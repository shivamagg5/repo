package io.eventhub.consumer.data.remote.dto

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

// ─── Event DTOs ─────────────────────────────────────────────────────────────

@Serializable
data class EventDto(
    val id: String,
    val name: String = "",
    val title: String? = null,
    val slug: String? = null,
    val description: String? = null,
    @SerialName("startAt") val startAt: String = "",
    @SerialName("startsAt") val startsAt: String? = null,
    @SerialName("endAt") val endAt: String? = null,
    @SerialName("endsAt") val endsAt: String? = null,
    val status: String = "PUBLISHED",
    @SerialName("coverImageUrl") val coverImageUrl: String? = null,
    @SerialName("coverImage") val coverImage: String? = null,
    @SerialName("bannerImageUrl") val bannerImageUrl: String? = null,
    val venue: VenueSnippetDto? = null,
    val venueName: String? = null,
    val city: String? = null,
    val organizer: OrganizerSnippetDto? = null,
    @SerialName("ticketTypes") val ticketTypes: List<TicketTypeDto> = emptyList(),
    val categories: List<String> = emptyList(),
    @SerialName("categoryName") val categoryName: String? = null,
    @SerialName("minPrice") val minPrice: Int? = null,
    @SerialName("minPriceMinor") val minPriceMinor: Int? = null,
    @SerialName("maxPrice") val maxPrice: Int? = null,
    @SerialName("isFree") val isFree: Boolean = false,
    @SerialName("isFavorited") val isFavorited: Boolean = false,
    @SerialName("totalCapacity") val totalCapacity: Int? = null,
    @SerialName("soldCount") val soldCount: Int? = null,
    val currency: String = "INR",
) {
    val displayName: String get() = if (name.isNotBlank()) name else (title ?: "Event")
    val displayStartAt: String get() = if (startAt.isNotBlank()) startAt else (startsAt ?: "")
    val displayEndAt: String? get() = endAt ?: endsAt
    val displayCoverImage: String? get() = coverImageUrl ?: coverImage ?: bannerImageUrl
    val displayMinPrice: Int? get() = minPrice ?: minPriceMinor
}

@Serializable
data class VenueSnippetDto(
    val id: String,
    val name: String,
    val city: String? = null,
    val state: String? = null,
    val address: String? = null,
    val latitude: Double? = null,
    val longitude: Double? = null,
)

@Serializable
data class OrganizerSnippetDto(
    val id: String,
    val name: String,
    @SerialName("logoUrl") val logoUrl: String? = null,
    val verified: Boolean = false,
)

@Serializable
data class TicketTypeDto(
    val id: String,
    val name: String,
    val description: String? = null,
    val price: Int,
    val currency: String = "INR",
    val available: Int? = null,
    val maxPerOrder: Int = 10,
    val minPerOrder: Int = 1,
    @SerialName("saleStartAt") val saleStartAt: String? = null,
    @SerialName("saleEndAt") val saleEndAt: String? = null,
    val status: String = "ACTIVE",
)

@Serializable
data class EventSearchResultDto(
    val events: List<EventDto>,
    val total: Int,
    val page: Int,
    val pageSize: Int,
)

// ─── Checkout DTOs ───────────────────────────────────────────────────────────

@Serializable
data class CheckoutSessionRequestDto(
    val eventId: String,
    val items: List<CheckoutItemDto>,
    val promoCode: String? = null,
)

@Serializable
data class CheckoutItemDto(
    val ticketTypeId: String,
    val quantity: Int,
)

@Serializable
data class CheckoutSessionDto(
    val id: String,
    val eventId: String,
    val items: List<CheckoutLineItemDto>,
    val subtotal: Int,
    val fees: Int,
    val tax: Int,
    val total: Int,
    val currency: String = "INR",
    val promoDiscount: Int = 0,
    val promoCode: String? = null,
    val expiresAt: String,
    val status: String,
)

@Serializable
data class CheckoutLineItemDto(
    val ticketTypeId: String,
    val ticketTypeName: String,
    val quantity: Int,
    val unitPrice: Int,
    val lineTotal: Int,
)

@Serializable
data class PaymentIntentResponseDto(
    val razorpayOrderId: String,
    val amount: Int,
    val currency: String,
    val key: String,
)

// ─── Order DTOs ──────────────────────────────────────────────────────────────

@Serializable
data class OrderDto(
    val id: String,
    val status: String,
    val event: EventDto? = null,
    val items: List<OrderItemDto> = emptyList(),
    val total: Int,
    val currency: String = "INR",
    @SerialName("createdAt") val createdAt: String,
    @SerialName("paidAt") val paidAt: String? = null,
)

@Serializable
data class OrderItemDto(
    val id: String,
    val ticketTypeId: String,
    val ticketTypeName: String,
    val quantity: Int,
    val unitPrice: Int,
    val lineTotal: Int,
)

// ─── Ticket DTOs ─────────────────────────────────────────────────────────────

@Serializable
data class TicketDto(
    val id: String,
    val orderId: String,
    val eventId: String,
    val event: EventDto? = null,
    val ticketTypeId: String,
    val ticketTypeName: String = "General Ticket",
    val tierName: String? = null,
    val holderName: String? = null,
    val holderEmail: String? = null,
    val status: String = "issued",   // VALID | USED | CANCELLED | REFUNDED | TRANSFERRED
    @SerialName("qrToken") val qrToken: String? = null,
    @SerialName("issuedAt") val issuedAt: String = "",
    @SerialName("checkedInAt") val checkedInAt: String? = null,
    val seat: String? = null,
    val gate: String? = null,
    val eventTitle: String? = null,
    val venueName: String? = null,
    val eventStartsAt: String? = null,
)

// ─── User DTOs ────────────────────────────────────────────────────────────────

@Serializable
data class UserDto(
    val id: String,
    val email: String,
    val name: String? = null,
    @SerialName("avatarUrl") val avatarUrl: String? = null,
    val phone: String? = null,
    val role: String = "CONSUMER",
    @SerialName("createdAt") val createdAt: String? = null,
)

@Serializable
data class UpdateUserRequestDto(
    val name: String? = null,
    val phone: String? = null,
    @SerialName("avatarUrl") val avatarUrl: String? = null,
)

// ─── Notification DTOs ───────────────────────────────────────────────────────

@Serializable
data class InAppNotificationDto(
    val id: String,
    val title: String,
    val body: String,
    val type: String,
    @SerialName("deepLink") val deepLink: String? = null,
    @SerialName("isRead") val isRead: Boolean = false,
    @SerialName("createdAt") val createdAt: String,
)
