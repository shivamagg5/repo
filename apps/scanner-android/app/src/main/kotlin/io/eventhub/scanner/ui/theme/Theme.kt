package io.eventhub.scanner.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

// Scanner High Contrast Palette (optimized for dark venues and bright outdoor gates)
val ScannerPrimary      = Color(0xFF00E676) // Bright green
val ScannerPrimaryDim   = Color(0xFF00A854)
val ScannerBackground   = Color(0xFF0A0A0E)
val ScannerSurface      = Color(0xFF14141B)
val ScannerSurface2     = Color(0xFF1E1E28)
val ScannerSurface3     = Color(0xFF282836)

val ScannerOnSurface    = Color(0xFFF5F5FA)
val ScannerOnSurfaceMed = Color(0xFFA0A0B0)

val ScanValidGreen      = Color(0xFF00E676)
val ScanInvalidRed      = Color(0xFFFF1744)
val ScanDuplicateAmber  = Color(0xFFFF9100)
val ScanOfflineBlue     = Color(0xFF2979FF)

private val ScannerColorScheme = darkColorScheme(
    primary = ScannerPrimary,
    onPrimary = Color.Black,
    primaryContainer = ScannerPrimaryDim,
    background = ScannerBackground,
    onBackground = ScannerOnSurface,
    surface = ScannerSurface,
    onSurface = ScannerOnSurface,
    surfaceVariant = ScannerSurface2,
    onSurfaceVariant = ScannerOnSurfaceMed,
    error = ScanInvalidRed,
    onError = Color.White
)

@Composable
fun ScannerTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = ScannerColorScheme,
        content = content
    )
}
