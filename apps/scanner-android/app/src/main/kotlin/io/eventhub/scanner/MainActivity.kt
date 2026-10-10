package io.eventhub.scanner

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.slack.circuit.backstack.rememberSaveableBackStack
import com.slack.circuit.foundation.Circuit
import com.slack.circuit.foundation.CircuitCompositionLocals
import com.slack.circuit.foundation.NavigableCircuitContent
import com.slack.circuit.foundation.rememberCircuitNavigator
import dagger.hilt.android.AndroidEntryPoint
import io.eventhub.scanner.ui.navigation.LoginRoute
import io.eventhub.scanner.ui.theme.ScannerTheme
import javax.inject.Inject

/**
 * Single Activity — Scanner App.
 * Screen stays on during scanning sessions (android:keepScreenOn in manifest).
 * Portrait lock enforced in manifest for reliable CameraX preview orientation.
 */
@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    @Inject
    lateinit var circuit: Circuit

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        setContent {
            ScannerTheme {
                CircuitCompositionLocals(circuit) {
                    val backStack = rememberSaveableBackStack(root = LoginRoute)
                    val navigator = rememberCircuitNavigator(backStack) { finish() }
                    NavigableCircuitContent(
                        navigator = navigator,
                        backStack = backStack,
                    )
                }
            }
        }
    }
}
