package io.eventhub.scanner.ui.feature.eventselect

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.Logout
import androidx.compose.material.icons.outlined.CheckCircle
import androidx.compose.material.icons.outlined.Download
import androidx.compose.material.icons.outlined.Event
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.slack.circuit.runtime.CircuitContext
import com.slack.circuit.runtime.screen.Screen
import com.slack.circuit.runtime.ui.Ui
import com.slack.circuit.runtime.ui.ui
import io.eventhub.scanner.data.remote.dto.ScannerEventDto
import io.eventhub.scanner.ui.navigation.EventSelectRoute
import io.eventhub.scanner.ui.theme.*

class EventSelectUiFactory : Ui.Factory {
    override fun create(screen: Screen, context: CircuitContext): Ui<*>? =
        if (screen is EventSelectRoute) ui<EventSelectState> { state, modifier ->
            EventSelectScreen(state, modifier)
        } else null
}

@Composable
fun EventSelectScreen(state: EventSelectState, modifier: Modifier = Modifier) {
    Scaffold(
        modifier = modifier,
        containerColor = ScannerBackground,
        topBar = {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .statusBarsPadding()
                    .padding(horizontal = 20.dp, vertical = 12.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = "Select Event",
                        style = MaterialTheme.typography.titleLarge,
                        color = ScannerOnSurface,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "Choose event to initialize offline validator",
                        style = MaterialTheme.typography.bodySmall,
                        color = ScannerOnSurfaceMed
                    )
                }
                IconButton(onClick = { state.eventSink(EventSelectEvent.SignOutClicked) }) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Outlined.Logout,
                        contentDescription = "Sign out",
                        tint = ScannerOnSurfaceMed
                    )
                }
            }
        },
        bottomBar = {
            Surface(
                color = ScannerSurface,
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier
                        .navigationBarsPadding()
                        .padding(horizontal = 20.dp, vertical = 14.dp)
                ) {
                    if (state.isDownloading) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            CircularProgressIndicator(
                                color = ScannerPrimary,
                                strokeWidth = 2.dp,
                                modifier = Modifier.size(24.dp)
                            )
                            Text(
                                text = state.downloadProgress,
                                style = MaterialTheme.typography.bodyMedium,
                                color = ScannerPrimary
                            )
                        }
                    } else {
                        Button(
                            onClick = { state.eventSink(EventSelectEvent.DownloadAndStartScanning) },
                            enabled = state.selectedEventId != null,
                            colors = ButtonDefaults.buttonColors(containerColor = ScannerPrimary),
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(52.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Outlined.Download,
                                contentDescription = null,
                                tint = Color.Black,
                                modifier = Modifier.size(20.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = "Download Dataset & Start",
                                style = MaterialTheme.typography.titleMedium,
                                color = Color.Black,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
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
                state.isLoading -> {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = ScannerPrimary)
                    }
                }
                state.error != null && state.events.isEmpty() -> {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(text = state.error, color = ScanInvalidRed)
                            Spacer(modifier = Modifier.height(12.dp))
                            Button(onClick = { state.eventSink(EventSelectEvent.RetryClicked) }) {
                                Text("Retry")
                            }
                        }
                    }
                }
                else -> {
                    LazyColumn(
                        contentPadding = PaddingValues(horizontal = 20.dp, vertical = 12.dp),
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        item {
                            Text(
                                text = "Gate Assignment",
                                style = MaterialTheme.typography.titleMedium,
                                color = ScannerOnSurface,
                                fontWeight = FontWeight.SemiBold
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                listOf("Gate A", "Gate B", "VIP Gate", "North Entrance").forEach { gate ->
                                    val isSelected = state.selectedGate == gate
                                    Surface(
                                        shape = RoundedCornerShape(8.dp),
                                        color = if (isSelected) ScannerPrimary else ScannerSurface2,
                                        modifier = Modifier.clickable {
                                            state.eventSink(EventSelectEvent.GateChanged(gate))
                                        }
                                    ) {
                                        Text(
                                            text = gate,
                                            color = if (isSelected) Color.Black else ScannerOnSurface,
                                            style = MaterialTheme.typography.labelMedium,
                                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp)
                                        )
                                    }
                                }
                            }
                        }

                        item {
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = "Assigned Events",
                                style = MaterialTheme.typography.titleMedium,
                                color = ScannerOnSurface,
                                fontWeight = FontWeight.SemiBold
                            )
                        }

                        items(state.events, key = { it.id }) { event ->
                            val isSelected = state.selectedEventId == event.id
                            EventSelectCard(
                                event = event,
                                isSelected = isSelected,
                                onClick = { state.eventSink(EventSelectEvent.EventSelected(event.id)) }
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun EventSelectCard(
    event: ScannerEventDto,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    Card(
        colors = CardDefaults.cardColors(containerColor = ScannerSurface),
        shape = RoundedCornerShape(14.dp),
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .border(
                2.dp,
                if (isSelected) ScannerPrimary else Color.Transparent,
                RoundedCornerShape(14.dp)
            )
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = event.name,
                    style = MaterialTheme.typography.titleMedium,
                    color = ScannerOnSurface,
                    fontWeight = FontWeight.Bold
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "${event.startAt.take(10)} • ${event.venueName ?: "Venue"}",
                    style = MaterialTheme.typography.bodySmall,
                    color = ScannerOnSurfaceMed
                )
                Spacer(modifier = Modifier.height(8.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                    Text(
                        text = "Total: ${event.totalTickets}",
                        style = MaterialTheme.typography.labelSmall,
                        color = ScannerOnSurfaceMed
                    )
                    Text(
                        text = "Checked In: ${event.checkedInCount}",
                        style = MaterialTheme.typography.labelSmall,
                        color = ScannerPrimary
                    )
                }
            }
            if (isSelected) {
                Icon(
                    imageVector = Icons.Outlined.CheckCircle,
                    contentDescription = "Selected",
                    tint = ScannerPrimary,
                    modifier = Modifier.size(24.dp)
                )
            }
        }
    }
}
