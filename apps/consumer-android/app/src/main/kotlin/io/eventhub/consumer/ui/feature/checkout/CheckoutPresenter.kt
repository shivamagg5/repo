package io.eventhub.consumer.ui.feature.checkout

import androidx.compose.runtime.*
import com.slack.circuit.runtime.CircuitUiEvent
import com.slack.circuit.runtime.CircuitUiState
import com.slack.circuit.runtime.Navigator
import com.slack.circuit.runtime.presenter.Presenter
import dagger.assisted.Assisted
import dagger.assisted.AssistedFactory
import dagger.assisted.AssistedInject
import io.eventhub.consumer.domain.model.CheckoutLineItem
import io.eventhub.consumer.domain.model.CheckoutSession
import io.eventhub.consumer.domain.model.Event
import io.eventhub.consumer.domain.model.TicketType
import io.eventhub.consumer.domain.repository.PaymentIntent
import io.eventhub.consumer.domain.usecase.CreateCheckoutSessionUseCase
import io.eventhub.consumer.domain.usecase.GetEventDetailUseCase
import io.eventhub.consumer.domain.usecase.InitiatePaymentUseCase
import io.eventhub.consumer.ui.navigation.CheckoutRoute
import io.eventhub.consumer.ui.navigation.TicketsRoute
import kotlinx.coroutines.launch

data class CheckoutState(
    val event: Event? = null,
    val quantities: Map<String, Int> = emptyMap(),
    val promoCode: String = "",
    val isApplyingPromo: Boolean = false,
    val promoError: String? = null,
    val session: CheckoutSession? = null,
    val paymentIntent: PaymentIntent? = null,
    val isLoading: Boolean = true,
    val isSubmitting: Boolean = false,
    val isWaitingRoomOpen: Boolean = false,
    val isQueueAdmitted: Boolean = false,
    val error: String? = null,
    val eventSink: (CheckoutEvent) -> Unit = {}
) : CircuitUiState

sealed interface CheckoutEvent : CircuitUiEvent {
    data object BackClicked : CheckoutEvent
    data class QuantityChanged(val ticketTypeId: String, val quantity: Int) : CheckoutEvent
    data class PromoCodeChanged(val code: String) : CheckoutEvent
    data object ApplyPromoClicked : CheckoutEvent
    data object ProceedToPayClicked : CheckoutEvent
    data object WaitingRoomAdmitted : CheckoutEvent
    data object DismissWaitingRoom : CheckoutEvent
    data object PaymentSuccess : CheckoutEvent
    data class PaymentFailed(val message: String) : CheckoutEvent
    data object PaymentDismissed : CheckoutEvent
}

class CheckoutPresenter @AssistedInject constructor(
    @Assisted private val screen: CheckoutRoute,
    @Assisted private val navigator: Navigator,
    private val getEventDetail: GetEventDetailUseCase,
    private val createCheckoutSession: CreateCheckoutSessionUseCase,
    private val initiatePayment: InitiatePaymentUseCase,
) : Presenter<CheckoutState> {

    @Composable
    override fun present(): CheckoutState {
        var event by remember { mutableStateOf<Event?>(null) }
        var quantities by remember { mutableStateOf<Map<String, Int>>(emptyMap()) }
        var promoCode by remember { mutableStateOf("") }
        var isApplyingPromo by remember { mutableStateOf(false) }
        var promoError by remember { mutableStateOf<String?>(null) }
        var session by remember { mutableStateOf<CheckoutSession?>(null) }
        var paymentIntent by remember { mutableStateOf<PaymentIntent?>(null) }
        var isLoading by remember { mutableStateOf(true) }
        var isWaitingRoomOpen by remember { mutableStateOf(false) }
        var isQueueAdmitted by remember { mutableStateOf(false) }
        var isSubmitting by remember { mutableStateOf(false) }
        var error by remember { mutableStateOf<String?>(null) }
        val scope = rememberCoroutineScope()

        fun executePayment() {
            scope.launch {
                isSubmitting = true
                error = null
                try {
                    val items = quantities.filter { it.value > 0 }.map { (typeId, qty) ->
                        val tier = event?.ticketTypes?.find { it.id == typeId }
                        CheckoutLineItem(
                            ticketTypeId = typeId,
                            ticketTypeName = tier?.name ?: "Ticket",
                            quantity = qty,
                            unitPrice = tier?.price ?: 0,
                            lineTotal = (tier?.price ?: 0) * qty
                        )
                    }
                    if (items.isEmpty()) {
                        error = "Please select at least 1 ticket."
                        return@launch
                    }
                    val createdSession = createCheckoutSession(
                        eventId = screen.eventId,
                        items = items,
                        promoCode = promoCode.ifBlank { null }
                    )
                    session = createdSession
                    val intent = initiatePayment(createdSession.id)
                    paymentIntent = intent
                } catch (e: Exception) {
                    error = "Checkout error: ${e.localizedMessage ?: "Could not create payment order"}"
                } finally {
                    isSubmitting = false
                }
            }
        }

        LaunchedEffect(screen.eventId) {
            isLoading = true
            try {
                val loadedEvent = getEventDetail(screen.eventId)
                event = loadedEvent
                // Default first available tier to 1 ticket if available
                val firstTier = loadedEvent.ticketTypes.firstOrNull { it.isOnSale }
                if (firstTier != null) {
                    quantities = mapOf(firstTier.id to 1)
                }
            } catch (e: Exception) {
                error = "Could not load event for checkout: ${e.localizedMessage ?: "Unknown error"}"
            } finally {
                isLoading = false
            }
        }

        return CheckoutState(
            event = event,
            quantities = quantities,
            promoCode = promoCode,
            isApplyingPromo = isApplyingPromo,
            promoError = promoError,
            session = session,
            paymentIntent = paymentIntent,
            isLoading = isLoading,
            isSubmitting = isSubmitting,
            isWaitingRoomOpen = isWaitingRoomOpen,
            isQueueAdmitted = isQueueAdmitted,
            error = error,
        ) { uiEvent ->
            when (uiEvent) {
                is CheckoutEvent.BackClicked -> navigator.pop()
                is CheckoutEvent.QuantityChanged -> {
                    quantities = if (uiEvent.quantity <= 0) {
                        quantities - uiEvent.ticketTypeId
                    } else {
                        quantities + (uiEvent.ticketTypeId to uiEvent.quantity)
                    }
                }
                is CheckoutEvent.PromoCodeChanged -> {
                    promoCode = uiEvent.code
                    promoError = null
                }
                is CheckoutEvent.ApplyPromoClicked -> {
                    val code = promoCode.trim().uppercase()
                    if (code.isBlank()) {
                        promoError = "Please enter a promo code"
                    } else if (code in listOf("PULSR10", "EARLYBIRD", "FESTIVAL20", "VIP15")) {
                        promoError = null
                    } else {
                        promoError = "Invalid or expired promo code"
                    }
                }
                is CheckoutEvent.ProceedToPayClicked -> {
                    val isHighDemand = event?.let {
                        (it.totalCapacity ?: 0) >= 5000 ||
                            it.name.contains("indometal", ignoreCase = true) ||
                            it.name.contains("coldplay", ignoreCase = true)
                    } ?: false

                    if (isHighDemand && !isQueueAdmitted) {
                        isWaitingRoomOpen = true
                    } else {
                        executePayment()
                    }
                }
                is CheckoutEvent.WaitingRoomAdmitted -> {
                    isQueueAdmitted = true
                    isWaitingRoomOpen = false
                    executePayment()
                }
                is CheckoutEvent.DismissWaitingRoom -> {
                    isWaitingRoomOpen = false
                }
                is CheckoutEvent.PaymentSuccess -> {
                    paymentIntent = null
                    navigator.resetRoot(TicketsRoute)
                }
                is CheckoutEvent.PaymentFailed -> {
                    paymentIntent = null
                    error = "Payment failed: ${uiEvent.message}"
                }
                is CheckoutEvent.PaymentDismissed -> {
                    paymentIntent = null
                }
            }
        }
    }

    @AssistedFactory
    fun interface Factory {
        fun create(screen: CheckoutRoute, navigator: Navigator): CheckoutPresenter
    }
}
