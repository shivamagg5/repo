package io.eventhub.consumer.data.remote

import io.eventhub.consumer.data.remote.dto.*
import io.ktor.client.HttpClient
import kotlinx.serialization.Serializable
import javax.inject.Inject
import javax.inject.Singleton

/**
 * EventApiService — wraps all event-related endpoints.
 * Matches GET /api/v1/events, /categories, /cities, /search
 */
@Singleton
class EventApiService @Inject constructor(private val client: HttpClient) {

    suspend fun getFeaturedEvents(): List<EventDto> = try {
        client.apiGetList("/public/events?limit=10&sort=newest")
    } catch (e: Exception) {
        client.apiGetList("/events/featured")
    }

    suspend fun getTrendingEvents(): List<EventDto> = try {
        client.apiGetList("/public/events?limit=10&sort=date")
    } catch (e: Exception) {
        client.apiGetList("/events/trending")
    }

    suspend fun getNearbyEvents(lat: Double, lng: Double): List<EventDto> = try {
        client.apiGetList("/public/events?limit=10")
    } catch (e: Exception) {
        client.apiGetList("/events/nearby?lat=$lat&lng=$lng")
    }

    suspend fun getEvents(
        city: String? = null,
        categoryId: String? = null,
        from: String? = null,
        to: String? = null,
        minPrice: Int? = null,
        maxPrice: Int? = null,
        page: Int = 1,
        pageSize: Int = 20,
    ): List<EventDto> {
        val params = buildList {
            city?.let { add("city=$it") }
            categoryId?.let { add("category=$it") }
            from?.let { add("dateFrom=$it") }
            to?.let { add("dateTo=$it") }
            add("limit=$pageSize")
        }.joinToString("&")
        val queryString = if (params.isNotEmpty()) "?$params" else ""
        return try {
            client.apiGetList("/public/events$queryString")
        } catch (e: Exception) {
            client.apiGetList("/events$queryString")
        }
    }

    suspend fun getEventById(eventId: String): EventDto = try {
        client.apiGet("/public/events/$eventId")
    } catch (e: Exception) {
        client.apiGet("/events/$eventId")
    }

    suspend fun getEventBySlug(slug: String): EventDto = try {
        client.apiGet("/public/events/$slug")
    } catch (e: Exception) {
        client.apiGet("/events/slug/$slug")
    }

    suspend fun searchEvents(query: String, page: Int = 1): List<EventDto> = try {
        client.apiGetList("/public/events?q=${query}&limit=20")
    } catch (e: Exception) {
        client.apiGetList("/search?q=${query}&page=$page")
    }

    suspend fun getCategories(): List<CategoryDto> = try {
        client.apiGetList("/public/categories")
    } catch (e: Exception) {
        client.apiGetList("/categories")
    }

    suspend fun getCities(): List<CityDto> = try {
        client.apiGetList("/public/cities")
    } catch (e: Exception) {
        client.apiGetList("/cities")
    }
}

/**
 * CheckoutApiService — POST /api/v1/checkout/sessions endpoints
 */
@Singleton
class CheckoutApiService @Inject constructor(private val client: HttpClient) {

    suspend fun createSession(request: CheckoutSessionRequestDto): CheckoutSessionDto =
        client.apiPost("/checkout/sessions", request)

    suspend fun getSession(sessionId: String): CheckoutSessionDto =
        client.apiGet("/checkout/sessions/$sessionId")

    suspend fun initiatePayment(sessionId: String): PaymentIntentResponseDto =
        client.apiPost("/checkout/sessions/$sessionId/payment")

    suspend fun cancelSession(sessionId: String) =
        client.apiPost<Unit>("/checkout/sessions/$sessionId/cancel")
}

/**
 * TicketApiService — GET /api/v1/tickets endpoints
 */
@Singleton
class TicketApiService @Inject constructor(private val client: HttpClient) {

    suspend fun getUserTickets(): List<TicketDto> = try {
        client.apiGetList("/tickets")
    } catch (e: Exception) {
        client.apiGetList("/users/me/tickets")
    }

    suspend fun getTicket(ticketId: String): TicketDto =
        client.apiGet("/tickets/$ticketId")

    suspend fun getTicketQrToken(ticketId: String): String =
        client.apiGet<Map<String, String>>("/tickets/$ticketId/qr")["token"]
            ?: error("No QR token in response")
}

/**
 * UserApiService — GET/PATCH /api/v1/users/me, favorites, notifications
 */
@Singleton
class UserApiService @Inject constructor(private val client: HttpClient) {

    suspend fun getMe(): UserDto =
        client.apiGet("/users/me")

    suspend fun updateMe(request: UpdateUserRequestDto): UserDto =
        client.apiPatch("/users/me", request)

    suspend fun getFavorites(): List<EventDto> =
        client.apiGetList("/users/me/favorites")

    suspend fun addFavorite(eventId: String): Unit =
        client.apiPost("/users/me/favorites/$eventId")

    suspend fun removeFavorite(eventId: String) =
        client.apiDelete("/users/me/favorites/$eventId")

    suspend fun getInAppNotifications(): List<InAppNotificationDto> = try {
        client.apiGetList("/notifications/in-app")
    } catch (e: Exception) {
        client.apiGetList("/users/me/notifications")
    }

    suspend fun registerDeviceToken(fcmToken: String) = try {
        client.apiPost<Unit>("/notifications/device-tokens", mapOf("token" to fcmToken, "platform" to "android"))
    } catch (e: Exception) {
        client.apiPost<Unit>("/users/me/device-token", mapOf("token" to fcmToken, "platform" to "android"))
    }
}

// Simple category + city DTOs
@Serializable
data class CategoryDto(val id: String, val name: String, val iconUrl: String? = null)

@Serializable
data class CityDto(val name: String, val state: String? = null, val country: String = "IN")
