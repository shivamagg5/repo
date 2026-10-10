package io.eventhub.consumer

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.CompositionLocalProvider
import com.slack.circuit.backstack.rememberSaveableBackStack
import com.slack.circuit.foundation.Circuit
import com.slack.circuit.foundation.CircuitCompositionLocals
import com.slack.circuit.foundation.NavigableCircuitContent
import com.slack.circuit.foundation.rememberCircuitNavigator
import dagger.hilt.android.AndroidEntryPoint
import io.eventhub.consumer.ui.navigation.HomeRoute
import io.eventhub.consumer.ui.theme.EventHubTheme
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import io.eventhub.consumer.ui.components.AppBottomBar
import javax.inject.Inject

/**
 * Single-Activity architecture.
 * Compose + Circuit handle all navigation — no Fragment transactions.
 * Edge-to-edge display for immersive full-screen event artwork.
 */
@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    @Inject
    lateinit var circuit: Circuit

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        setContent {
            EventHubTheme {
                CircuitCompositionLocals(circuit) {
                    val backStack = rememberSaveableBackStack(root = HomeRoute)
                    val navigator = rememberCircuitNavigator(backStack) {
                        // Handle back-pressed when stack is empty
                        finish()
                    }
                    val currentScreen = backStack.topRecord?.screen

                    Box(modifier = Modifier.fillMaxSize()) {
                        NavigableCircuitContent(
                            navigator = navigator,
                            backStack = backStack,
                            modifier = Modifier.fillMaxSize(),
                        )

                        AppBottomBar(
                            currentScreen = currentScreen,
                            onTabSelected = { targetScreen ->
                                navigator.resetRoot(targetScreen)
                            },
                            modifier = Modifier.align(Alignment.BottomCenter)
                        )
                    }
                }
            }
        }
    }
}
