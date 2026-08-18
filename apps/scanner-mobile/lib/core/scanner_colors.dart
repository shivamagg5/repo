// =============================================================================
// Scanner Mobile — Design System & Color Tokens
// High-contrast, outdoor-optimized dark theme tailored for venue gate scanning.
// =============================================================================

import 'package:flutter/material.dart';

abstract final class ScannerColors {
  // ── Backgrounds (Ultra-Dark Canvas) ────────────────────────────────────────
  static const Color background = Color(0xFF090D16);
  static const Color surface = Color(0xFF111827);
  static const Color card = Color(0xFF1A2234);
  static const Color cardHover = Color(0xFF243048);
  static const Color cardElevated = Color(0xFF1E293B);

  // ── Brand Accents ─────────────────────────────────────────────────────────
  static const Color electricPurple = Color(0xFF7C3AED);
  static const Color electricPurpleLight = Color(0xFF9B5FFF);
  static const Color electricPurpleDark = Color(0xFF5B21B6);
  static const Color electricPurpleSubtle = Color(0x267C3AED); // 15% opacity

  // ── Status Tokens (High Visibility) ───────────────────────────────────────
  /// Success / Admitted / Valid
  static const Color success = Color(0xFF10B981);
  static const Color successLight = Color(0xFF34D399);
  static const Color successDark = Color(0xFF065F46);
  static const Color successSubtle = Color(0x2610B981);

  /// Error / Already Used / Revoked / Blocked
  static const Color danger = Color(0xFFEF4444);
  static const Color dangerLight = Color(0xFFF87171);
  static const Color dangerDark = Color(0xFF991B1B);
  static const Color dangerSubtle = Color(0x26EF4444);

  /// Warning / Wrong Event / Expired
  static const Color warning = Color(0xFFF59E0B);
  static const Color warningLight = Color(0xFFFBBF24);
  static const Color warningDark = Color(0xFF92400E);
  static const Color warningSubtle = Color(0x26F59E0B);

  /// Info / Offline Accepted / Synced
  static const Color info = Color(0xFF0EA5E9);
  static const Color infoLight = Color(0xFF38BDF8);
  static const Color infoDark = Color(0xFF075985);
  static const Color infoSubtle = Color(0x260EA5E9);

  // ── Text & Content ────────────────────────────────────────────────────────
  static const Color textPrimary = Color(0xFFFFFFFF);
  static const Color textSecondary = Color(0xFF94A3B8);
  static const Color textMuted = Color(0xFF64748B);
  static const Color textOnAccent = Color(0xFFFFFFFF);

  // ── Borders & Dividers ────────────────────────────────────────────────────
  static const Color border = Color(0xFF2A364F);
  static const Color borderSubtle = Color(0xFF1E293B);
  static const Color borderHighlight = Color(0xFF3B4D70);

  // ── Gradients ─────────────────────────────────────────────────────────────
  static const LinearGradient primaryGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [electricPurple, Color(0xFF6366F1)],
  );

  static const LinearGradient successGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFF059669), Color(0xFF10B981)],
  );

  static const LinearGradient dangerGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFFDC2626), Color(0xFFEF4444)],
  );
}
