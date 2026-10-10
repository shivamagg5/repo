package io.eventhub.consumer.ui.navigation

import com.slack.circuit.runtime.screen.Screen
import kotlinx.parcelize.Parcelize
import kotlinx.serialization.Serializable

// ─── All app routes as Circuit Screens ──────────────────────────────────────
// Type-safe: no string routes, no typos

@Parcelize
@Serializable
object HomeRoute : Screen

@Parcelize
@Serializable
object DiscoverRoute : Screen

@Parcelize
@Serializable
data class EventDetailRoute(val eventId: String) : Screen

@Parcelize
@Serializable
data class CheckoutRoute(val eventId: String) : Screen

@Parcelize
@Serializable
data class CheckoutConfirmRoute(val sessionId: String) : Screen

@Parcelize
@Serializable
object TicketsRoute : Screen

@Parcelize
@Serializable
data class TicketDetailRoute(val ticketId: String) : Screen

@Parcelize
@Serializable
data class OrderDetailRoute(val orderId: String) : Screen

@Parcelize
@Serializable
object SearchRoute : Screen

@Parcelize
@Serializable
object ProfileRoute : Screen

@Parcelize
@Serializable
object SavedRoute : Screen

@Parcelize
@Serializable
object NotificationsRoute : Screen

@Parcelize
@Serializable
object LoginRoute : Screen

@Parcelize
@Serializable
object SignupRoute : Screen

@Parcelize
@Serializable
object OnboardingRoute : Screen
