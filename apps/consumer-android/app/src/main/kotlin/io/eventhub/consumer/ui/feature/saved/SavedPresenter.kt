package io.eventhub.consumer.ui.feature.saved

import androidx.compose.runtime.*
import com.slack.circuit.runtime.CircuitUiEvent
import com.slack.circuit.runtime.CircuitUiState
import com.slack.circuit.runtime.Navigator
import com.slack.circuit.runtime.presenter.Presenter
import dagger.assisted.Assisted
import dagger.assisted.AssistedFactory
import dagger.assisted.AssistedInject
import io.eventhub.consumer.domain.model.Event
import io.eventhub.consumer.domain.usecase.GetFavoritesUseCase
import io.eventhub.consumer.domain.usecase.ToggleFavoriteUseCase
import io.eventhub.consumer.ui.navigation.EventDetailRoute
import io.eventhub.consumer.ui.navigation.HomeRoute
import io.eventhub.consumer.ui.navigation.SavedRoute
import kotlinx.coroutines.launch

data class SavedState(
    val events: List<Event> = emptyList(),
    val isLoading: Boolean = true,
    val error: String? = null,
    val eventSink: (SavedEvent) -> Unit = {}
) : CircuitUiState

sealed interface SavedEvent : CircuitUiEvent {
    data class EventClicked(val eventId: String) : SavedEvent
    data class RemoveFavoriteClicked(val eventId: String) : SavedEvent
    data object ExploreClicked : SavedEvent
    data object BackClicked : SavedEvent
    data object RetryClicked : SavedEvent
}

class SavedPresenter @AssistedInject constructor(
    @Assisted private val screen: SavedRoute,
    @Assisted private val navigator: Navigator,
    private val getFavorites: GetFavoritesUseCase,
    private val toggleFavorite: ToggleFavoriteUseCase,
) : Presenter<SavedState> {

    @Composable
    override fun present(): SavedState {
        var events by remember { mutableStateOf<List<Event>>(emptyList()) }
        var isLoading by remember { mutableStateOf(true) }
        var error by remember { mutableStateOf<String?>(null) }
        val scope = rememberCoroutineScope()

        fun load() {
            scope.launch {
                isLoading = true
                error = null
                try {
                    events = getFavorites()
                } catch (e: Exception) {
                    error = "Failed to load saved events: ${e.localizedMessage ?: "Unknown error"}"
                } finally {
                    isLoading = false
                }
            }
        }

        LaunchedEffect(Unit) { load() }

        return SavedState(
            events = events,
            isLoading = isLoading,
            error = error,
        ) { uiEvent ->
            when (uiEvent) {
                is SavedEvent.EventClicked -> navigator.goTo(EventDetailRoute(uiEvent.eventId))
                is SavedEvent.RemoveFavoriteClicked -> {
                    val targetId = uiEvent.eventId
                    events = events.filter { it.id != targetId }
                    scope.launch {
                        try {
                            toggleFavorite(targetId, false)
                        } catch (_: Exception) {}
                    }
                }
                is SavedEvent.ExploreClicked -> navigator.resetRoot(HomeRoute)
                is SavedEvent.BackClicked -> navigator.pop()
                is SavedEvent.RetryClicked -> load()
            }
        }
    }

    @AssistedFactory
    fun interface Factory {
        fun create(screen: SavedRoute, navigator: Navigator): SavedPresenter
    }
}
