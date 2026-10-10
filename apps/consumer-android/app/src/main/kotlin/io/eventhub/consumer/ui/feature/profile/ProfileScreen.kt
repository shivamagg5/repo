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
                .padding(horizontal = 20.dp, vertical = 12.dp)
        ) {
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
                    Column {
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
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            // Main Account Action List
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

            // Support & Legal Action List
            Text(
                text = "Preferences & Support",
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
                        icon = Icons.Outlined.Security,
                        title = "Security & Privacy",
                        subtitle = "256-bit encryption & authentication",
                        onClick = { showSecurityDialog = true }
                    )
                    HorizontalDivider(color = SurfaceBorder)
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

            // App Version Footer
            Text(
                text = "PULSR v1.0.0 (Native Android) • All Systems Operational",
                style = MaterialTheme.typography.labelSmall,
                color = OnSurfaceLow,
                modifier = Modifier.fillMaxWidth(),
                textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                fontSize = 10.sp
            )
            Spacer(modifier = Modifier.height(16.dp))
        }
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
