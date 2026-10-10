package io.eventhub.scanner.ui.feature.auth

import androidx.compose.runtime.*
import com.slack.circuit.runtime.CircuitUiEvent
import com.slack.circuit.runtime.CircuitUiState
import com.slack.circuit.runtime.Navigator
import com.slack.circuit.runtime.presenter.Presenter
import dagger.assisted.Assisted
import dagger.assisted.AssistedFactory
import dagger.assisted.AssistedInject
import io.eventhub.scanner.ui.navigation.EventSelectRoute
import io.eventhub.scanner.ui.navigation.LoginRoute
import io.github.jan.supabase.auth.Auth
import io.github.jan.supabase.auth.providers.builtin.Email
import kotlinx.coroutines.launch

data class ScannerLoginState(
    val email: String = "",
    val pinOrPass: String = "",
    val isLoading: Boolean = false,
    val error: String? = null,
    val eventSink: (ScannerLoginEvent) -> Unit = {}
) : CircuitUiState

sealed interface ScannerLoginEvent : CircuitUiEvent {
    data class EmailChanged(val email: String) : ScannerLoginEvent
    data class PinChanged(val pin: String) : ScannerLoginEvent
    data object Submit : ScannerLoginEvent
    data object SkipToDemo : ScannerLoginEvent
}

class ScannerLoginPresenter @AssistedInject constructor(
    @Assisted private val screen: LoginRoute,
    @Assisted private val navigator: Navigator,
    private val auth: Auth,
) : Presenter<ScannerLoginState> {

    @Composable
    override fun present(): ScannerLoginState {
        var email by remember { mutableStateOf("") }
        var pinOrPass by remember { mutableStateOf("") }
        var isLoading by remember { mutableStateOf(false) }
        var error by remember { mutableStateOf<String?>(null) }
        val scope = rememberCoroutineScope()

        // Check if already authenticated
        LaunchedEffect(Unit) {
            if (auth.currentSessionOrNull() != null) {
                navigator.resetRoot(EventSelectRoute)
            }
        }

        return ScannerLoginState(
            email = email,
            pinOrPass = pinOrPass,
            isLoading = isLoading,
            error = error,
        ) { uiEvent ->
            when (uiEvent) {
                is ScannerLoginEvent.EmailChanged -> email = uiEvent.email
                is ScannerLoginEvent.PinChanged -> pinOrPass = uiEvent.pin
                is ScannerLoginEvent.SkipToDemo -> {
                    navigator.resetRoot(EventSelectRoute)
                }
                is ScannerLoginEvent.Submit -> {
                    if (email.isBlank() || pinOrPass.isBlank()) {
                        error = "Enter scanner staff email and password"
                        return@ScannerLoginState
                    }
                    scope.launch {
                        isLoading = true
                        error = null
                        try {
                            auth.signInWith(Email) {
                                this.email = email.trim()
                                this.password = pinOrPass
                            }
                            navigator.resetRoot(EventSelectRoute)
                        } catch (e: Exception) {
                            error = "Sign in failed: ${e.localizedMessage ?: "Invalid credentials"}"
                        } finally {
                            isLoading = false
                        }
                    }
                }
            }
        }
    }

    @AssistedFactory
    fun interface Factory {
        fun create(screen: LoginRoute, navigator: Navigator): ScannerLoginPresenter
    }
}
