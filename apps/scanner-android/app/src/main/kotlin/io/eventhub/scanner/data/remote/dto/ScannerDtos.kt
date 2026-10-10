package io.eventhub.scanner.data.remote.dto

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class ScannerEventDto(
    val id: String,
    val name: String,
    @SerialName("startAt") val startAt: String,
    @SerialName("endAt") val endAt: String? = null,
    val venueName: String? = null,
    val totalTickets: Int = 0,
    val checkedInCount: Int = 0,
)

@Serializable
data class EventBootstrapDto(
    val eventId: String,
    val eventName: String,
    val startAt: String,
    val endAt: String? = null,
    val gateScope: String? = null,
    val datasetVersion: Long,
    val expiryTimestamp: Long,
    val tickets: List<BootstrapTicketDto>
)

@Serializable
data class BootstrapTicketDto(
    val ticketId: String,
    val credentialHash: String,
    val accessTier: String,
    val status: String,
    val holderName: String? = null,
    val seat: String? = null,
    val gate: String? = null,
    val isUsed: Boolean = false,
)

@Serializable
data class CheckInRequestDto(
    val eventId: String,
    @SerialName("qrPayload") val qrPayload: String,
    @SerialName("ticketToken") val ticketToken: String = qrPayload,
    val gateId: String? = null,
    val gate: String? = gateId,
    val deviceId: String,
    val scanId: String? = null,
    val timestamp: Long = System.currentTimeMillis()
)

@Serializable
data class CheckInResponseDto(
    val success: Boolean,
    val status: String, // VALID, ALREADY_CHECKED_IN, INVALID, REVOKED
    val ticketId: String? = null,
    val holderName: String? = null,
    val accessTier: String? = null,
    val seat: String? = null,
    val message: String? = null,
    val checkedInAt: String? = null,
)

@Serializable
data class BatchSyncRequestDto(
    val deviceId: String,
    val eventId: String,
    val records: List<SyncRecordDto>
)

@Serializable
data class SyncRecordDto(
    val syncId: String,
    val ticketId: String,
    val localTimestamp: Long,
    val datasetVersion: Long,
    val result: String,
)

@Serializable
data class BatchSyncResponseDto(
    val processedCount: Int,
    val syncedIds: List<String>,
    val conflicts: List<SyncConflictDto> = emptyList()
)

@Serializable
data class SyncConflictDto(
    val syncId: String,
    val ticketId: String,
    val reason: String,
)

@Serializable
data class AttendeeDto(
    val ticketId: String,
    val ticketNumber: String? = null,
    val ticketTypeName: String? = null,
    val purchaserName: String? = null,
    val status: String,
    val checkedInAt: String? = null,
)

@Serializable
data class ManualCheckinRequestDto(
    val ticketId: String,
    val eventId: String,
    val gateId: String,
    val deviceId: String,
)

@Serializable
data class ManualCheckinResponseDto(
    val result: String,
    val ticketId: String? = null,
    val ticketNumber: String? = null,
    val ticketTypeName: String? = null,
    val purchaserName: String? = null,
    val scannedAt: String? = null,
    val message: String? = null,
)
