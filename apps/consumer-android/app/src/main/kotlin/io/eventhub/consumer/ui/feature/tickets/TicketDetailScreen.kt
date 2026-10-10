package io.eventhub.consumer.ui.feature.tickets

import android.app.Activity
import android.content.Intent
import android.graphics.Bitmap
import android.net.Uri
import android.provider.CalendarContract
import android.view.WindowManager
import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
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
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.CheckCircle
import androidx.compose.material.icons.outlined.LocationOn
import androidx.compose.material.icons.outlined.Share
import androidx.compose.material.icons.outlined.Verified
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil3.compose.AsyncImage
import com.google.zxing.BarcodeFormat
import com.google.zxing.MultiFormatWriter
import com.journeyapps.barcodescanner.BarcodeEncoder
import com.slack.circuit.runtime.CircuitContext
import com.slack.circuit.runtime.screen.Screen
import com.slack.circuit.runtime.ui.Ui
import com.slack.circuit.runtime.ui.ui
import io.eventhub.consumer.domain.model.Ticket
import io.eventhub.consumer.domain.model.TicketStatus
import io.eventhub.consumer.ui.components.ErrorState
import io.eventhub.consumer.ui.components.LoadingState
import io.eventhub.consumer.ui.navigation.TicketDetailRoute
import io.eventhub.consumer.ui.theme.*

class TicketDetailUiFactory : Ui.Factory {
    override fun create(screen: Screen, context: CircuitContext): Ui<*>? =
        if (screen is TicketDetailRoute) ui<TicketDetailState> { state, modifier ->
            TicketDetailScreen(state, modifier)
        } else null
}

@Composable
fun TicketDetailScreen(state: TicketDetailState, modifier: Modifier = Modifier) {
    val context = LocalContext.current
    val activity = context as? Activity

    // Automatically boost screen brightness for reliable turnstile QR scanning in dark venues
    DisposableEffect(activity, state.isTorchBoostActive) {
        val window = activity?.window
        val originalBrightness = window?.attributes?.screenBrightness ?: WindowManager.LayoutParams.BRIGHTNESS_OVERRIDE_NONE
        if (state.isTorchBoostActive) {
            window?.attributes = window?.attributes?.apply {
                screenBrightness = WindowManager.LayoutParams.BRIGHTNESS_OVERRIDE_FULL
            }
        } else {
            window?.attributes = window?.attributes?.apply {
                screenBrightness = WindowManager.LayoutParams.BRIGHTNESS_OVERRIDE_NONE
            }
        }
        onDispose {
            window?.attributes = window?.attributes?.apply {
                screenBrightness = originalBrightness
            }
        }
    }

    Scaffold(
        modifier = modifier,
        containerColor = BackgroundDark,
        topBar = {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .statusBarsPadding()
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                IconButton(onClick = { state.eventSink(TicketDetailEvent.BackClicked) }) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Outlined.ArrowBack,
                        contentDescription = "Back",
                        tint = OnSurface
                    )
                }
                Text(
                    text = "Admission Pass",
                    style = MaterialTheme.typography.titleLarge,
                    color = OnSurface,
                    fontWeight = FontWeight.Bold
                )
                IconButton(onClick = {
                    val shareIntent = Intent(Intent.ACTION_SEND).apply {
                        type = "text/plain"
                        putExtra(Intent.EXTRA_TEXT, "Admission Pass for ${state.ticket?.event?.name ?: "Event"}")
                    }
                    context.startActivity(Intent.createChooser(shareIntent, "Share Ticket"))
                }) {
                    Icon(
                        imageVector = Icons.Outlined.Share,
                        contentDescription = "Share",
                        tint = OnSurface
                    )
                }
            }
        }
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            when {
                state.isLoading -> LoadingState(message = "Generating admission QR pass...")
                state.error != null && state.ticket == null -> ErrorState(
                    message = state.error,
                    onRetry = { state.eventSink(TicketDetailEvent.RetryClicked) }
                )
                state.ticket != null -> {
                    TicketPassContent(
                        ticket = state.ticket,
                        qrToken = state.qrToken ?: state.ticket.id,
                        isOfflineCached = state.isOfflineCached,
                        isTorchBoostActive = state.isTorchBoostActive,
                        onToggleBrightness = { state.eventSink(TicketDetailEvent.ToggleBrightnessBoostClicked) },
                        onSaveOffline = { state.eventSink(TicketDetailEvent.SaveOfflineClicked) },
                        onAddToCalendar = {
                            val intent = Intent(Intent.ACTION_INSERT).apply {
                                data = CalendarContract.Events.CONTENT_URI
                                putExtra(CalendarContract.Events.TITLE, state.ticket.event?.name)
                                putExtra(CalendarContract.Events.EVENT_LOCATION, state.ticket.event?.venue?.name)
                            }
                            context.startActivity(intent)
                        },
                        onOpenDirections = {
                            val venue = state.ticket.event?.venue
                            val query = "${venue?.name ?: ""} ${venue?.address ?: ""} ${venue?.city ?: ""}".trim()
                            val gmmIntentUri = Uri.parse("geo:0,0?q=${Uri.encode(query)}")
                            val mapIntent = Intent(Intent.ACTION_VIEW, gmmIntentUri)
                            try {
                                context.startActivity(mapIntent)
                            } catch (e: Exception) {
                                val browserIntent = Intent(
                                    Intent.ACTION_VIEW,
                                    Uri.parse("https://www.google.com/maps/search/?api=1&query=${Uri.encode(query)}")
                                )
                                context.startActivity(browserIntent)
                            }
                        }
                    )
                }
            }

            // Offline vault saved confirmation toast banner
            if (state.isSavedSuccessToastVisible) {
                Surface(
                    shape = RoundedCornerShape(16.dp),
                    color = Color(0xFF1E1838),
                    border = androidx.compose.foundation.BorderStroke(1.dp, PulsrAcid),
                    shadowElevation = 8.dp,
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .padding(bottom = 24.dp, start = 20.dp, end = 20.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Outlined.CheckCircle,
                            contentDescription = null,
                            tint = PulsrAcid,
                            modifier = Modifier.size(20.dp)
                        )
                        Spacer(modifier = Modifier.width(10.dp))
                        Text(
                            text = "Pass & QR token secured in offline device vault!",
                            style = MaterialTheme.typography.bodySmall,
                            color = OnSurface,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.weight(1f)
                        )
                        IconButton(
                            onClick = { state.eventSink(TicketDetailEvent.DismissToast) },
                            modifier = Modifier.size(24.dp)
                        ) {
                            Text(text = "✕", color = OnSurfaceMedium, fontSize = 12.sp)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun TicketPassContent(
    ticket: Ticket,
    qrToken: String,
    isOfflineCached: Boolean,
    isTorchBoostActive: Boolean,
    onToggleBrightness: () -> Unit,
    onSaveOffline: () -> Unit,
    onAddToCalendar: () -> Unit,
    onOpenDirections: () -> Unit
) {
    val qrBitmap = remember(qrToken) {
        generateQrBitmap(qrToken, 512)
    }

    // Animated Holographic Rainbow Shimmer Transition
    val infiniteTransition = rememberInfiniteTransition(label = "hologramShimmer")
    val shimmerOffset by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 1000f,
        animationSpec = infiniteRepeatable(
            animation = tween(3500, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "shimmerFloat"
    )

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 20.dp, vertical = 12.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        // Holographic Security Top Ribbon with Active Shimmer
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(6.dp)
                .clip(RoundedCornerShape(topStart = 20.dp, topEnd = 20.dp))
                .background(
                    Brush.horizontalGradient(
                        colors = listOf(PulsrPink, PulsrFlame, PulsrAcid, PulsrNeon, PulsrPink),
                        startX = shimmerOffset,
                        endX = shimmerOffset + 600f
                    )
                )
        )

        // VIP Perforated Concert Pass
        Card(
            colors = CardDefaults.cardColors(containerColor = TicketBackground),
            shape = RoundedCornerShape(bottomStart = 20.dp, bottomEnd = 20.dp),
            modifier = Modifier
                .fillMaxWidth()
                .border(
                    1.dp,
                    TicketDivider,
                    RoundedCornerShape(bottomStart = 20.dp, bottomEnd = 20.dp)
                )
        ) {
            Column(
                modifier = Modifier.fillMaxWidth(),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                // Upper Section: Event Info & Tier
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(20.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        AsyncImage(
                            model = ticket.event?.coverImageUrl,
                            contentDescription = null,
                            contentScale = ContentScale.Crop,
                            modifier = Modifier
                                .size(64.dp)
                                .clip(RoundedCornerShape(12.dp))
                                .border(1.dp, SurfaceBorder, RoundedCornerShape(12.dp))
                        )
                        Spacer(modifier = Modifier.width(14.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = ticket.event?.name ?: "Event",
                                style = MaterialTheme.typography.titleMedium,
                                color = OnSurface,
                                fontWeight = FontWeight.Bold,
                                maxLines = 2
                            )
                            Spacer(modifier = Modifier.height(2.dp))
                            Text(
                                text = ticket.ticketTypeName,
                                style = MaterialTheme.typography.bodyMedium,
                                color = PulsrPink,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(14.dp))

                    // Event venue & doors status pill
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "📍 ${ticket.event?.venue?.name ?: "Venue TBA"}",
                            style = MaterialTheme.typography.bodySmall,
                            color = OnSurfaceMedium,
                            maxLines = 1,
                            modifier = Modifier.weight(1f)
                        )
                        Surface(
                            shape = RoundedCornerShape(20.dp),
                            color = PulsrAcid.copy(alpha = 0.15f),
                            border = androidx.compose.foundation.BorderStroke(1.dp, PulsrAcid.copy(alpha = 0.3f))
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(6.dp)
                                        .clip(CircleShape)
                                        .background(PulsrAcid)
                                )
                                Spacer(modifier = Modifier.width(5.dp))
                                Text(
                                    text = "VERIFIED ENTRY",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = PulsrAcid,
                                    fontWeight = FontWeight.Black,
                                    fontSize = 9.sp
                                )
                            }
                        }
                    }

                    // Security live pulse badge & offline status
                    Spacer(modifier = Modifier.height(8.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "⚡ ANTI-REPLAY PASS ACTIVE",
                            style = MaterialTheme.typography.labelSmall,
                            color = PulsrNeon,
                            fontWeight = FontWeight.Bold,
                            fontSize = 9.sp,
                            letterSpacing = 0.5.sp
                        )

                        if (isOfflineCached) {
                            Text(
                                text = "📶 STORED OFFLINE",
                                style = MaterialTheme.typography.labelSmall,
                                color = PulsrAcid,
                                fontWeight = FontWeight.Bold,
                                fontSize = 9.sp
                            )
                        }
                    }
                }

                // ─── Perforated Ticket Notches & Divider ─────────────────────
                PerforatedTicketDivider()

                // Lower Section: Turnstile QR Code & Details
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(20.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    // High Contrast QR Code with Neon Glow Frame
                    Surface(
                        color = QRBackground,
                        shape = RoundedCornerShape(20.dp),
                        modifier = Modifier
                            .size(240.dp)
                            .padding(4.dp)
                            .border(2.5.dp, GlowBorderPink, RoundedCornerShape(20.dp))
                    ) {
                        Box(contentAlignment = Alignment.Center, modifier = Modifier.padding(12.dp)) {
                            if (qrBitmap != null) {
                                Image(
                                    bitmap = qrBitmap.asImageBitmap(),
                                    contentDescription = "Admission QR Code",
                                    modifier = Modifier.fillMaxSize()
                                )
                            } else {
                                CircularProgressIndicator(color = PulsrPink)
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))
                    Text(
                        text = "Present at Turnstile / Gate Scanner",
                        style = MaterialTheme.typography.labelSmall,
                        color = OnSurfaceMedium
                    )
                    Text(
                        text = "PASS #${ticket.id.take(8).uppercase()}",
                        style = MaterialTheme.typography.labelMedium,
                        color = OnSurface,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 1.sp
                    )

                    Spacer(modifier = Modifier.height(14.dp))

                    // Turnstile Quick Utility Action Chips
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        // Brightness Boost Toggle Chip
                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            color = if (isTorchBoostActive) Color(0xFF2C2415) else Surface3Dark,
                            border = androidx.compose.foundation.BorderStroke(
                                1.dp,
                                if (isTorchBoostActive) PulsrFlame else SurfaceBorder
                            ),
                            modifier = Modifier
                                .weight(1f)
                                .clickable { onToggleBrightness() }
                        ) {
                            Row(
                                modifier = Modifier.padding(vertical = 8.dp, horizontal = 10.dp),
                                horizontalArrangement = Arrangement.Center,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = if (isTorchBoostActive) "☀️ 100% Boost: ON" else "🔅 Boost Brightness",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = if (isTorchBoostActive) PulsrFlame else OnSurfaceMedium,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 10.sp
                                )
                            }
                        }

                        // Offline Vault Cache Chip
                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            color = if (isOfflineCached) Color(0xFF14241B) else Surface3Dark,
                            border = androidx.compose.foundation.BorderStroke(
                                1.dp,
                                if (isOfflineCached) PulsrAcid else SurfaceBorder
                            ),
                            modifier = Modifier
                                .weight(1f)
                                .clickable { onSaveOffline() }
                        ) {
                            Row(
                                modifier = Modifier.padding(vertical = 8.dp, horizontal = 10.dp),
                                horizontalArrangement = Arrangement.Center,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = if (isOfflineCached) "✓ Vault Secured" else "💾 Save Offline",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = if (isOfflineCached) PulsrAcid else OnSurfaceMedium,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 10.sp
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))
                    HorizontalDivider(color = TicketDivider)
                    Spacer(modifier = Modifier.height(16.dp))

                    // Details Grid (Gate, Seat, Date, Status)
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        DetailColumn(title = "EVENT DATE", value = ticket.event?.startAt?.take(10) ?: "--")
                        DetailColumn(title = "GATE", value = ticket.gate ?: "Main Gate")
                        DetailColumn(title = "ZONE / SEAT", value = ticket.seat ?: "General Arena")
                    }
                    Spacer(modifier = Modifier.height(14.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        DetailColumn(title = "ATTENDEE", value = ticket.holderName ?: "Verified Guest")
                        DetailColumn(
                            title = "STATUS",
                            value = when (ticket.status) {
                                TicketStatus.VALID -> "Active • Ready"
                                TicketStatus.USED -> "Admitted"
                                TicketStatus.CANCELLED -> "Cancelled"
                                TicketStatus.REFUNDED -> "Refunded"
                                TicketStatus.TRANSFERRED -> "Transferred"
                            },
                            isStatus = true
                        )
                    }

                    Spacer(modifier = Modifier.height(14.dp))

                    // Holographic Authenticity Ribbon
                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        color = Surface3Dark,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 7.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.Center
                        ) {
                            Icon(
                                imageVector = Icons.Outlined.Verified,
                                contentDescription = null,
                                tint = PulsrNeon,
                                modifier = Modifier.size(14.dp)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = "PULSR VERIFIED TICKET • SECURE ENCRYPTED ADMISSION",
                                style = MaterialTheme.typography.labelSmall,
                                color = OnSurfaceMedium,
                                fontWeight = FontWeight.Bold,
                                fontSize = 9.sp
                            )
                        }
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        // Action Buttons Row: Calendar & Venue Directions
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            OutlinedButton(
                onClick = onAddToCalendar,
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier
                    .weight(1f)
                    .height(48.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, SurfaceBorder)
            ) {
                Icon(
                    imageVector = Icons.Outlined.CalendarMonth,
                    contentDescription = null,
                    tint = PulsrPink,
                    modifier = Modifier.size(16.dp)
                )
                Spacer(modifier = Modifier.width(6.dp))
                Text(text = "Calendar", color = OnSurface, style = MaterialTheme.typography.labelLarge)
            }

            OutlinedButton(
                onClick = onOpenDirections,
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier
                    .weight(1f)
                    .height(48.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, SurfaceBorder)
            ) {
                Icon(
                    imageVector = Icons.Outlined.LocationOn,
                    contentDescription = null,
                    tint = PulsrNeon,
                    modifier = Modifier.size(16.dp)
                )
                Spacer(modifier = Modifier.width(6.dp))
                Text(text = "Directions", color = OnSurface, style = MaterialTheme.typography.labelLarge)
            }
        }

        Spacer(modifier = Modifier.height(24.dp))
    }
}

@Composable
private fun PerforatedTicketDivider(modifier: Modifier = Modifier) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .height(26.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Left notch cut-out
        Box(
            modifier = Modifier
                .size(width = 13.dp, height = 26.dp)
                .clip(RoundedCornerShape(topEnd = 13.dp, bottomEnd = 13.dp))
                .background(BackgroundDark)
        )

        // Dashed perforated line in the middle
        Canvas(
            modifier = Modifier
                .weight(1f)
                .height(2.dp)
                .padding(horizontal = 4.dp)
        ) {
            val dashWidth = 12f
            val dashGap = 8f
            var startX = 0f
            while (startX < size.width) {
                drawLine(
                    color = Color(0xFF382F57),
                    start = androidx.compose.ui.geometry.Offset(startX, 0f),
                    end = androidx.compose.ui.geometry.Offset(startX + dashWidth, 0f),
                    strokeWidth = 2f
                )
                startX += dashWidth + dashGap
            }
        }

        // Right notch cut-out
        Box(
            modifier = Modifier
                .size(width = 13.dp, height = 26.dp)
                .clip(RoundedCornerShape(topStart = 13.dp, bottomStart = 13.dp))
                .background(BackgroundDark)
        )
    }
}

@Composable
private fun DetailColumn(title: String, value: String, isStatus: Boolean = false) {
    Column {
        Text(text = title, style = MaterialTheme.typography.labelSmall, color = OnSurfaceMedium, fontSize = 10.sp)
        Spacer(modifier = Modifier.height(2.dp))
        Text(
            text = value,
            style = MaterialTheme.typography.titleSmall,
            color = if (isStatus) PulsrAcid else OnSurface,
            fontWeight = FontWeight.Bold
        )
    }
}

private fun generateQrBitmap(content: String, size: Int): Bitmap? = try {
    val matrix = MultiFormatWriter().encode(content, BarcodeFormat.QR_CODE, size, size)
    BarcodeEncoder().createBitmap(matrix)
} catch (e: Exception) {
    null
}
