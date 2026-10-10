package io.eventhub.scanner.domain.engine

import io.eventhub.scanner.data.local.db.ScannerDatabase
import io.eventhub.scanner.data.remote.ScannerApiService
import io.eventhub.scanner.data.remote.dto.CheckInRequestDto
import io.eventhub.scanner.data.remote.dto.CheckInResponseDto
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.security.MessageDigest
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap
import javax.inject.Inject
import javax.inject.Singleton

sealed interface ScanResult {
    data class Success(
        val ticketId: String,
        val holderName: String?,
        val accessTier: String,
        val seat: String?,
        val isOffline: Boolean
    ) : ScanResult

    data class AlreadyCheckedIn(
        val ticketId: String,
        val checkedInAt: Long?,
        val isOffline: Boolean
    ) : ScanResult

    data class Invalid(val reason: String) : ScanResult
    data object DatasetExpired : ScanResult
}

@Singleton
class OfflineVerificationEngine @Inject constructor(
    private val db: ScannerDatabase,
    private val api: ScannerApiService,
) {
    // 500ms duplicate scan prevention cache
    private val recentScans = ConcurrentHashMap<String, Long>()

    suspend fun processScan(
        rawBarcode: String,
        eventId: String,
        gate: String?,
        deviceId: String,
        isOnline: Boolean
    ): ScanResult = withContext(Dispatchers.IO) {
        val now = System.currentTimeMillis()

        // 1. Duplicate scan throttle (ignore identical barcode within 800ms)
        val lastScanTime = recentScans[rawBarcode]
        if (lastScanTime != null && now - lastScanTime < 800) {
            return@withContext ScanResult.Invalid("Duplicate scan suppressed")
        }
        recentScans[rawBarcode] = now

        // 2. Online Mode (Preferred as per Architecture Section 3)
        if (isOnline) {
            try {
                val response = api.checkInOnline(
                    CheckInRequestDto(
                        eventId = eventId,
                        qrPayload = rawBarcode,
                        gateId = gate,
                        gate = gate,
                        deviceId = deviceId,
                        scanId = UUID.randomUUID().toString(),
                        timestamp = now
                    )
                )
                if (response.success) {
                    // Update local DB cache as well if ticket exists locally
                    response.ticketId?.let { tId ->
                        db.scannerDatabaseQueries.markTicketLocallyUsed(now, tId)
                    }
                    return@withContext ScanResult.Success(
                        ticketId = response.ticketId ?: "ONLINE_TICKET",
                        holderName = response.holderName,
                        accessTier = response.accessTier ?: "GENERAL",
                        seat = response.seat,
                        isOffline = false
                    )
                } else if (response.status == "ALREADY_CHECKED_IN") {
                    return@withContext ScanResult.AlreadyCheckedIn(
                        ticketId = response.ticketId ?: "UNKNOWN",
                        checkedInAt = null,
                        isOffline = false
                    )
                } else {
                    return@withContext ScanResult.Invalid(response.message ?: "Invalid ticket")
                }
            } catch (e: Exception) {
                // Network failed mid-request — fall through to local verification
            }
        }

        // 3. Offline Mode Execution (Architecture Section 6)
        val activeEvent = db.scannerDatabaseQueries.getActiveEvent().executeAsOneOrNull()
            ?: return@withContext ScanResult.Invalid("No event dataset loaded on device")

        if (now > activeEvent.expiryTimestamp) {
            return@withContext ScanResult.DatasetExpired
        }

        // Compute SHA-256 hash of scanned credential
        val credentialHash = hashCredential(rawBarcode)

        // Lookup in local encrypted SQLite table
        val ticket = db.scannerDatabaseQueries.getTicketByHash(credentialHash, eventId).executeAsOneOrNull()
            ?: db.scannerDatabaseQueries.getTicketById(rawBarcode.trim(), eventId).executeAsOneOrNull()
            ?: return@withContext ScanResult.Invalid("Ticket not found in local dataset")

        if (ticket.status != "VALID") {
            return@withContext ScanResult.Invalid("Ticket is marked ${ticket.status}")
        }

        if (ticket.isLocallyUsed == 1L) {
            return@withContext ScanResult.AlreadyCheckedIn(
                ticketId = ticket.ticketId,
                checkedInAt = ticket.locallyCheckedInAt,
                isOffline = true
            )
        }

        // Mark ticket locally used
        db.scannerDatabaseQueries.markTicketLocallyUsed(now, ticket.ticketId)

        // Queue in CheckInQueueTable for idempotent server sync
        val syncId = UUID.randomUUID().toString()
        db.scannerDatabaseQueries.insertCheckInQueue(
            syncId = syncId,
            deviceId = deviceId,
            eventId = eventId,
            ticketId = ticket.ticketId,
            localTimestamp = now,
            datasetVersion = activeEvent.datasetVersion,
            result = "SUCCESS"
        )

        ScanResult.Success(
            ticketId = ticket.ticketId,
            holderName = ticket.holderName,
            accessTier = ticket.accessTier,
            seat = ticket.seat,
            isOffline = true
        )
    }

    private fun hashCredential(raw: String): String {
        val digest = MessageDigest.getInstance("SHA-256")
        val bytes = digest.digest(raw.trim().toByteArray(Charsets.UTF_8))
        return bytes.joinToString("") { "%02x".format(it) }
    }

    suspend fun searchAttendees(
        eventId: String,
        query: String,
        isOnline: Boolean
    ): List<io.eventhub.scanner.data.remote.dto.AttendeeDto> = withContext(Dispatchers.IO) {
        if (isOnline) {
            val remoteResults = try {
                api.searchAttendees(eventId, query)
            } catch (e: Exception) {
                emptyList()
            }
            if (remoteResults.isNotEmpty()) return@withContext remoteResults
        }

        // Fallback to local SQLite search
        try {
            val localList = db.scannerDatabaseQueries.searchTicketsByNameOrId(eventId, query).executeAsList()
            localList.map { t ->
                io.eventhub.scanner.data.remote.dto.AttendeeDto(
                    ticketId = t.ticketId,
                    ticketNumber = t.ticketId.takeLast(8),
                    ticketTypeName = t.accessTier,
                    purchaserName = t.holderName ?: "Attendee",
                    status = if (t.isLocallyUsed == 1L) "checked_in" else t.status.lowercase(),
                    checkedInAt = t.locallyCheckedInAt?.toString()
                )
            }
        } catch (e: Exception) {
            emptyList()
        }
    }

    suspend fun manualAdmit(
        ticketId: String,
        eventId: String,
        gate: String?,
        deviceId: String,
        isOnline: Boolean
    ): ScanResult = withContext(Dispatchers.IO) {
        val now = System.currentTimeMillis()

        if (isOnline) {
            try {
                val res = api.manualCheckIn(
                    io.eventhub.scanner.data.remote.dto.ManualCheckinRequestDto(
                        ticketId = ticketId,
                        eventId = eventId,
                        gateId = gate ?: "MAIN_GATE",
                        deviceId = deviceId
                    )
                )
                if (res.result == "success") {
                    db.scannerDatabaseQueries.markTicketLocallyUsed(now, ticketId)
                    return@withContext ScanResult.Success(
                        ticketId = ticketId,
                        holderName = res.purchaserName,
                        accessTier = res.ticketTypeName ?: "GENERAL",
                        seat = null,
                        isOffline = false
                    )
                } else if (res.result == "already_checked_in") {
                    return@withContext ScanResult.AlreadyCheckedIn(
                        ticketId = ticketId,
                        checkedInAt = null,
                        isOffline = false
                    )
                } else {
                    return@withContext ScanResult.Invalid(res.message ?: "Manual check-in rejected")
                }
            } catch (e: Exception) {
                // Network failed mid-request — fallback to local
            }
        }

        // Offline local fallback
        val activeEvent = db.scannerDatabaseQueries.getActiveEvent().executeAsOneOrNull()
            ?: return@withContext ScanResult.Invalid("No active event dataset")

        val ticket = db.scannerDatabaseQueries.getTicketById(ticketId, eventId).executeAsOneOrNull()
            ?: return@withContext ScanResult.Invalid("Ticket not found in local dataset")

        if (ticket.isLocallyUsed == 1L) {
            return@withContext ScanResult.AlreadyCheckedIn(
                ticketId = ticket.ticketId,
                checkedInAt = ticket.locallyCheckedInAt,
                isOffline = true
            )
        }

        db.scannerDatabaseQueries.markTicketLocallyUsed(now, ticket.ticketId)
        db.scannerDatabaseQueries.insertCheckInQueue(
            syncId = UUID.randomUUID().toString(),
            deviceId = deviceId,
            eventId = eventId,
            ticketId = ticket.ticketId,
            localTimestamp = now,
            datasetVersion = activeEvent.datasetVersion,
            result = "SUCCESS"
        )

        ScanResult.Success(
            ticketId = ticket.ticketId,
            holderName = ticket.holderName,
            accessTier = ticket.accessTier,
            seat = ticket.seat,
            isOffline = true
        )
    }
}

