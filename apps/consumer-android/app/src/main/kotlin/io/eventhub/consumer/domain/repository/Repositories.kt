package io.eventhub.consumer.domain.repository

import io.eventhub.consumer.domain.model.*

interface EventRepository {
    suspend fun getFeaturedEvents(): List<Event>
    suspend fun getTrendingEvents(): List<Event>
    suspend fun getNearbyEvents(lat: Double, lng: Double): List<Event>
    suspend fun getEvents(
        city: String? = null,
        categoryId: String? = null,
        from: String? = null,
        to: String? = null,
        minPrice: Int? = null,
        maxPrice: Int? = null,
        page: Int = 1,
        pageSize: Int = 20,
    ): List<Event>
    suspend fun getEventById(eventId: String): Event
    suspend fun getEventBySlug(slug: String): Event
    suspend fun searchEvents(query: String, page: Int = 1): List<Event>
    suspend fun toggleFavorite(eventId: String, isFavorited: Boolean)
    suspend fun getFavorites(): List<Event>
    suspend fun getCategories(): List<Category>
    suspend fun getCities(): List<City>
}

interface TicketRepository {
    suspend fun getUserTickets(): List<Ticket>
    suspend fun getTicket(ticketId: String): Ticket
    suspend fun getTicketQrToken(ticketId: String): String
    suspend fun cacheTicketForOffline(ticket: Ticket, qrToken: String?)
    suspend fun isTicketCachedOffline(ticketId: String): Boolean
}

interface CheckoutRepository {
    suspend fun createSession(eventId: String, items: List<CheckoutLineItem>, promoCode: String?): CheckoutSession
    suspend fun getSession(sessionId: String): CheckoutSession
    suspend fun initiatePayment(sessionId: String): PaymentIntent
    suspend fun cancelSession(sessionId: String)
}

data class PaymentIntent(
    val razorpayOrderId: String,
    val amount: Int,
    val currency: String,
    val key: String
)

interface UserRepository {
    suspend fun getMe(): User
    suspend fun updateMe(name: String?, phone: String?, avatarUrl: String?): User
    suspend fun registerDeviceToken(fcmToken: String)
    suspend fun getNotifications(): List<NotificationItem>
}

interface AuthRepository {
    suspend fun signInWithEmail(email: String, password: String): User
    suspend fun signUpWithEmail(email: String, password: String, name: String?): User
    suspend fun signInWithGoogle(idToken: String): User
    suspend fun signOut()
    suspend fun isAuthenticated(): Boolean
    suspend fun getCurrentUser(): User?
}
