package io.eventhub.scanner

import io.eventhub.scanner.data.local.db.ScannerDatabase
import io.eventhub.scanner.data.local.db.ScannerDatabaseQueries
import io.eventhub.scanner.data.remote.ScannerApiService
import io.eventhub.scanner.data.remote.dto.CheckInRequestDto
import io.eventhub.scanner.data.remote.dto.CheckInResponseDto
import io.eventhub.scanner.data.remote.dto.ManualCheckinRequestDto
import io.eventhub.scanner.data.remote.dto.ManualCheckinResponseDto
import io.eventhub.scanner.domain.engine.OfflineVerificationEngine
import io.eventhub.scanner.domain.engine.ScanResult
import io.mockk.*
import kotlinx.coroutines.runBlocking
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test

class OfflineVerificationEngineTest {

    private val db = mockk<ScannerDatabase>(relaxed = true)
    private val queries = mockk<ScannerDatabaseQueries>(relaxed = true)
    private val api = mockk<ScannerApiService>()
    private lateinit var engine: OfflineVerificationEngine

    @BeforeEach
    fun setup() {
        every { db.scannerDatabaseQueries } returns queries
        engine = OfflineVerificationEngine(db, api)
    }

    @Test
    fun `processScan returns Success when online API checkIn succeeds`() = runBlocking {
        val onlineResponse = CheckInResponseDto(
            success = true,
            status = "VALID",
            ticketId = "TKT-1001",
            holderName = "Jane Doe",
            accessTier = "VIP_GOLD",
            seat = "A-12"
        )

        coEvery { api.checkInOnline(any()) } returns onlineResponse

        val result = engine.processScan(
            rawBarcode = "VALID_QR_CODE_PAYLOAD_1001",
            eventId = "evt-123",
            gate = "NORTH_VIP",
            deviceId = "DEV-01",
            isOnline = true
        )

        assertTrue(result is ScanResult.Success)
        val success = result as ScanResult.Success
        assertEquals("TKT-1001", success.ticketId)
        assertEquals("Jane Doe", success.holderName)
        assertEquals("VIP_GOLD", success.accessTier)
        assertFalse(success.isOffline)

        verify { queries.markTicketLocallyUsed(any(), "TKT-1001") }
    }

    @Test
    fun `processScan returns AlreadyCheckedIn when online API reports ticket already used`() = runBlocking {
        val onlineResponse = CheckInResponseDto(
            success = false,
            status = "ALREADY_CHECKED_IN",
            ticketId = "TKT-DUPE-22",
            message = "Ticket already admitted"
        )

        coEvery { api.checkInOnline(any()) } returns onlineResponse

        val result = engine.processScan(
            rawBarcode = "USED_QR_CODE_PAYLOAD_22",
            eventId = "evt-123",
            gate = "GATE_B",
            deviceId = "DEV-01",
            isOnline = true
        )

        assertTrue(result is ScanResult.AlreadyCheckedIn)
        val dupe = result as ScanResult.AlreadyCheckedIn
        assertEquals("TKT-DUPE-22", dupe.ticketId)
        assertFalse(dupe.isOffline)
    }

    @Test
    fun `processScan suppresses rapid duplicate scan within 800ms throttle window`() = runBlocking {
        val onlineResponse = CheckInResponseDto(
            success = true,
            status = "VALID",
            ticketId = "TKT-RAPID-01"
        )
        coEvery { api.checkInOnline(any()) } returns onlineResponse

        val firstScan = engine.processScan(
            rawBarcode = "RAPID_FIRE_CODE_01",
            eventId = "evt-123",
            gate = "GATE_A",
            deviceId = "DEV-01",
            isOnline = true
        )
        assertTrue(firstScan is ScanResult.Success)

        // Rapid immediate rescan of exact same barcode
        val secondScan = engine.processScan(
            rawBarcode = "RAPID_FIRE_CODE_01",
            eventId = "evt-123",
            gate = "GATE_A",
            deviceId = "DEV-01",
            isOnline = true
        )
        assertTrue(secondScan is ScanResult.Invalid)
        assertEquals("Duplicate scan suppressed", (secondScan as ScanResult.Invalid).reason)
    }

    @Test
    fun `manualAdmit returns Success when online manual check-in succeeds`() = runBlocking {
        val response = ManualCheckinResponseDto(
            result = "success",
            ticketId = "TKT-MANUAL-77",
            purchaserName = "Rahul Sharma",
            ticketTypeName = "GENERAL_ADMISSION"
        )
        coEvery { api.manualCheckIn(any()) } returns response

        val result = engine.manualAdmit(
            ticketId = "TKT-MANUAL-77",
            eventId = "evt-123",
            gate = "MAIN_GATE",
            deviceId = "MANUAL-01",
            isOnline = true
        )

        assertTrue(result is ScanResult.Success)
        val success = result as ScanResult.Success
        assertEquals("TKT-MANUAL-77", success.ticketId)
        assertEquals("Rahul Sharma", success.holderName)
        assertEquals("GENERAL_ADMISSION", success.accessTier)
    }
}
