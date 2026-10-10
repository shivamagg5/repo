package io.eventhub.scanner.ui.navigation

import com.slack.circuit.runtime.screen.Screen
import kotlinx.parcelize.Parcelize
import kotlinx.serialization.Serializable

@Parcelize
@Serializable
object LoginRoute : Screen

@Parcelize
@Serializable
object EventSelectRoute : Screen

@Parcelize
@Serializable
data class ScannerRoute(
    val eventId: String,
    val eventName: String,
    val gate: String = "Gate A"
) : Screen

@Parcelize
@Serializable
object SyncStatusRoute : Screen

@Parcelize
@Serializable
data class ManualEntryRoute(
    val eventId: String,
    val gate: String
) : Screen
