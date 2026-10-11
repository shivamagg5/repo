package io.eventhub.consumer.ui.feature.auth

import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.slack.circuit.runtime.CircuitContext
import com.slack.circuit.runtime.screen.Screen
import com.slack.circuit.runtime.ui.Ui
import com.slack.circuit.runtime.ui.ui
import io.eventhub.consumer.ui.navigation.LoginRoute
import io.eventhub.consumer.ui.theme.*

class LoginUiFactory : Ui.Factory {
    override fun create(screen: Screen, context: CircuitContext): Ui<*>? =
        if (screen is LoginRoute) ui<LoginState> { state, modifier ->
            LoginScreen(state, modifier)
        } else null
}

@Composable
fun LoginScreen(state: LoginState, modifier: Modifier = Modifier) {
    var passwordVisible by remember { mutableStateOf(false) }
    var confirmPasswordVisible by remember { mutableStateOf(false) }

    Scaffold(
        modifier = modifier,
        containerColor = BackgroundDark,
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .statusBarsPadding()
                .navigationBarsPadding()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 24.dp, vertical = 20.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            // PULSR Brand Header
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Box(
                    modifier = Modifier
                        .size(36.dp)
                        .clip(RoundedCornerShape(10.dp))
                        .background(HotGradient),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Outlined.GraphicEq,
                        contentDescription = null,
                        tint = OnPrimary,
                        modifier = Modifier.size(20.dp)
                    )
                }
                Text(
                    text = "PULSR",
                    fontSize = 28.sp,
                    fontWeight = FontWeight.Black,
                    letterSpacing = 2.5.sp,
                    color = OnSurface
                )
            }
            Spacer(modifier = Modifier.height(10.dp))

            // Dynamic Header Titles
            val (titleText, subtitleText) = when (state.authMode) {
                AuthMode.SIGN_IN -> Pair("Welcome Back", "Sign in with your registered email or mobile number")
                AuthMode.SIGN_UP_STEP_1_CONTACT -> Pair("Create Your Account", "Step 1 of 3: Enter your contact details")
                AuthMode.SIGN_UP_STEP_2_OTP -> Pair("Verify Mobile Number", "Step 2 of 3: Enter the 6-digit code sent to ${state.signUpCountryCode} ${state.signUpPhone}")
                AuthMode.SIGN_UP_STEP_3_DETAILS -> Pair("Personal Details", "Step 3 of 3: Set your name, birthday and secure password")
                AuthMode.SIGN_UP_SUCCESS -> Pair("Registration Complete", "Your PULSR account is live!")
                AuthMode.FORGOT_PASSWORD_STEP_1_IDENTIFIER -> Pair("Forgot Password", "Enter your email or phone to receive a recovery code")
                AuthMode.FORGOT_PASSWORD_STEP_2_OTP -> Pair("Verify Recovery Code", "Enter the 6-digit OTP to reset your password")
                AuthMode.FORGOT_PASSWORD_STEP_3_PASSWORD -> Pair("Set New Password", "Create a strong new password for your account")
                AuthMode.FORGOT_PASSWORD_SUCCESS -> Pair("Password Reset Complete", "Your password has been successfully updated")
            }

            Text(
                text = titleText,
                style = MaterialTheme.typography.headlineMedium,
                color = OnSurface,
                fontWeight = FontWeight.Bold,
                textAlign = TextAlign.Center
            )
            Text(
                text = subtitleText,
                style = MaterialTheme.typography.bodyMedium,
                color = OnSurfaceMedium,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(horizontal = 8.dp)
            )

            Spacer(modifier = Modifier.height(20.dp))

            // Segmented Tab Switcher (Visible on SIGN_IN and SIGN_UP_STEP_1_CONTACT)
            if (state.authMode == AuthMode.SIGN_IN || state.authMode == AuthMode.SIGN_UP_STEP_1_CONTACT) {
                Surface(
                    shape = RoundedCornerShape(16.dp),
                    color = SurfaceDark,
                    border = androidx.compose.foundation.BorderStroke(1.dp, SurfaceBorder),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier.padding(4.dp),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        val isSignIn = state.authMode == AuthMode.SIGN_IN
                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .clip(RoundedCornerShape(12.dp))
                                .then(
                                    if (isSignIn) Modifier.background(HotGradient)
                                    else Modifier.background(Color.Transparent)
                                )
                                .clickable {
                                    if (!isSignIn) state.eventSink(LoginEvent.SwitchMode(AuthMode.SIGN_IN))
                                }
                                .padding(vertical = 10.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = "Sign In",
                                fontSize = 14.sp,
                                fontWeight = if (isSignIn) FontWeight.Bold else FontWeight.Medium,
                                color = if (isSignIn) OnPrimary else OnSurfaceMedium
                            )
                        }

                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .clip(RoundedCornerShape(12.dp))
                                .then(
                                    if (!isSignIn) Modifier.background(HotGradient)
                                    else Modifier.background(Color.Transparent)
                                )
                                .clickable {
                                    if (isSignIn) state.eventSink(LoginEvent.SwitchMode(AuthMode.SIGN_UP_STEP_1_CONTACT))
                                }
                                .padding(vertical = 10.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = "Sign Up",
                                fontSize = 14.sp,
                                fontWeight = if (!isSignIn) FontWeight.Bold else FontWeight.Medium,
                                color = if (!isSignIn) OnPrimary else OnSurfaceMedium
                            )
                        }
                    }
                }
                Spacer(modifier = Modifier.height(18.dp))
            }

            // Error banner
            if (state.error != null) {
                Surface(
                    color = ErrorRed.copy(alpha = 0.15f),
                    shape = RoundedCornerShape(12.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, ErrorRed.copy(alpha = 0.4f)),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier.padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(Icons.Outlined.ErrorOutline, contentDescription = null, tint = ErrorRed, modifier = Modifier.size(18.dp))
                        Text(
                            text = state.error,
                            style = MaterialTheme.typography.bodySmall,
                            color = ErrorRed,
                            modifier = Modifier.weight(1f)
                        )
                    }
                }
                Spacer(modifier = Modifier.height(14.dp))
            }

            // Success message banner
            if (state.successMessage != null && state.authMode != AuthMode.SIGN_UP_SUCCESS && state.authMode != AuthMode.FORGOT_PASSWORD_SUCCESS) {
                Surface(
                    color = SuccessGreen.copy(alpha = 0.15f),
                    shape = RoundedCornerShape(12.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, SuccessGreen.copy(alpha = 0.4f)),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier.padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(Icons.Outlined.CheckCircle, contentDescription = null, tint = SuccessGreen, modifier = Modifier.size(18.dp))
                        Text(
                            text = state.successMessage,
                            style = MaterialTheme.typography.bodySmall,
                            color = SuccessGreen,
                            modifier = Modifier.weight(1f)
                        )
                    }
                }
                Spacer(modifier = Modifier.height(14.dp))
            }

            // ─────────────────────────────────────────────────────────────
            // MODE: SIGN IN
            // ─────────────────────────────────────────────────────────────
            if (state.authMode == AuthMode.SIGN_IN) {
                OutlinedTextField(
                    value = state.signInIdentifier,
                    onValueChange = { state.eventSink(LoginEvent.SignInIdentifierChanged(it)) },
                    label = { Text("Email address or Mobile number") },
                    placeholder = { Text("e.g. user@example.com or +91 9876543210") },
                    leadingIcon = { Icon(Icons.Outlined.Person, contentDescription = null, tint = OnSurfaceMedium) },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(14.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedContainerColor = SurfaceDark,
                        unfocusedContainerColor = SurfaceDark,
                        focusedBorderColor = PulsrPink,
                        unfocusedBorderColor = SurfaceBorder
                    ),
                    singleLine = true
                )

                Spacer(modifier = Modifier.height(12.dp))

                OutlinedTextField(
                    value = state.signInPassword,
                    onValueChange = { state.eventSink(LoginEvent.SignInPasswordChanged(it)) },
                    label = { Text("Password") },
                    leadingIcon = { Icon(Icons.Outlined.Lock, contentDescription = null, tint = OnSurfaceMedium) },
                    trailingIcon = {
                        IconButton(onClick = { passwordVisible = !passwordVisible }) {
                            Icon(
                                imageVector = if (passwordVisible) Icons.Outlined.Visibility else Icons.Outlined.VisibilityOff,
                                contentDescription = null,
                                tint = OnSurfaceMedium
                            )
                        }
                    },
                    visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(14.dp),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedContainerColor = SurfaceDark,
                        unfocusedContainerColor = SurfaceDark,
                        focusedBorderColor = PulsrPink,
                        unfocusedBorderColor = SurfaceBorder
                    ),
                    singleLine = true
                )

                // Forgot Password link
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 8.dp),
                    horizontalArrangement = Arrangement.End
                ) {
                    Text(
                        text = "Forgot password?",
                        color = PulsrPink,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier
                            .clickable {
                                state.eventSink(LoginEvent.SwitchMode(AuthMode.FORGOT_PASSWORD_STEP_1_IDENTIFIER))
                            }
                            .padding(4.dp)
                    )
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Primary Sign In Button
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(52.dp)
                        .clip(RoundedCornerShape(14.dp))
                        .then(
                            if (!state.isLoading) {
                                Modifier
                                    .background(HotGradient)
                                    .clickable { state.eventSink(LoginEvent.SignInSubmitted) }
                            } else {
                                Modifier.background(Surface3Dark)
                            }
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    if (state.isLoading) {
                        CircularProgressIndicator(color = OnPrimary, strokeWidth = 2.dp, modifier = Modifier.size(20.dp))
                    } else {
                        Text(
                            text = "Sign In",
                            style = MaterialTheme.typography.labelLarge,
                            color = OnPrimary,
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 0.5.sp
                        )
                    }
                }
            }

            // ─────────────────────────────────────────────────────────────
            // MODE: SIGN UP STEP 1 (Contact: Phone + Email)
            // ─────────────────────────────────────────────────────────────
            if (state.authMode == AuthMode.SIGN_UP_STEP_1_CONTACT) {
                // Phone Number with Country Code
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    OutlinedTextField(
                        value = state.signUpCountryCode,
                        onValueChange = { state.eventSink(LoginEvent.SignUpCountryCodeChanged(it)) },
                        label = { Text("Code") },
                        modifier = Modifier.width(90.dp),
                        shape = RoundedCornerShape(14.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedContainerColor = SurfaceDark,
                            unfocusedContainerColor = SurfaceDark,
                            focusedBorderColor = PulsrPink,
                            unfocusedBorderColor = SurfaceBorder
                        ),
                        singleLine = true
                    )

                    OutlinedTextField(
                        value = state.signUpPhone,
                        onValueChange = { state.eventSink(LoginEvent.SignUpPhoneChanged(it)) },
                        label = { Text("Mobile number") },
                        placeholder = { Text("9876543210") },
                        leadingIcon = { Icon(Icons.Outlined.Phone, contentDescription = null, tint = OnSurfaceMedium) },
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(14.dp),
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedContainerColor = SurfaceDark,
                            unfocusedContainerColor = SurfaceDark,
                            focusedBorderColor = PulsrPink,
                            unfocusedBorderColor = SurfaceBorder
                        ),
                        singleLine = true
                    )
                }

                Spacer(modifier = Modifier.height(12.dp))

                OutlinedTextField(
                    value = state.signUpEmail,
                    onValueChange = { state.eventSink(LoginEvent.SignUpEmailChanged(it)) },
                    label = { Text("Email address") },
                    placeholder = { Text("user@example.com") },
                    leadingIcon = { Icon(Icons.Outlined.Email, contentDescription = null, tint = OnSurfaceMedium) },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(14.dp),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedContainerColor = SurfaceDark,
                        unfocusedContainerColor = SurfaceDark,
                        focusedBorderColor = PulsrPink,
                        unfocusedBorderColor = SurfaceBorder
                    ),
                    singleLine = true
                )

                Spacer(modifier = Modifier.height(20.dp))

                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(52.dp)
                        .clip(RoundedCornerShape(14.dp))
                        .then(
                            if (!state.isLoading) {
                                Modifier
                                    .background(HotGradient)
                                    .clickable { state.eventSink(LoginEvent.SignUpContactSubmitted) }
                            } else {
                                Modifier.background(Surface3Dark)
                            }
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    if (state.isLoading) {
                        CircularProgressIndicator(color = OnPrimary, strokeWidth = 2.dp, modifier = Modifier.size(20.dp))
                    } else {
                        Text(
                            text = "Send Mobile OTP",
                            style = MaterialTheme.typography.labelLarge,
                            color = OnPrimary,
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 0.5.sp
                        )
                    }
                }
            }

            // ─────────────────────────────────────────────────────────────
            // MODE: SIGN UP STEP 2 (OTP Entry)
            // ─────────────────────────────────────────────────────────────
            if (state.authMode == AuthMode.SIGN_UP_STEP_2_OTP) {
                OutlinedTextField(
                    value = state.signUpOtp,
                    onValueChange = {
                        if (it.length <= 6) state.eventSink(LoginEvent.SignUpOtpChanged(it))
                    },
                    label = { Text("6-Digit Mobile OTP") },
                    placeholder = { Text("••••••") },
                    leadingIcon = { Icon(Icons.Outlined.Pin, contentDescription = null, tint = OnSurfaceMedium) },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(14.dp),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedContainerColor = SurfaceDark,
                        unfocusedContainerColor = SurfaceDark,
                        focusedBorderColor = PulsrPink,
                        unfocusedBorderColor = SurfaceBorder
                    ),
                    singleLine = true
                )

                Spacer(modifier = Modifier.height(10.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Edit phone number",
                        color = OnSurfaceMedium,
                        fontSize = 13.sp,
                        modifier = Modifier
                            .clickable {
                                state.eventSink(LoginEvent.SwitchMode(AuthMode.SIGN_UP_STEP_1_CONTACT))
                            }
                            .padding(4.dp)
                    )

                    if (state.signUpOtpCooldown > 0) {
                        Text(
                            text = "Resend in ${state.signUpOtpCooldown}s",
                            color = OnSurfaceLow,
                            fontSize = 13.sp,
                            modifier = Modifier.padding(4.dp)
                        )
                    } else {
                        Text(
                            text = "Resend OTP",
                            color = PulsrPink,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.SemiBold,
                            modifier = Modifier
                                .clickable {
                                    state.eventSink(LoginEvent.SignUpOtpResendClicked)
                                }
                                .padding(4.dp)
                        )
                    }
                }

                Spacer(modifier = Modifier.height(20.dp))

                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(52.dp)
                        .clip(RoundedCornerShape(14.dp))
                        .then(
                            if (!state.isLoading) {
                                Modifier
                                    .background(HotGradient)
                                    .clickable { state.eventSink(LoginEvent.SignUpOtpSubmitted) }
                            } else {
                                Modifier.background(Surface3Dark)
                            }
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    if (state.isLoading) {
                        CircularProgressIndicator(color = OnPrimary, strokeWidth = 2.dp, modifier = Modifier.size(20.dp))
                    } else {
                        Text(
                            text = "Verify & Continue",
                            style = MaterialTheme.typography.labelLarge,
                            color = OnPrimary,
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 0.5.sp
                        )
                    }
                }
            }

            // ─────────────────────────────────────────────────────────────
            // MODE: SIGN UP STEP 3 (Details & Consents)
            // ─────────────────────────────────────────────────────────────
            if (state.authMode == AuthMode.SIGN_UP_STEP_3_DETAILS) {
                OutlinedTextField(
                    value = state.signUpName,
                    onValueChange = { state.eventSink(LoginEvent.SignUpNameChanged(it)) },
                    label = { Text("Full Name") },
                    leadingIcon = { Icon(Icons.Outlined.Person, contentDescription = null, tint = OnSurfaceMedium) },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(14.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedContainerColor = SurfaceDark,
                        unfocusedContainerColor = SurfaceDark,
                        focusedBorderColor = PulsrPink,
                        unfocusedBorderColor = SurfaceBorder
                    ),
                    singleLine = true
                )

                Spacer(modifier = Modifier.height(10.dp))

                OutlinedTextField(
                    value = state.signUpDob,
                    onValueChange = { state.eventSink(LoginEvent.SignUpDobChanged(it)) },
                    label = { Text("Date of Birth (YYYY-MM-DD)") },
                    placeholder = { Text("2000-01-15") },
                    leadingIcon = { Icon(Icons.Outlined.CalendarToday, contentDescription = null, tint = OnSurfaceMedium) },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(14.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedContainerColor = SurfaceDark,
                        unfocusedContainerColor = SurfaceDark,
                        focusedBorderColor = PulsrPink,
                        unfocusedBorderColor = SurfaceBorder
                    ),
                    singleLine = true
                )

                Spacer(modifier = Modifier.height(10.dp))

                OutlinedTextField(
                    value = state.signUpPassword,
                    onValueChange = { state.eventSink(LoginEvent.SignUpPasswordChanged(it)) },
                    label = { Text("Password (min 8 chars)") },
                    leadingIcon = { Icon(Icons.Outlined.Lock, contentDescription = null, tint = OnSurfaceMedium) },
                    trailingIcon = {
                        IconButton(onClick = { passwordVisible = !passwordVisible }) {
                            Icon(
                                imageVector = if (passwordVisible) Icons.Outlined.Visibility else Icons.Outlined.VisibilityOff,
                                contentDescription = null,
                                tint = OnSurfaceMedium
                            )
                        }
                    },
                    visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(14.dp),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedContainerColor = SurfaceDark,
                        unfocusedContainerColor = SurfaceDark,
                        focusedBorderColor = PulsrPink,
                        unfocusedBorderColor = SurfaceBorder
                    ),
                    singleLine = true
                )

                Spacer(modifier = Modifier.height(10.dp))

                OutlinedTextField(
                    value = state.signUpConfirmPassword,
                    onValueChange = { state.eventSink(LoginEvent.SignUpConfirmPasswordChanged(it)) },
                    label = { Text("Confirm Password") },
                    leadingIcon = { Icon(Icons.Outlined.Lock, contentDescription = null, tint = OnSurfaceMedium) },
                    trailingIcon = {
                        IconButton(onClick = { confirmPasswordVisible = !confirmPasswordVisible }) {
                            Icon(
                                imageVector = if (confirmPasswordVisible) Icons.Outlined.Visibility else Icons.Outlined.VisibilityOff,
                                contentDescription = null,
                                tint = OnSurfaceMedium
                            )
                        }
                    },
                    visualTransformation = if (confirmPasswordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(14.dp),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedContainerColor = SurfaceDark,
                        unfocusedContainerColor = SurfaceDark,
                        focusedBorderColor = PulsrPink,
                        unfocusedBorderColor = SurfaceBorder
                    ),
                    singleLine = true
                )

                Spacer(modifier = Modifier.height(14.dp))

                // Optional WhatsApp consent checkbox
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { state.eventSink(LoginEvent.SignUpWhatsappConsentChanged(!state.signUpWhatsappConsent)) }
                        .padding(vertical = 4.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Checkbox(
                        checked = state.signUpWhatsappConsent,
                        onCheckedChange = { state.eventSink(LoginEvent.SignUpWhatsappConsentChanged(it)) },
                        colors = CheckboxDefaults.colors(checkedColor = PulsrPink)
                    )
                    Text(
                        text = "Receive event tickets, updates and offers on WhatsApp",
                        style = MaterialTheme.typography.bodySmall,
                        color = OnSurfaceMedium
                    )
                }

                // Required Terms & Privacy checkbox
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { state.eventSink(LoginEvent.SignUpTermsAcceptedChanged(!state.signUpTermsAccepted)) }
                        .padding(vertical = 4.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Checkbox(
                        checked = state.signUpTermsAccepted,
                        onCheckedChange = { state.eventSink(LoginEvent.SignUpTermsAcceptedChanged(it)) },
                        colors = CheckboxDefaults.colors(checkedColor = PulsrPink)
                    )
                    Text(
                        text = "I agree to the Terms of Service and Privacy Policy *",
                        style = MaterialTheme.typography.bodySmall,
                        color = if (state.signUpTermsAccepted) OnSurface else OnSurfaceMedium
                    )
                }

                Spacer(modifier = Modifier.height(18.dp))

                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(52.dp)
                        .clip(RoundedCornerShape(14.dp))
                        .then(
                            if (!state.isLoading) {
                                Modifier
                                    .background(HotGradient)
                                    .clickable { state.eventSink(LoginEvent.SignUpDetailsSubmitted) }
                            } else {
                                Modifier.background(Surface3Dark)
                            }
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    if (state.isLoading) {
                        CircularProgressIndicator(color = OnPrimary, strokeWidth = 2.dp, modifier = Modifier.size(20.dp))
                    } else {
                        Text(
                            text = "Create Account",
                            style = MaterialTheme.typography.labelLarge,
                            color = OnPrimary,
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 0.5.sp
                        )
                    }
                }
            }

            // ─────────────────────────────────────────────────────────────
            // MODE: SIGN UP SUCCESS (Email Confirmation Notice)
            // ─────────────────────────────────────────────────────────────
            if (state.authMode == AuthMode.SIGN_UP_SUCCESS) {
                Surface(
                    color = SurfaceDark,
                    shape = RoundedCornerShape(16.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, SuccessGreen.copy(alpha = 0.5f)),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(
                        modifier = Modifier.padding(20.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Box(
                            modifier = Modifier
                                .size(56.dp)
                                .clip(CircleShape)
                                .background(SuccessGreen.copy(alpha = 0.2f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(Icons.Outlined.MarkEmailRead, contentDescription = null, tint = SuccessGreen, modifier = Modifier.size(30.dp))
                        }
                        Spacer(modifier = Modifier.height(14.dp))
                        Text(
                            text = "Account Created!",
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold,
                            color = OnSurface
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "We have sent a verification email to ${state.signUpEmail}. Please confirm your email address. You are ready to explore events now!",
                            style = MaterialTheme.typography.bodyMedium,
                            color = OnSurfaceMedium,
                            textAlign = TextAlign.Center
                        )
                        Spacer(modifier = Modifier.height(18.dp))
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(48.dp)
                                .clip(RoundedCornerShape(12.dp))
                                .background(HotGradient)
                                .clickable { state.eventSink(LoginEvent.SkipClicked) },
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = "Start Exploring Events",
                                color = OnPrimary,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
            }

            // ─────────────────────────────────────────────────────────────
            // MODE: FORGOT PASSWORD STEP 1 (Identifier: Email or Phone)
            // ─────────────────────────────────────────────────────────────
            if (state.authMode == AuthMode.FORGOT_PASSWORD_STEP_1_IDENTIFIER) {
                OutlinedTextField(
                    value = state.forgotIdentifier,
                    onValueChange = { state.eventSink(LoginEvent.ForgotIdentifierChanged(it)) },
                    label = { Text("Registered Email or Mobile") },
                    placeholder = { Text("e.g. user@example.com or +91 9876543210") },
                    leadingIcon = { Icon(Icons.Outlined.AccountCircle, contentDescription = null, tint = OnSurfaceMedium) },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(14.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedContainerColor = SurfaceDark,
                        unfocusedContainerColor = SurfaceDark,
                        focusedBorderColor = PulsrPink,
                        unfocusedBorderColor = SurfaceBorder
                    ),
                    singleLine = true
                )

                Spacer(modifier = Modifier.height(20.dp))

                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(52.dp)
                        .clip(RoundedCornerShape(14.dp))
                        .then(
                            if (!state.isLoading) {
                                Modifier
                                    .background(HotGradient)
                                    .clickable { state.eventSink(LoginEvent.ForgotIdentifierSubmitted) }
                            } else {
                                Modifier.background(Surface3Dark)
                            }
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    if (state.isLoading) {
                        CircularProgressIndicator(color = OnPrimary, strokeWidth = 2.dp, modifier = Modifier.size(20.dp))
                    } else {
                        Text(
                            text = "Send Recovery Code",
                            style = MaterialTheme.typography.labelLarge,
                            color = OnPrimary,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                TextButton(
                    onClick = { state.eventSink(LoginEvent.SwitchMode(AuthMode.SIGN_IN)) }
                ) {
                    Text("Back to Sign In", color = OnSurfaceMedium)
                }
            }

            // ─────────────────────────────────────────────────────────────
            // MODE: FORGOT PASSWORD STEP 2 (OTP Entry)
            // ─────────────────────────────────────────────────────────────
            if (state.authMode == AuthMode.FORGOT_PASSWORD_STEP_2_OTP) {
                OutlinedTextField(
                    value = state.forgotOtp,
                    onValueChange = {
                        if (it.length <= 6) state.eventSink(LoginEvent.ForgotOtpChanged(it))
                    },
                    label = { Text("6-Digit Recovery Code") },
                    placeholder = { Text("••••••") },
                    leadingIcon = { Icon(Icons.Outlined.Pin, contentDescription = null, tint = OnSurfaceMedium) },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(14.dp),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedContainerColor = SurfaceDark,
                        unfocusedContainerColor = SurfaceDark,
                        focusedBorderColor = PulsrPink,
                        unfocusedBorderColor = SurfaceBorder
                    ),
                    singleLine = true
                )

                Spacer(modifier = Modifier.height(10.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Change identifier",
                        color = OnSurfaceMedium,
                        fontSize = 13.sp,
                        modifier = Modifier
                            .clickable {
                                state.eventSink(LoginEvent.SwitchMode(AuthMode.FORGOT_PASSWORD_STEP_1_IDENTIFIER))
                            }
                            .padding(4.dp)
                    )

                    if (state.forgotOtpCooldown > 0) {
                        Text(
                            text = "Resend in ${state.forgotOtpCooldown}s",
                            color = OnSurfaceLow,
                            fontSize = 13.sp,
                            modifier = Modifier.padding(4.dp)
                        )
                    } else {
                        Text(
                            text = "Resend Code",
                            color = PulsrPink,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.SemiBold,
                            modifier = Modifier
                                .clickable {
                                    state.eventSink(LoginEvent.ForgotOtpResendClicked)
                                }
                                .padding(4.dp)
                        )
                    }
                }

                Spacer(modifier = Modifier.height(20.dp))

                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(52.dp)
                        .clip(RoundedCornerShape(14.dp))
                        .then(
                            if (!state.isLoading) {
                                Modifier
                                    .background(HotGradient)
                                    .clickable { state.eventSink(LoginEvent.ForgotOtpSubmitted) }
                            } else {
                                Modifier.background(Surface3Dark)
                            }
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    if (state.isLoading) {
                        CircularProgressIndicator(color = OnPrimary, strokeWidth = 2.dp, modifier = Modifier.size(20.dp))
                    } else {
                        Text(
                            text = "Verify Code",
                            style = MaterialTheme.typography.labelLarge,
                            color = OnPrimary,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }

            // ─────────────────────────────────────────────────────────────
            // MODE: FORGOT PASSWORD STEP 3 (New Password)
            // ─────────────────────────────────────────────────────────────
            if (state.authMode == AuthMode.FORGOT_PASSWORD_STEP_3_PASSWORD) {
                OutlinedTextField(
                    value = state.forgotNewPassword,
                    onValueChange = { state.eventSink(LoginEvent.ForgotNewPasswordChanged(it)) },
                    label = { Text("New Password (min 8 chars)") },
                    leadingIcon = { Icon(Icons.Outlined.Lock, contentDescription = null, tint = OnSurfaceMedium) },
                    trailingIcon = {
                        IconButton(onClick = { passwordVisible = !passwordVisible }) {
                            Icon(
                                imageVector = if (passwordVisible) Icons.Outlined.Visibility else Icons.Outlined.VisibilityOff,
                                contentDescription = null,
                                tint = OnSurfaceMedium
                            )
                        }
                    },
                    visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(14.dp),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedContainerColor = SurfaceDark,
                        unfocusedContainerColor = SurfaceDark,
                        focusedBorderColor = PulsrPink,
                        unfocusedBorderColor = SurfaceBorder
                    ),
                    singleLine = true
                )

                Spacer(modifier = Modifier.height(10.dp))

                OutlinedTextField(
                    value = state.forgotConfirmPassword,
                    onValueChange = { state.eventSink(LoginEvent.ForgotConfirmPasswordChanged(it)) },
                    label = { Text("Confirm New Password") },
                    leadingIcon = { Icon(Icons.Outlined.Lock, contentDescription = null, tint = OnSurfaceMedium) },
                    trailingIcon = {
                        IconButton(onClick = { confirmPasswordVisible = !confirmPasswordVisible }) {
                            Icon(
                                imageVector = if (confirmPasswordVisible) Icons.Outlined.Visibility else Icons.Outlined.VisibilityOff,
                                contentDescription = null,
                                tint = OnSurfaceMedium
                            )
                        }
                    },
                    visualTransformation = if (confirmPasswordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(14.dp),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedContainerColor = SurfaceDark,
                        unfocusedContainerColor = SurfaceDark,
                        focusedBorderColor = PulsrPink,
                        unfocusedBorderColor = SurfaceBorder
                    ),
                    singleLine = true
                )

                Spacer(modifier = Modifier.height(20.dp))

                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(52.dp)
                        .clip(RoundedCornerShape(14.dp))
                        .then(
                            if (!state.isLoading) {
                                Modifier
                                    .background(HotGradient)
                                    .clickable { state.eventSink(LoginEvent.ForgotResetSubmitted) }
                            } else {
                                Modifier.background(Surface3Dark)
                            }
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    if (state.isLoading) {
                        CircularProgressIndicator(color = OnPrimary, strokeWidth = 2.dp, modifier = Modifier.size(20.dp))
                    } else {
                        Text(
                            text = "Save New Password",
                            style = MaterialTheme.typography.labelLarge,
                            color = OnPrimary,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }

            // ─────────────────────────────────────────────────────────────
            // MODE: FORGOT PASSWORD SUCCESS
            // ─────────────────────────────────────────────────────────────
            if (state.authMode == AuthMode.FORGOT_PASSWORD_SUCCESS) {
                Surface(
                    color = SurfaceDark,
                    shape = RoundedCornerShape(16.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, SuccessGreen.copy(alpha = 0.5f)),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(
                        modifier = Modifier.padding(20.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Box(
                            modifier = Modifier
                                .size(56.dp)
                                .clip(CircleShape)
                                .background(SuccessGreen.copy(alpha = 0.2f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(Icons.Outlined.CheckCircle, contentDescription = null, tint = SuccessGreen, modifier = Modifier.size(30.dp))
                        }
                        Spacer(modifier = Modifier.height(14.dp))
                        Text(
                            text = "Password Reset Complete",
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold,
                            color = OnSurface
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "Your password has been successfully updated. You can now sign in with your new password on both the web and mobile apps.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = OnSurfaceMedium,
                            textAlign = TextAlign.Center
                        )
                        Spacer(modifier = Modifier.height(18.dp))
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(48.dp)
                                .clip(RoundedCornerShape(12.dp))
                                .background(HotGradient)
                                .clickable { state.eventSink(LoginEvent.SwitchMode(AuthMode.SIGN_IN)) },
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = "Sign In Now",
                                color = OnPrimary,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
            }

            // ─────────────────────────────────────────────────────────────
            // Bottom Auxiliary Actions: Explore & Encryption Badge
            // ─────────────────────────────────────────────────────────────
            if (state.authMode == AuthMode.SIGN_IN || state.authMode == AuthMode.SIGN_UP_STEP_1_CONTACT) {
                Spacer(modifier = Modifier.height(14.dp))

                OutlinedButton(
                    onClick = { state.eventSink(LoginEvent.SkipClicked) },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(52.dp),
                    shape = RoundedCornerShape(14.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, PulsrPink.copy(alpha = 0.5f)),
                    colors = ButtonDefaults.outlinedButtonColors(
                        containerColor = SurfaceDark.copy(alpha = 0.6f),
                        contentColor = OnSurface
                    )
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Outlined.Explore,
                            contentDescription = "Explore",
                            tint = PulsrPink,
                            modifier = Modifier.size(20.dp)
                        )
                        Text(
                            text = "Explore Events & Passes",
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Bold,
                            color = OnSurface
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            // Security assurance badge
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                Icon(
                    imageVector = Icons.Outlined.Shield,
                    contentDescription = null,
                    tint = OnSurfaceLow,
                    modifier = Modifier.size(13.dp)
                )
                Text(
                    text = "256-Bit Encrypted Ticket Vault",
                    fontSize = 10.sp,
                    color = OnSurfaceLow
                )
            }
        }
    }
}
