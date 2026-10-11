package io.eventhub.consumer

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import com.slack.circuit.backstack.rememberSaveableBackStack
import com.slack.circuit.foundation.Circuit
import com.slack.circuit.foundation.CircuitCompositionLocals
import com.slack.circuit.foundation.NavigableCircuitContent
import com.slack.circuit.foundation.rememberCircuitNavigator
import dagger.hilt.android.AndroidEntryPoint
import io.eventhub.consumer.ui.components.AppBottomBar
import io.eventhub.consumer.ui.navigation.HomeRoute
import io.eventhub.consumer.ui.navigation.LoginRoute
import io.eventhub.consumer.ui.theme.EventHubTheme
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
                    // Gateway screen: app opens to Login/Signup & Explore first
                    val backStack = rememberSaveableBackStack(root = LoginRoute)
                    val currentScreen = backStack.topRecord?.screen

                    val navigator = rememberCircuitNavigator(backStack) {
                        // When stack pop reaches bottom: if in a sub-tab, return to Home; otherwise finish
                        if (currentScreen != null && currentScreen !is HomeRoute && currentScreen !is LoginRoute) {
                            while (backStack.size > 0) {
                                backStack.pop()
                            }
                            backStack.push(HomeRoute)
                        } else {
                            finish()
                        }
                    }

                    // System Back gesture/hardware back handling:
                    // 1. If deep in stack (>1), pop to previous screen
                    // 2. If at root of secondary tab (Search, Tickets, Profile), return to Home
                    // 3. If at Home or Login root, finish app
                    BackHandler(enabled = true) {
                        if (backStack.size > 1) {
                            navigator.pop()
                        } else if (currentScreen != null && currentScreen !is HomeRoute && currentScreen !is LoginRoute) {
                            navigator.resetRoot(HomeRoute)
                        } else {
                            finish()
                        }
                    }

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
