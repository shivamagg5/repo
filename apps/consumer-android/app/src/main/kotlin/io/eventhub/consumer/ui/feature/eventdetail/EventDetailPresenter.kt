package io.eventhub.consumer.ui.feature.eventdetail

import androidx.compose.runtime.*
import com.slack.circuit.runtime.CircuitUiEvent
import com.slack.circuit.runtime.CircuitUiState
import com.slack.circuit.runtime.Navigator
import com.slack.circuit.runtime.presenter.Presenter
import dagger.assisted.Assisted
import dagger.assisted.AssistedFactory
import dagger.assisted.AssistedInject
import io.eventhub.consumer.domain.model.Event
import io.eventhub.consumer.domain.usecase.GetEventDetailUseCase
import io.eventhub.consumer.domain.usecase.ToggleFavoriteUseCase
import io.eventhub.consumer.ui.navigation.CheckoutRoute
import io.eventhub.consumer.ui.navigation.EventDetailRoute
import kotlinx.coroutines.launch

data class EventDetailState(
    val event: Event? = null,
    val isLoading: Boolean = true,
    val error: String? = null,
    val isFavorited: Boolean = false,
    val eventSink: (EventDetailEvent) -> Unit = {}
) : CircuitUiState

sealed interface EventDetailEvent : CircuitUiEvent {
    data object BackClicked : EventDetailEvent
    data object FavoriteClicked : EventDetailEvent
    data object ShareClicked : EventDetailEvent
    data object BookTicketsClicked : EventDetailEvent
    data object RetryClicked : EventDetailEvent
}

class EventDetailPresenter @AssistedInject constructor(
    @Assisted private val screen: EventDetailRoute,
    @Assisted private val navigator: Navigator,
    private val getEventDetail: GetEventDetailUseCase,
    private val toggleFavorite: ToggleFavoriteUseCase,
) : Presenter<EventDetailState> {

    @Composable
    override fun present(): EventDetailState {
        var event by remember { mutableStateOf<Event?>(null) }
        var isLoading by remember { mutableStateOf(true) }
        var error by remember { mutableStateOf<String?>(null) }
        var isFavorited by remember { mutableStateOf(false) }
        val scope = rememberCoroutineScope()

        fun load() {
            scope.launch {
                isLoading = true
                error = null
                try {
                    val loaded = getEventDetail(screen.eventId)
                    event = loaded
                    isFavorited = loaded.isFavorited
                } catch (e: Exception) {
                    error = "Failed to load event details: ${e.localizedMessage ?: "Unknown error"}"
                } finally {
                    isLoading = false
                }
            }
        }

        LaunchedEffect(screen.eventId) { load() }

        return EventDetailState(
            event = event,
            isLoading = isLoading,
            error = error,
            isFavorited = isFavorited,
        ) { uiEvent ->
            when (uiEvent) {
                is EventDetailEvent.BackClicked -> navigator.pop()
                is EventDetailEvent.FavoriteClicked -> {
                    val current = isFavorited
                    isFavorited = !current
                    scope.launch {
                        try {
                            toggleFavorite(screen.eventId, !current)
                        } catch (e: Exception) {
                            isFavorited = current // Revert on failure
                        }
                    }
                }
                is EventDetailEvent.ShareClicked -> {
                    // Handled in UI layer via Intent
                }
                is EventDetailEvent.BookTicketsClicked -> {
                    navigator.goTo(CheckoutRoute(screen.eventId))
                }
                is EventDetailEvent.RetryClicked -> load()
            }
        }
    }

    @AssistedFactory
    fun interface Factory {
        fun create(screen: EventDetailRoute, navigator: Navigator): EventDetailPresenter
    }
}
