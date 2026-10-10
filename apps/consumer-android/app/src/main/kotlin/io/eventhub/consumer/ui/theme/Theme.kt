package io.eventhub.consumer.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.Color

private val EventHubDarkColorScheme = darkColorScheme(
    primary          = PulsrPink,
    onPrimary        = OnPrimary,
    primaryContainer = PulsrPinkDim,
    secondary        = PulsrFlame,
    onSecondary      = OnPrimary,
    tertiary         = PulsrAcid,
    background       = BackgroundDark,
    onBackground     = OnSurface,
    surface          = SurfaceDark,
    onSurface        = OnSurface,
    surfaceVariant   = Surface2Dark,
    onSurfaceVariant = OnSurfaceMedium,
    surfaceTint      = PulsrPink,
    outline          = SurfaceBorder,
    error            = ErrorRed,
    onError          = OnPrimary,
)

// Light theme exists for theming completeness — app defaults to dark
private val EventHubLightColorScheme = lightColorScheme(
    primary    = BrandViolet,
    secondary  = AccentOrange,
    tertiary   = AccentGold,
)

@Composable
fun EventHubTheme(
    darkTheme: Boolean = true,   // Always dark by default — brand decision
    content: @Composable () -> Unit,
) {
    val colorScheme = if (darkTheme) EventHubDarkColorScheme else EventHubLightColorScheme

    MaterialTheme(
        colorScheme = colorScheme,
        typography = EventHubTypography,
        content = content,
    )
}
