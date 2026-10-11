package io.eventhub.consumer.ui.feature.auth

import androidx.compose.runtime.*
import com.slack.circuit.runtime.CircuitUiEvent
import com.slack.circuit.runtime.CircuitUiState
import com.slack.circuit.runtime.Navigator
import com.slack.circuit.runtime.presenter.Presenter
import dagger.assisted.Assisted
import dagger.assisted.AssistedFactory
import dagger.assisted.AssistedInject
import io.eventhub.consumer.data.remote.dto.SignupRequestDto
import io.eventhub.consumer.domain.repository.AuthRepository
import io.eventhub.consumer.ui.navigation.HomeRoute
import io.eventhub.consumer.ui.navigation.LoginRoute
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

enum class AuthMode {
    SIGN_IN,
    SIGN_UP_STEP_1_CONTACT,
    SIGN_UP_STEP_2_OTP,
    SIGN_UP_STEP_3_DETAILS,
    SIGN_UP_SUCCESS,
    FORGOT_PASSWORD_STEP_1_IDENTIFIER,
    FORGOT_PASSWORD_STEP_2_OTP,
    FORGOT_PASSWORD_STEP_3_PASSWORD,
    FORGOT_PASSWORD_SUCCESS,
}

data class LoginState(
    val authMode: AuthMode = AuthMode.SIGN_IN,
    // Sign In fields
    val signInIdentifier: String = "",
    val signInPassword: String = "",
    // Sign Up fields
    val signUpCountryCode: String = "+91",
    val signUpPhone: String = "",
    val signUpEmail: String = "",
    val signUpOtp: String = "",
    val signUpVerificationToken: String = "",
    val signUpOtpCooldown: Int = 0,
    val signUpName: String = "",
    val signUpDob: String = "",
    val signUpPassword: String = "",
    val signUpConfirmPassword: String = "",
    val signUpWhatsappConsent: Boolean = false,
    val signUpTermsAccepted: Boolean = false,
    // Forgot Password fields
    val forgotIdentifier: String = "",
    val forgotOtp: String = "",
    val forgotResetToken: String = "",
    val forgotOtpCooldown: Int = 0,
    val forgotNewPassword: String = "",
    val forgotConfirmPassword: String = "",
    // Common state
    val isLoading: Boolean = false,
    val error: String? = null,
    val successMessage: String? = null,
    // Backward compatibility helper
    val isSignUp: Boolean = authMode == AuthMode.SIGN_UP_STEP_1_CONTACT ||
            authMode == AuthMode.SIGN_UP_STEP_2_OTP ||
            authMode == AuthMode.SIGN_UP_STEP_3_DETAILS ||
            authMode == AuthMode.SIGN_UP_SUCCESS,
    val eventSink: (LoginEvent) -> Unit = {}
) : CircuitUiState

sealed interface LoginEvent : CircuitUiEvent {
    // Mode navigation
    data class SwitchMode(val mode: AuthMode) : LoginEvent
    data object ToggleMode : LoginEvent

    // Sign In events
    data class SignInIdentifierChanged(val identifier: String) : LoginEvent
    data class SignInPasswordChanged(val password: String) : LoginEvent
    data object SignInSubmitted : LoginEvent

    // Sign Up events
    data class SignUpCountryCodeChanged(val code: String) : LoginEvent
    data class SignUpPhoneChanged(val phone: String) : LoginEvent
    data class SignUpEmailChanged(val email: String) : LoginEvent
    data object SignUpContactSubmitted : LoginEvent

    data class SignUpOtpChanged(val otp: String) : LoginEvent
    data object SignUpOtpSubmitted : LoginEvent
    data object SignUpOtpResendClicked : LoginEvent

    data class SignUpNameChanged(val name: String) : LoginEvent
    data class SignUpDobChanged(val dob: String) : LoginEvent
    data class SignUpPasswordChanged(val password: String) : LoginEvent
    data class SignUpConfirmPasswordChanged(val password: String) : LoginEvent
    data class SignUpWhatsappConsentChanged(val consent: Boolean) : LoginEvent
    data class SignUpTermsAcceptedChanged(val accepted: Boolean) : LoginEvent
    data object SignUpDetailsSubmitted : LoginEvent

    // Forgot Password events
    data class ForgotIdentifierChanged(val identifier: String) : LoginEvent
    data object ForgotIdentifierSubmitted : LoginEvent
    data class ForgotOtpChanged(val otp: String) : LoginEvent
    data object ForgotOtpSubmitted : LoginEvent
    data object ForgotOtpResendClicked : LoginEvent
    data class ForgotNewPasswordChanged(val password: String) : LoginEvent
    data class ForgotConfirmPasswordChanged(val password: String) : LoginEvent
    data object ForgotResetSubmitted : LoginEvent

    // Common events
    data object DismissError : LoginEvent
    data class GoogleSignInClicked(val idToken: String) : LoginEvent
    data object SkipClicked : LoginEvent

    // Backward compatibility events
    data class EmailChanged(val email: String) : LoginEvent
    data class PasswordChanged(val password: String) : LoginEvent
    data class NameChanged(val name: String) : LoginEvent
    data object Submit : LoginEvent
}

class LoginPresenter @AssistedInject constructor(
    @Assisted private val screen: LoginRoute,
    @Assisted private val navigator: Navigator,
    private val authRepository: AuthRepository,
) : Presenter<LoginState> {

    @Composable
    override fun present(): LoginState {
        var authMode by remember { mutableStateOf(AuthMode.SIGN_IN) }

        // Sign In
        var signInIdentifier by remember { mutableStateOf("") }
        var signInPassword by remember { mutableStateOf("") }

        // Sign Up
        var signUpCountryCode by remember { mutableStateOf("+91") }
        var signUpPhone by remember { mutableStateOf("") }
        var signUpEmail by remember { mutableStateOf("") }
        var signUpOtp by remember { mutableStateOf("") }
        var signUpVerificationToken by remember { mutableStateOf("") }
        var signUpOtpCooldown by remember { mutableIntStateOf(0) }
        var signUpName by remember { mutableStateOf("") }
        var signUpDob by remember { mutableStateOf("") }
        var signUpPassword by remember { mutableStateOf("") }
        var signUpConfirmPassword by remember { mutableStateOf("") }
        var signUpWhatsappConsent by remember { mutableStateOf(false) }
        var signUpTermsAccepted by remember { mutableStateOf(false) }

        // Forgot Password
        var forgotIdentifier by remember { mutableStateOf("") }
        var forgotOtp by remember { mutableStateOf("") }
        var forgotResetToken by remember { mutableStateOf("") }
        var forgotOtpCooldown by remember { mutableIntStateOf(0) }
        var forgotNewPassword by remember { mutableStateOf("") }
        var forgotConfirmPassword by remember { mutableStateOf("") }

        // Common
        var isLoading by remember { mutableStateOf(false) }
        var error by remember { mutableStateOf<String?>(null) }
        var successMessage by remember { mutableStateOf<String?>(null) }

        val scope = rememberCoroutineScope()

        // Countdown timers
        LaunchedEffect(signUpOtpCooldown) {
            if (signUpOtpCooldown > 0) {
                delay(1000)
                signUpOtpCooldown -= 1
            }
        }
        LaunchedEffect(forgotOtpCooldown) {
            if (forgotOtpCooldown > 0) {
                delay(1000)
                forgotOtpCooldown -= 1
            }
        }

        fun normalizePhone(code: String, rawPhone: String): String {
            val digits = rawPhone.filter { it.isDigit() }
            return if (rawPhone.startsWith("+")) rawPhone.trim()
            else "$code$digits"
        }

        return LoginState(
            authMode = authMode,
            signInIdentifier = signInIdentifier,
            signInPassword = signInPassword,
            signUpCountryCode = signUpCountryCode,
            signUpPhone = signUpPhone,
            signUpEmail = signUpEmail,
            signUpOtp = signUpOtp,
            signUpVerificationToken = signUpVerificationToken,
            signUpOtpCooldown = signUpOtpCooldown,
            signUpName = signUpName,
            signUpDob = signUpDob,
            signUpPassword = signUpPassword,
            signUpConfirmPassword = signUpConfirmPassword,
            signUpWhatsappConsent = signUpWhatsappConsent,
            signUpTermsAccepted = signUpTermsAccepted,
            forgotIdentifier = forgotIdentifier,
            forgotOtp = forgotOtp,
            forgotResetToken = forgotResetToken,
            forgotOtpCooldown = forgotOtpCooldown,
            forgotNewPassword = forgotNewPassword,
            forgotConfirmPassword = forgotConfirmPassword,
            isLoading = isLoading,
            error = error,
            successMessage = successMessage,
        ) { uiEvent ->
            when (uiEvent) {
                is LoginEvent.SwitchMode -> {
                    authMode = uiEvent.mode
                    error = null
                    successMessage = null
                }
                is LoginEvent.ToggleMode -> {
                    authMode = if (authMode == AuthMode.SIGN_IN) AuthMode.SIGN_UP_STEP_1_CONTACT else AuthMode.SIGN_IN
                    error = null
                    successMessage = null
                }

                // ─── Sign In Handlers ───
                is LoginEvent.SignInIdentifierChanged -> signInIdentifier = uiEvent.identifier
                is LoginEvent.SignInPasswordChanged -> signInPassword = uiEvent.password
                is LoginEvent.SignInSubmitted -> {
                    if (signInIdentifier.isBlank() || signInPassword.isBlank()) {
                        error = "Please enter both your email/phone and password."
                        return@LoginState
                    }
                    scope.launch {
                        isLoading = true
                        error = null
                        try {
                            authRepository.signInWithIdentifier(signInIdentifier.trim(), signInPassword)
                            navigator.resetRoot(HomeRoute)
                        } catch (e: Exception) {
                            error = e.localizedMessage ?: "Invalid credentials. Please check your details."
                        } finally {
                            isLoading = false
                        }
                    }
                }

                // ─── Sign Up Step 1 Handlers ───
                is LoginEvent.SignUpCountryCodeChanged -> signUpCountryCode = uiEvent.code
                is LoginEvent.SignUpPhoneChanged -> signUpPhone = uiEvent.phone
                is LoginEvent.SignUpEmailChanged -> signUpEmail = uiEvent.email
                is LoginEvent.SignUpContactSubmitted -> {
                    val fullPhone = normalizePhone(signUpCountryCode, signUpPhone)
                    if (signUpPhone.isBlank() || signUpEmail.isBlank()) {
                        error = "Please enter both mobile number and email."
                        return@LoginState
                    }
                    if (!signUpEmail.contains("@") || !signUpEmail.contains(".")) {
                        error = "Please enter a valid email address."
                        return@LoginState
                    }
                    scope.launch {
                        isLoading = true
                        error = null
                        try {
                            val res = authRepository.sendOtp(fullPhone, "SIGNUP")
                            signUpOtpCooldown = if (res.cooldownSeconds > 0) res.cooldownSeconds else 60
                            authMode = AuthMode.SIGN_UP_STEP_2_OTP
                            successMessage = res.message.ifBlank { "OTP sent to $fullPhone" }
                        } catch (e: Exception) {
                            error = e.localizedMessage ?: "Failed to send mobile OTP. Please try again."
                        } finally {
                            isLoading = false
                        }
                    }
                }

                // ─── Sign Up Step 2 Handlers (OTP) ───
                is LoginEvent.SignUpOtpChanged -> signUpOtp = uiEvent.otp
                is LoginEvent.SignUpOtpSubmitted -> {
                    val cleanOtp = signUpOtp.filter { it.isDigit() }
                    if (cleanOtp.length != 6) {
                        error = "Please enter the complete 6-digit OTP."
                        return@LoginState
                    }
                    val fullPhone = normalizePhone(signUpCountryCode, signUpPhone)
                    scope.launch {
                        isLoading = true
                        error = null
                        try {
                            val res = authRepository.verifyOtp(fullPhone, cleanOtp, "SIGNUP")
                            signUpVerificationToken = res.verificationToken
                            authMode = AuthMode.SIGN_UP_STEP_3_DETAILS
                            successMessage = "Phone verified! Complete your profile."
                        } catch (e: Exception) {
                            error = e.localizedMessage ?: "Invalid or expired OTP. Please try again."
                        } finally {
                            isLoading = false
                        }
                    }
                }
                is LoginEvent.SignUpOtpResendClicked -> {
                    if (signUpOtpCooldown > 0) return@LoginState
                    val fullPhone = normalizePhone(signUpCountryCode, signUpPhone)
                    scope.launch {
                        isLoading = true
                        error = null
                        try {
                            val res = authRepository.sendOtp(fullPhone, "SIGNUP")
                            signUpOtpCooldown = if (res.cooldownSeconds > 0) res.cooldownSeconds else 60
                            successMessage = "New OTP sent successfully."
                        } catch (e: Exception) {
                            error = e.localizedMessage ?: "Failed to resend OTP."
                        } finally {
                            isLoading = false
                        }
                    }
                }

                // ─── Sign Up Step 3 Handlers (Details & Consent) ───
                is LoginEvent.SignUpNameChanged -> signUpName = uiEvent.name
                is LoginEvent.SignUpDobChanged -> signUpDob = uiEvent.dob
                is LoginEvent.SignUpPasswordChanged -> signUpPassword = uiEvent.password
                is LoginEvent.SignUpConfirmPasswordChanged -> signUpConfirmPassword = uiEvent.password
                is LoginEvent.SignUpWhatsappConsentChanged -> signUpWhatsappConsent = uiEvent.consent
                is LoginEvent.SignUpTermsAcceptedChanged -> signUpTermsAccepted = uiEvent.accepted
                is LoginEvent.SignUpDetailsSubmitted -> {
                    if (signUpName.isBlank()) {
                        error = "Please enter your full name."
                        return@LoginState
                    }
                    if (signUpDob.isBlank()) {
                        error = "Please enter your date of birth (YYYY-MM-DD)."
                        return@LoginState
                    }
                    if (signUpPassword.length < 8) {
                        error = "Password must be at least 8 characters long."
                        return@LoginState
                    }
                    if (signUpPassword != signUpConfirmPassword) {
                        error = "Passwords do not match."
                        return@LoginState
                    }
                    if (!signUpTermsAccepted) {
                        error = "You must agree to the Terms and Privacy Policy."
                        return@LoginState
                    }
                    val fullPhone = normalizePhone(signUpCountryCode, signUpPhone)
                    scope.launch {
                        isLoading = true
                        error = null
                        try {
                            authRepository.signUpWithCanonical(
                                SignupRequestDto(
                                    email = signUpEmail.trim().lowercase(),
                                    password = signUpPassword,
                                    name = signUpName.trim(),
                                    phone = fullPhone,
                                    verificationToken = signUpVerificationToken,
                                    dob = signUpDob.trim(),
                                    whatsappConsent = signUpWhatsappConsent,
                                    termsAccepted = true,
                                )
                            )
                            authMode = AuthMode.SIGN_UP_SUCCESS
                            successMessage = "Account created successfully!"
                        } catch (e: Exception) {
                            error = e.localizedMessage ?: "Registration failed. Please try again."
                        } finally {
                            isLoading = false
                        }
                    }
                }

                // ─── Forgot Password Step 1 Handlers ───
                is LoginEvent.ForgotIdentifierChanged -> forgotIdentifier = uiEvent.identifier
                is LoginEvent.ForgotIdentifierSubmitted -> {
                    if (forgotIdentifier.isBlank()) {
                        error = "Please enter your registered email or phone."
                        return@LoginState
                    }
                    scope.launch {
                        isLoading = true
                        error = null
                        try {
                            val res = authRepository.requestForgotPasswordOtp(forgotIdentifier.trim())
                            forgotOtpCooldown = if (res.cooldownSeconds > 0) res.cooldownSeconds else 60
                            authMode = AuthMode.FORGOT_PASSWORD_STEP_2_OTP
                            successMessage = res.message.ifBlank { "OTP sent to ${res.destination}" }
                        } catch (e: Exception) {
                            error = e.localizedMessage ?: "Failed to initiate password recovery."
                        } finally {
                            isLoading = false
                        }
                    }
                }

                // ─── Forgot Password Step 2 Handlers (OTP) ───
                is LoginEvent.ForgotOtpChanged -> forgotOtp = uiEvent.otp
                is LoginEvent.ForgotOtpSubmitted -> {
                    val cleanOtp = forgotOtp.filter { it.isDigit() }
                    if (cleanOtp.length != 6) {
                        error = "Please enter the 6-digit recovery code."
                        return@LoginState
                    }
                    scope.launch {
                        isLoading = true
                        error = null
                        try {
                            val res = authRepository.verifyForgotPasswordOtp(forgotIdentifier.trim(), cleanOtp)
                            forgotResetToken = res.resetToken
                            authMode = AuthMode.FORGOT_PASSWORD_STEP_3_PASSWORD
                            successMessage = "Recovery code verified! Enter new password."
                        } catch (e: Exception) {
                            error = e.localizedMessage ?: "Invalid or expired recovery code."
                        } finally {
                            isLoading = false
                        }
                    }
                }
                is LoginEvent.ForgotOtpResendClicked -> {
                    if (forgotOtpCooldown > 0) return@LoginState
                    scope.launch {
                        isLoading = true
                        error = null
                        try {
                            val res = authRepository.requestForgotPasswordOtp(forgotIdentifier.trim())
                            forgotOtpCooldown = if (res.cooldownSeconds > 0) res.cooldownSeconds else 60
                            successMessage = "Recovery code resent successfully."
                        } catch (e: Exception) {
                            error = e.localizedMessage ?: "Failed to resend code."
                        } finally {
                            isLoading = false
                        }
                    }
                }

                // ─── Forgot Password Step 3 Handlers (Password) ───
                is LoginEvent.ForgotNewPasswordChanged -> forgotNewPassword = uiEvent.password
                is LoginEvent.ForgotConfirmPasswordChanged -> forgotConfirmPassword = uiEvent.password
                is LoginEvent.ForgotResetSubmitted -> {
                    if (forgotNewPassword.length < 8) {
                        error = "Password must be at least 8 characters long."
                        return@LoginState
                    }
                    if (forgotNewPassword != forgotConfirmPassword) {
                        error = "Passwords do not match."
                        return@LoginState
                    }
                    scope.launch {
                        isLoading = true
                        error = null
                        try {
                            authRepository.resetForgotPassword(forgotResetToken, forgotNewPassword)
                            authMode = AuthMode.FORGOT_PASSWORD_SUCCESS
                            successMessage = "Password reset successfully! Please sign in with your new password."
                        } catch (e: Exception) {
                            error = e.localizedMessage ?: "Failed to reset password."
                        } finally {
                            isLoading = false
                        }
                    }
                }

                // ─── Common / Backward Compat ───
                is LoginEvent.DismissError -> error = null
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

                // Compatibility aliases
                is LoginEvent.EmailChanged -> signInIdentifier = uiEvent.email
                is LoginEvent.PasswordChanged -> signInPassword = uiEvent.password
                is LoginEvent.NameChanged -> signUpName = uiEvent.name
                is LoginEvent.Submit -> {
                    if (authMode == AuthMode.SIGN_IN) {
                        uiEvent.let { }
                        // Forward to signInSubmitted
                        if (signInIdentifier.isNotBlank() && signInPassword.isNotBlank()) {
                            scope.launch {
                                isLoading = true
                                error = null
                                try {
                                    authRepository.signInWithIdentifier(signInIdentifier.trim(), signInPassword)
                                    navigator.resetRoot(HomeRoute)
                                } catch (e: Exception) {
                                    error = e.localizedMessage ?: "Invalid credentials."
                                } finally {
                                    isLoading = false
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    @AssistedFactory
    fun interface Factory {
        fun create(screen: LoginRoute, navigator: Navigator): LoginPresenter
    }
}
