package io.eventhub.consumer.ui.feature.profile

import android.content.Intent
import android.net.Uri
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
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.automirrored.outlined.ArrowForward
import androidx.compose.material.icons.automirrored.outlined.HelpOutline
import androidx.compose.material.icons.automirrored.outlined.Logout
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil3.compose.AsyncImage
import com.slack.circuit.runtime.CircuitContext
import com.slack.circuit.runtime.screen.Screen
import com.slack.circuit.runtime.ui.Ui
import com.slack.circuit.runtime.ui.ui
import io.eventhub.consumer.ui.navigation.ProfileRoute
import io.eventhub.consumer.ui.theme.*

class ProfileUiFactory : Ui.Factory {
    override fun create(screen: Screen, context: CircuitContext): Ui<*>? =
        if (screen is ProfileRoute) ui<ProfileState> { state, modifier ->
            ProfileScreen(state, modifier)
        } else null
}

@Composable
fun ProfileScreen(state: ProfileState, modifier: Modifier = Modifier) {
    val context = LocalContext.current
    var showSecurityDialog by remember { mutableStateOf(false) }

    Scaffold(
        modifier = modifier,
        containerColor = BackgroundDark,
        topBar = {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .statusBarsPadding()
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(onClick = { state.eventSink(ProfileEvent.BackClicked) }) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Outlined.ArrowBack,
                        contentDescription = "Back",
                        tint = OnSurface
                    )
                }
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "Account & Profile",
                    style = MaterialTheme.typography.titleLarge,
                    color = OnSurface,
                    fontWeight = FontWeight.Bold
                )
            }
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp)
                .padding(top = 12.dp, bottom = 128.dp)
        ) {
            // Info / Feedback banner
            if (state.infoMessage != null) {
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
                            text = state.infoMessage,
                            style = MaterialTheme.typography.bodySmall,
                            color = SuccessGreen,
                            modifier = Modifier.weight(1f)
                        )
                    }
                }
                Spacer(modifier = Modifier.height(14.dp))
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

            // User Header Card
            Card(
                colors = CardDefaults.cardColors(containerColor = SurfaceDark),
                shape = RoundedCornerShape(20.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, SurfaceBorder, RoundedCornerShape(20.dp))
            ) {
                Row(
                    modifier = Modifier.padding(18.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    if (state.user?.avatarUrl != null) {
                        AsyncImage(
                            model = state.user.avatarUrl,
                            contentDescription = "Avatar",
                            modifier = Modifier
                                .size(64.dp)
                                .clip(CircleShape)
                        )
                    } else {
                        Surface(
                            shape = CircleShape,
                            color = PulsrPink.copy(alpha = 0.18f),
                            border = androidx.compose.foundation.BorderStroke(1.dp, GlowBorderPink),
                            modifier = Modifier.size(64.dp)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Text(
                                    text = (state.user?.name ?: state.user?.email ?: "U").take(1).uppercase(),
                                    style = MaterialTheme.typography.headlineSmall,
                                    color = PulsrPink,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }
                    }
                    Spacer(modifier = Modifier.width(16.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            Text(
                                text = state.user?.name ?: "PULSR Member",
                                style = MaterialTheme.typography.titleLarge,
                                color = OnSurface,
                                fontWeight = FontWeight.Bold
                            )
                            Surface(
                                shape = RoundedCornerShape(4.dp),
                                color = PulsrAcid.copy(alpha = 0.15f)
                            ) {
                                Text(
                                    text = "PRO",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = PulsrAcid,
                                    fontWeight = FontWeight.Black,
                                    fontSize = 8.sp,
                                    modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp)
                                )
                            }
                        }
                        Spacer(modifier = Modifier.height(2.dp))
                        Text(
                            text = state.user?.email ?: "Signed in",
                            style = MaterialTheme.typography.bodySmall,
                            color = OnSurfaceMedium
                        )
                    }
                    IconButton(onClick = { state.eventSink(ProfileEvent.OpenEditDetails) }) {
                        Icon(Icons.Outlined.Edit, contentDescription = "Edit Profile", tint = PulsrPink, modifier = Modifier.size(20.dp))
                    }
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            // ─────────────────────────────────────────────────────────────
            // SECTION: Verification & Identity
            // ─────────────────────────────────────────────────────────────
            Text(
                text = "Verification & Identity",
                style = MaterialTheme.typography.labelMedium,
                color = OnSurfaceLow,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(start = 4.dp, bottom = 8.dp)
            )

            Card(
                colors = CardDefaults.cardColors(containerColor = SurfaceDark),
                shape = RoundedCornerShape(18.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, SurfaceBorder, RoundedCornerShape(18.dp))
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    // Email verification status row
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = "Email Address",
                                style = MaterialTheme.typography.labelSmall,
                                color = OnSurfaceLow
                            )
                            Text(
                                text = state.user?.email ?: "Not available",
                                style = MaterialTheme.typography.bodyMedium,
                                color = OnSurface,
                                fontWeight = FontWeight.SemiBold
                            )
                        }

                        if (state.user?.emailVerified == true) {
                            Surface(
                                color = SuccessGreen.copy(alpha = 0.15f),
                                shape = RoundedCornerShape(8.dp),
                                border = androidx.compose.foundation.BorderStroke(1.dp, SuccessGreen.copy(alpha = 0.3f))
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                                ) {
                                    Icon(Icons.Outlined.CheckCircle, contentDescription = null, tint = SuccessGreen, modifier = Modifier.size(13.dp))
                                    Text("Verified", color = SuccessGreen, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                }
                            }
                        } else {
                            Surface(
                                color = WarningAmber.copy(alpha = 0.15f),
                                shape = RoundedCornerShape(8.dp),
                                border = androidx.compose.foundation.BorderStroke(1.dp, WarningAmber.copy(alpha = 0.3f))
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                                ) {
                                    Icon(Icons.Outlined.WarningAmber, contentDescription = null, tint = WarningAmber, modifier = Modifier.size(13.dp))
                                    Text("Unverified", color = WarningAmber, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    }

                    // If email is unverified, show message & resend button
                    if (state.user?.emailVerified != true) {
                        Spacer(modifier = Modifier.height(10.dp))
                        Text(
                            text = "Please verify your email using the confirmation link we sent to your inbox.",
                            style = MaterialTheme.typography.bodySmall,
                            color = OnSurfaceMedium,
                            fontSize = 12.sp
                        )

                        if (state.emailMessage != null) {
                            Spacer(modifier = Modifier.height(6.dp))
                            Text(
                                text = state.emailMessage,
                                color = PulsrAcid,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.SemiBold
                            )
                        }

                        Spacer(modifier = Modifier.height(8.dp))
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            OutlinedButton(
                                onClick = { state.eventSink(ProfileEvent.ResendVerificationEmailClicked) },
                                enabled = !state.isResendingEmail && state.emailCooldownSeconds == 0,
                                shape = RoundedCornerShape(8.dp),
                                border = androidx.compose.foundation.BorderStroke(1.dp, PulsrPink.copy(alpha = 0.5f)),
                                modifier = Modifier.height(34.dp)
                            ) {
                                if (state.isResendingEmail) {
                                    CircularProgressIndicator(color = PulsrPink, strokeWidth = 2.dp, modifier = Modifier.size(14.dp))
                                } else {
                                    Text(
                                        text = if (state.emailCooldownSeconds > 0) "Resend in ${state.emailCooldownSeconds}s" else "Resend verification email",
                                        color = PulsrPink,
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                            }
                        }
                    }

                    HorizontalDivider(color = SurfaceBorder, modifier = Modifier.padding(vertical = 12.dp))

                    // Phone verification status row
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = "Mobile Number",
                                style = MaterialTheme.typography.labelSmall,
                                color = OnSurfaceLow
                            )
                            Text(
                                text = state.user?.phone ?: "Not registered",
                                style = MaterialTheme.typography.bodyMedium,
                                color = OnSurface,
                                fontWeight = FontWeight.SemiBold
                            )
                        }

                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            if (state.user?.phoneVerified == true) {
                                Surface(
                                    color = SuccessGreen.copy(alpha = 0.15f),
                                    shape = RoundedCornerShape(8.dp),
                                    border = androidx.compose.foundation.BorderStroke(1.dp, SuccessGreen.copy(alpha = 0.3f))
                                ) {
                                    Row(
                                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                                    ) {
                                        Icon(Icons.Outlined.CheckCircle, contentDescription = null, tint = SuccessGreen, modifier = Modifier.size(13.dp))
                                        Text("Verified", color = SuccessGreen, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                    }
                                }
                            }

                            Text(
                                text = "Change",
                                color = PulsrPink,
                                fontSize = 13.sp,
                                fontWeight = FontWeight.SemiBold,
                                modifier = Modifier
                                    .clickable { state.eventSink(ProfileEvent.OpenChangePhone) }
                                    .padding(4.dp)
                            )
                        }
                    }

                    HorizontalDivider(color = SurfaceBorder, modifier = Modifier.padding(vertical = 12.dp))

                    // Date of birth row
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = "Date of Birth",
                                style = MaterialTheme.typography.labelSmall,
                                color = OnSurfaceLow
                            )
                            Text(
                                text = state.user?.dob ?: "Not provided",
                                style = MaterialTheme.typography.bodyMedium,
                                color = OnSurface,
                                fontWeight = FontWeight.SemiBold
                            )
                        }

                        Text(
                            text = "Edit",
                            color = PulsrPink,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.SemiBold,
                            modifier = Modifier
                                .clickable { state.eventSink(ProfileEvent.OpenEditDetails) }
                                .padding(4.dp)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            // ─────────────────────────────────────────────────────────────
            // SECTION: Preferences & Communications
            // ─────────────────────────────────────────────────────────────
            Text(
                text = "Preferences & Consent",
                style = MaterialTheme.typography.labelMedium,
                color = OnSurfaceLow,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(start = 4.dp, bottom = 8.dp)
            )

            Card(
                colors = CardDefaults.cardColors(containerColor = SurfaceDark),
                shape = RoundedCornerShape(18.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, SurfaceBorder, RoundedCornerShape(18.dp))
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = "WhatsApp Updates & Offers",
                                style = MaterialTheme.typography.bodyMedium,
                                color = OnSurface,
                                fontWeight = FontWeight.SemiBold
                            )
                            Text(
                                text = "Receive direct tickets, event reminders & member drops on WhatsApp",
                                style = MaterialTheme.typography.bodySmall,
                                color = OnSurfaceLow,
                                fontSize = 11.sp
                            )
                        }
                        Switch(
                            checked = state.user?.whatsappConsent == true,
                            onCheckedChange = { state.eventSink(ProfileEvent.ToggleWhatsappConsent(it)) },
                            colors = SwitchDefaults.colors(
                                checkedThumbColor = OnPrimary,
                                checkedTrackColor = PulsrPink
                            )
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            // ─────────────────────────────────────────────────────────────
            // SECTION: Security & Credentials
            // ─────────────────────────────────────────────────────────────
            Text(
                text = "Security & Credentials",
                style = MaterialTheme.typography.labelMedium,
                color = OnSurfaceLow,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(start = 4.dp, bottom = 8.dp)
            )

            Card(
                colors = CardDefaults.cardColors(containerColor = SurfaceDark),
                shape = RoundedCornerShape(18.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, SurfaceBorder, RoundedCornerShape(18.dp))
            ) {
                Column {
                    ProfileOptionRow(
                        icon = Icons.Outlined.LockReset,
                        title = "Change Password",
                        subtitle = "Update your password across web and mobile",
                        onClick = { state.eventSink(ProfileEvent.OpenChangePassword) }
                    )
                    HorizontalDivider(color = SurfaceBorder)
                    ProfileOptionRow(
                        icon = Icons.Outlined.Security,
                        title = "Security & Privacy Standard",
                        subtitle = "256-bit encryption & RBI compliance info",
                        onClick = { showSecurityDialog = true }
                    )
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            // ─────────────────────────────────────────────────────────────
            // SECTION: My Activity
            // ─────────────────────────────────────────────────────────────
            Text(
                text = "My Activity",
                style = MaterialTheme.typography.labelMedium,
                color = OnSurfaceLow,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(start = 4.dp, bottom = 8.dp)
            )

            Card(
                colors = CardDefaults.cardColors(containerColor = SurfaceDark),
                shape = RoundedCornerShape(18.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, SurfaceBorder, RoundedCornerShape(18.dp))
            ) {
                Column {
                    ProfileOptionRow(
                        icon = Icons.Outlined.ConfirmationNumber,
                        title = "My Tickets",
                        subtitle = "View active and past admission passes",
                        onClick = { state.eventSink(ProfileEvent.MyTicketsClicked) }
                    )
                    HorizontalDivider(color = SurfaceBorder)
                    ProfileOptionRow(
                        icon = Icons.Outlined.FavoriteBorder,
                        title = "Saved Events",
                        subtitle = "Bookmarked concerts, raves & comedy",
                        onClick = { state.eventSink(ProfileEvent.SavedEventsClicked) }
                    )
                    HorizontalDivider(color = SurfaceBorder)
                    ProfileOptionRow(
                        icon = Icons.Outlined.Notifications,
                        title = "Notifications",
                        subtitle = "Drop alerts, price drops & ticket updates",
                        onClick = { state.eventSink(ProfileEvent.NotificationsClicked) }
                    )
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            // ─────────────────────────────────────────────────────────────
            // SECTION: Support & Legal
            // ─────────────────────────────────────────────────────────────
            Text(
                text = "Support & Legal",
                style = MaterialTheme.typography.labelMedium,
                color = OnSurfaceLow,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(start = 4.dp, bottom = 8.dp)
            )

            Card(
                colors = CardDefaults.cardColors(containerColor = SurfaceDark),
                shape = RoundedCornerShape(18.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, SurfaceBorder, RoundedCornerShape(18.dp))
            ) {
                Column {
                    ProfileOptionRow(
                        icon = Icons.AutoMirrored.Outlined.HelpOutline,
                        title = "Help & Support",
                        subtitle = "Get assistance or report an issue",
                        onClick = {
                            val emailIntent = Intent(Intent.ACTION_SENDTO).apply {
                                data = Uri.parse("mailto:support@pulsr.live?subject=PULSR%20Mobile%20Support")
                            }
                            try {
                                context.startActivity(emailIntent)
                            } catch (e: Exception) {
                                val browserIntent = Intent(Intent.ACTION_VIEW, Uri.parse("https://pulsr.live/contact"))
                                context.startActivity(browserIntent)
                            }
                        }
                    )
                    HorizontalDivider(color = SurfaceBorder)
                    ProfileOptionRow(
                        icon = Icons.Outlined.Description,
                        title = "Terms & Policies",
                        subtitle = "Terms of service and privacy statement",
                        onClick = {
                            val intent = Intent(Intent.ACTION_VIEW, Uri.parse("https://pulsr.live/terms"))
                            context.startActivity(intent)
                        }
                    )
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Logout Button
            OutlinedButton(
                onClick = { state.eventSink(ProfileEvent.LogoutClicked) },
                colors = ButtonDefaults.outlinedButtonColors(contentColor = ErrorRed),
                shape = RoundedCornerShape(14.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, ErrorRed.copy(alpha = 0.5f)),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(50.dp)
            ) {
                Icon(
                    imageVector = Icons.AutoMirrored.Outlined.Logout,
                    contentDescription = null,
                    tint = ErrorRed,
                    modifier = Modifier.size(18.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text("Sign Out", fontWeight = FontWeight.Bold, color = ErrorRed)
            }

            Spacer(modifier = Modifier.height(16.dp))

            Text(
                text = "PULSR v1.0.0 (Unified Canonical Auth) • All Systems Operational",
                style = MaterialTheme.typography.labelSmall,
                color = OnSurfaceLow,
                modifier = Modifier.fillMaxWidth(),
                textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                fontSize = 10.sp
            )
            Spacer(modifier = Modifier.height(16.dp))
        }
    }

    // ─────────────────────────────────────────────────────────────
    // MODAL: Edit Personal Details
    // ─────────────────────────────────────────────────────────────
    if (state.isEditingDetails) {
        AlertDialog(
            onDismissRequest = { state.eventSink(ProfileEvent.CloseEditDetails) },
            title = {
                Text("Edit Personal Details", color = OnSurface, fontWeight = FontWeight.Bold)
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    OutlinedTextField(
                        value = state.editName,
                        onValueChange = { state.eventSink(ProfileEvent.EditNameChanged(it)) },
                        label = { Text("Full Name") },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp)
                    )
                    OutlinedTextField(
                        value = state.editDob,
                        onValueChange = { state.eventSink(ProfileEvent.EditDobChanged(it)) },
                        label = { Text("Date of Birth (YYYY-MM-DD)") },
                        placeholder = { Text("2000-01-15") },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp)
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = { state.eventSink(ProfileEvent.SavePersonalDetails) },
                    enabled = !state.isSavingDetails,
                    colors = ButtonDefaults.buttonColors(containerColor = PulsrPink)
                ) {
                    if (state.isSavingDetails) {
                        CircularProgressIndicator(color = OnPrimary, strokeWidth = 2.dp, modifier = Modifier.size(16.dp))
                    } else {
                        Text("Save Details", color = OnPrimary, fontWeight = FontWeight.Bold)
                    }
                }
            },
            dismissButton = {
                TextButton(onClick = { state.eventSink(ProfileEvent.CloseEditDetails) }) {
                    Text("Cancel", color = OnSurfaceMedium)
                }
            },
            containerColor = Surface3Dark
        )
    }

    // ─────────────────────────────────────────────────────────────
    // MODAL: Change Mobile Number (With OTP)
    // ─────────────────────────────────────────────────────────────
    if (state.phoneChangeStep != PhoneChangeModalStep.IDLE) {
        AlertDialog(
            onDismissRequest = { state.eventSink(ProfileEvent.CloseChangePhone) },
            title = {
                Text("Change Mobile Number", color = OnSurface, fontWeight = FontWeight.Bold)
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    if (state.phoneError != null) {
                        Text(text = state.phoneError, color = ErrorRed, fontSize = 12.sp)
                    }

                    if (state.phoneChangeStep == PhoneChangeModalStep.ENTER_PHONE) {
                        Text(
                            text = "Enter your new mobile number. We will send an SMS verification OTP to verify ownership.",
                            style = MaterialTheme.typography.bodySmall,
                            color = OnSurfaceMedium
                        )
                        OutlinedTextField(
                            value = state.newPhone,
                            onValueChange = { state.eventSink(ProfileEvent.ChangePhoneInputChanged(it)) },
                            label = { Text("New Mobile Number") },
                            placeholder = { Text("9876543210") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp)
                        )
                    } else if (state.phoneChangeStep == PhoneChangeModalStep.ENTER_OTP) {
                        Text(
                            text = "Enter the 6-digit code sent to ${state.newPhone}",
                            style = MaterialTheme.typography.bodySmall,
                            color = OnSurfaceMedium
                        )
                        OutlinedTextField(
                            value = state.phoneOtp,
                            onValueChange = { state.eventSink(ProfileEvent.ChangePhoneOtpChanged(it)) },
                            label = { Text("6-Digit OTP") },
                            placeholder = { Text("••••••") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp)
                        )
                        if (state.phoneCooldownSeconds > 0) {
                            Text("Resend in ${state.phoneCooldownSeconds}s", color = OnSurfaceLow, fontSize = 12.sp)
                        } else {
                            Text(
                                text = "Resend Code",
                                color = PulsrPink,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier
                                    .clickable { state.eventSink(ProfileEvent.RequestChangePhoneOtp) }
                                    .padding(vertical = 4.dp)
                            )
                        }
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (state.phoneChangeStep == PhoneChangeModalStep.ENTER_PHONE) {
                            state.eventSink(ProfileEvent.RequestChangePhoneOtp)
                        } else {
                            state.eventSink(ProfileEvent.VerifyChangePhoneOtp)
                        }
                    },
                    enabled = !state.isChangingPhone,
                    colors = ButtonDefaults.buttonColors(containerColor = PulsrPink)
                ) {
                    if (state.isChangingPhone) {
                        CircularProgressIndicator(color = OnPrimary, strokeWidth = 2.dp, modifier = Modifier.size(16.dp))
                    } else {
                        Text(
                            text = if (state.phoneChangeStep == PhoneChangeModalStep.ENTER_PHONE) "Send OTP" else "Verify & Save",
                            color = OnPrimary,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            },
            dismissButton = {
                TextButton(onClick = { state.eventSink(ProfileEvent.CloseChangePhone) }) {
                    Text("Cancel", color = OnSurfaceMedium)
                }
            },
            containerColor = Surface3Dark
        )
    }

    // ─────────────────────────────────────────────────────────────
    // MODAL: Change Password
    // ─────────────────────────────────────────────────────────────
    if (state.isChangingPasswordOpen) {
        var showCurPass by remember { mutableStateOf(false) }
        var showNewPass by remember { mutableStateOf(false) }

        AlertDialog(
            onDismissRequest = { state.eventSink(ProfileEvent.CloseChangePassword) },
            title = {
                Text("Change Password", color = OnSurface, fontWeight = FontWeight.Bold)
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    if (state.passwordError != null) {
                        Text(text = state.passwordError, color = ErrorRed, fontSize = 12.sp)
                    }

                    OutlinedTextField(
                        value = state.currentPassword,
                        onValueChange = { state.eventSink(ProfileEvent.CurrentPasswordChanged(it)) },
                        label = { Text("Current Password") },
                        visualTransformation = if (showCurPass) VisualTransformation.None else PasswordVisualTransformation(),
                        trailingIcon = {
                            IconButton(onClick = { showCurPass = !showCurPass }) {
                                Icon(if (showCurPass) Icons.Outlined.Visibility else Icons.Outlined.VisibilityOff, contentDescription = null, tint = OnSurfaceMedium)
                            }
                        },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp)
                    )

                    OutlinedTextField(
                        value = state.newPassword,
                        onValueChange = { state.eventSink(ProfileEvent.NewPasswordChanged(it)) },
                        label = { Text("New Password (min 8 chars)") },
                        visualTransformation = if (showNewPass) VisualTransformation.None else PasswordVisualTransformation(),
                        trailingIcon = {
                            IconButton(onClick = { showNewPass = !showNewPass }) {
                                Icon(if (showNewPass) Icons.Outlined.Visibility else Icons.Outlined.VisibilityOff, contentDescription = null, tint = OnSurfaceMedium)
                            }
                        },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp)
                    )

                    OutlinedTextField(
                        value = state.confirmPassword,
                        onValueChange = { state.eventSink(ProfileEvent.ConfirmPasswordChanged(it)) },
                        label = { Text("Confirm New Password") },
                        visualTransformation = if (showNewPass) VisualTransformation.None else PasswordVisualTransformation(),
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp)
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = { state.eventSink(ProfileEvent.SaveNewPassword) },
                    enabled = !state.isSavingPassword,
                    colors = ButtonDefaults.buttonColors(containerColor = PulsrPink)
                ) {
                    if (state.isSavingPassword) {
                        CircularProgressIndicator(color = OnPrimary, strokeWidth = 2.dp, modifier = Modifier.size(16.dp))
                    } else {
                        Text("Update Password", color = OnPrimary, fontWeight = FontWeight.Bold)
                    }
                }
            },
            dismissButton = {
                TextButton(onClick = { state.eventSink(ProfileEvent.CloseChangePassword) }) {
                    Text("Cancel", color = OnSurfaceMedium)
                }
            },
            containerColor = Surface3Dark
        )
    }

    if (showSecurityDialog) {
        AlertDialog(
            onDismissRequest = { showSecurityDialog = false },
            title = {
                Text("Security & Privacy", color = OnSurface, fontWeight = FontWeight.Bold)
            },
            text = {
                Text(
                    text = "Your account is secured with 256-bit end-to-end encryption. All ticketing transactions are processed through RBI-compliant, PCI-DSS Level 1 certified gateways. Your payment credentials and QR tokens are never stored in plaintext.",
                    color = OnSurfaceMedium,
                    style = MaterialTheme.typography.bodyMedium,
                    lineHeight = 20.sp
                )
            },
            confirmButton = {
                TextButton(onClick = { showSecurityDialog = false }) {
                    Text("Got it", color = PulsrPink, fontWeight = FontWeight.Bold)
                }
            },
            containerColor = Surface3Dark
        )
    }
}

@Composable
private fun ProfileOptionRow(
    icon: ImageVector,
    title: String,
    subtitle: String? = null,
    onClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Row(modifier = Modifier.weight(1f), verticalAlignment = Alignment.CenterVertically) {
            Surface(
                shape = CircleShape,
                color = PulsrPink.copy(alpha = 0.12f),
                modifier = Modifier.size(38.dp)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(imageVector = icon, contentDescription = null, tint = PulsrPink, modifier = Modifier.size(18.dp))
                }
            }
            Spacer(modifier = Modifier.width(14.dp))
            Column {
                Text(text = title, style = MaterialTheme.typography.bodyMedium, color = OnSurface, fontWeight = FontWeight.SemiBold)
                if (subtitle != null) {
                    Text(text = subtitle, style = MaterialTheme.typography.bodySmall, color = OnSurfaceLow, fontSize = 11.sp)
                }
            }
        }
        Icon(
            imageVector = Icons.AutoMirrored.Outlined.ArrowForward,
            contentDescription = null,
            tint = OnSurfaceLow,
            modifier = Modifier.size(16.dp)
        )
    }
}
