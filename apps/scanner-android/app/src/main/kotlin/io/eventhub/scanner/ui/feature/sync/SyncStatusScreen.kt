package io.eventhub.scanner.ui.feature.sync

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.outlined.Check
import androidx.compose.material.icons.outlined.ErrorOutline
import androidx.compose.material.icons.outlined.Pending
import androidx.compose.material.icons.outlined.Sync
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
import io.eventhub.scanner.data.local.db.CheckInQueueTable
import io.eventhub.scanner.ui.navigation.SyncStatusRoute
import io.eventhub.scanner.ui.theme.*
import java.text.SimpleDateFormat
import java.util.*

class SyncStatusUiFactory : Ui.Factory {
    override fun create(screen: Screen, context: CircuitContext): Ui<*>? =
        if (screen is SyncStatusRoute) ui<SyncStatusState> { state, modifier ->
            SyncStatusScreen(state, modifier)
        } else null
}

@Composable
fun SyncStatusScreen(state: SyncStatusState, modifier: Modifier = Modifier) {
    val pendingCount = state.records.count { it.syncStatus == "PENDING" }
    val syncedCount = state.records.count { it.syncStatus == "SYNCED" }
    val conflictCount = state.records.count { it.syncStatus == "CONFLICT" }

    Scaffold(
        modifier = modifier,
        containerColor = ScannerBackground,
        topBar = {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .statusBarsPadding()
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(onClick = { state.eventSink(SyncStatusEvent.BackClicked) }) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Outlined.ArrowBack,
                        contentDescription = "Back",
                        tint = ScannerOnSurface
                    )
                }
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "Sync Queue & Logs",
                    style = MaterialTheme.typography.titleLarge,
                    color = ScannerOnSurface,
                    fontWeight = FontWeight.Bold
                )
            }
        },
        bottomBar = {
            Surface(
                color = ScannerSurface,
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier
                        .navigationBarsPadding()
                        .padding(horizontal = 16.dp, vertical = 12.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    OutlinedButton(
                        onClick = { state.eventSink(SyncStatusEvent.ClearSyncedClicked) },
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier.weight(1f)
                    ) {
                        Text("Clear Synced", color = ScannerOnSurfaceMed)
                    }

                    Button(
                        onClick = { state.eventSink(SyncStatusEvent.ForceSyncClicked) },
                        enabled = !state.isSyncing,
                        colors = ButtonDefaults.buttonColors(containerColor = ScannerPrimary),
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier.weight(1f)
                    ) {
                        if (state.isSyncing) {
                            CircularProgressIndicator(color = Color.Black, strokeWidth = 2.dp, modifier = Modifier.size(18.dp))
                        } else {
                            Icon(Icons.Outlined.Sync, contentDescription = null, tint = Color.Black, modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Force Sync", color = Color.Black, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
    ) { paddingValues ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues),
            contentPadding = PaddingValues(horizontal = 20.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            // Stats Row
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    SyncStatCard(title = "Pending", count = "$pendingCount", color = ScanDuplicateAmber, modifier = Modifier.weight(1f))
                    SyncStatCard(title = "Synced", count = "$syncedCount", color = ScanValidGreen, modifier = Modifier.weight(1f))
                    SyncStatCard(title = "Conflicts", count = "$conflictCount", color = ScanInvalidRed, modifier = Modifier.weight(1f))
                }
            }

            item {
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "Recent Scan Logs",
                    style = MaterialTheme.typography.titleMedium,
                    color = ScannerOnSurface,
                    fontWeight = FontWeight.SemiBold
                )
            }

            if (state.records.isEmpty()) {
                item {
                    Text(
                        text = "No local scan records in queue.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = ScannerOnSurfaceMed
                    )
                }
            } else {
                items(state.records, key = { it.syncId }) { record ->
                    QueueRecordItem(record = record)
                }
            }
        }
    }
}

@Composable
private fun SyncStatCard(title: String, count: String, color: Color, modifier: Modifier = Modifier) {
    Card(
        colors = CardDefaults.cardColors(containerColor = ScannerSurface),
        shape = RoundedCornerShape(12.dp),
        modifier = modifier
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Text(text = title, style = MaterialTheme.typography.labelSmall, color = ScannerOnSurfaceMed)
            Spacer(modifier = Modifier.height(4.dp))
            Text(text = count, style = MaterialTheme.typography.titleLarge, color = color, fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
private fun QueueRecordItem(record: CheckInQueueTable) {
    val sdf = SimpleDateFormat("HH:mm:ss", Locale.getDefault())
    val time = sdf.format(Date(record.localTimestamp))

    Card(
        colors = CardDefaults.cardColors(containerColor = ScannerSurface),
        shape = RoundedCornerShape(10.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Column {
                Text(
                    text = "Ticket: ${record.ticketId.take(12).uppercase()}",
                    style = MaterialTheme.typography.titleSmall,
                    color = ScannerOnSurface,
                    fontWeight = FontWeight.SemiBold
                )
                Text(
                    text = "Logged: $time • Device: ${record.deviceId}",
                    style = MaterialTheme.typography.bodySmall,
                    color = ScannerOnSurfaceMed
                )
            }
            Surface(
                shape = RoundedCornerShape(6.dp),
                color = when (record.syncStatus) {
                    "SYNCED" -> ScanValidGreen.copy(alpha = 0.2f)
                    "CONFLICT" -> ScanInvalidRed.copy(alpha = 0.2f)
                    else -> ScanDuplicateAmber.copy(alpha = 0.2f)
                }
            ) {
                Text(
                    text = record.syncStatus,
                    style = MaterialTheme.typography.labelSmall,
                    color = when (record.syncStatus) {
                        "SYNCED" -> ScanValidGreen
                        "CONFLICT" -> ScanInvalidRed
                        else -> ScanDuplicateAmber
                    },
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                    fontWeight = FontWeight.Bold
                )
            }
        }
    }
}
