// =============================================================================
// Consumer Mobile — Animation Utilities  (Phase 15)
//
// MOTION PHILOSOPHY (per approved guardrails):
//   - Enhance, don't gimmick. Motion is applied ONLY to:
//       Hero headers, CTA interactions, tab transitions,
//       selected state, ticket/payment success, live status.
//   - Ordinary content lists are mostly stable.
//   - Respect MediaQuery.disableAnimations (reduced-motion support).
//   - 44 px minimum touch targets are enforced in widget wrappers below.
// =============================================================================

import 'package:flutter/material.dart';

// ─── Reduced-Motion Guard ────────────────────────────────────────────────────

/// Returns [duration] if animations are enabled, or [Duration.zero] if the
/// device has requested reduced motion.
Duration effectiveDuration(BuildContext context, Duration duration) {
  if (MediaQuery.of(context).disableAnimations) return Duration.zero;
  return duration;
}

// ─── FadeSlideIn ─────────────────────────────────────────────────────────────

/// Fade + upward slide entrance animation for hero widgets and primary sections.
/// NOT applied to every list card — only intentional focal areas.
class FadeSlideIn extends StatefulWidget {
  const FadeSlideIn({
    super.key,
    required this.child,
    this.delay = Duration.zero,
    this.duration = const Duration(milliseconds: 500),
    this.offsetY = 24.0,
  });

  final Widget child;
  final Duration delay;
  final Duration duration;
  final double offsetY;

  @override
  State<FadeSlideIn> createState() => _FadeSlideInState();
}

class _FadeSlideInState extends State<FadeSlideIn>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;
  late final Animation<double> _fade;
  late final Animation<Offset> _slide;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(vsync: this, duration: widget.duration);
    _fade = CurvedAnimation(parent: _ctrl, curve: Curves.easeOut);
    _slide = Tween<Offset>(
      begin: Offset(0, widget.offsetY / 100),
      end: Offset.zero,
    ).animate(CurvedAnimation(parent: _ctrl, curve: Curves.easeOutCubic));

    if (widget.delay == Duration.zero) {
      _ctrl.forward();
    } else {
      Future.delayed(widget.delay, () {
        if (mounted) _ctrl.forward();
      });
    }
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (MediaQuery.of(context).disableAnimations) return widget.child;
    return FadeTransition(
      opacity: _fade,
      child: SlideTransition(position: _slide, child: widget.child),
    );
  }
}

// ─── ScaleBounce ─────────────────────────────────────────────────────────────

/// Spring-scale press feedback for CTA buttons and interactive cards.
/// Applied to primary CTAs and hero cards — not every tappable element.
class ScaleBounce extends StatefulWidget {
  const ScaleBounce({
    super.key,
    required this.child,
    required this.onTap,
    this.scale = 0.95,
    this.duration = const Duration(milliseconds: 120),
  });

  final Widget child;
  final VoidCallback onTap;
  final double scale;
  final Duration duration;

  @override
  State<ScaleBounce> createState() => _ScaleBounceState();
}

class _ScaleBounceState extends State<ScaleBounce>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;
  late final Animation<double> _scaleAnim;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(vsync: this, duration: widget.duration);
    _scaleAnim = Tween<double>(begin: 1.0, end: widget.scale).animate(
      CurvedAnimation(parent: _ctrl, curve: Curves.easeOut),
    );
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  Future<void> _handleTap() async {
    if (!MediaQuery.of(context).disableAnimations) {
      await _ctrl.forward();
      await _ctrl.reverse();
    }
    widget.onTap();
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: _handleTap,
      child: ScaleTransition(scale: _scaleAnim, child: widget.child),
    );
  }
}

// ─── GlowPulse ───────────────────────────────────────────────────────────────

/// Subtle neon glow pulse — used ONLY for live status indicators (e.g. "LIVE" badge).
/// Never rely on glow alone as the state indicator (accessibility rule).
class GlowPulse extends StatefulWidget {
  const GlowPulse({
    super.key,
    required this.child,
    this.color = const Color(0xFFFF2D78),
    this.blurRadius = 8.0,
    this.duration = const Duration(milliseconds: 900),
  });

  final Widget child;
  final Color color;
  final double blurRadius;
  final Duration duration;

  @override
  State<GlowPulse> createState() => _GlowPulseState();
}

class _GlowPulseState extends State<GlowPulse>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;
  late final Animation<double> _anim;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(vsync: this, duration: widget.duration)
      ..repeat(reverse: true);
    _anim = CurvedAnimation(parent: _ctrl, curve: Curves.easeInOut);
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (MediaQuery.of(context).disableAnimations) return widget.child;
    return AnimatedBuilder(
      animation: _anim,
      builder: (_, child) => DecoratedBox(
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          boxShadow: [
            BoxShadow(
              color: widget.color.withValues(alpha: 0.6 * _anim.value),
              blurRadius: widget.blurRadius * _anim.value,
            ),
          ],
        ),
        child: child,
      ),
      child: widget.child,
    );
  }
}

// ─── Tab Indicator Painter (for custom floating nav) ─────────────────────────

/// Paints the active pill background on the floating bottom nav.
class PillIndicatorPainter extends CustomPainter {
  PillIndicatorPainter({
    required this.color,
    required this.progress,
    required this.itemCount,
    required this.activeIndex,
  });

  final Color color;
  final double progress;
  final int itemCount;
  final int activeIndex;

  @override
  void paint(Canvas canvas, Size size) {
    final itemWidth = size.width / itemCount;
    final pillWidth = itemWidth * 0.7;
    final pillHeight = size.height * 0.72;
    final top = (size.height - pillHeight) / 2;
    final left = (activeIndex * itemWidth) + (itemWidth - pillWidth) / 2;

    final paint = Paint()..color = color;
    final rRect = RRect.fromRectAndRadius(
      Rect.fromLTWH(left, top, pillWidth, pillHeight),
      const Radius.circular(24),
    );
    canvas.drawRRect(rRect, paint);
  }

  @override
  bool shouldRepaint(PillIndicatorPainter old) =>
      old.activeIndex != activeIndex || old.color != color;
}
