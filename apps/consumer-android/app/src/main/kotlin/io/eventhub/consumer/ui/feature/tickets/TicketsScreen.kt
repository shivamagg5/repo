package io.eventhub.consumer.ui.feature.tickets

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowForward
import androidx.compose.material.icons.outlined.CalendarToday
import androidx.compose.material.icons.outlined.ConfirmationNumber
import androidx.compose.material.icons.outlined.LocationOn
import androidx.compose.material.icons.outlined.QrCode
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil3.compose.AsyncImage
import com.slack.circuit.runtime.CircuitContext
import com.slack.circuit.runtime.screen.Screen
import com.slack.circuit.runtime.ui.Ui
import com.slack.circuit.runtime.ui.ui
import io.eventhub.consumer.domain.model.Ticket
import io.eventhub.consumer.domain.model.TicketStatus
import io.eventhub.consumer.ui.components.EmptyState
import io.eventhub.consumer.ui.components.ErrorState
import io.eventhub.consumer.ui.components.LoadingState
import io.eventhub.consumer.ui.navigation.TicketsRoute
import io.eventhub.consumer.ui.theme.*

class TicketsUiFactory : Ui.Factory {
    override fun create(screen: Screen, context: CircuitContext): Ui<*>? =
        if (screen is TicketsRoute) ui<TicketsState> { state, modifier ->
            TicketsScreen(state, modifier)
        } else null
}

@Composable
fun TicketsScreen(state: TicketsState, modifier: Modifier = Modifier) {
    Scaffold(
        modifier = modifier,
        containerColor = BackgroundDark,
        topBar = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .statusBarsPadding()
                    .padding(horizontal = 20.dp, vertical = 12.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "My Passes",
                        style = MaterialTheme.typography.headlineMedium,
                        color = OnSurface,
                        fontWeight = FontWeight.Bold
                    )
                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = PulsrPink.copy(alpha = 0.15f)
                    ) {
                        Text(
                            text = "${state.tickets.size} TOTAL",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Black,
                            color = PulsrPink,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                        )
                    }
                }
                Spacer(modifier = Modifier.height(14.dp))
                TabRow(
                    selectedTabIndex = state.selectedTab,
                    containerColor = SurfaceDark,
                    contentColor = PulsrPink,
                    divider = {}
                ) {
                    val upcomingCount = state.tickets.count { it.status == TicketStatus.VALID }
                    val pastCount = state.tickets.count { it.status != TicketStatus.VALID }

                    Tab(
                        selected = state.selectedTab == 0,
                        onClick = { state.eventSink(TicketsEvent.TabSelected(0)) },
                        text = {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                Text(
                                    "Upcoming Passes",
                                    fontWeight = if (state.selectedTab == 0) FontWeight.Bold else FontWeight.Medium,
                                    color = if (state.selectedTab == 0) PulsrPink else OnSurfaceMedium
                                )
                                if (upcomingCount > 0) {
                                    Surface(
                                        shape = CircleShape,
                                        color = if (state.selectedTab == 0) PulsrPink else Surface2Dark
                                    ) {
                                        Text(
                                            text = "$upcomingCount",
                                            fontSize = 10.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = if (state.selectedTab == 0) OnPrimary else OnSurfaceMedium,
                                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 1.dp)
                                        )
                                    }
                                }
                            }
                        }
                    )
                    Tab(
                        selected = state.selectedTab == 1,
                        onClick = { state.eventSink(TicketsEvent.TabSelected(1)) },
                        text = {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                Text(
                                    "Past Events",
                                    fontWeight = if (state.selectedTab == 1) FontWeight.Bold else FontWeight.Medium,
                                    color = if (state.selectedTab == 1) PulsrPink else OnSurfaceMedium
                                )
                                if (pastCount > 0) {
                                    Surface(
                                        shape = CircleShape,
                                        color = Surface2Dark
                                    ) {
                                        Text(
                                            text = "$pastCount",
                                            fontSize = 10.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = OnSurfaceMedium,
                                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 1.dp)
                                        )
                                    }
                                }
                            }
                        }
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
                state.isLoading -> LoadingState(message = "Loading your ticket vault...")
                state.error != null -> ErrorState(
                    message = state.error,
                    onRetry = { state.eventSink(TicketsEvent.RetryClicked) }
                )
                else -> {
                    val filteredTickets = if (state.selectedTab == 0) {
                        state.tickets.filter { it.status == TicketStatus.VALID }
                    } else {
                        state.tickets.filter { it.status != TicketStatus.VALID }
                    }

                    if (filteredTickets.isEmpty()) {
                        EmptyState(
                            title = if (state.selectedTab == 0) "No upcoming passes" else "No past events recorded",
                            description = if (state.selectedTab == 0) 
                                "Explore festivals, live raves, and gigs happening near you to reserve entry." 
                            else 
                                "Used and concluded admission passes will be catalogued here for your memories.",
                            actionText = if (state.selectedTab == 0) "Explore Events" else null,
                            onActionClick = { state.eventSink(TicketsEvent.ExploreEventsClicked) },
                            icon = Icons.Outlined.ConfirmationNumber
                        )
                    } else {
                        LazyColumn(
                            contentPadding = PaddingValues(horizontal = 20.dp, vertical = 12.dp),
                            verticalArrangement = Arrangement.spacedBy(16.dp)
                        ) {
                            items(filteredTickets, key = { it.id }) { ticket ->
                                TicketCardItem(
                                    ticket = ticket,
                                    onClick = { state.eventSink(TicketsEvent.TicketClicked(ticket.id)) }
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun TicketCardItem(
    ticket: Ticket,
    onClick: () -> Unit
) {
    Card(
        colors = CardDefaults.cardColors(containerColor = TicketBackground),
        shape = RoundedCornerShape(18.dp),
        modifier = Modifier
            .fillMaxWidth()
            .border(1.dp, SurfaceBorder, RoundedCornerShape(18.dp))
            .clickable(onClick = onClick)
    ) {
        Column {
            // Holographic security accent bar on top
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(4.dp)
                    .background(
                        Brush.horizontalGradient(
                            listOf(PulsrPink, PulsrFlame, PulsrAcid, PulsrNeon)
                        )
                    )
            )

            // Upper Pass Details
            Row(
                modifier = Modifier.padding(14.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                AsyncImage(
                    model = ticket.event?.coverImageUrl,
                    contentDescription = null,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier
                        .size(80.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .border(1.dp, SurfaceBorder, RoundedCornerShape(12.dp))
                )
                Spacer(modifier = Modifier.width(14.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Surface(
                            shape = RoundedCornerShape(4.dp),
                            color = when (ticket.status) {
                                TicketStatus.VALID -> PulsrAcid.copy(alpha = 0.15f)
                                TicketStatus.USED -> Surface3Dark
                                else -> ErrorRed.copy(alpha = 0.15f)
                            }
                        ) {
                            Text(
                                text = if (ticket.status == TicketStatus.VALID) "VALID ENTRY PASS" else ticket.status.name,
                                style = MaterialTheme.typography.labelSmall,
                                color = when (ticket.status) {
                                    TicketStatus.VALID -> PulsrAcid
                                    TicketStatus.USED -> OnSurfaceMedium
                                    else -> ErrorRed
                                },
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                                fontWeight = FontWeight.Black,
                                fontSize = 9.sp,
                                letterSpacing = 0.5.sp
                            )
                        }

                        if (ticket.status == TicketStatus.VALID) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(4.dp)
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(6.dp)
                                        .background(PulsrAcid, CircleShape)
                                )
                                Text(
                                    text = "READY",
                                    fontSize = 9.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = PulsrAcid
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = ticket.event?.name ?: "Event Ticket",
                        style = MaterialTheme.typography.titleMedium,
                        color = OnSurface,
                        fontWeight = FontWeight.Bold,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(
                        text = ticket.ticketTypeName,
                        style = MaterialTheme.typography.bodySmall,
                        color = AccentGold,
                        fontWeight = FontWeight.SemiBold
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(3.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Outlined.CalendarToday,
                                contentDescription = null,
                                tint = OnSurfaceLow,
                                modifier = Modifier.size(11.dp)
                            )
                            Text(
                                text = ticket.event?.startAt?.take(10) ?: "",
                                style = MaterialTheme.typography.labelSmall,
                                color = OnSurfaceMedium,
                                fontSize = 11.sp
                            )
                        }
                        if (!ticket.event?.venue?.city.isNullOrBlank()) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(3.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Outlined.LocationOn,
                                    contentDescription = null,
                                    tint = PulsrFlame,
                                    modifier = Modifier.size(11.dp)
                                )
                                Text(
                                    text = ticket.event?.venue?.city ?: "",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = OnSurfaceMedium,
                                    fontSize = 11.sp
                                )
                            }
                        }
                    }
                }
            }

            // Physical Perforated Ticket Notches & Dashed Line
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(22.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Left notch
                Box(
                    modifier = Modifier
                        .size(width = 11.dp, height = 22.dp)
                        .clip(RoundedCornerShape(topEnd = 11.dp, bottomEnd = 11.dp))
                        .background(BackgroundDark)
                )

                // Dashed line
                Canvas(
                    modifier = Modifier
                        .weight(1f)
                        .height(2.dp)
                        .padding(horizontal = 4.dp)
                ) {
                    val dashWidth = 10f
                    val dashGap = 6f
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

                // Right notch
                Box(
                    modifier = Modifier
                        .size(width = 11.dp, height = 22.dp)
                        .clip(RoundedCornerShape(topStart = 11.dp, bottomStart = 11.dp))
                        .background(BackgroundDark)
                )
            }

            // Lower Admission Action Strip
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 10.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = "PASS #${ticket.id.take(8).uppercase()}",
                        fontFamily = FontFamily.Monospace,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = OnSurface
                    )
                    Text(
                        text = "Tap to show gate entry pass",
                        fontSize = 11.sp,
                        color = OnSurfaceMedium
                    )
                }

                Surface(
                    shape = RoundedCornerShape(10.dp),
                    color = PulsrPink.copy(alpha = 0.12f),
                    border = androidx.compose.foundation.BorderStroke(1.dp, PulsrPink.copy(alpha = 0.3f))
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Outlined.QrCode,
                            contentDescription = null,
                            tint = PulsrPink,
                            modifier = Modifier.size(16.dp)
                        )
                        Text(
                            text = "SCAN QR",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Black,
                            color = PulsrPink
                        )
                    }
                }
            }
        }
    }
}
