package io.eventhub.scanner.ui.feature.scanner

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.Build
import androidx.compose.runtime.*
import androidx.work.WorkManager
import com.slack.circuit.runtime.CircuitUiEvent
import com.slack.circuit.runtime.CircuitUiState
import com.slack.circuit.runtime.Navigator
import com.slack.circuit.runtime.presenter.Presenter
import dagger.assisted.Assisted
import dagger.assisted.AssistedFactory
import dagger.assisted.AssistedInject
import dagger.hilt.android.qualifiers.ApplicationContext
import io.eventhub.scanner.data.local.db.ScannerDatabase
import io.eventhub.scanner.domain.engine.OfflineVerificationEngine
import io.eventhub.scanner.domain.engine.ScanResult
import io.eventhub.scanner.ui.navigation.EventSelectRoute
import io.eventhub.scanner.ui.navigation.ManualEntryRoute
import io.eventhub.scanner.ui.navigation.ScannerRoute
import io.eventhub.scanner.ui.navigation.SyncStatusRoute
import io.eventhub.scanner.worker.CheckInSyncWorker
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*

data class ScannerState(
    val eventName: String,
    val gate: String,
    val isOnline: Boolean = true,
    val pendingSyncCount: Long = 0,
    val datasetExpiryText: String = "",
    val lastScanResult: ScanResult? = null,
    val deviceId: String = "GATE-TERMINAL-01",
    val sessionAdmitted: Int = 0,
    val sessionDuplicates: Int = 0,
    val sessionRejections: Int = 0,
    val ingressVelocityRpm: Int = 0,
    val isTorchOn: Boolean = false,
    val isContinuousMode: Boolean = false,
    val isAudioMuted: Boolean = false,
    val isGateHudExpanded: Boolean = false,
    val totalEventTickets: Long = 0,
    val totalEventAdmitted: Long = 0,
    val eventSink: (ScannerEvent) -> Unit = {}
) : CircuitUiState

sealed interface ScannerEvent : CircuitUiEvent {
    data class BarcodeScanned(val rawValue: String) : ScannerEvent
    data object ManualEntryClicked : ScannerEvent
    data object SyncStatusClicked : ScannerEvent
    data object SwitchEventClicked : ScannerEvent
    data object DismissResult : ScannerEvent
    data object ForceSyncTriggered : ScannerEvent
    data object ToggleTorchClicked : ScannerEvent
    data object ToggleContinuousMode : ScannerEvent
    data object ToggleAudioMuted : ScannerEvent
    data object ToggleGateHudExpanded : ScannerEvent
}

class ScannerPresenter @AssistedInject constructor(
    @Assisted private val screen: ScannerRoute,
    @Assisted private val navigator: Navigator,
    private val engine: OfflineVerificationEngine,
    private val db: ScannerDatabase,
    private val audio: ScannerAudioEngine,
    @ApplicationContext private val context: Context,
) : Presenter<ScannerState> {

    @Composable
    override fun present(): ScannerState {
        var isOnline by remember { mutableStateOf(checkConnectivity(context)) }
        var pendingCount by remember { mutableStateOf(0L) }
        var expiryText by remember { mutableStateOf("") }
        var lastResult by remember { mutableStateOf<ScanResult?>(null) }
        var isTorchOn by remember { mutableStateOf(false) }
        var isContinuousMode by remember { mutableStateOf(false) }
        var isAudioMuted by remember { mutableStateOf(false) }
        var isGateHudExpanded by remember { mutableStateOf(false) }
        var sessionAdmitted by remember { mutableStateOf(0) }
        var sessionDuplicates by remember { mutableStateOf(0) }
        var sessionRejections by remember { mutableStateOf(0) }
        var totalEventTickets by remember { mutableStateOf(0L) }
        var totalEventAdmitted by remember { mutableStateOf(0L) }
        val recentScanTimestamps = remember { mutableStateListOf<Long>() }

        val scope = rememberCoroutineScope()
        val deviceId = remember { "DEV-" + Build.MODEL.take(6).uppercase() }

        // Periodic connectivity, queue count, and event stats updater
        LaunchedEffect(Unit) {
            while (true) {
                isOnline = checkConnectivity(context)
                pendingCount = try {
                    db.scannerDatabaseQueries.getPendingQueueCount().executeAsOne()
                } catch (e: Exception) {
                    0L
                }

                try {
                    val stats = db.scannerDatabaseQueries.getGateStats(screen.eventId).executeAsOneOrNull()
                    if (stats != null) {
                        totalEventTickets = stats.totalTickets
                        totalEventAdmitted = stats.admittedCount ?: 0L
                    }
                } catch (e: Exception) {
                    // Ignore stats error
                }

                val activeEvent = db.scannerDatabaseQueries.getActiveEvent().executeAsOneOrNull()
                if (activeEvent != null) {
                    val sdf = SimpleDateFormat("dd MMM, HH:mm", Locale.getDefault())
                    expiryText = sdf.format(Date(activeEvent.expiryTimestamp))
                }

                // Prune scans older than 60 seconds for live RPM calculation
                val now = System.currentTimeMillis()
                recentScanTimestamps.removeAll { now - it > 60_000 }

                delay(2500)
            }
        }

        // Auto-dismiss scan result: 750ms for rapid continuous mode, 2500ms for inspection mode
        LaunchedEffect(lastResult, isContinuousMode) {
            if (lastResult is ScanResult.Success) {
                val dismissDelay = if (isContinuousMode) 750L else 2500L
                delay(dismissDelay)
                lastResult = null
            }
        }

        val ingressVelocityRpm = recentScanTimestamps.size

        return ScannerState(
            eventName = screen.eventName,
            gate = screen.gate,
            isOnline = isOnline,
            pendingSyncCount = pendingCount,
            datasetExpiryText = expiryText,
            lastScanResult = lastResult,
            deviceId = deviceId,
            sessionAdmitted = sessionAdmitted,
            sessionDuplicates = sessionDuplicates,
            sessionRejections = sessionRejections,
            ingressVelocityRpm = ingressVelocityRpm,
            isTorchOn = isTorchOn,
            isContinuousMode = isContinuousMode,
            isAudioMuted = isAudioMuted,
            isGateHudExpanded = isGateHudExpanded,
            totalEventTickets = totalEventTickets,
            totalEventAdmitted = totalEventAdmitted,
        ) { uiEvent ->
            when (uiEvent) {
                is ScannerEvent.BarcodeScanned -> {
                    scope.launch {
                        val result = engine.processScan(
                            rawBarcode = uiEvent.rawValue,
                            eventId = screen.eventId,
                            gate = screen.gate,
                            deviceId = deviceId,
                            isOnline = isOnline
                        )
                        lastResult = result

                        val now = System.currentTimeMillis()
                        recentScanTimestamps.add(now)

                        when (result) {
                            is ScanResult.Success -> {
                                sessionAdmitted++
                                audio.playSuccessFeedback()
                            }
                            is ScanResult.AlreadyCheckedIn -> {
                                sessionDuplicates++
                                audio.playDuplicateWarningFeedback()
                            }
                            is ScanResult.Invalid, is ScanResult.DatasetExpired -> {
                                sessionRejections++
                                audio.playErrorFeedback()
                            }
                        }

                        // Trigger sync worker in background if online and queue has items
                        if (isOnline) {
                            CheckInSyncWorker.triggerImmediate(WorkManager.getInstance(context))
                        }
                    }
                }
                is ScannerEvent.ManualEntryClicked -> navigator.goTo(ManualEntryRoute(screen.eventId, screen.gate))
                is ScannerEvent.SyncStatusClicked -> navigator.goTo(SyncStatusRoute)
                is ScannerEvent.SwitchEventClicked -> navigator.resetRoot(EventSelectRoute)
                is ScannerEvent.DismissResult -> lastResult = null
                is ScannerEvent.ForceSyncTriggered -> {
                    CheckInSyncWorker.triggerImmediate(WorkManager.getInstance(context))
                }
                is ScannerEvent.ToggleTorchClicked -> isTorchOn = !isTorchOn
                is ScannerEvent.ToggleContinuousMode -> isContinuousMode = !isContinuousMode
                is ScannerEvent.ToggleAudioMuted -> {
                    val newMuted = !isAudioMuted
                    isAudioMuted = newMuted
                    audio.setMuted(newMuted)
                }
                is ScannerEvent.ToggleGateHudExpanded -> isGateHudExpanded = !isGateHudExpanded
            }
        }
    }

    private fun checkConnectivity(ctx: Context): Boolean {
        val cm = ctx.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager ?: return false
        val activeNetwork = cm.activeNetwork ?: return false
        val caps = cm.getNetworkCapabilities(activeNetwork) ?: return false
        return caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
    }

    @AssistedFactory
    fun interface Factory {
        fun create(screen: ScannerRoute, navigator: Navigator): ScannerPresenter
    }
}
