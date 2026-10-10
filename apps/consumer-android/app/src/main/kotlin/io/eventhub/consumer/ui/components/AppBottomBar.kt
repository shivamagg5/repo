package io.eventhub.consumer.ui.components

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ConfirmationNumber
import androidx.compose.material.icons.filled.Explore
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.outlined.ConfirmationNumber
import androidx.compose.material.icons.outlined.Explore
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.slack.circuit.runtime.screen.Screen
import io.eventhub.consumer.ui.navigation.HomeRoute
import io.eventhub.consumer.ui.navigation.ProfileRoute
import io.eventhub.consumer.ui.navigation.SearchRoute
import io.eventhub.consumer.ui.navigation.TicketsRoute
import io.eventhub.consumer.ui.theme.*

enum class NavTab(
    val title: String,
    val selectedIcon: ImageVector,
    val unselectedIcon: ImageVector,
    val screen: Screen,
) {
    HOME("Home", Icons.Filled.Home, Icons.Outlined.Home, HomeRoute),
    DISCOVER("Discover", Icons.Filled.Explore, Icons.Outlined.Explore, SearchRoute),
    TICKETS("Tickets", Icons.Filled.ConfirmationNumber, Icons.Outlined.ConfirmationNumber, TicketsRoute),
    PROFILE("Profile", Icons.Filled.Person, Icons.Outlined.Person, ProfileRoute),
}

@Composable
fun AppBottomBar(
    currentScreen: Screen?,
    onTabSelected: (Screen) -> Unit,
    modifier: Modifier = Modifier,
) {
    // Only show on root tabs
    val isRootTab = currentScreen is HomeRoute ||
            currentScreen is SearchRoute ||
            currentScreen is TicketsRoute ||
            currentScreen is ProfileRoute

    if (!isRootTab) return

    val currentTab = when (currentScreen) {
        is HomeRoute -> NavTab.HOME
        is SearchRoute -> NavTab.DISCOVER
        is TicketsRoute -> NavTab.TICKETS
        is ProfileRoute -> NavTab.PROFILE
        else -> NavTab.HOME
    }

    Box(
        modifier = modifier
            .fillMaxWidth()
            .navigationBarsPadding()
            .padding(horizontal = 24.dp, vertical = 10.dp),
        contentAlignment = Alignment.Center
    ) {
        Row(
            modifier = Modifier
                .shadow(
                    elevation = 20.dp,
                    shape = RoundedCornerShape(32.dp),
                    spotColor = PulsrPink.copy(alpha = 0.35f),
                    ambientColor = Color.Black.copy(alpha = 0.8f)
                )
                .clip(RoundedCornerShape(32.dp))
                .background(Surface2Dark.copy(alpha = 0.94f))
                .border(
                    width = 1.dp,
                    color = SurfaceBorder,
                    shape = RoundedCornerShape(32.dp)
                )
                .padding(horizontal = 8.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            NavTab.values().forEach { tab ->
                val isSelected = currentTab == tab
                NavTabItem(
                    tab = tab,
                    isSelected = isSelected,
                    onClick = {
                        if (!isSelected) {
                            onTabSelected(tab.screen)
                        }
                    }
                )
            }
        }
    }
}

@Composable
private fun NavTabItem(
    tab: NavTab,
    isSelected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val scale by animateFloatAsState(
        targetValue = if (isSelected) 1.05f else 1.0f,
        animationSpec = spring(dampingRatio = Spring.DampingRatioMediumBouncy, stiffness = Spring.StiffnessLow),
        label = "tabScale"
    )

    val contentColor by animateColorAsState(
        targetValue = if (isSelected) OnPrimary else OnSurfaceLow,
        label = "tabColor"
    )

    val interactionSource = remember { MutableInteractionSource() }

    Box(
        modifier = modifier
            .scale(scale)
            .clip(RoundedCornerShape(24.dp))
            .then(
                if (isSelected) {
                    Modifier.background(HotGradient)
                } else {
                    Modifier
                }
            )
            .clickable(
                interactionSource = interactionSource,
                indication = null,
                onClick = onClick
            )
            .padding(horizontal = 16.dp, vertical = 8.dp),
        contentAlignment = Alignment.Center
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            Icon(
                imageVector = if (isSelected) tab.selectedIcon else tab.unselectedIcon,
                contentDescription = tab.title,
                tint = contentColor,
                modifier = Modifier.size(20.dp)
            )

            if (isSelected) {
                Text(
                    text = tab.title,
                    color = contentColor,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 0.3.sp
                )
            }
        }
    }
}
