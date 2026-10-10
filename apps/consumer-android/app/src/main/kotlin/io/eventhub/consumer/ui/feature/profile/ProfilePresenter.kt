package io.eventhub.consumer.ui.feature.profile

import androidx.compose.runtime.*
import com.slack.circuit.runtime.CircuitUiEvent
import com.slack.circuit.runtime.CircuitUiState
import com.slack.circuit.runtime.Navigator
import com.slack.circuit.runtime.presenter.Presenter
import dagger.assisted.Assisted
import dagger.assisted.AssistedFactory
import dagger.assisted.AssistedInject
import io.eventhub.consumer.domain.model.User
import io.eventhub.consumer.domain.repository.AuthRepository
import io.eventhub.consumer.domain.usecase.GetUserProfileUseCase
import io.eventhub.consumer.ui.navigation.LoginRoute
import io.eventhub.consumer.ui.navigation.NotificationsRoute
import io.eventhub.consumer.ui.navigation.ProfileRoute
import io.eventhub.consumer.ui.navigation.SavedRoute
import io.eventhub.consumer.ui.navigation.TicketsRoute
import kotlinx.coroutines.launch

data class ProfileState(
    val user: User? = null,
    val isLoading: Boolean = true,
    val error: String? = null,
    val eventSink: (ProfileEvent) -> Unit = {}
) : CircuitUiState

sealed interface ProfileEvent : CircuitUiEvent {
    data object MyTicketsClicked : ProfileEvent
    data object SavedEventsClicked : ProfileEvent
    data object NotificationsClicked : ProfileEvent
    data object LogoutClicked : ProfileEvent
    data object BackClicked : ProfileEvent
    data object RetryClicked : ProfileEvent
}

class ProfilePresenter @AssistedInject constructor(
    @Assisted private val screen: ProfileRoute,
    @Assisted private val navigator: Navigator,
    private val getUserProfile: GetUserProfileUseCase,
    private val authRepository: AuthRepository,
) : Presenter<ProfileState> {

    @Composable
    override fun present(): ProfileState {
        var user by remember { mutableStateOf<User?>(null) }
        var isLoading by remember { mutableStateOf(true) }
        var error by remember { mutableStateOf<String?>(null) }
        val scope = rememberCoroutineScope()

        fun load() {
            scope.launch {
                isLoading = true
                error = null
                try {
                    user = getUserProfile()
                } catch (e: Exception) {
                    error = "Failed to load profile."
                } finally {
                    isLoading = false
                }
            }
        }

        LaunchedEffect(Unit) { load() }

        return ProfileState(
            user = user,
            isLoading = isLoading,
            error = error,
        ) { uiEvent ->
            when (uiEvent) {
                is ProfileEvent.MyTicketsClicked -> navigator.goTo(TicketsRoute)
                is ProfileEvent.SavedEventsClicked -> navigator.goTo(SavedRoute)
                is ProfileEvent.NotificationsClicked -> navigator.goTo(NotificationsRoute)
                is ProfileEvent.LogoutClicked -> {
                    scope.launch {
                        authRepository.signOut()
                        navigator.resetRoot(LoginRoute)
                    }
                }
                is ProfileEvent.BackClicked -> navigator.pop()
                is ProfileEvent.RetryClicked -> load()
            }
        }
    }

    @AssistedFactory
    fun interface Factory {
        fun create(screen: ProfileRoute, navigator: Navigator): ProfilePresenter
    }
}
