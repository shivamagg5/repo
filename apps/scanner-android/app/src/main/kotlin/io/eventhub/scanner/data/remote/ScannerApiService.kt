package io.eventhub.scanner.data.remote

import io.eventhub.scanner.data.remote.dto.*
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.*
import kotlinx.serialization.Serializable
import javax.inject.Inject
import javax.inject.Singleton

@Serializable
data class ApiEnvelope<T>(
    val data: T,
    val meta: Map<String, String>? = null
)

@Serializable
data class ApiListEnvelope<T>(
    val data: List<T>,
    val meta: Map<String, String>? = null
)

@Singleton
class ScannerApiService @Inject constructor(
    private val client: HttpClient
) {
    suspend fun getAuthorizedEvents(): List<ScannerEventDto> =
        client.get("scanner/events").body<ApiListEnvelope<ScannerEventDto>>().data

    suspend fun downloadBootstrapDataset(eventId: String): EventBootstrapDto = try {
        client.get("scanner/events/$eventId/package").body<ApiEnvelope<EventBootstrapDto>>().data
    } catch (e: Exception) {
        client.get("scanner/events/$eventId/bootstrap").body<ApiEnvelope<EventBootstrapDto>>().data
    }

    suspend fun checkInOnline(request: CheckInRequestDto): CheckInResponseDto = try {
        client.post("scanner/scan") {
            setBody(request)
        }.body<ApiEnvelope<CheckInResponseDto>>().data
    } catch (e: Exception) {
        client.post("scanner/checkins") {
            setBody(request)
        }.body<ApiEnvelope<CheckInResponseDto>>().data
    }

    suspend fun syncBatch(request: BatchSyncRequestDto): BatchSyncResponseDto =
        client.post("scanner/sync") {
            setBody(request)
        }.body<ApiEnvelope<BatchSyncResponseDto>>().data

    suspend fun searchAttendees(eventId: String, query: String): List<AttendeeDto> = try {
        client.get("scanner/attendees") {
            parameter("eventId", eventId)
            parameter("query", query)
        }.body<ApiEnvelope<List<AttendeeDto>>>().data
    } catch (e: Exception) {
        try {
            client.get("scanner/attendees") {
                parameter("eventId", eventId)
                parameter("query", query)
            }.body<ApiListEnvelope<AttendeeDto>>().data
        } catch (e2: Exception) {
            emptyList()
        }
    }

    suspend fun manualCheckIn(request: ManualCheckinRequestDto): ManualCheckinResponseDto =
        client.post("scanner/manual-checkin") {
            setBody(request)
        }.body<ApiEnvelope<ManualCheckinResponseDto>>().data
}
