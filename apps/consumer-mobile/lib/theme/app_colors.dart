// =============================================================================
// Consumer Mobile — App Color Tokens  (Phase 15)
// Lightning Purple + Neon Pink dual-accent on ultra-dark canvas.
//
// HIERARCHY RULE:
//   Purple  → primary actions / navigation / focus / CTAs
//   Pink    → highlights / badges / live / secondary emphasis
//   Purple→Pink gradient → hero / major CTAs / premium moments
//
// SEMANTIC RULE (binding — do NOT reassign):
//   success  → semantic green  (#4ADE80)
//   error    → semantic red    (#EE3D5A)
//   warning  → amber/orange    (#FBBF24)
//   info     → blue            (#80B0EC)
//
// SCOPE: consumer-mobile ONLY. Do not propagate to other apps yet.
// =============================================================================

import 'package:flutter/material.dart';

abstract final class AppColors {
  // ── Primary Accent — Electric Purple ──────────────────────────────────────
  static const Color electricPurple      = Color(0xFF7B2FFF);
  static const Color electricPurpleLight = Color(0xFF9B5FFF); // hover / lighter
  static const Color electricPurpleDark  = Color(0xFF5C1FCC); // pressed
  static const Color electricPurpleSubtle= Color(0x1A7B2FFF); // 10% overlay

  // ── Secondary Accent — Neon Pink ──────────────────────────────────────────
  static const Color neonPink      = Color(0xFFFF2D78);
  static const Color neonPinkLight = Color(0xFFFF6FA8); // lighter
  static const Color neonPinkDark  = Color(0xFFCC2060); // pressed
  static const Color neonPinkSubtle= Color(0x1AFF2D78); // 10% overlay

  // ── Gradient Helpers ──────────────────────────────────────────────────────
  /// Purple → Pink hero gradient (horizontal, left-to-right)
  static const LinearGradient primaryGradient = LinearGradient(
    begin: Alignment.centerLeft,
    end: Alignment.centerRight,
    colors: [electricPurple, neonPink],
  );

  /// Purple → Pink gradient (diagonal, top-left to bottom-right)
  static const LinearGradient diagonalGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [electricPurple, neonPink],
  );

  /// Subtle dark gradient for card overlays (image → dark overlay)
  static const LinearGradient cardOverlayGradient = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [Colors.transparent, Color(0xCC0A0A0F)],
  );

  // ── Backgrounds (Ultra-Dark Mode) ─────────────────────────────────────────
  static const Color background = Color(0xFF0A0A0F); // deepest dark canvas
  static const Color surface    = Color(0xFF12121A); // modal / bottom sheet
  static const Color card       = Color(0xFF1A1A26); // card background
  static const Color cardHover  = Color(0xFF22223A); // card hover / pressed

  // ── Text ──────────────────────────────────────────────────────────────────
  static const Color textPrimary   = Color(0xFFFFFFFF);
  static const Color textSecondary = Color(0xFFA0A0B8);
  static const Color textTertiary  = Color(0xFF6B6B8A);
  static const Color textOnAccent  = Color(0xFFFFFFFF); // text on purple/pink bg
  static const Color textOnCard    = Color(0xFFFFFFFF); // text on dark card

  // ── Semantic — DO NOT remap these to brand colors ──────────────────────────
  static const Color danger        = Color(0xFFEE3D5A); // error / destructive
  static const Color dangerSubtle  = Color(0x33EE3D5A);
  static const Color info          = Color(0xFF80B0EC); // informational
  static const Color infoSubtle    = Color(0x3380B0EC);
  static const Color success       = Color(0xFF4ADE80); // payment confirmed / scan ok
  static const Color successSubtle = Color(0x334ADE80);
  static const Color warning       = Color(0xFFFBBF24); // caution / amber
  static const Color warningSubtle = Color(0x33FBBF24);

  // ── Borders & Dividers ────────────────────────────────────────────────────
  static const Color border  = Color(0xFF2A2A3A); // default border
  static const Color divider = Color(0xFF1E1E2E); // subtle divider

  // ── Glassmorphism (floating bottom nav / overlays) ─────────────────────────
  static const Color glassBackground = Color(0xCC12121A); // 80% surface
  static const Color glassBorder     = Color(0x337B2FFF); // 20% purple border

  // ── Category Chip Accent Colors (semantic, not brand) ─────────────────────
  static const Color chipMusic    = Color(0xFFE879F9); // fuchsia
  static const Color chipArt      = Color(0xFF38BDF8); // sky blue
  static const Color chipFood     = Color(0xFFFB923C); // orange
  static const Color chipSports   = Color(0xFF4ADE80); // green
  static const Color chipComedy   = Color(0xFFFBBF24); // amber
  static const Color chipTheatre  = Color(0xFFF87171); // red
  static const Color chipFestival = Color(0xFFC084FC); // lavender
  static const Color chipDefault  = Color(0xFF94A3B8); // slate

  // ── Shimmer / Loading ─────────────────────────────────────────────────────
  static const Color shimmerBase      = Color(0xFF1A1A26);
  static const Color shimmerHighlight = Color(0xFF2A2A40); // subtle purple sheen

  // ── Live / Pulse Indicator ────────────────────────────────────────────────
  static const Color livePulse = neonPink; // neon pink for LIVE badge dot
}
