package io.eventhub.consumer.ui.theme

import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import java.text.NumberFormat
import java.util.Locale

// ─── PULSR Brand Palette (Matching Landing Page) ─────────────────────────────
val PulsrPink       = Color(0xFFFF2E93)  // Hot pink / loud magenta (--primary)
val PulsrPinkDim    = Color(0xFFC7156F)  // Pressed / container
val PulsrFlame      = Color(0xFFFF5E1E)  // Marquee / ticket flame orange (--flame)
val PulsrAcid       = Color(0xFFA3F736)  // Acid green / electric lime (--accent)
val PulsrNeon       = Color(0xFF00F0FF)  // Cyan / electric teal (--neon)
val AccentGold      = Color(0xFFFFB800)  // Gold price tag highlight

// Backward compatibility aliases
val BrandViolet     = PulsrPink
val BrandVioletDim  = PulsrPinkDim
val AccentOrange    = PulsrFlame

// ─── Signature Gradients ──────────────────────────────────────────────────────
val HotGradient = Brush.horizontalGradient(listOf(PulsrPink, PulsrFlame))
val HotGradientVertical = Brush.verticalGradient(listOf(PulsrPink, PulsrFlame))
val AcidGradient = Brush.horizontalGradient(listOf(PulsrAcid, PulsrNeon))
val HeroCardOverlay = Brush.verticalGradient(
    listOf(
        Color.Transparent,
        Color(0x660A0910),
        Color(0xE60A0910),
        Color(0xFF0A0910)
    )
)
val GlassSurfaceGradient = Brush.verticalGradient(
    listOf(
        Color(0x332E2648),
        Color(0x77161226)
    )
)

// ─── Dark Obsidian Surface System ───────────────────────────────────────────
val BackgroundDark  = Color(0xFF0A0910)  // Deep obsidian midnight black
val SurfaceDark     = Color(0xFF141021)  // Card background
val Surface2Dark    = Color(0xFF1C172F)  // Elevated surfaces / bottom navigation
val Surface3Dark    = Color(0xFF26203E)  // Modals / dialogs
val SurfaceBorder   = Color(0xFF2D2547)  // Subtle crisp borders
val GlowBorderPink  = Color(0x66FF2E93)  // Accent glow border
val GlowBorderAcid  = Color(0x66A3F736)  // Live neon glow border

// ─── Text & Content ─────────────────────────────────────────────────────────
val OnPrimary       = Color(0xFFFFFFFF)
val OnSurface       = Color(0xFFF7F6FB)  // High emphasis
val OnSurfaceMedium = Color(0xFFA9A4BF)  // Medium emphasis / subtitles
val OnSurfaceLow    = Color(0xFF6B6582)  // Muted / placeholders

// ─── Status Colors ──────────────────────────────────────────────────────────
val SuccessGreen    = PulsrAcid
val ErrorRed        = Color(0xFFFF334B)
val WarningAmber    = Color(0xFFFFAB00)
val InfoBlue        = Color(0xFF00D2FF)

// ─── Ticket-specific ────────────────────────────────────────────────────────
val TicketBackground = Color(0xFF161228)
val TicketDivider    = Color(0xFF2D2547)
val QRBackground     = Color(0xFFFFFFFF)

// ─── Currency Formatter (Minor Units paise -> INR) ───────────────────────────
fun formatCurrency(priceInPaise: Int?): String {
    if (priceInPaise == null || priceInPaise == 0) return "Free"
    // Handle both paise (e.g. 149900) and raw rupees (e.g. 1499)
    val rupees = if (priceInPaise >= 10000 && priceInPaise % 100 == 0) {
        priceInPaise / 100
    } else {
        priceInPaise
    }
    return "₹" + NumberFormat.getIntegerInstance(Locale("en", "IN")).format(rupees)
}

