package io.eventhub.scanner.ui.feature.manual

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import androidx.compose.runtime.*
import com.slack.circuit.runtime.CircuitUiEvent
import com.slack.circuit.runtime.CircuitUiState
import com.slack.circuit.runtime.Navigator
import com.slack.circuit.runtime.presenter.Presenter
import dagger.assisted.Assisted
import dagger.assisted.AssistedFactory
import dagger.assisted.AssistedInject
import dagger.hilt.android.qualifiers.ApplicationContext
import io.eventhub.scanner.data.remote.dto.AttendeeDto
import io.eventhub.scanner.domain.engine.OfflineVerificationEngine
import io.eventhub.scanner.domain.engine.ScanResult
import io.eventhub.scanner.ui.feature.scanner.ScannerAudioEngine
import io.eventhub.scanner.ui.navigation.ManualEntryRoute
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

data class ManualEntryState(
    val selectedTab: Int = 0, // 0 = Attendee Lookup, 1 = Direct Code Entry
    val ticketCode: String = "",
    val searchQuery: String = "",
    val searchResults: List<AttendeeDto> = emptyList(),
    val isSearching: Boolean = false,
    val isSubmitting: Boolean = false,
    val admittingTicketId: String? = null,
    val result: ScanResult? = null,
    val isOnline: Boolean = true,
    val eventSink: (ManualEntryEvent) -> Unit = {}
) : CircuitUiState

sealed interface ManualEntryEvent : CircuitUiEvent {
    data class TabSelected(val index: Int) : ManualEntryEvent
    data class CodeChanged(val code: String) : ManualEntryEvent
    data class QueryChanged(val query: String) : ManualEntryEvent
    data object SubmitCode : ManualEntryEvent
    data class AdmitAttendee(val ticketId: String) : ManualEntryEvent
    data object BackClicked : ManualEntryEvent
    data object DismissResult : ManualEntryEvent
}

class ManualEntryPresenter @AssistedInject constructor(
    @Assisted private val screen: ManualEntryRoute,
    @Assisted private val navigator: Navigator,
    private val engine: OfflineVerificationEngine,
    private val audio: ScannerAudioEngine,
    @ApplicationContext private val context: Context,
) : Presenter<ManualEntryState> {

    @Composable
    override fun present(): ManualEntryState {
        var selectedTab by remember { mutableIntStateOf(0) }
        var code by remember { mutableStateOf("") }
        var query by remember { mutableStateOf("") }
        var searchResults by remember { mutableStateOf<List<AttendeeDto>>(emptyList()) }
        var isSearching by remember { mutableStateOf(false) }
        var isSubmitting by remember { mutableStateOf(false) }
        var admittingTicketId by remember { mutableStateOf<String?>(null) }
        var result by remember { mutableStateOf<ScanResult?>(null) }
        val isOnline = remember { checkConnectivity(context) }
        val scope = rememberCoroutineScope()
        var searchJob by remember { mutableStateOf<Job?>(null) }

        fun performSearch(q: String) {
            searchJob?.cancel()
            if (q.trim().length < 2) {
                searchResults = emptyList()
                isSearching = false
                return
            }
            searchJob = scope.launch {
                delay(300) // debounce typing
                isSearching = true
                val results = engine.searchAttendees(screen.eventId, q.trim(), isOnline)
                searchResults = results
                isSearching = false
            }
        }

        return ManualEntryState(
            selectedTab = selectedTab,
            ticketCode = code,
            searchQuery = query,
            searchResults = searchResults,
            isSearching = isSearching,
            isSubmitting = isSubmitting,
            admittingTicketId = admittingTicketId,
            result = result,
            isOnline = isOnline,
        ) { uiEvent ->
            when (uiEvent) {
                is ManualEntryEvent.TabSelected -> selectedTab = uiEvent.index
                is ManualEntryEvent.CodeChanged -> code = uiEvent.code.uppercase()
                is ManualEntryEvent.QueryChanged -> {
                    query = uiEvent.query
                    performSearch(uiEvent.query)
                }
                is ManualEntryEvent.SubmitCode -> {
                    if (code.isNotBlank()) {
                        scope.launch {
                            isSubmitting = true
                            val res = engine.processScan(
                                rawBarcode = code.trim(),
                                eventId = screen.eventId,
                                gate = screen.gate,
                                deviceId = "MANUAL-TERMINAL",
                                isOnline = isOnline
                            )
                            result = res
                            isSubmitting = false

                            when (res) {
                                is ScanResult.Success -> audio.playSuccessFeedback()
                                is ScanResult.AlreadyCheckedIn -> audio.playDuplicateWarningFeedback()
                                else -> audio.playErrorFeedback()
                            }
                        }
                    }
                }
                is ManualEntryEvent.AdmitAttendee -> {
                    scope.launch {
                        admittingTicketId = uiEvent.ticketId
                        val res = engine.manualAdmit(
                            ticketId = uiEvent.ticketId,
                            eventId = screen.eventId,
                            gate = screen.gate,
                            deviceId = "MANUAL-LOOKUP-TERMINAL",
                            isOnline = isOnline
                        )
                        result = res
                        admittingTicketId = null

                        when (res) {
                            is ScanResult.Success -> {
                                audio.playSuccessFeedback()
                                // Update local search results list status
                                searchResults = searchResults.map {
                                    if (it.ticketId == uiEvent.ticketId) it.copy(status = "checked_in") else it
                                }
                            }
                            is ScanResult.AlreadyCheckedIn -> audio.playDuplicateWarningFeedback()
                            else -> audio.playErrorFeedback()
                        }
                    }
                }
                is ManualEntryEvent.BackClicked -> navigator.pop()
                is ManualEntryEvent.DismissResult -> result = null
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
        fun create(screen: ManualEntryRoute, navigator: Navigator): ManualEntryPresenter
    }
}
