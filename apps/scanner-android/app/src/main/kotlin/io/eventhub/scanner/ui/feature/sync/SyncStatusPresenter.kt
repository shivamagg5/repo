package io.eventhub.scanner.ui.feature.sync

import android.content.Context
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
import io.eventhub.scanner.data.local.db.CheckInQueueTable
import io.eventhub.scanner.data.local.db.ScannerDatabase
import io.eventhub.scanner.ui.navigation.SyncStatusRoute
import io.eventhub.scanner.worker.CheckInSyncWorker
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

data class SyncStatusState(
    val records: List<CheckInQueueTable> = emptyList(),
    val isSyncing: Boolean = false,
    val eventSink: (SyncStatusEvent) -> Unit = {}
) : CircuitUiState

sealed interface SyncStatusEvent : CircuitUiEvent {
    data object ForceSyncClicked : SyncStatusEvent
    data object ClearSyncedClicked : SyncStatusEvent
    data object BackClicked : SyncStatusEvent
}

class SyncStatusPresenter @AssistedInject constructor(
    @Assisted private val screen: SyncStatusRoute,
    @Assisted private val navigator: Navigator,
    private val db: ScannerDatabase,
    @ApplicationContext private val context: Context,
) : Presenter<SyncStatusState> {

    @Composable
    override fun present(): SyncStatusState {
        var records by remember { mutableStateOf<List<CheckInQueueTable>>(emptyList()) }
        var isSyncing by remember { mutableStateOf(false) }
        val scope = rememberCoroutineScope()

        fun loadRecords() {
            records = try {
                db.scannerDatabaseQueries.getAllQueueRecords().executeAsList()
            } catch (e: Exception) {
                emptyList()
            }
        }

        LaunchedEffect(Unit) {
            while (true) {
                loadRecords()
                delay(2000)
            }
        }

        return SyncStatusState(
            records = records,
            isSyncing = isSyncing,
        ) { uiEvent ->
            when (uiEvent) {
                is SyncStatusEvent.ForceSyncClicked -> {
                    scope.launch {
                        isSyncing = true
                        CheckInSyncWorker.triggerImmediate(WorkManager.getInstance(context))
                        delay(1500)
                        loadRecords()
                        isSyncing = false
                    }
                }
                is SyncStatusEvent.ClearSyncedClicked -> {
                    db.scannerDatabaseQueries.clearSyncedRecords()
                    loadRecords()
                }
                is SyncStatusEvent.BackClicked -> navigator.pop()
            }
        }
    }

    @AssistedFactory
    fun interface Factory {
        fun create(screen: SyncStatusRoute, navigator: Navigator): SyncStatusPresenter
    }
}
