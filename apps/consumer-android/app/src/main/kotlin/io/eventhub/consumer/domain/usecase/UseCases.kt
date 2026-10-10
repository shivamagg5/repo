package io.eventhub.consumer.domain.usecase

import io.eventhub.consumer.domain.model.*
import io.eventhub.consumer.domain.repository.*
import javax.inject.Inject

class GetFeaturedEventsUseCase @Inject constructor(
    private val eventRepository: EventRepository
) {
    suspend operator fun invoke(): List<Event> = eventRepository.getFeaturedEvents()
}

class GetTrendingEventsUseCase @Inject constructor(
    private val eventRepository: EventRepository
) {
    suspend operator fun invoke(): List<Event> = eventRepository.getTrendingEvents()
}

class ToggleFavoriteUseCase @Inject constructor(
    private val eventRepository: EventRepository
) {
    suspend operator fun invoke(eventId: String, isFavorited: Boolean) {
        eventRepository.toggleFavorite(eventId, isFavorited)
    }
}

class GetFavoritesUseCase @Inject constructor(
    private val eventRepository: EventRepository
) {
    suspend operator fun invoke(): List<Event> = eventRepository.getFavorites()
}

class GetEventDetailUseCase @Inject constructor(
    private val eventRepository: EventRepository
) {
    suspend operator fun invoke(eventId: String): Event = eventRepository.getEventById(eventId)
}

class SearchEventsUseCase @Inject constructor(
    private val eventRepository: EventRepository
) {
    suspend operator fun invoke(query: String, page: Int = 1): List<Event> =
        eventRepository.searchEvents(query, page)
}

class GetTicketsUseCase @Inject constructor(
    private val ticketRepository: TicketRepository
) {
    suspend operator fun invoke(): List<Ticket> = ticketRepository.getUserTickets()
}

class GetTicketDetailUseCase @Inject constructor(
    private val ticketRepository: TicketRepository
) {
    suspend operator fun invoke(ticketId: String): Ticket = ticketRepository.getTicket(ticketId)
    suspend fun getQrToken(ticketId: String): String = ticketRepository.getTicketQrToken(ticketId)
    suspend fun cacheForOffline(ticket: Ticket, qrToken: String?) = ticketRepository.cacheTicketForOffline(ticket, qrToken)
    suspend fun isCachedOffline(ticketId: String): Boolean = ticketRepository.isTicketCachedOffline(ticketId)
}

class CreateCheckoutSessionUseCase @Inject constructor(
    private val checkoutRepository: CheckoutRepository
) {
    suspend operator fun invoke(
        eventId: String,
        items: List<CheckoutLineItem>,
        promoCode: String? = null
    ): CheckoutSession = checkoutRepository.createSession(eventId, items, promoCode)
}

class InitiatePaymentUseCase @Inject constructor(
    private val checkoutRepository: CheckoutRepository
) {
    suspend operator fun invoke(sessionId: String): PaymentIntent =
        checkoutRepository.initiatePayment(sessionId)
}

class GetUserProfileUseCase @Inject constructor(
    private val userRepository: UserRepository
) {
    suspend operator fun invoke(): User = userRepository.getMe()
}

class GetNotificationsUseCase @Inject constructor(
    private val userRepository: UserRepository
) {
    suspend operator fun invoke(): List<NotificationItem> = userRepository.getNotifications()
}
