package io.eventhub.consumer.domain.model

import kotlinx.serialization.Serializable

/** Domain models — pure Kotlin, no Android/Ktor dependencies. KMP-ready. */

@Serializable
data class Event(
    val id: String,
    val name: String,
    val slug: String?,
    val description: String?,
    val startAt: String,
    val endAt: String?,
    val status: EventStatus,
    val coverImageUrl: String?,
    val bannerImageUrl: String?,
    val venue: VenueSnippet?,
    val organizer: OrganizerSnippet?,
    val ticketTypes: List<TicketType>,
    val categories: List<String>,
    val minPrice: Int?,
    val maxPrice: Int?,
    val isFree: Boolean,
    val isFavorited: Boolean,
    val currency: String,
    val soldCount: Int?,
    val totalCapacity: Int?,
)

enum class EventStatus { DRAFT, PENDING, PUBLISHED, CANCELLED, COMPLETED }

@Serializable
data class VenueSnippet(
    val id: String,
    val name: String,
    val city: String?,
    val state: String?,
    val address: String?,
    val latitude: Double?,
    val longitude: Double?,
)

@Serializable
data class OrganizerSnippet(
    val id: String,
    val name: String,
    val logoUrl: String?,
    val verified: Boolean,
)

@Serializable
data class TicketType(
    val id: String,
    val name: String,
    val description: String?,
    val price: Int,
    val currency: String,
    val available: Int?,
    val maxPerOrder: Int,
    val minPerOrder: Int,
    val saleStartAt: String?,
    val saleEndAt: String?,
    val status: String,
) {
    val isSoldOut: Boolean get() = available != null && available <= 0
    val isOnSale: Boolean get() = status == "ACTIVE" && !isSoldOut
}

@Serializable
data class Ticket(
    val id: String,
    val orderId: String,
    val eventId: String,
    val event: Event?,
    val ticketTypeId: String,
    val ticketTypeName: String,
    val holderName: String?,
    val holderEmail: String?,
    val status: TicketStatus,
    val qrToken: String?,
    val issuedAt: String,
    val checkedInAt: String?,
    val seat: String?,
    val gate: String?,
    val isOfflineCached: Boolean = false,
)

@Serializable
enum class TicketStatus { VALID, USED, CANCELLED, REFUNDED, TRANSFERRED }

data class Order(
    val id: String,
    val status: OrderStatus,
    val event: Event?,
    val items: List<OrderItem>,
    val total: Int,
    val currency: String,
    val createdAt: String,
    val paidAt: String?,
)

enum class OrderStatus { PENDING, PAID, CANCELLED, REFUNDED, FAILED }

data class OrderItem(
    val id: String,
    val ticketTypeId: String,
    val ticketTypeName: String,
    val quantity: Int,
    val unitPrice: Int,
    val lineTotal: Int,
)

data class CheckoutSession(
    val id: String,
    val eventId: String,
    val items: List<CheckoutLineItem>,
    val subtotal: Int,
    val fees: Int,
    val tax: Int,
    val total: Int,
    val currency: String,
    val promoDiscount: Int,
    val promoCode: String?,
    val expiresAt: String,
    val status: String,
)

data class CheckoutLineItem(
    val ticketTypeId: String,
    val ticketTypeName: String,
    val quantity: Int,
    val unitPrice: Int,
    val lineTotal: Int,
)

data class User(
    val id: String,
    val email: String,
    val name: String?,
    val avatarUrl: String?,
    val phone: String?,
    val role: String,
)

data class Category(val id: String, val name: String, val iconUrl: String?)
data class City(val name: String, val state: String?, val country: String)

data class NotificationItem(
    val id: String,
    val title: String,
    val body: String,
    val type: String,
    val deepLink: String? = null,
    val isRead: Boolean = false,
    val createdAt: String,
)
