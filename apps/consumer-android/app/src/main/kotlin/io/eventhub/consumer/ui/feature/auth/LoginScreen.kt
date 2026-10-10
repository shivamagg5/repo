package io.eventhub.consumer.ui.feature.auth

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Email
import androidx.compose.material.icons.outlined.Lock
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material.icons.outlined.Shield
import androidx.compose.material.icons.outlined.Visibility
import androidx.compose.material.icons.outlined.VisibilityOff
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
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

    val infiniteTransition = rememberInfiniteTransition(label = "spinStar")
    val starAngle by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 360f,
        animationSpec = infiniteRepeatable(
            animation = tween(12000, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "spinAngle"
    )

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
                .padding(horizontal = 24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            // PULSR Brand Header with Rotating Star
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Text(
                    text = "✳",
                    fontSize = 34.sp,
                    color = PulsrAcid,
                    modifier = Modifier.rotate(starAngle)
                )
                Text(
                    text = "PULSR",
                    fontSize = 30.sp,
                    fontWeight = FontWeight.Black,
                    letterSpacing = 2.sp,
                    color = OnSurface
                )
            }
            Spacer(modifier = Modifier.height(14.dp))
            Text(
                text = if (state.isSignUp) "Join the Movement" else "Welcome to PULSR",
                style = MaterialTheme.typography.headlineMedium,
                color = OnSurface,
                fontWeight = FontWeight.Bold
            )
            Text(
                text = if (state.isSignUp) "Access exclusive drops, live raves & VIP passes" else "Sign in to access your ticket vault & radar",
                style = MaterialTheme.typography.bodyMedium,
                color = OnSurfaceMedium
            )

            Spacer(modifier = Modifier.height(26.dp))

            // Error alert
            if (state.error != null) {
                Surface(
                    color = ErrorRed.copy(alpha = 0.15f),
                    shape = RoundedCornerShape(12.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, ErrorRed.copy(alpha = 0.4f)),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        text = state.error,
                        style = MaterialTheme.typography.bodySmall,
                        color = ErrorRed,
                        modifier = Modifier.padding(12.dp)
                    )
                }
                Spacer(modifier = Modifier.height(14.dp))
            }

            // Name field (if Sign Up)
            if (state.isSignUp) {
                OutlinedTextField(
                    value = state.name,
                    onValueChange = { state.eventSink(LoginEvent.NameChanged(it)) },
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
                Spacer(modifier = Modifier.height(12.dp))
            }

            // Email
            OutlinedTextField(
                value = state.email,
                onValueChange = { state.eventSink(LoginEvent.EmailChanged(it)) },
                label = { Text("Email address") },
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

            Spacer(modifier = Modifier.height(12.dp))

            // Password
            OutlinedTextField(
                value = state.password,
                onValueChange = { state.eventSink(LoginEvent.PasswordChanged(it)) },
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

            Spacer(modifier = Modifier.height(20.dp))

            // Submit Button with HotGradient
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp)
                    .clip(RoundedCornerShape(14.dp))
                    .then(
                        if (!state.isLoading) {
                            Modifier
                                .background(HotGradient)
                                .clickable { state.eventSink(LoginEvent.Submit) }
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
                        text = if (state.isSignUp) "Create Account" else "Sign In",
                        style = MaterialTheme.typography.labelLarge,
                        color = OnPrimary,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 0.5.sp
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Quick Demo Credentials Fill Pill (Super convenient for testing & demo)
            Surface(
                shape = RoundedCornerShape(12.dp),
                color = SurfaceDark,
                border = androidx.compose.foundation.BorderStroke(1.dp, PulsrAcid.copy(alpha = 0.3f)),
                modifier = Modifier
                    .clickable {
                        state.eventSink(LoginEvent.EmailChanged("attendee@eventhub.io"))
                        state.eventSink(LoginEvent.PasswordChanged("password123"))
                    }
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Text("⚡", fontSize = 12.sp)
                    Text(
                        text = "Fill Demo Attendee Credentials",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = PulsrAcid
                    )
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Toggle Sign In / Sign Up
            TextButton(onClick = { state.eventSink(LoginEvent.ToggleMode) }) {
                Text(
                    text = if (state.isSignUp) "Already have an account? Sign In" else "Don't have an account? Sign Up",
                    color = PulsrPink,
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.SemiBold
                )
            }

            TextButton(onClick = { state.eventSink(LoginEvent.SkipClicked) }) {
                Text("Explore without account", color = OnSurfaceLow, style = MaterialTheme.typography.bodySmall)
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Encryption badge
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
