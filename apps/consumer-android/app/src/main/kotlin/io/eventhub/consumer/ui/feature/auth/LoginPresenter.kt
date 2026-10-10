package io.eventhub.consumer.ui.feature.auth

import androidx.compose.runtime.*
import com.slack.circuit.runtime.CircuitUiEvent
import com.slack.circuit.runtime.CircuitUiState
import com.slack.circuit.runtime.Navigator
import com.slack.circuit.runtime.presenter.Presenter
import dagger.assisted.Assisted
import dagger.assisted.AssistedFactory
import dagger.assisted.AssistedInject
import io.eventhub.consumer.domain.repository.AuthRepository
import io.eventhub.consumer.ui.navigation.HomeRoute
import io.eventhub.consumer.ui.navigation.LoginRoute
import kotlinx.coroutines.launch

data class LoginState(
    val email: String = "",
    val password: String = "",
    val isSignUp: Boolean = false,
    val name: String = "",
    val isLoading: Boolean = false,
    val error: String? = null,
    val eventSink: (LoginEvent) -> Unit = {}
) : CircuitUiState

sealed interface LoginEvent : CircuitUiEvent {
    data class EmailChanged(val email: String) : LoginEvent
    data class PasswordChanged(val password: String) : LoginEvent
    data class NameChanged(val name: String) : LoginEvent
    data object ToggleMode : LoginEvent
    data object Submit : LoginEvent
    data class GoogleSignInClicked(val idToken: String) : LoginEvent
    data object SkipClicked : LoginEvent
}

class LoginPresenter @AssistedInject constructor(
    @Assisted private val screen: LoginRoute,
    @Assisted private val navigator: Navigator,
    private val authRepository: AuthRepository,
) : Presenter<LoginState> {

    @Composable
    override fun present(): LoginState {
        var email by remember { mutableStateOf("") }
        var password by remember { mutableStateOf("") }
        var name by remember { mutableStateOf("") }
        var isSignUp by remember { mutableStateOf(false) }
        var isLoading by remember { mutableStateOf(false) }
        var error by remember { mutableStateOf<String?>(null) }
        val scope = rememberCoroutineScope()

        return LoginState(
            email = email,
            password = password,
            name = name,
            isSignUp = isSignUp,
            isLoading = isLoading,
            error = error,
        ) { uiEvent ->
            when (uiEvent) {
                is LoginEvent.EmailChanged -> email = uiEvent.email
                is LoginEvent.PasswordChanged -> password = uiEvent.password
                is LoginEvent.NameChanged -> name = uiEvent.name
                is LoginEvent.ToggleMode -> {
                    isSignUp = !isSignUp
                    error = null
                }
                is LoginEvent.Submit -> {
                    if (email.isBlank() || password.isBlank()) {
                        error = "Please fill in all required fields."
                        return@LoginState
                    }
                    scope.launch {
                        isLoading = true
                        error = null
                        try {
                            if (isSignUp) {
                                authRepository.signUpWithEmail(email, password, name.ifBlank { null })
                            } else {
                                authRepository.signInWithEmail(email, password)
                            }
                            navigator.resetRoot(HomeRoute)
                        } catch (e: Exception) {
                            error = "Authentication failed: ${e.localizedMessage ?: "Invalid credentials"}"
                        } finally {
                            isLoading = false
                        }
                    }
                }
                is LoginEvent.GoogleSignInClicked -> {
                    scope.launch {
                        isLoading = true
                        error = null
                        try {
                            authRepository.signInWithGoogle(uiEvent.idToken)
                            navigator.resetRoot(HomeRoute)
                        } catch (e: Exception) {
                            error = "Google Sign-In failed: ${e.localizedMessage}"
                        } finally {
                            isLoading = false
                        }
                    }
                }
                is LoginEvent.SkipClicked -> {
                    navigator.resetRoot(HomeRoute)
                }
            }
        }
    }

    @AssistedFactory
    fun interface Factory {
        fun create(screen: LoginRoute, navigator: Navigator): LoginPresenter
    }
}
