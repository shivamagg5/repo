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
import io.eventhub.consumer.domain.usecase.GetTicketsUseCase
import io.eventhub.consumer.ui.navigation.HomeRoute
import io.eventhub.consumer.ui.navigation.TicketDetailRoute
import io.eventhub.consumer.ui.navigation.TicketsRoute
import kotlinx.coroutines.launch

data class TicketsState(
    val tickets: List<Ticket> = emptyList(),
    val selectedTab: Int = 0, // 0 = Upcoming, 1 = Past
    val isLoading: Boolean = true,
    val error: String? = null,
    val eventSink: (TicketsEvent) -> Unit = {}
) : CircuitUiState

sealed interface TicketsEvent : CircuitUiEvent {
    data class TabSelected(val index: Int) : TicketsEvent
    data class TicketClicked(val ticketId: String) : TicketsEvent
    data object ExploreEventsClicked : TicketsEvent
    data object RetryClicked : TicketsEvent
}

class TicketsPresenter @AssistedInject constructor(
    @Assisted private val screen: TicketsRoute,
    @Assisted private val navigator: Navigator,
    private val getTickets: GetTicketsUseCase,
) : Presenter<TicketsState> {

    @Composable
    override fun present(): TicketsState {
        var tickets by remember { mutableStateOf<List<Ticket>>(emptyList()) }
        var selectedTab by remember { mutableStateOf(0) }
        var isLoading by remember { mutableStateOf(true) }
        var error by remember { mutableStateOf<String?>(null) }
        val scope = rememberCoroutineScope()

        fun load() {
            scope.launch {
                isLoading = true
                error = null
                try {
                    tickets = getTickets()
                } catch (e: Exception) {
                    error = "Failed to load tickets: ${e.localizedMessage ?: "Unknown error"}"
                } finally {
                    isLoading = false
                }
            }
        }

        LaunchedEffect(Unit) { load() }

        return TicketsState(
            tickets = tickets,
            selectedTab = selectedTab,
            isLoading = isLoading,
            error = error,
        ) { uiEvent ->
            when (uiEvent) {
                is TicketsEvent.TabSelected -> selectedTab = uiEvent.index
                is TicketsEvent.TicketClicked -> navigator.goTo(TicketDetailRoute(uiEvent.ticketId))
                is TicketsEvent.ExploreEventsClicked -> navigator.resetRoot(HomeRoute)
                is TicketsEvent.RetryClicked -> load()
            }
        }
    }

    @AssistedFactory
    fun interface Factory {
        fun create(screen: TicketsRoute, navigator: Navigator): TicketsPresenter
    }
}
