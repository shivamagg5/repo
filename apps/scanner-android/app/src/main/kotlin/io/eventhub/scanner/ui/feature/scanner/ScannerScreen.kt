package io.eventhub.scanner.ui.feature.scanner

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import com.slack.circuit.runtime.CircuitContext
import com.slack.circuit.runtime.screen.Screen
import com.slack.circuit.runtime.ui.Ui
import com.slack.circuit.runtime.ui.ui
import io.eventhub.scanner.domain.engine.ScanResult
import io.eventhub.scanner.ui.camera.BarcodeAnalyzer
import io.eventhub.scanner.ui.camera.CameraPreview
import io.eventhub.scanner.ui.navigation.ScannerRoute
import io.eventhub.scanner.ui.theme.*

class ScannerUiFactory : Ui.Factory {
    override fun create(screen: Screen, context: CircuitContext): Ui<*>? =
        if (screen is ScannerRoute) ui<ScannerState> { state, modifier ->
            ScannerScreen(state, modifier)
        } else null
}

@Composable
fun ScannerScreen(state: ScannerState, modifier: Modifier = Modifier) {
    val context = LocalContext.current
    var hasCameraPermission by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED
        )
    }

    val permissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { granted ->
        hasCameraPermission = granted
    }

    LaunchedEffect(Unit) {
        if (!hasCameraPermission) {
            permissionLauncher.launch(Manifest.permission.CAMERA)
        }
    }

    val analyzer = remember {
        BarcodeAnalyzer { barcode ->
            state.eventSink(ScannerEvent.BarcodeScanned(barcode))
        }
    }

    Scaffold(
        modifier = modifier,
        containerColor = Color.Black
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            if (hasCameraPermission) {
                // Camera Background Preview with Torch Control
                CameraPreview(
                    modifier = Modifier.fillMaxSize(),
                    analyzer = analyzer,
                    isTorchOn = state.isTorchOn
                )

                // Scanning Reticle Overlay with Sweeping Laser Line
                ScannerReticleOverlay(isContinuousMode = state.isContinuousMode)

                // Turnstile Peripheral Flash Frame (instant peripheral vision cue for bouncers)
                state.lastScanResult?.let { result ->
                    val flashBorderColor = when (result) {
                        is ScanResult.Success -> ScanValidGreen
                        is ScanResult.AlreadyCheckedIn -> ScanDuplicateAmber
                        else -> ScanInvalidRed
                    }
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .border(6.dp, flashBorderColor)
                    )
                }
            } else {
                // Permission rationale box
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(ScannerBackground)
                        .padding(32.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Outlined.PhotoCamera,
                            contentDescription = null,
                            tint = ScannerPrimary,
                            modifier = Modifier.size(56.dp)
                        )
                        Text(
                            text = "Camera Permission Required",
                            style = MaterialTheme.typography.titleLarge,
                            color = ScannerOnSurface,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "To scan ticket QR codes and admit attendees at the gate, please allow camera access.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = ScannerOnSurfaceMed,
                            textAlign = TextAlign.Center
                        )
                        Button(
                            onClick = { permissionLauncher.launch(Manifest.permission.CAMERA) },
                            colors = ButtonDefaults.buttonColors(containerColor = ScannerPrimary),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Text("Enable Camera", color = Color.Black, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }

            // Operational HUD Top Bar
            OperationalHudTopBar(
                state = state,
                onSyncClick = { state.eventSink(ScannerEvent.SyncStatusClicked) },
                onSwitchEvent = { state.eventSink(ScannerEvent.SwitchEventClicked) },
                onToggleTorch = { state.eventSink(ScannerEvent.ToggleTorchClicked) },
                onToggleContinuous = { state.eventSink(ScannerEvent.ToggleContinuousMode) },
                onToggleMute = { state.eventSink(ScannerEvent.ToggleAudioMuted) },
                onExpandHud = { state.eventSink(ScannerEvent.ToggleGateHudExpanded) }
            )

            // Result Banner Overlay (Bottom Sheet popup)
            AnimatedVisibility(
                visible = state.lastScanResult != null,
                enter = slideInVertically(initialOffsetY = { it }) + fadeIn(),
                exit = slideOutVertically(targetOffsetY = { it }) + fadeOut(),
                modifier = Modifier.align(Alignment.BottomCenter)
            ) {
                state.lastScanResult?.let { result ->
                    ScanResultBanner(
                        result = result,
                        onDismiss = { state.eventSink(ScannerEvent.DismissResult) }
                    )
                }
            }

            // Bottom Action Controls (Manual entry, sync status)
            if (state.lastScanResult == null) {
                BottomControlsBar(
                    onManualEntry = { state.eventSink(ScannerEvent.ManualEntryClicked) },
                    onSyncQueue = { state.eventSink(ScannerEvent.SyncStatusClicked) },
                    pendingCount = state.pendingSyncCount,
                    modifier = Modifier.align(Alignment.BottomCenter)
                )
            }

            // Expanded Gate Telemetry HUD Dialog
            if (state.isGateHudExpanded) {
                GateTelemetryHudModal(
                    state = state,
                    onDismiss = { state.eventSink(ScannerEvent.ToggleGateHudExpanded) },
                    onSwitchEvent = { state.eventSink(ScannerEvent.SwitchEventClicked) },
                    onSyncQueue = { state.eventSink(ScannerEvent.SyncStatusClicked) }
                )
            }
        }
    }
}

@Composable
private fun OperationalHudTopBar(
    state: ScannerState,
    onSyncClick: () -> Unit,
    onSwitchEvent: () -> Unit,
    onToggleTorch: () -> Unit,
    onToggleContinuous: () -> Unit,
    onToggleMute: () -> Unit,
    onExpandHud: () -> Unit,
) {
    Surface(
        color = Color.Black.copy(alpha = 0.88f),
        modifier = Modifier
            .fillMaxWidth()
            .statusBarsPadding()
    ) {
        Column(
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
        ) {
            // Row 1: Online status, Gate/Event title, Quick Toggles
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Online/Offline Indicator Badge
                Surface(
                    shape = RoundedCornerShape(20.dp),
                    color = if (state.isOnline) ScanValidGreen.copy(alpha = 0.2f) else ScanOfflineBlue.copy(alpha = 0.25f),
                    border = androidx.compose.foundation.BorderStroke(
                        1.dp,
                        if (state.isOnline) ScanValidGreen else ScanOfflineBlue
                    )
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(5.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(7.dp)
                                .background(if (state.isOnline) ScanValidGreen else ScanOfflineBlue, CircleShape)
                        )
                        Text(
                            text = if (state.isOnline) "ONLINE" else "OFFLINE ACTIVE",
                            style = MaterialTheme.typography.labelSmall,
                            color = if (state.isOnline) ScanValidGreen else ScanOfflineBlue,
                            fontWeight = FontWeight.Bold,
                            fontSize = 10.sp
                        )
                    }
                }

                // Gate & Event Title
                Text(
                    text = "${state.gate} • ${state.eventName.take(16)}",
                    style = MaterialTheme.typography.titleSmall,
                    color = ScannerOnSurface,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.clickable(onClick = onExpandHud)
                )

                // Actions: Continuous Mode, Mute, Torch, HUD
                Row(verticalAlignment = Alignment.CenterVertically) {
                    IconButton(onClick = onToggleContinuous, modifier = Modifier.size(32.dp)) {
                        Icon(
                            imageVector = Icons.Outlined.Bolt,
                            contentDescription = "Continuous Mode",
                            tint = if (state.isContinuousMode) Color(0xFF00F0FF) else ScannerOnSurfaceMed
                        )
                    }
                    IconButton(onClick = onToggleMute, modifier = Modifier.size(32.dp)) {
                        Icon(
                            imageVector = if (state.isAudioMuted) Icons.Outlined.VolumeOff else Icons.Outlined.VolumeUp,
                            contentDescription = "Sound Mute",
                            tint = if (state.isAudioMuted) ScannerOnSurfaceMed.copy(alpha = 0.5f) else ScannerOnSurface
                        )
                    }
                    IconButton(onClick = onToggleTorch, modifier = Modifier.size(32.dp)) {
                        Icon(
                            imageVector = if (state.isTorchOn) Icons.Outlined.FlashOn else Icons.Outlined.FlashOff,
                            contentDescription = "Flashlight",
                            tint = if (state.isTorchOn) Color(0xFFFFD600) else ScannerOnSurfaceMed
                        )
                    }
                    IconButton(onClick = onExpandHud, modifier = Modifier.size(32.dp)) {
                        Icon(
                            imageVector = Icons.Outlined.Leaderboard,
                            contentDescription = "Gate Telemetry",
                            tint = ScannerPrimary
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(6.dp))

            // Row 2: Live Gate Session Metrics Pills (Admitted, Ingress Velocity, Queue)
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable(onClick = onExpandHud),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Admitted pill
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = ScanValidGreen.copy(alpha = 0.15f),
                    modifier = Modifier.weight(1f)
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Icon(Icons.Outlined.Check, contentDescription = null, tint = ScanValidGreen, modifier = Modifier.size(14.dp))
                        Text(
                            text = "ADMIT: ${state.sessionAdmitted}",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = ScanValidGreen
                        )
                    }
                }

                // Ingress Velocity RPM pill
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = Color(0xFF00F0FF).copy(alpha = 0.15f),
                    modifier = Modifier.weight(1f)
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Icon(Icons.Outlined.Speed, contentDescription = null, tint = Color(0xFF00F0FF), modifier = Modifier.size(14.dp))
                        Text(
                            text = "${state.ingressVelocityRpm} / MIN",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF00F0FF)
                        )
                    }
                }

                // Queue pill
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = if (state.pendingSyncCount > 0) ScanOfflineBlue.copy(alpha = 0.2f) else ScannerSurface2,
                    modifier = Modifier
                        .weight(1f)
                        .clickable(onClick = onSyncClick)
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Icon(Icons.Outlined.Sync, contentDescription = null, tint = if (state.pendingSyncCount > 0) ScanOfflineBlue else ScannerOnSurfaceMed, modifier = Modifier.size(14.dp))
                        Text(
                            text = "QUEUE: ${state.pendingSyncCount}",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = if (state.pendingSyncCount > 0) ScanOfflineBlue else ScannerOnSurfaceMed
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun ScannerReticleOverlay(isContinuousMode: Boolean) {
    val infiniteTransition = rememberInfiniteTransition(label = "laser")
    val laserFraction by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(1800, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "laserY"
    )

    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            if (isContinuousMode) {
                Surface(
                    shape = RoundedCornerShape(20.dp),
                    color = Color(0xFF00F0FF).copy(alpha = 0.2f),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF00F0FF))
                ) {
                    Text(
                        text = "⚡ CONTINUOUS BATCH SCAN (0.7s)",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Black,
                        letterSpacing = 0.8.sp,
                        color = Color(0xFF00F0FF),
                        modifier = Modifier.padding(horizontal = 14.dp, vertical = 5.dp)
                    )
                }
            }

            Box(
                modifier = Modifier
                    .size(260.dp)
                    .border(1.dp, ScannerPrimary.copy(alpha = 0.4f), RoundedCornerShape(24.dp))
            ) {
                // 4 Corner Brackets
                Canvas(modifier = Modifier.fillMaxSize()) {
                    val stroke = 4.dp.toPx()
                    val bracketLen = 28.dp.toPx()
                    val color = ScanValidGreen

                    // Top-Left
                    drawLine(color, Offset(0f, 0f), Offset(bracketLen, 0f), stroke)
                    drawLine(color, Offset(0f, 0f), Offset(0f, bracketLen), stroke)

                    // Top-Right
                    drawLine(color, Offset(size.width, 0f), Offset(size.width - bracketLen, 0f), stroke)
                    drawLine(color, Offset(size.width, 0f), Offset(size.width, bracketLen), stroke)

                    // Bottom-Left
                    drawLine(color, Offset(0f, size.height), Offset(bracketLen, size.height), stroke)
                    drawLine(color, Offset(0f, size.height), Offset(0f, size.height - bracketLen), stroke)

                    // Bottom-Right
                    drawLine(color, Offset(size.width, size.height), Offset(size.width - bracketLen, size.height), stroke)
                    drawLine(color, Offset(size.width, size.height), Offset(size.width, size.height - bracketLen), stroke)

                    // Sweeping Laser Beam
                    val laserY = size.height * laserFraction
                    drawLine(
                        color = ScanValidGreen.copy(alpha = 0.85f),
                        start = Offset(10.dp.toPx(), laserY),
                        end = Offset(size.width - 10.dp.toPx(), laserY),
                        strokeWidth = 2.5.dp.toPx()
                    )
                }
            }

            Surface(
                shape = RoundedCornerShape(12.dp),
                color = Color.Black.copy(alpha = 0.65f)
            ) {
                Text(
                    text = "ALIGN QR CODE WITHIN TARGET",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.sp,
                    color = ScannerOnSurfaceMed,
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                )
            }
        }
    }
}

@Composable
private fun ScanResultBanner(
    result: ScanResult,
    onDismiss: () -> Unit
) {
    val (bgColor, icon, title, subtitle) = when (result) {
        is ScanResult.Success -> Quad(
            ScanValidGreen,
            Icons.Outlined.CheckCircle,
            "ADMIT: ${result.accessTier}",
            "${result.holderName ?: "Guest"} • Seat: ${result.seat ?: "General"}${if (result.isOffline) " [OFFLINE AUTH]" else ""}"
        )
        is ScanResult.AlreadyCheckedIn -> Quad(
            ScanDuplicateAmber,
            Icons.Outlined.Warning,
            "ALREADY SCANNED",
            "Ticket ID: ${result.ticketId.take(8).uppercase()}"
        )
        is ScanResult.Invalid -> Quad(
            ScanInvalidRed,
            Icons.Outlined.Cancel,
            "INVALID / REJECTED",
            result.reason
        )
        is ScanResult.DatasetExpired -> Quad(
            ScanInvalidRed,
            Icons.Outlined.TimerOff,
            "DATASET EXPIRED",
            "Connect to internet to refresh event validation dataset"
        )
    }

    Surface(
        color = bgColor,
        shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp),
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onDismiss)
    ) {
        Column(
            modifier = Modifier
                .navigationBarsPadding()
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = Color.Black,
                modifier = Modifier.size(54.dp)
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = title,
                style = MaterialTheme.typography.headlineMedium,
                color = Color.Black,
                fontWeight = FontWeight.ExtraBold,
                textAlign = TextAlign.Center
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = subtitle,
                style = MaterialTheme.typography.titleMedium,
                color = Color.Black.copy(alpha = 0.85f),
                fontWeight = FontWeight.SemiBold,
                textAlign = TextAlign.Center
            )
            Spacer(modifier = Modifier.height(14.dp))
            Text(
                text = "Tap anywhere to continue scanning",
                style = MaterialTheme.typography.labelSmall,
                color = Color.Black.copy(alpha = 0.6f)
            )
        }
    }
}

@Composable
private fun BottomControlsBar(
    onManualEntry: () -> Unit,
    onSyncQueue: () -> Unit,
    pendingCount: Long,
    modifier: Modifier = Modifier
) {
    Surface(
        color = Color.Black.copy(alpha = 0.85f),
        modifier = modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier
                .navigationBarsPadding()
                .padding(horizontal = 24.dp, vertical = 14.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            FilledTonalButton(
                onClick = onManualEntry,
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.filledTonalButtonColors(containerColor = ScannerSurface2)
            ) {
                Icon(
                    imageVector = Icons.Outlined.Search,
                    contentDescription = null,
                    tint = ScannerOnSurface,
                    modifier = Modifier.size(18.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text("Attendee Lookup", color = ScannerOnSurface)
            }

            FilledTonalButton(
                onClick = onSyncQueue,
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.filledTonalButtonColors(containerColor = ScannerSurface2)
            ) {
                Icon(
                    imageVector = Icons.Outlined.Sync,
                    contentDescription = null,
                    tint = if (pendingCount > 0) ScanDuplicateAmber else ScannerOnSurface,
                    modifier = Modifier.size(18.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text("Sync Queue ($pendingCount)", color = ScannerOnSurface)
            }
        }
    }
}

@Composable
private fun GateTelemetryHudModal(
    state: ScannerState,
    onDismiss: () -> Unit,
    onSwitchEvent: () -> Unit,
    onSyncQueue: () -> Unit,
) {
    Surface(
        color = Color.Black.copy(alpha = 0.85f),
        modifier = Modifier
            .fillMaxSize()
            .clickable(onClick = onDismiss),
        contentColor = ScannerOnSurface
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp),
            contentAlignment = Alignment.Center
        ) {
            Surface(
                shape = RoundedCornerShape(20.dp),
                color = ScannerSurface,
                border = androidx.compose.foundation.BorderStroke(1.dp, ScannerSurface2),
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable(enabled = false) {}
            ) {
                Column(
                    modifier = Modifier.padding(24.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(
                                text = "TURNSTILE TELEMETRY HUD",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Black,
                                letterSpacing = 1.sp,
                                color = ScannerPrimary
                            )
                            Text(
                                text = "${state.gate} • ${state.eventName}",
                                fontSize = 16.sp,
                                fontWeight = FontWeight.Bold,
                                color = ScannerOnSurface
                            )
                        }
                        IconButton(onClick = onDismiss) {
                            Icon(Icons.Outlined.Close, contentDescription = "Close", tint = ScannerOnSurfaceMed)
                        }
                    }

                    HorizontalDivider(color = ScannerSurface2)

                    // Gate Headcount Progress
                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text("Total Admitted", fontSize = 12.sp, color = ScannerOnSurfaceMed)
                            Text(
                                "${state.totalEventAdmitted} / ${if (state.totalEventTickets > 0) state.totalEventTickets else "—"}",
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold,
                                color = ScanValidGreen
                            )
                        }
                        if (state.totalEventTickets > 0) {
                            val progress = (state.totalEventAdmitted.toFloat() / state.totalEventTickets.toFloat()).coerceIn(0f, 1f)
                            LinearProgressIndicator(
                                progress = { progress },
                                modifier = Modifier.fillMaxWidth().height(6.dp),
                                color = ScanValidGreen,
                                trackColor = ScannerSurface2
                            )
                        }
                    }

                    // Session Metrics Grid
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Surface(
                            shape = RoundedCornerShape(10.dp),
                            color = ScannerSurface2,
                            modifier = Modifier.weight(1f)
                        ) {
                            Column(modifier = Modifier.padding(10.dp)) {
                                Text("INGRESS RATE", fontSize = 10.sp, color = ScannerOnSurfaceMed, fontWeight = FontWeight.Bold)
                                Text("${state.ingressVelocityRpm} /min", fontSize = 15.sp, fontWeight = FontWeight.ExtraBold, color = Color(0xFF00F0FF))
                            }
                        }
                        Surface(
                            shape = RoundedCornerShape(10.dp),
                            color = ScannerSurface2,
                            modifier = Modifier.weight(1f)
                        ) {
                            Column(modifier = Modifier.padding(10.dp)) {
                                Text("DUPLICATES", fontSize = 10.sp, color = ScannerOnSurfaceMed, fontWeight = FontWeight.Bold)
                                Text("${state.sessionDuplicates}", fontSize = 15.sp, fontWeight = FontWeight.ExtraBold, color = ScanDuplicateAmber)
                            }
                        }
                        Surface(
                            shape = RoundedCornerShape(10.dp),
                            color = ScannerSurface2,
                            modifier = Modifier.weight(1f)
                        ) {
                            Column(modifier = Modifier.padding(10.dp)) {
                                Text("REJECTED", fontSize = 10.sp, color = ScannerOnSurfaceMed, fontWeight = FontWeight.Bold)
                                Text("${state.sessionRejections}", fontSize = 15.sp, fontWeight = FontWeight.ExtraBold, color = ScanInvalidRed)
                            }
                        }
                    }

                    // Terminal Info
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("Terminal ID: ${state.deviceId}", fontSize = 11.sp, color = ScannerOnSurfaceMed)
                        Text(
                            text = if (state.datasetExpiryText.isNotEmpty()) "Expires: ${state.datasetExpiryText}" else "Key Active",
                            fontSize = 11.sp,
                            color = ScannerOnSurfaceMed
                        )
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        OutlinedButton(
                            onClick = onSwitchEvent,
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Text("Switch Event", fontSize = 12.sp)
                        }
                        Button(
                            onClick = onDismiss,
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(10.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = ScannerPrimary)
                        ) {
                            Text("Resume Scan", fontSize = 12.sp, color = Color.Black, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
    }
}

private data class Quad<A, B, C, D>(val first: A, val second: B, val third: C, val fourth: D)
