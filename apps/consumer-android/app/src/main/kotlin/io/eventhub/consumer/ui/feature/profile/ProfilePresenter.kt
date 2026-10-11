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
import io.eventhub.consumer.domain.repository.UserRepository
import io.eventhub.consumer.domain.usecase.GetUserProfileUseCase
import io.eventhub.consumer.ui.navigation.LoginRoute
import io.eventhub.consumer.ui.navigation.NotificationsRoute
import io.eventhub.consumer.ui.navigation.ProfileRoute
import io.eventhub.consumer.ui.navigation.SavedRoute
import io.eventhub.consumer.ui.navigation.TicketsRoute
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

enum class PhoneChangeModalStep {
    IDLE,
    ENTER_PHONE,
    ENTER_OTP,
}

data class ProfileState(
    val user: User? = null,
    val isLoading: Boolean = true,
    val error: String? = null,
    val infoMessage: String? = null,
    // Email verification
    val isResendingEmail: Boolean = false,
    val emailCooldownSeconds: Int = 0,
    val emailMessage: String? = null,
    // Edit details
    val isEditingDetails: Boolean = false,
    val editName: String = "",
    val editDob: String = "",
    val isSavingDetails: Boolean = false,
    // Change Phone
    val phoneChangeStep: PhoneChangeModalStep = PhoneChangeModalStep.IDLE,
    val newPhone: String = "",
    val phoneOtp: String = "",
    val phoneCooldownSeconds: Int = 0,
    val isChangingPhone: Boolean = false,
    val phoneError: String? = null,
    val phoneSuccess: String? = null,
    // Change Password
    val isChangingPasswordOpen: Boolean = false,
    val currentPassword: String = "",
    val newPassword: String = "",
    val confirmPassword: String = "",
    val isSavingPassword: Boolean = false,
    val passwordError: String? = null,
    val passwordSuccess: String? = null,
    val eventSink: (ProfileEvent) -> Unit = {}
) : CircuitUiState

sealed interface ProfileEvent : CircuitUiEvent {
    data object MyTicketsClicked : ProfileEvent
    data object SavedEventsClicked : ProfileEvent
    data object NotificationsClicked : ProfileEvent
    data object LogoutClicked : ProfileEvent
    data object BackClicked : ProfileEvent
    data object RetryClicked : ProfileEvent
    data object DismissMessages : ProfileEvent

    // Email verification
    data object ResendVerificationEmailClicked : ProfileEvent

    // Edit personal details
    data object OpenEditDetails : ProfileEvent
    data object CloseEditDetails : ProfileEvent
    data class EditNameChanged(val name: String) : ProfileEvent
    data class EditDobChanged(val dob: String) : ProfileEvent
    data object SavePersonalDetails : ProfileEvent

    // WhatsApp updates consent toggle
    data class ToggleWhatsappConsent(val enabled: Boolean) : ProfileEvent

    // Change Phone modal
    data object OpenChangePhone : ProfileEvent
    data object CloseChangePhone : ProfileEvent
    data class ChangePhoneInputChanged(val phone: String) : ProfileEvent
    data class ChangePhoneOtpChanged(val otp: String) : ProfileEvent
    data object RequestChangePhoneOtp : ProfileEvent
    data object VerifyChangePhoneOtp : ProfileEvent

    // Change Password modal
    data object OpenChangePassword : ProfileEvent
    data object CloseChangePassword : ProfileEvent
    data class CurrentPasswordChanged(val pass: String) : ProfileEvent
    data class NewPasswordChanged(val pass: String) : ProfileEvent
    data class ConfirmPasswordChanged(val pass: String) : ProfileEvent
    data object SaveNewPassword : ProfileEvent
}

class ProfilePresenter @AssistedInject constructor(
    @Assisted private val screen: ProfileRoute,
    @Assisted private val navigator: Navigator,
    private val getUserProfile: GetUserProfileUseCase,
    private val userRepository: UserRepository,
    private val authRepository: AuthRepository,
) : Presenter<ProfileState> {

    @Composable
    override fun present(): ProfileState {
        var user by remember { mutableStateOf<User?>(null) }
        var isLoading by remember { mutableStateOf(true) }
        var error by remember { mutableStateOf<String?>(null) }
        var infoMessage by remember { mutableStateOf<String?>(null) }

        // Email
        var isResendingEmail by remember { mutableStateOf(false) }
        var emailCooldownSeconds by remember { mutableIntStateOf(0) }
        var emailMessage by remember { mutableStateOf<String?>(null) }

        // Details
        var isEditingDetails by remember { mutableStateOf(false) }
        var editName by remember { mutableStateOf("") }
        var editDob by remember { mutableStateOf("") }
        var isSavingDetails by remember { mutableStateOf(false) }

        // Phone
        var phoneChangeStep by remember { mutableStateOf(PhoneChangeModalStep.IDLE) }
        var newPhone by remember { mutableStateOf("") }
        var phoneOtp by remember { mutableStateOf("") }
        var phoneCooldownSeconds by remember { mutableIntStateOf(0) }
        var isChangingPhone by remember { mutableStateOf(false) }
        var phoneError by remember { mutableStateOf<String?>(null) }
        var phoneSuccess by remember { mutableStateOf<String?>(null) }

        // Password
        var isChangingPasswordOpen by remember { mutableStateOf(false) }
        var currentPassword by remember { mutableStateOf("") }
        var newPassword by remember { mutableStateOf("") }
        var confirmPassword by remember { mutableStateOf("") }
        var isSavingPassword by remember { mutableStateOf(false) }
        var passwordError by remember { mutableStateOf<String?>(null) }
        var passwordSuccess by remember { mutableStateOf<String?>(null) }

        val scope = rememberCoroutineScope()

        // Cooldown counters
        LaunchedEffect(emailCooldownSeconds) {
            if (emailCooldownSeconds > 0) {
                delay(1000)
                emailCooldownSeconds -= 1
            }
        }
        LaunchedEffect(phoneCooldownSeconds) {
            if (phoneCooldownSeconds > 0) {
                delay(1000)
                phoneCooldownSeconds -= 1
            }
        }

        fun normalizePhone(rawPhone: String): String {
            val digits = rawPhone.filter { it.isDigit() }
            return if (rawPhone.startsWith("+")) rawPhone.trim()
            else "+91$digits"
        }

        fun load() {
            scope.launch {
                isLoading = true
                error = null
                try {
                    val u = getUserProfile()
                    user = u
                    editName = u.name ?: ""
                    editDob = u.dob ?: ""
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
            infoMessage = infoMessage,
            isResendingEmail = isResendingEmail,
            emailCooldownSeconds = emailCooldownSeconds,
            emailMessage = emailMessage,
            isEditingDetails = isEditingDetails,
            editName = editName,
            editDob = editDob,
            isSavingDetails = isSavingDetails,
            phoneChangeStep = phoneChangeStep,
            newPhone = newPhone,
            phoneOtp = phoneOtp,
            phoneCooldownSeconds = phoneCooldownSeconds,
            isChangingPhone = isChangingPhone,
            phoneError = phoneError,
            phoneSuccess = phoneSuccess,
            isChangingPasswordOpen = isChangingPasswordOpen,
            currentPassword = currentPassword,
            newPassword = newPassword,
            confirmPassword = confirmPassword,
            isSavingPassword = isSavingPassword,
            passwordError = passwordError,
            passwordSuccess = passwordSuccess,
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
                is ProfileEvent.DismissMessages -> {
                    error = null
                    infoMessage = null
                    emailMessage = null
                    phoneError = null
                    passwordError = null
                }

                // ─── Email Verification ───
                is ProfileEvent.ResendVerificationEmailClicked -> {
                    if (emailCooldownSeconds > 0) return@ProfileState
                    scope.launch {
                        isResendingEmail = true
                        emailMessage = null
                        try {
                            authRepository.resendConfirmationEmail(user?.email)
                            emailCooldownSeconds = 60
                            emailMessage = "Verification email sent! Check your inbox."
                        } catch (e: Exception) {
                            emailMessage = e.localizedMessage ?: "Failed to resend email."
                        } finally {
                            isResendingEmail = false
                        }
                    }
                }

                // ─── Edit Personal Details ───
                is ProfileEvent.OpenEditDetails -> {
                    editName = user?.name ?: ""
                    editDob = user?.dob ?: ""
                    isEditingDetails = true
                }
                is ProfileEvent.CloseEditDetails -> isEditingDetails = false
                is ProfileEvent.EditNameChanged -> editName = uiEvent.name
                is ProfileEvent.EditDobChanged -> editDob = uiEvent.dob
                is ProfileEvent.SavePersonalDetails -> {
                    scope.launch {
                        isSavingDetails = true
                        try {
                            val updated = userRepository.updateMe(
                                name = editName.trim(),
                                dob = editDob.trim().ifBlank { null },
                            )
                            user = updated
                            isEditingDetails = false
                            infoMessage = "Personal details updated successfully!"
                        } catch (e: Exception) {
                            error = e.localizedMessage ?: "Failed to save details."
                        } finally {
                            isSavingDetails = false
                        }
                    }
                }

                // ─── WhatsApp Consent Toggle ───
                is ProfileEvent.ToggleWhatsappConsent -> {
                    val next = uiEvent.enabled
                    user = user?.copy(whatsappConsent = next)
                    scope.launch {
                        try {
                            userRepository.updateMe(whatsappConsent = next)
                        } catch (e: Exception) {
                            user = user?.copy(whatsappConsent = !next)
                            error = "Failed to update WhatsApp preference."
                        }
                    }
                }

                // ─── Change Mobile Number ───
                is ProfileEvent.OpenChangePhone -> {
                    newPhone = ""
                    phoneOtp = ""
                    phoneError = null
                    phoneSuccess = null
                    phoneChangeStep = PhoneChangeModalStep.ENTER_PHONE
                }
                is ProfileEvent.CloseChangePhone -> {
                    phoneChangeStep = PhoneChangeModalStep.IDLE
                    phoneError = null
                }
                is ProfileEvent.ChangePhoneInputChanged -> newPhone = uiEvent.phone
                is ProfileEvent.ChangePhoneOtpChanged -> phoneOtp = uiEvent.otp
                is ProfileEvent.RequestChangePhoneOtp -> {
                    val formatted = normalizePhone(newPhone)
                    if (newPhone.isBlank()) {
                        phoneError = "Please enter a valid mobile number."
                        return@ProfileState
                    }
                    scope.launch {
                        isChangingPhone = true
                        phoneError = null
                        try {
                            val res = authRepository.changePhoneRequest(formatted)
                            phoneCooldownSeconds = if (res.cooldownSeconds > 0) res.cooldownSeconds else 60
                            phoneChangeStep = PhoneChangeModalStep.ENTER_OTP
                            phoneSuccess = "Verification code sent to $formatted"
                        } catch (e: Exception) {
                            phoneError = e.localizedMessage ?: "Failed to send verification code."
                        } finally {
                            isChangingPhone = false
                        }
                    }
                }
                is ProfileEvent.VerifyChangePhoneOtp -> {
                    val formatted = normalizePhone(newPhone)
                    val cleanOtp = phoneOtp.filter { it.isDigit() }
                    if (cleanOtp.length != 6) {
                        phoneError = "Please enter the 6-digit code."
                        return@ProfileState
                    }
                    scope.launch {
                        isChangingPhone = true
                        phoneError = null
                        try {
                            authRepository.changePhoneVerify(formatted, cleanOtp)
                            user = user?.copy(phone = formatted, phoneVerified = true)
                            phoneChangeStep = PhoneChangeModalStep.IDLE
                            infoMessage = "Mobile number updated and verified!"
                        } catch (e: Exception) {
                            phoneError = e.localizedMessage ?: "Invalid or expired OTP."
                        } finally {
                            isChangingPhone = false
                        }
                    }
                }

                // ─── Change Password ───
                is ProfileEvent.OpenChangePassword -> {
                    currentPassword = ""
                    newPassword = ""
                    confirmPassword = ""
                    passwordError = null
                    passwordSuccess = null
                    isChangingPasswordOpen = true
                }
                is ProfileEvent.CloseChangePassword -> isChangingPasswordOpen = false
                is ProfileEvent.CurrentPasswordChanged -> currentPassword = uiEvent.pass
                is ProfileEvent.NewPasswordChanged -> newPassword = uiEvent.pass
                is ProfileEvent.ConfirmPasswordChanged -> confirmPassword = uiEvent.pass
                is ProfileEvent.SaveNewPassword -> {
                    if (currentPassword.isBlank()) {
                        passwordError = "Please enter your current password."
                        return@ProfileState
                    }
                    if (newPassword.length < 8) {
                        passwordError = "New password must be at least 8 characters long."
                        return@ProfileState
                    }
                    if (newPassword != confirmPassword) {
                        passwordError = "New passwords do not match."
                        return@ProfileState
                    }
                    scope.launch {
                        isSavingPassword = true
                        passwordError = null
                        try {
                            authRepository.changePassword(currentPassword, newPassword)
                            isChangingPasswordOpen = false
                            infoMessage = "Password changed successfully!"
                        } catch (e: Exception) {
                            passwordError = e.localizedMessage ?: "Failed to change password. Check your current password."
                        } finally {
                            isSavingPassword = false
                        }
                    }
                }
            }
        }
    }

    @AssistedFactory
    fun interface Factory {
        fun create(screen: ProfileRoute, navigator: Navigator): ProfilePresenter
    }
}
