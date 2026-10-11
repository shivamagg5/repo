package io.eventhub.consumer.ui.feature.eventdetail

import android.content.Intent
import android.net.Uri
import android.provider.CalendarContract
import androidx.compose.animation.AnimatedVisibility
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
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil3.compose.AsyncImage
import com.slack.circuit.runtime.CircuitContext
import com.slack.circuit.runtime.screen.Screen
import com.slack.circuit.runtime.ui.Ui
import com.slack.circuit.runtime.ui.ui
import io.eventhub.consumer.domain.model.Event
import io.eventhub.consumer.domain.model.TicketType
import io.eventhub.consumer.ui.components.ErrorState
import io.eventhub.consumer.ui.components.LoadingState
import io.eventhub.consumer.ui.navigation.EventDetailRoute
import io.eventhub.consumer.ui.theme.*

class EventDetailUiFactory : Ui.Factory {
    override fun create(screen: Screen, context: CircuitContext): Ui<*>? =
        if (screen is EventDetailRoute) ui<EventDetailState> { state, modifier ->
            EventDetailScreen(state, modifier)
        } else null
}

@Composable
fun EventDetailScreen(state: EventDetailState, modifier: Modifier = Modifier) {
    val context = LocalContext.current

    Scaffold(
        modifier = modifier,
        containerColor = BackgroundDark,
        bottomBar = {
            if (state.event != null) {
                EventBottomBar(
                    event = state.event,
                    onBookTickets = { state.eventSink(EventDetailEvent.BookTicketsClicked) }
                )
            }
        }
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(bottom = paddingValues.calculateBottomPadding())
        ) {
            when {
                state.isLoading -> LoadingState(message = "Loading event details...")
                state.error != null -> ErrorState(
                    message = state.error,
                    onRetry = { state.eventSink(EventDetailEvent.RetryClicked) }
                )
                state.event != null -> {
                    EventDetailContent(
                        event = state.event,
                        isFavorited = state.isFavorited,
                        onBack = { state.eventSink(EventDetailEvent.BackClicked) },
                        onFavorite = { state.eventSink(EventDetailEvent.FavoriteClicked) },
                        onShare = {
                            val intent = Intent(Intent.ACTION_SEND).apply {
                                type = "text/plain"
                                putExtra(Intent.EXTRA_SUBJECT, state.event.name)
                                putExtra(
                                    Intent.EXTRA_TEXT,
                                    "Check out ${state.event.name} on EventHub: https://app.eventhub.io/events/${state.event.id}"
                                )
                            }
                            context.startActivity(Intent.createChooser(intent, "Share Event"))
                        },
                        onOpenDirections = {
                            val venue = state.event.venue
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
                        },
                        onAddToCalendar = {
                            val intent = Intent(Intent.ACTION_INSERT).apply {
                                data = CalendarContract.Events.CONTENT_URI
                                putExtra(CalendarContract.Events.TITLE, state.event.name)
                                putExtra(CalendarContract.Events.DESCRIPTION, state.event.description)
                                putExtra(CalendarContract.Events.EVENT_LOCATION, state.event.venue?.name)
                            }
                            context.startActivity(intent)
                        }
                    )
                }
            }
        }
    }
}

@Composable
private fun EventDetailContent(
    event: Event,
    isFavorited: Boolean,
    onBack: () -> Unit,
    onFavorite: () -> Unit,
    onShare: () -> Unit,
    onOpenDirections: () -> Unit,
    onAddToCalendar: () -> Unit
) {
    var selectedZone by remember { mutableStateOf<String?>("pit") }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(bottom = 24.dp)
    ) {
        // Hero Image with Floating Action Buttons
        item {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(340.dp)
            ) {
                AsyncImage(
                    model = event.bannerImageUrl ?: event.coverImageUrl,
                    contentDescription = null,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize()
                )
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(HeroCardOverlay)
                )

                // Top Navigation Icons
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .statusBarsPadding()
                        .padding(horizontal = 16.dp, vertical = 8.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconButton(
                        onClick = onBack,
                        modifier = Modifier
                            .size(42.dp)
                            .background(SurfaceDark.copy(alpha = 0.8f), CircleShape)
                    ) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Outlined.ArrowBack,
                            contentDescription = "Back",
                            tint = OnSurface
                        )
                    }

                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        IconButton(
                            onClick = onShare,
                            modifier = Modifier
                                .size(42.dp)
                                .background(SurfaceDark.copy(alpha = 0.8f), CircleShape)
                        ) {
                            Icon(
                                imageVector = Icons.Outlined.Share,
                                contentDescription = "Share",
                                tint = OnSurface
                            )
                        }
                        IconButton(
                            onClick = onFavorite,
                            modifier = Modifier
                                .size(42.dp)
                                .background(SurfaceDark.copy(alpha = 0.8f), CircleShape)
                        ) {
                            Icon(
                                imageVector = if (isFavorited) Icons.Filled.Favorite else Icons.Outlined.FavoriteBorder,
                                contentDescription = "Favorite",
                                tint = if (isFavorited) PulsrPink else OnSurface
                            )
                        }
                    }
                }
            }
        }

        // Title and Category Header
        item {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp)
                    .offset(y = (-20).dp)
            ) {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    event.categories.forEach { cat ->
                        Surface(
                            shape = RoundedCornerShape(6.dp),
                            color = PulsrPink.copy(alpha = 0.15f),
                            border = androidx.compose.foundation.BorderStroke(1.dp, PulsrPink.copy(alpha = 0.3f))
                        ) {
                            Text(
                                text = cat.uppercase(),
                                style = MaterialTheme.typography.labelSmall,
                                color = PulsrPink,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                    Surface(
                        shape = RoundedCornerShape(6.dp),
                        color = PulsrAcid.copy(alpha = 0.15f)
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp),
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Outlined.Verified,
                                contentDescription = null,
                                tint = PulsrAcid,
                                modifier = Modifier.size(12.dp)
                            )
                            Text(
                                text = "VERIFIED EVENT",
                                style = MaterialTheme.typography.labelSmall,
                                color = PulsrAcid,
                                fontWeight = FontWeight.Bold,
                                fontSize = 10.sp
                            )
                        }
                    }
                }
                Spacer(modifier = Modifier.height(10.dp))
                Text(
                    text = event.name,
                    style = MaterialTheme.typography.headlineMedium,
                    color = OnSurface,
                    fontWeight = FontWeight.Bold
                )
            }
        }

        // Info Cards: Date, Time & Venue with Interactive Intent Actions
        item {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                InfoTile(
                    icon = Icons.Outlined.CalendarToday,
                    title = event.startAt.take(10),
                    subtitle = if (event.endAt != null) "Until ${event.endAt.take(10)}" else "Doors open 1 hour prior",
                    actionLabel = "Add to Calendar",
                    onActionClick = onAddToCalendar
                )
                event.venue?.let { venue ->
                    InfoTile(
                        icon = Icons.Outlined.LocationOn,
                        title = venue.name,
                        subtitle = "${venue.address ?: ""}${if (!venue.city.isNullOrEmpty()) ", ${venue.city}" else ""}",
                        actionLabel = "Get Directions",
                        onActionClick = onOpenDirections
                    )
                }
                event.organizer?.let { org ->
                    InfoTile(
                        icon = Icons.Outlined.Person,
                        title = org.name,
                        subtitle = if (org.verified) "Verified Organizer" else "Event Organizer"
                    )
                }
            }
        }

        // About / Description
        item {
            Spacer(modifier = Modifier.height(24.dp))
            Column(modifier = Modifier.padding(horizontal = 20.dp)) {
                Text(
                    text = "About Event",
                    style = MaterialTheme.typography.titleLarge,
                    color = OnSurface,
                    fontWeight = FontWeight.SemiBold
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = event.description ?: "No description provided for this event.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = OnSurfaceMedium,
                    lineHeight = 22.sp
                )
            }
        }

        // ─── Interactive Arena & Stage Layout Visualizer ─────────────────────
        item {
            Spacer(modifier = Modifier.height(24.dp))
            Column(modifier = Modifier.padding(horizontal = 20.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Arena & Stage Layout",
                        style = MaterialTheme.typography.titleLarge,
                        color = OnSurface,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "Tap zone to preview view",
                        style = MaterialTheme.typography.labelSmall,
                        color = PulsrNeon
                    )
                }
                Spacer(modifier = Modifier.height(12.dp))

                ArenaZonePreviewCard(
                    selectedZone = selectedZone,
                    onSelectZone = { selectedZone = it }
                )
            }
        }

        // Ticket Types Preview
        if (event.ticketTypes.isNotEmpty()) {
            item {
                Spacer(modifier = Modifier.height(24.dp))
                Text(
                    text = "Available Ticket Tiers",
                    style = MaterialTheme.typography.titleLarge,
                    color = OnSurface,
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier.padding(horizontal = 20.dp)
                )
                Spacer(modifier = Modifier.height(12.dp))
            }
            items(event.ticketTypes, key = { it.id }) { tier ->
                TicketTierCard(
                    tier = tier,
                    modifier = Modifier.padding(horizontal = 20.dp, vertical = 6.dp)
                )
            }
        }
    }
}

@Composable
private fun ArenaZonePreviewCard(
    selectedZone: String?,
    onSelectZone: (String) -> Unit
) {
    Card(
        colors = CardDefaults.cardColors(containerColor = SurfaceDark),
        shape = RoundedCornerShape(16.dp),
        modifier = Modifier
            .fillMaxWidth()
            .border(1.dp, SurfaceBorder, RoundedCornerShape(16.dp))
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            // Stage Rig Bar
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(34.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .background(Surface2Dark)
                    .border(1.dp, SurfaceBorder, RoundedCornerShape(8.dp)),
                contentAlignment = Alignment.Center
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Box(modifier = Modifier.size(5.dp).clip(CircleShape).background(PulsrPink))
                    Text(
                        text = "MAIN STAGE & AUDIO RIG",
                        style = MaterialTheme.typography.labelSmall,
                        color = OnSurface,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 1.2.sp
                    )
                    Box(modifier = Modifier.size(5.dp).clip(CircleShape).background(PulsrPink))
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            // 3 Zone Clickable Blocks with Equal Sizing
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                ArenaZonePill(
                    title = "VIP Front Pit",
                    subtitle = "5m Front Row",
                    accentColor = PulsrFlame,
                    isSelected = selectedZone == "pit",
                    onClick = { onSelectZone("pit") },
                    modifier = Modifier.weight(1f)
                )
                ArenaZonePill(
                    title = "Standing Arena",
                    subtitle = "Main Floor",
                    accentColor = PulsrPink,
                    isSelected = selectedZone == "standing",
                    onClick = { onSelectZone("standing") },
                    modifier = Modifier.weight(1f)
                )
                ArenaZonePill(
                    title = "Grandstand",
                    subtitle = "Stadium Tier",
                    accentColor = PulsrNeon,
                    isSelected = selectedZone == "grandstand",
                    onClick = { onSelectZone("grandstand") },
                    modifier = Modifier.weight(1f)
                )
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Zone Viewpoint Telemetry Text
            Surface(
                shape = RoundedCornerShape(10.dp),
                color = Surface2Dark,
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 9.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        text = when (selectedZone) {
                            "pit" -> "Direct Eye-Level View • 5m from Headliner"
                            "standing" -> "Immersive Production & Acoustic Arena"
                            "grandstand" -> "Panoramic Stadium Overview • Reserved Seats"
                            else -> "Select a zone to preview sightline"
                        },
                        style = MaterialTheme.typography.bodySmall,
                        color = OnSurfaceMedium,
                        fontSize = 11.sp
                    )
                    Text(
                        text = "100% Sightline",
                        style = MaterialTheme.typography.labelSmall,
                        color = PulsrAcid,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }
    }
}

@Composable
private fun ArenaZonePill(
    title: String,
    subtitle: String,
    accentColor: Color,
    isSelected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Surface(
        shape = RoundedCornerShape(10.dp),
        color = if (isSelected) accentColor.copy(alpha = 0.2f) else Surface2Dark,
        border = androidx.compose.foundation.BorderStroke(
            1.dp,
            if (isSelected) accentColor else SurfaceBorder
        ),
        modifier = modifier
            .height(58.dp)
            .clip(RoundedCornerShape(10.dp))
            .clickable(onClick = onClick)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(vertical = 8.dp, horizontal = 4.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Text(
                text = title,
                style = MaterialTheme.typography.labelSmall,
                color = if (isSelected) accentColor else OnSurface,
                fontWeight = FontWeight.Bold,
                textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                fontSize = 11.sp,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Spacer(modifier = Modifier.height(2.dp))
            Text(
                text = subtitle,
                style = MaterialTheme.typography.bodySmall,
                color = OnSurfaceLow,
                fontSize = 9.sp,
                textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }
    }
}

@Composable
private fun InfoTile(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    title: String,
    subtitle: String,
    actionLabel: String? = null,
    onActionClick: (() -> Unit)? = null
) {
    Card(
        colors = CardDefaults.cardColors(containerColor = SurfaceDark),
        shape = RoundedCornerShape(12.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier.padding(14.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Surface(
                shape = CircleShape,
                color = PulsrPink.copy(alpha = 0.15f),
                modifier = Modifier.size(42.dp)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(imageVector = icon, contentDescription = null, tint = PulsrPink, modifier = Modifier.size(20.dp))
                }
            }
            Spacer(modifier = Modifier.width(14.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(text = title, style = MaterialTheme.typography.titleMedium, color = OnSurface, fontWeight = FontWeight.SemiBold)
                Text(text = subtitle, style = MaterialTheme.typography.bodySmall, color = OnSurfaceMedium)
            }
            if (actionLabel != null && onActionClick != null) {
                TextButton(onClick = onActionClick) {
                    Text(
                        text = actionLabel,
                        style = MaterialTheme.typography.labelSmall,
                        color = PulsrNeon,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }
    }
}

@Composable
private fun TicketTierCard(
    tier: TicketType,
    modifier: Modifier = Modifier
) {
    Card(
        colors = CardDefaults.cardColors(containerColor = SurfaceDark),
        shape = RoundedCornerShape(16.dp),
        modifier = modifier
            .fillMaxWidth()
            .border(
                1.dp,
                if (tier.isSoldOut) SurfaceBorder else GlowBorderPink.copy(alpha = 0.4f),
                RoundedCornerShape(16.dp)
            )
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = tier.name,
                    style = MaterialTheme.typography.titleMedium,
                    color = if (tier.isSoldOut) OnSurfaceLow else OnSurface,
                    fontWeight = FontWeight.Bold
                )
                if (!tier.description.isNullOrEmpty()) {
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(
                        text = tier.description,
                        style = MaterialTheme.typography.bodySmall,
                        color = OnSurfaceMedium,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                }
                Spacer(modifier = Modifier.height(6.dp))
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(6.dp))
                            .background(if (tier.isSoldOut) ErrorRed.copy(alpha = 0.15f) else PulsrAcid.copy(alpha = 0.15f))
                            .padding(horizontal = 6.dp, vertical = 2.dp)
                    ) {
                        Text(
                            text = when {
                                tier.isSoldOut -> "SOLD OUT"
                                tier.available != null && tier.available < 20 -> "ONLY ${tier.available} LEFT"
                                else -> "AVAILABLE"
                            },
                            style = MaterialTheme.typography.labelSmall,
                            color = if (tier.isSoldOut) ErrorRed else PulsrAcid,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }
            Text(
                text = formatCurrency(tier.price),
                style = MaterialTheme.typography.titleLarge,
                color = if (tier.isSoldOut) OnSurfaceLow else AccentGold,
                fontWeight = FontWeight.Bold
            )
        }
    }
}

@Composable
private fun EventBottomBar(
    event: Event,
    onBookTickets: () -> Unit
) {
    Surface(
        color = Surface2Dark,
        tonalElevation = 12.dp,
        modifier = Modifier
            .fillMaxWidth()
            .border(width = 1.dp, color = SurfaceBorder, shape = RoundedCornerShape(topStart = 20.dp, topEnd = 20.dp))
    ) {
        Row(
            modifier = Modifier
                .navigationBarsPadding()
                .padding(horizontal = 20.dp, vertical = 14.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    Box(modifier = Modifier.size(6.dp).clip(CircleShape).background(PulsrAcid))
                    Text(
                        text = "LIVE INVENTORY",
                        style = MaterialTheme.typography.labelSmall,
                        color = PulsrAcid,
                        fontWeight = FontWeight.Black,
                        fontSize = 9.sp
                    )
                }
                Text(
                    text = formatCurrency(event.minPrice),
                    style = MaterialTheme.typography.headlineSmall,
                    color = if (event.isFree) PulsrAcid else AccentGold,
                    fontWeight = FontWeight.Bold
                )
            }
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(14.dp))
                    .background(HotGradient)
                    .clickable(onClick = onBookTickets)
                    .padding(horizontal = 24.dp, vertical = 14.dp),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "Select Tickets →",
                    style = MaterialTheme.typography.labelLarge,
                    color = OnPrimary,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 0.5.sp
                )
            }
        }
    }
}
