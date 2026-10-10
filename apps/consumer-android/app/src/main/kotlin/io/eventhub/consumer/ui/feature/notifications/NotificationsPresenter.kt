package io.eventhub.consumer.ui.feature.notifications

import androidx.compose.runtime.*
import com.slack.circuit.runtime.CircuitUiEvent
import com.slack.circuit.runtime.CircuitUiState
import com.slack.circuit.runtime.Navigator
import com.slack.circuit.runtime.presenter.Presenter
import dagger.assisted.Assisted
import dagger.assisted.AssistedFactory
import dagger.assisted.AssistedInject
import io.eventhub.consumer.domain.model.NotificationItem
import io.eventhub.consumer.domain.usecase.GetNotificationsUseCase
import io.eventhub.consumer.ui.navigation.NotificationsRoute
import kotlinx.coroutines.launch

data class NotificationsState(
    val notifications: List<NotificationItem> = emptyList(),
    val isLoading: Boolean = true,
    val error: String? = null,
    val eventSink: (NotificationsEvent) -> Unit = {}
) : CircuitUiState

sealed interface NotificationsEvent : CircuitUiEvent {
    data class NotificationClicked(val item: NotificationItem) : NotificationsEvent
    data object BackClicked : NotificationsEvent
    data object RetryClicked : NotificationsEvent
}

class NotificationsPresenter @AssistedInject constructor(
    @Assisted private val screen: NotificationsRoute,
    @Assisted private val navigator: Navigator,
    private val getNotifications: GetNotificationsUseCase,
) : Presenter<NotificationsState> {

    @Composable
    override fun present(): NotificationsState {
        var notifications by remember { mutableStateOf<List<NotificationItem>>(emptyList()) }
        var isLoading by remember { mutableStateOf(true) }
        var error by remember { mutableStateOf<String?>(null) }
        val scope = rememberCoroutineScope()

        fun load() {
            scope.launch {
                isLoading = true
                error = null
                try {
                    notifications = getNotifications()
                } catch (e: Exception) {
                    error = "Failed to load notifications: ${e.localizedMessage ?: "Unknown error"}"
                } finally {
                    isLoading = false
                }
            }
        }

        LaunchedEffect(Unit) { load() }

        return NotificationsState(
            notifications = notifications,
            isLoading = isLoading,
            error = error,
        ) { uiEvent ->
            when (uiEvent) {
                is NotificationsEvent.NotificationClicked -> {
                    // Mark as read or follow deep link if present
                }
                is NotificationsEvent.BackClicked -> navigator.pop()
                is NotificationsEvent.RetryClicked -> load()
            }
        }
    }

    @AssistedFactory
    fun interface Factory {
        fun create(screen: NotificationsRoute, navigator: Navigator): NotificationsPresenter
    }
}
