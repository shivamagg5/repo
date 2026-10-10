package io.eventhub.consumer.ui.feature.tickets

import androidx.compose.runtime.*
import com.slack.circuit.runtime.CircuitUiEvent
import com.slack.circuit.runtime.CircuitUiState
import com.slack.circuit.runtime.Navigator
import com.slack.circuit.runtime.presenter.Presenter
import dagger.assisted.Assisted
import dagger.assisted.AssistedFactory
import dagger.assisted.AssistedInject
import io.eventhub.consumer.domain.model.Ticket
import io.eventhub.consumer.domain.usecase.GetTicketDetailUseCase
import io.eventhub.consumer.ui.navigation.TicketDetailRoute
import kotlinx.coroutines.launch

data class TicketDetailState(
    val ticket: Ticket? = null,
    val qrToken: String? = null,
    val isLoading: Boolean = true,
    val isOfflineCached: Boolean = false,
    val error: String? = null,
    val isSavedSuccessToastVisible: Boolean = false,
    val isTorchBoostActive: Boolean = true,
    val eventSink: (TicketDetailEvent) -> Unit = {}
) : CircuitUiState

sealed interface TicketDetailEvent : CircuitUiEvent {
    data object BackClicked : TicketDetailEvent
    data object AddToCalendarClicked : TicketDetailEvent
    data object RetryClicked : TicketDetailEvent
    data object SaveOfflineClicked : TicketDetailEvent
    data object ToggleBrightnessBoostClicked : TicketDetailEvent
    data object DismissToast : TicketDetailEvent
}

class TicketDetailPresenter @AssistedInject constructor(
    @Assisted private val screen: TicketDetailRoute,
    @Assisted private val navigator: Navigator,
    private val getTicketDetail: GetTicketDetailUseCase,
) : Presenter<TicketDetailState> {

    @Composable
    override fun present(): TicketDetailState {
        var ticket by remember { mutableStateOf<Ticket?>(null) }
        var qrToken by remember { mutableStateOf<String?>(null) }
        var isLoading by remember { mutableStateOf(true) }
        var isOfflineCached by remember { mutableStateOf(false) }
        var error by remember { mutableStateOf<String?>(null) }
        var isSavedSuccessToastVisible by remember { mutableStateOf(false) }
        var isTorchBoostActive by remember { mutableStateOf(true) }
        val scope = rememberCoroutineScope()

        fun load() {
            scope.launch {
                isLoading = true
                error = null
                try {
                    val loaded = getTicketDetail(screen.ticketId)
                    val token = loaded.qrToken ?: getTicketDetail.getQrToken(screen.ticketId)
                    ticket = loaded
                    qrToken = token
                    isOfflineCached = loaded.isOfflineCached || getTicketDetail.isCachedOffline(screen.ticketId)
                    // Auto-secure pass in local vault for offline reliability
                    getTicketDetail.cacheForOffline(loaded, token)
                } catch (e: Exception) {
                    error = "Failed to load ticket barcode: ${e.localizedMessage ?: "Unknown error"}"
                } finally {
                    isLoading = false
                }
            }
        }

        LaunchedEffect(screen.ticketId) { load() }

        return TicketDetailState(
            ticket = ticket,
            qrToken = qrToken,
            isLoading = isLoading,
            isOfflineCached = isOfflineCached,
            error = error,
            isSavedSuccessToastVisible = isSavedSuccessToastVisible,
            isTorchBoostActive = isTorchBoostActive,
        ) { uiEvent ->
            when (uiEvent) {
                is TicketDetailEvent.BackClicked -> navigator.pop()
                is TicketDetailEvent.AddToCalendarClicked -> {
                    // Triggered in UI via calendar intent
                }
                is TicketDetailEvent.RetryClicked -> load()
                is TicketDetailEvent.SaveOfflineClicked -> {
                    ticket?.let { t ->
                        scope.launch {
                            getTicketDetail.cacheForOffline(t, qrToken)
                            isOfflineCached = true
                            isSavedSuccessToastVisible = true
                        }
                    }
                }
                is TicketDetailEvent.ToggleBrightnessBoostClicked -> {
                    isTorchBoostActive = !isTorchBoostActive
                }
                is TicketDetailEvent.DismissToast -> {
                    isSavedSuccessToastVisible = false
                }
            }
        }
    }

    @AssistedFactory
    fun interface Factory {
        fun create(screen: TicketDetailRoute, navigator: Navigator): TicketDetailPresenter
    }
}
