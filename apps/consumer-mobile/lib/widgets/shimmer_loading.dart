// =============================================================================
// Consumer Mobile — Shimmer Skeleton Loading  (Phase 16 UI/UX Overhaul)
//
// Skeleton cards that mirror the real card dimensions exactly.
// Uses an AnimationController repeating shimmer (base → highlight → base).
// Applied everywhere LoadingState() previously used a plain spinner.
// =============================================================================

import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

// ── Shimmer Animation Controller ─────────────────────────────────────────────

class _ShimmerScope extends StatefulWidget {
  final Widget child;
  const _ShimmerScope({required this.child});

  @override
  State<_ShimmerScope> createState() => _ShimmerScopeState();
}

class _ShimmerScopeState extends State<_ShimmerScope>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat();
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }


  Animation<double> get animation => _ctrl;

  @override
  Widget build(BuildContext context) => widget.child;
}

// ── ShimmerBox — base rectangle ───────────────────────────────────────────────

class ShimmerBox extends StatelessWidget {
  final double width;
  final double height;
  final double radius;

  const ShimmerBox({
    super.key,
    required this.width,
    required this.height,
    this.radius = 8,
  });

  @override
  Widget build(BuildContext context) {
    return _AnimatedShimmerBox(
      width: width,
      height: height,
      radius: radius,
    );
  }
}

class _AnimatedShimmerBox extends StatefulWidget {
  final double width;
  final double height;
  final double radius;
  const _AnimatedShimmerBox({
    required this.width,
    required this.height,
    required this.radius,
  });

  @override
  State<_AnimatedShimmerBox> createState() => _AnimatedShimmerBoxState();
}

class _AnimatedShimmerBoxState extends State<_AnimatedShimmerBox>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;
  late final Animation<double> _anim;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat();
    _anim = CurvedAnimation(parent: _ctrl, curve: Curves.easeInOut);
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _anim,
      builder: (_, __) {
        return Container(
          width: widget.width,
          height: widget.height,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(widget.radius),
            gradient: LinearGradient(
              begin: Alignment(-1.0 + 2.0 * _anim.value, 0),
              end: Alignment(1.0 + 2.0 * _anim.value, 0),
              colors: const [
                AppColors.shimmerBase,
                AppColors.shimmerHighlight,
                AppColors.shimmerBase,
              ],
              stops: const [0.0, 0.5, 1.0],
            ),
          ),
        );
      },
    );
  }
}

// ── ShimmerCarousel — hero section skeleton ───────────────────────────────────

class ShimmerCarousel extends StatelessWidget {
  const ShimmerCarousel({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 12, 16, 0),
      height: 300,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(24),
      ),
      child: Stack(
        children: [
          ShimmerBox(
            width: double.infinity,
            height: 300,
            radius: 24,
          ),
          // Fake dot indicators at bottom
          Positioned(
            bottom: 16,
            left: 0,
            right: 0,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(3, (i) {
                return Container(
                  margin: const EdgeInsets.symmetric(horizontal: 3),
                  width: i == 0 ? 20 : 6,
                  height: 6,
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.3),
                    borderRadius: BorderRadius.circular(3),
                  ),
                );
              }),
            ),
          ),
          // Fake text block at bottom
          Positioned(
            left: 20,
            right: 20,
            bottom: 42,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                ShimmerBox(width: 200, height: 20, radius: 6),
                const SizedBox(height: 8),
                ShimmerBox(width: 140, height: 14, radius: 5),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ── ShimmerCardLarge — mirrors EventCardLarge ────────────────────────────────

class ShimmerCardLarge extends StatelessWidget {
  const ShimmerCardLarge({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: MediaQuery.of(context).size.width * 0.88,
      height: 256,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
      ),
      child: Stack(
        children: [
          // Full-bleed image skeleton
          ShimmerBox(
            width: double.infinity,
            height: 256,
            radius: 20,
          ),
          // Top badges
          Positioned(
            top: 12,
            left: 12,
            child: Row(
              children: [
                ShimmerBox(width: 60, height: 24, radius: 8),
                const SizedBox(width: 6),
                ShimmerBox(width: 72, height: 24, radius: 8),
              ],
            ),
          ),
          // Bottom text
          Positioned(
            left: 16,
            right: 16,
            bottom: 16,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                ShimmerBox(width: 220, height: 18, radius: 6),
                const SizedBox(height: 6),
                ShimmerBox(width: 160, height: 13, radius: 5),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ── ShimmerCardSmall — mirrors EventCardSmall ────────────────────────────────

class ShimmerCardSmall extends StatelessWidget {
  const ShimmerCardSmall({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 190,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        color: AppColors.card,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Image
          ClipRRect(
            borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
            child: ShimmerBox(width: 190, height: 128, radius: 0),
          ),
          // Text block
          Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                ShimmerBox(width: 140, height: 13, radius: 5),
                const SizedBox(height: 6),
                ShimmerBox(width: 100, height: 11, radius: 4),
                const SizedBox(height: 8),
                ShimmerBox(width: 80, height: 11, radius: 4),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ── ShimmerRow — horizontal list of shimmer cards ────────────────────────────

class ShimmerLargeRow extends StatelessWidget {
  const ShimmerLargeRow({super.key});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 256,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 20),
        itemCount: 3,
        separatorBuilder: (_, __) => const SizedBox(width: 16),
        itemBuilder: (_, __) => const ShimmerCardLarge(),
      ),
    );
  }
}

class ShimmerSmallRow extends StatelessWidget {
  const ShimmerSmallRow({super.key});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 240,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 20),
        itemCount: 4,
        separatorBuilder: (_, __) => const SizedBox(width: 12),
        itemBuilder: (_, __) => const ShimmerCardSmall(),
      ),
    );
  }
}
