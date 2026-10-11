package io.eventhub.consumer.ui.feature.home

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import com.slack.circuit.runtime.CircuitUiEvent
import com.slack.circuit.runtime.CircuitUiState
import com.slack.circuit.runtime.Navigator
import com.slack.circuit.runtime.presenter.Presenter
import dagger.assisted.Assisted
import dagger.assisted.AssistedFactory
import dagger.assisted.AssistedInject
import io.eventhub.consumer.domain.model.Event
import io.eventhub.consumer.domain.usecase.GetFeaturedEventsUseCase
import io.eventhub.consumer.domain.usecase.GetTrendingEventsUseCase
import io.eventhub.consumer.domain.usecase.ToggleFavoriteUseCase
import io.eventhub.consumer.ui.navigation.DiscoverRoute
import io.eventhub.consumer.ui.navigation.EventDetailRoute
import io.eventhub.consumer.ui.navigation.HomeRoute
import io.eventhub.consumer.ui.navigation.NotificationsRoute
import io.eventhub.consumer.domain.repository.AuthRepository
import io.eventhub.consumer.ui.navigation.LoginRoute
import io.eventhub.consumer.ui.navigation.SearchRoute
import kotlinx.coroutines.launch

// ─── State ───────────────────────────────────────────────────────────────────

data class HomeState(
    val featuredEvents: List<Event> = emptyList(),
    val trendingEvents: List<Event> = emptyList(),
    val isLoading: Boolean = true,
    val isAuthenticated: Boolean = false,
    val error: String? = null,
    val eventSink: (HomeEvent) -> Unit = {},
) : CircuitUiState

// ─── Events ──────────────────────────────────────────────────────────────────

sealed interface HomeEvent : CircuitUiEvent {
    data class EventClicked(val eventId: String) : HomeEvent
    data class FavoriteToggled(val eventId: String, val isFavorited: Boolean) : HomeEvent
    data object SearchClicked : HomeEvent
    data object NotificationsClicked : HomeEvent
    data object SeeAllTrendingClicked : HomeEvent
    data object LoginClicked : HomeEvent
    data object RetryClicked : HomeEvent
}

// ─── Presenter ───────────────────────────────────────────────────────────────

class HomePresenter @AssistedInject constructor(
    @Assisted private val screen: HomeRoute,
    @Assisted private val navigator: Navigator,
    private val getFeaturedEvents: GetFeaturedEventsUseCase,
    private val getTrendingEvents: GetTrendingEventsUseCase,
    private val toggleFavorite: ToggleFavoriteUseCase,
    private val authRepository: AuthRepository,
) : Presenter<HomeState> {

    @Composable
    override fun present(): HomeState {
        var featured by remember { mutableStateOf<List<Event>>(emptyList()) }
        var trending by remember { mutableStateOf<List<Event>>(emptyList()) }
        var isLoading by remember { mutableStateOf(true) }
        var isAuthenticated by remember { mutableStateOf(false) }
        var error by remember { mutableStateOf<String?>(null) }
        val scope = rememberCoroutineScope()

        fun load() {
            scope.launch {
                isLoading = true
                error = null
                try {
                    isAuthenticated = authRepository.isAuthenticated()
                    featured = getFeaturedEvents()
                    trending = getTrendingEvents()
                } catch (e: Exception) {
                    error = "Could not load events. Tap to retry."
                } finally {
                    isLoading = false
                }
            }
        }

        LaunchedEffect(Unit) { load() }

        return HomeState(
            featuredEvents = featured,
            trendingEvents = trending,
            isLoading = isLoading,
            isAuthenticated = isAuthenticated,
            error = error,
        ) { event ->
            when (event) {
                is HomeEvent.EventClicked -> navigator.goTo(EventDetailRoute(event.eventId))
                is HomeEvent.FavoriteToggled -> {
                    featured = featured.map { if (it.id == event.eventId) it.copy(isFavorited = event.isFavorited) else it }
                    trending = trending.map { if (it.id == event.eventId) it.copy(isFavorited = event.isFavorited) else it }
                    scope.launch {
                        try {
                            toggleFavorite(event.eventId, event.isFavorited)
                        } catch (_: Exception) {
                            featured = featured.map { if (it.id == event.eventId) it.copy(isFavorited = !event.isFavorited) else it }
                            trending = trending.map { if (it.id == event.eventId) it.copy(isFavorited = !event.isFavorited) else it }
                        }
                    }
                }
                is HomeEvent.SearchClicked -> navigator.goTo(SearchRoute)
                is HomeEvent.NotificationsClicked -> navigator.goTo(NotificationsRoute)
                is HomeEvent.SeeAllTrendingClicked -> navigator.goTo(DiscoverRoute)
                is HomeEvent.LoginClicked -> navigator.goTo(LoginRoute)
                is HomeEvent.RetryClicked -> load()
            }
        }
    }

    @AssistedFactory
    fun interface Factory {
        fun create(screen: HomeRoute, navigator: Navigator): HomePresenter
    }
}
