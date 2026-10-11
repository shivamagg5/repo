package io.eventhub.consumer.ui.feature.notifications

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.outlined.ConfirmationNumber
import androidx.compose.material.icons.outlined.Info
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material.icons.outlined.NotificationsNone
import androidx.compose.material.icons.outlined.Radio
import androidx.compose.material.icons.outlined.Warning
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.slack.circuit.runtime.CircuitContext
import com.slack.circuit.runtime.screen.Screen
import com.slack.circuit.runtime.ui.Ui
import com.slack.circuit.runtime.ui.ui
import io.eventhub.consumer.domain.model.NotificationItem
import io.eventhub.consumer.ui.components.EmptyState
import io.eventhub.consumer.ui.components.ErrorState
import io.eventhub.consumer.ui.components.LoadingState
import io.eventhub.consumer.ui.navigation.NotificationsRoute
import io.eventhub.consumer.ui.theme.*

class NotificationsUiFactory : Ui.Factory {
    override fun create(screen: Screen, context: CircuitContext): Ui<*>? =
        if (screen is NotificationsRoute) ui<NotificationsState> { state, modifier ->
            NotificationsScreen(state, modifier)
        } else null
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NotificationsScreen(state: NotificationsState, modifier: Modifier = Modifier) {
    Scaffold(
        modifier = modifier,
        containerColor = BackgroundDark,
        topBar = {
            TopAppBar(
                title = {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Text(
                            text = "Notifications",
                            style = MaterialTheme.typography.titleLarge,
                            color = OnSurface,
                            fontWeight = FontWeight.Bold
                        )
                        val unreadCount = state.notifications.count { !it.isRead }
                        if (unreadCount > 0) {
                            Surface(
                                shape = RoundedCornerShape(10.dp),
                                color = PulsrPink
                            ) {
                                Text(
                                    text = "$unreadCount NEW",
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Black,
                                    color = OnPrimary,
                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                )
                            }
                        }
                    }
                },
                navigationIcon = {
                    IconButton(onClick = { state.eventSink(NotificationsEvent.BackClicked) }) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Outlined.ArrowBack,
                            contentDescription = "Back",
                            tint = OnSurface
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = BackgroundDark)
            )
        }
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            when {
                state.isLoading -> {
                    LoadingState(message = "Syncing live alert feeds...")
                }
                state.error != null -> {
                    ErrorState(
                        message = state.error,
                        onRetry = { state.eventSink(NotificationsEvent.RetryClicked) }
                    )
                }
                state.notifications.isEmpty() -> {
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(horizontal = 24.dp),
                        verticalArrangement = Arrangement.Center,
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Surface(
                            shape = CircleShape,
                            color = SurfaceDark,
                            border = androidx.compose.foundation.BorderStroke(1.dp, SurfaceBorder),
                            modifier = Modifier.size(72.dp)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Icon(
                                    imageVector = Icons.Outlined.NotificationsNone,
                                    contentDescription = null,
                                    tint = PulsrPink,
                                    modifier = Modifier.size(32.dp)
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(20.dp))

                        Text(
                            text = "Live Radar Feed Active",
                            style = MaterialTheme.typography.titleLarge,
                            color = OnSurface,
                            fontWeight = FontWeight.Bold
                        )
                        Spacer(modifier = Modifier.height(6.dp))
                        Text(
                            text = "You're all caught up! You will be alerted instantly when tickets drop, gates open, or schedule announcements are made.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = OnSurfaceMedium,
                            textAlign = androidx.compose.ui.text.style.TextAlign.Center
                        )

                        Spacer(modifier = Modifier.height(28.dp))

                        // Active channels indicator card
                        Surface(
                            shape = RoundedCornerShape(16.dp),
                            color = SurfaceDark,
                            border = androidx.compose.foundation.BorderStroke(1.dp, SurfaceBorder),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .size(8.dp)
                                            .background(PulsrAcid, CircleShape)
                                    )
                                    Text(
                                        text = "MONITORED ALERT CHANNELS",
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Black,
                                        letterSpacing = 1.sp,
                                        color = PulsrAcid
                                    )
                                }
                                Spacer(modifier = Modifier.height(10.dp))
                                Text(
                                    text = "• Gate Admissions & Turnstile Fast-Pass Status",
                                    fontSize = 12.sp,
                                    color = OnSurfaceMedium
                                )
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = "• Arena Headliner Schedule & Door Time Adjustments",
                                    fontSize = 12.sp,
                                    color = OnSurfaceMedium
                                )
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = "• Exclusive Artist Pre-sales & VIP Waitlist Notifications",
                                    fontSize = 12.sp,
                                    color = OnSurfaceMedium
                                )
                            }
                        }
                    }
                }
                else -> {
                    LazyColumn(
                        contentPadding = PaddingValues(start = 20.dp, top = 12.dp, end = 20.dp, bottom = 128.dp),
                        verticalArrangement = Arrangement.spacedBy(14.dp)
                    ) {
                        items(state.notifications, key = { it.id }) { item ->
                            NotificationCard(
                                item = item,
                                onClick = { state.eventSink(NotificationsEvent.NotificationClicked(item)) }
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun NotificationCard(
    item: NotificationItem,
    onClick: () -> Unit
) {
    val (icon, tintColor, badgeText) = when (item.type.lowercase()) {
        "alert", "urgent" -> Triple(Icons.Outlined.Warning, ErrorRed, "URGENT ALERT")
        "ticket", "order" -> Triple(Icons.Outlined.ConfirmationNumber, PulsrPink, "TICKET PASS")
        else -> Triple(Icons.Outlined.Info, PulsrNeon, "RADAR UPDATE")
    }

    Card(
        colors = CardDefaults.cardColors(containerColor = SurfaceDark),
        shape = RoundedCornerShape(16.dp),
        modifier = Modifier
            .fillMaxWidth()
            .border(
                1.dp,
                if (!item.isRead) tintColor.copy(alpha = 0.4f) else SurfaceBorder,
                RoundedCornerShape(16.dp)
            )
            .clickable(onClick = onClick)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            verticalAlignment = Alignment.Top
        ) {
            Surface(
                shape = CircleShape,
                color = tintColor.copy(alpha = 0.12f),
                modifier = Modifier.size(42.dp)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        imageVector = icon,
                        contentDescription = null,
                        tint = tintColor,
                        modifier = Modifier.size(20.dp)
                    )
                }
            }
            Spacer(modifier = Modifier.width(14.dp))
            Column(modifier = Modifier.weight(1f)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Surface(
                        shape = RoundedCornerShape(4.dp),
                        color = tintColor.copy(alpha = 0.12f)
                    ) {
                        Text(
                            text = badgeText,
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Black,
                            letterSpacing = 0.5.sp,
                            color = tintColor,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                        )
                    }

                    if (!item.isRead) {
                        Box(
                            modifier = Modifier
                                .size(8.dp)
                                .background(PulsrPink, CircleShape)
                        )
                    }
                }
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    text = item.title,
                    style = MaterialTheme.typography.titleSmall,
                    color = OnSurface,
                    fontWeight = FontWeight.Bold
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = item.body,
                    style = MaterialTheme.typography.bodySmall,
                    color = OnSurfaceMedium,
                    lineHeight = MaterialTheme.typography.bodySmall.lineHeight
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = item.createdAt.take(10),
                    style = MaterialTheme.typography.labelSmall,
                    color = OnSurfaceLow
                )
            }
        }
    }
}
