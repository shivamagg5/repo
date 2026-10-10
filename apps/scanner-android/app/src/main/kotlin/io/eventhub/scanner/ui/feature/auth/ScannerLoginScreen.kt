package io.eventhub.scanner.ui.feature.auth

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Email
import androidx.compose.material.icons.outlined.Lock
import androidx.compose.material.icons.outlined.QrCodeScanner
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import com.slack.circuit.runtime.CircuitContext
import com.slack.circuit.runtime.screen.Screen
import com.slack.circuit.runtime.ui.Ui
import com.slack.circuit.runtime.ui.ui
import io.eventhub.scanner.ui.navigation.LoginRoute
import io.eventhub.scanner.ui.theme.*

class ScannerLoginUiFactory : Ui.Factory {
    override fun create(screen: Screen, context: CircuitContext): Ui<*>? =
        if (screen is LoginRoute) ui<ScannerLoginState> { state, modifier ->
            ScannerLoginScreen(state, modifier)
        } else null
}

@Composable
fun ScannerLoginScreen(state: ScannerLoginState, modifier: Modifier = Modifier) {
    Scaffold(
        modifier = modifier,
        containerColor = ScannerBackground,
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .statusBarsPadding()
                .navigationBarsPadding()
                .padding(horizontal = 28.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Surface(
                shape = RoundedCornerShape(20.dp),
                color = ScannerPrimary.copy(alpha = 0.15f),
                modifier = Modifier.size(80.dp)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        imageVector = Icons.Outlined.QrCodeScanner,
                        contentDescription = "Scanner",
                        tint = ScannerPrimary,
                        modifier = Modifier.size(44.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(20.dp))
            Text(
                text = "EventHub Scanner",
                style = MaterialTheme.typography.headlineMedium,
                color = ScannerOnSurface,
                fontWeight = FontWeight.Bold
            )
            Text(
                text = "Gate Control & Ticket Validation Terminal",
                style = MaterialTheme.typography.bodyMedium,
                color = ScannerOnSurfaceMed
            )

            Spacer(modifier = Modifier.height(32.dp))

            if (state.error != null) {
                Surface(
                    color = ScanInvalidRed.copy(alpha = 0.15f),
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        text = state.error,
                        style = MaterialTheme.typography.bodySmall,
                        color = ScanInvalidRed,
                        modifier = Modifier.padding(12.dp)
                    )
                }
                Spacer(modifier = Modifier.height(16.dp))
            }

            OutlinedTextField(
                value = state.email,
                onValueChange = { state.eventSink(ScannerLoginEvent.EmailChanged(it)) },
                label = { Text("Staff Email") },
                leadingIcon = { Icon(Icons.Outlined.Email, contentDescription = null, tint = ScannerOnSurfaceMed) },
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = ScannerPrimary,
                    unfocusedBorderColor = ScannerSurface2,
                    focusedTextColor = ScannerOnSurface,
                    unfocusedTextColor = ScannerOnSurface
                ),
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email)
            )

            Spacer(modifier = Modifier.height(14.dp))

            OutlinedTextField(
                value = state.pinOrPass,
                onValueChange = { state.eventSink(ScannerLoginEvent.PinChanged(it)) },
                label = { Text("Staff Password") },
                leadingIcon = { Icon(Icons.Outlined.Lock, contentDescription = null, tint = ScannerOnSurfaceMed) },
                visualTransformation = PasswordVisualTransformation(),
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = ScannerPrimary,
                    unfocusedBorderColor = ScannerSurface2,
                    focusedTextColor = ScannerOnSurface,
                    unfocusedTextColor = ScannerOnSurface
                ),
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password)
            )

            Spacer(modifier = Modifier.height(28.dp))

            Button(
                onClick = { state.eventSink(ScannerLoginEvent.Submit) },
                enabled = !state.isLoading,
                colors = ButtonDefaults.buttonColors(containerColor = ScannerPrimary),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp)
            ) {
                if (state.isLoading) {
                    CircularProgressIndicator(color = Color.Black, strokeWidth = 2.dp, modifier = Modifier.size(22.dp))
                } else {
                    Text(
                        text = "Authorize Device",
                        style = MaterialTheme.typography.titleMedium,
                        color = Color.Black,
                        fontWeight = FontWeight.Bold
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            OutlinedButton(
                onClick = { state.eventSink(ScannerLoginEvent.SkipToDemo) },
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.outlinedButtonColors(contentColor = ScannerPrimary),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp)
            ) {
                Text(
                    text = "Try Offline Scanner (Demo)",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Medium
                )
            }
        }
    }
}
