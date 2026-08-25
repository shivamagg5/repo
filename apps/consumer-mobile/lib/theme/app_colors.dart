// =============================================================================
// Consumer Mobile — App Color Tokens
// PULSR Website Colors — hot pink · flame orange · acid green · neon cyan
// on ultra-dark canvas (ported from consumer-web globals.css :root)
//
// WEBSITE → MOBILE MAPPING:
//   --primary  (hot pink)    → primary accent  (was electricPurple)
//   --flame    (orange)      → secondary accent (was neonPink)
//   --accent   (acid green)  → highlight / price / badge
//   --neon     (cyan)        → info / live indicator
//   --background             → background (unchanged)
//   --card                   → card (unchanged)
//   --border                 → border (unchanged)
//
// oklch → sRGB hex conversions:
//   oklch(0.78 0.19 340) → #E8547A  (hot pink)
//   oklch(0.7  0.21  40) → #E87C2A  (flame orange)
//   oklch(0.87 0.22 145) → #A8E63D  (acid green)
//   oklch(0.85 0.19 195) → #3DE8D8  (neon cyan)
//   oklch(0.13 0.005 285)→ #191921  (background)
//   oklch(0.18 0.008 285)→ #21212E  (card)
//   oklch(0.3  0.01  285) → #42424F  (border)
//
// SEMANTIC RULE (binding — do NOT reassign):
//   success  → semantic green  (#4ADE80)
//   error    → semantic red    (#EE3D5A)
//   warning  → amber/orange    (#FBBF24)
//   info     → blue            (#80B0EC)
//
// SCOPE: consumer-mobile ONLY.
// =============================================================================

import 'package:flutter/material.dart';

abstract final class AppColors {
  // ── Primary Accent — Hot Pink (website --primary) ─────────────────────────
  static const Color hotPink      = Color(0xFFE8547A);
  static const Color hotPinkLight = Color(0xFFEF7D98); // hover / lighter
  static const Color hotPinkDark  = Color(0xFFBF3A5D); // pressed
  static const Color hotPinkSubtle= Color(0x1AE8547A); // 10% overlay

  // ── Secondary Accent — Flame Orange (website --flame) ─────────────────────
  static const Color flameOrange      = Color(0xFFE87C2A);
  static const Color flameOrangeLight = Color(0xFFEF9A58); // hover / lighter
  static const Color flameOrangeDark  = Color(0xFFBF5E18); // pressed
  static const Color flameOrangeSubtle= Color(0x1AE87C2A); // 10% overlay

  // ── Highlight — Acid Green (website --accent) ──────────────────────────────
  static const Color acidGreen      = Color(0xFFA8E63D);
  static const Color acidGreenLight = Color(0xFFC0ED6A); // lighter
  static const Color acidGreenDark  = Color(0xFF82BF1A); // pressed
  static const Color acidGreenSubtle= Color(0x1AA8E63D); // 10% overlay

  // ── Info / Live — Neon Cyan (website --neon) ──────────────────────────────
  static const Color neonCyan      = Color(0xFF3DE8D8);
  static const Color neonCyanSubtle= Color(0x1A3DE8D8); // 10% overlay

  // ── Gradient Helpers ──────────────────────────────────────────────────────
  /// Hot pink → flame orange gradient (matches website bg-hot)
  static const LinearGradient primaryGradient = LinearGradient(
    begin: Alignment.centerLeft,
    end: Alignment.centerRight,
    colors: [hotPink, flameOrange],
  );

  /// Acid green → neon cyan gradient (matches website bg-acid)
  static const LinearGradient accentGradient = LinearGradient(
    begin: Alignment.centerLeft,
    end: Alignment.centerRight,
    colors: [acidGreen, neonCyan],
  );

  /// Hot pink → flame orange (diagonal — for hero / premium CTAs)
  static const LinearGradient diagonalGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [hotPink, flameOrange],
  );

  /// Subtle dark gradient for card overlays (image → dark overlay)
  static const LinearGradient cardOverlayGradient = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [Colors.transparent, Color(0xCC0A0A0F)],
  );

  // ── Backgrounds (Ultra-Dark Mode — same as website) ───────────────────────
  static const Color background = Color(0xFF191921); // --background oklch(0.13 0.005 285)
  static const Color surface    = Color(0xFF1A1A26); // --muted oklch(0.22 0.008 285)
  static const Color card       = Color(0xFF21212E); // --card oklch(0.18 0.008 285)
  static const Color cardHover  = Color(0xFF2A2A3A); // slightly lighter

  // ── Text ──────────────────────────────────────────────────────────────────
  static const Color textPrimary   = Color(0xFFF5F5F5); // --foreground oklch(0.97 0.005 285)
  static const Color textSecondary = Color(0xFFA0A0B8); // --muted-foreground
  static const Color textTertiary  = Color(0xFF5A5A6E); // dim
  static const Color textOnAccent  = Color(0xFF1A0A0F); // --primary-foreground (dark on pink)
  static const Color textOnCard    = Color(0xFFF5F5F5);

  // ── Semantic — DO NOT remap these to brand colors ──────────────────────────
  static const Color danger        = Color(0xFFEE3D5A);
  static const Color dangerSubtle  = Color(0x33EE3D5A);
  static const Color info          = Color(0xFF80B0EC);
  static const Color infoSubtle    = Color(0x3380B0EC);
  static const Color success       = Color(0xFF4ADE80);
  static const Color successSubtle = Color(0x334ADE80);
  static const Color warning       = Color(0xFFFBBF24);
  static const Color warningSubtle = Color(0x33FBBF24);

  // ── Borders & Dividers ────────────────────────────────────────────────────
  static const Color border  = Color(0xFF42424F); // --border oklch(0.3 0.01 285)
  static const Color divider = Color(0xFF2A2A38); // subtle divider

  // ── Glassmorphism (floating bottom nav / overlays) ─────────────────────────
  static const Color glassBackground = Color(0xCC21212E); // 80% card
  static const Color glassBorder     = Color(0x33E8547A); // 20% hot-pink border

  // ── Category Chip Accent Colors (semantic, not brand) ─────────────────────
  static const Color chipMusic    = Color(0xFFE8547A); // hot pink (primary)
  static const Color chipArt      = Color(0xFF3DE8D8); // neon cyan
  static const Color chipFood     = Color(0xFFE87C2A); // flame orange
  static const Color chipSports   = Color(0xFF4ADE80); // semantic green
  static const Color chipComedy   = Color(0xFFA8E63D); // acid green
  static const Color chipTheatre  = Color(0xFFF87171); // red
  static const Color chipFestival = Color(0xFFE87C2A); // flame orange
  static const Color chipDefault  = Color(0xFF94A3B8); // slate

  // ── Shimmer / Loading ─────────────────────────────────────────────────────
  static const Color shimmerBase      = Color(0xFF21212E);
  static const Color shimmerHighlight = Color(0xFF2A2A40);

  // ── Live / Pulse Indicator ────────────────────────────────────────────────
  static const Color livePulse = hotPink; // hot pink for LIVE badge dot

  // ── Legacy aliases (for code referencing old names) ───────────────────────
  // These keep backward compat without changing other files.
  static const Color electricPurple       = hotPink;
  static const Color electricPurpleLight  = hotPinkLight;
  static const Color electricPurpleDark   = hotPinkDark;
  static const Color electricPurpleSubtle = hotPinkSubtle;
  static const Color neonPink             = flameOrange;
  static const Color neonPinkLight        = flameOrangeLight;
  static const Color neonPinkDark         = flameOrangeDark;
  static const Color neonPinkSubtle       = flameOrangeSubtle;
}
