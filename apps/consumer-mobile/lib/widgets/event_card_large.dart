// =============================================================================
// Reusable — Large Hero Event Card  (Phase 16 UI/UX Overhaul)
// Full-bleed image, cinematic gradient overlay, price badge (purple gradient),
// category pill, spring-bounce tap feedback, social proof row.
// =============================================================================

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../theme/app_colors.dart';
import '../utils/animations.dart';

class EventCardLarge extends StatelessWidget {
  final String title;
  final String venue;
  final String date;
  final String? imageUrl;
  final String? category;
  final String? price;
  final bool isBookmarked;
  final bool isTrending;
  final int? interestedCount;
  final VoidCallback? onTap;
  final VoidCallback? onBookmark;

  const EventCardLarge({
    super.key,
    required this.title,
    required this.venue,
    required this.date,
    this.imageUrl,
    this.category,
    this.price,
    this.isBookmarked = false,
    this.isTrending = false,
    this.interestedCount,
    this.onTap,
    this.onBookmark,
  });

  @override
  Widget build(BuildContext context) {
    return ScaleBounce(
      scale: 0.97,
      onTap: () {
        HapticFeedback.lightImpact();
        onTap?.call();
      },
      child: Container(
        height: 256,
        width: double.infinity,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(20),
          color: AppColors.card,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.3),
              blurRadius: 16,
              offset: const Offset(0, 6),
            ),
          ],
        ),
        clipBehavior: Clip.antiAlias,
        child: Stack(
          fit: StackFit.expand,
          children: [
            // ── Event Image ──────────────────────────────────────────────
            if (imageUrl != null && imageUrl!.isNotEmpty)
              CachedNetworkImage(
                imageUrl: imageUrl!,
                fit: BoxFit.cover,
                placeholder: (context, url) =>
                    Container(color: AppColors.shimmerBase),
                errorWidget: (context, url, error) =>
                    _buildPlaceholderImage(),
              )
            else
              _buildPlaceholderImage(),

            // ── Deep cinematic gradient overlay ───────────────────────────
            Positioned.fill(
              child: DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      Colors.transparent,
                      Colors.black.withValues(alpha: 0.1),
                      Colors.black.withValues(alpha: 0.65),
                      Colors.black.withValues(alpha: 0.88),
                    ],
                    stops: const [0.0, 0.3, 0.65, 1.0],
                  ),
                ),
              ),
            ),

            // ── Top-left badges row ───────────────────────────────────────
            Positioned(
              top: 12,
              left: 12,
              right: 56,
              child: Row(
                children: [
                  // Date badge
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      gradient: AppColors.primaryGradient,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      date,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.2,
                      ),
                    ),
                  ),
                  if (category != null) ...[
                    const SizedBox(width: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(
                        color: AppColors.neonPink.withValues(alpha: 0.9),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        category!,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                  // Trending badge
                  if (isTrending) ...[
                    const SizedBox(width: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 5),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFF6B00).withValues(alpha: 0.9),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Text(
                        '🔥 Hot',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),

            // ── Bookmark button ──────────────────────────────────────────
            Positioned(
              top: 8,
              right: 8,
              child: _AnimatedBookmark(
                isBookmarked: isBookmarked,
                onTap: onBookmark,
              ),
            ),

            // ── Bottom: Title + Venue + Social Proof + Price ─────────────
            Positioned(
              left: 16,
              right: 16,
              bottom: 14,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Social proof
                  if (interestedCount != null && interestedCount! > 0) ...[
                    Row(
                      children: [
                        // Avatar stack
                        SizedBox(
                          width: 52,
                          height: 20,
                          child: Stack(
                            children: List.generate(3, (i) {
                              return Positioned(
                                left: i * 14.0,
                                child: Container(
                                  width: 20,
                                  height: 20,
                                  decoration: BoxDecoration(
                                    shape: BoxShape.circle,
                                    color: [
                                      AppColors.electricPurple,
                                      AppColors.neonPink,
                                      AppColors.chipMusic,
                                    ][i],
                                    border: Border.all(
                                        color: Colors.black, width: 1.5),
                                  ),
                                  child: Center(
                                    child: Text(
                                      ['R', 'P', 'A'][i],
                                      style: const TextStyle(
                                          color: Colors.white,
                                          fontSize: 8,
                                          fontWeight: FontWeight.w700),
                                    ),
                                  ),
                                ),
                              );
                            }),
                          ),
                        ),
                        const SizedBox(width: 6),
                        Text(
                          '${_formatCount(interestedCount!)} going',
                          style: TextStyle(
                            color: Colors.white.withValues(alpha: 0.85),
                            fontSize: 11,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                  ],

                  // Title
                  Text(
                    title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 19,
                      fontWeight: FontWeight.w800,
                      height: 1.2,
                      letterSpacing: -0.2,
                      shadows: [
                        Shadow(blurRadius: 10, color: Colors.black54),
                      ],
                    ),
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      const Icon(Icons.location_on_outlined,
                          color: AppColors.textSecondary, size: 13),
                      const SizedBox(width: 3),
                      Expanded(
                        child: Text(
                          venue,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: AppColors.textSecondary,
                            fontSize: 12,
                          ),
                        ),
                      ),
                      if (price != null) ...[
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            gradient: AppColors.primaryGradient,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            price!,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _formatCount(int count) {
    if (count >= 1000) return '${(count / 1000).toStringAsFixed(1)}k';
    return count.toString();
  }

  Widget _buildPlaceholderImage() {
    final colors = _categoryGradient(category);
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: colors,
        ),
      ),
      child: const Center(
        child: Icon(Icons.event_rounded, color: Colors.white24, size: 52),
      ),
    );
  }

  static List<Color> _categoryGradient(String? category) {
    switch (category?.toLowerCase()) {
      case 'music':
      case 'concert':
        return [const Color(0xFF2D1B69), const Color(0xFF7B2FFF)];
      case 'festival':
        return [const Color(0xFF1A0533), const Color(0xFFB830A0)];
      case 'comedy':
        return [const Color(0xFF1A2A0A), const Color(0xFF4ADE80)];
      case 'theatre':
        return [const Color(0xFF2A0A0A), const Color(0xFFEE3D5A)];
      case 'art':
        return [const Color(0xFF0A1A2A), const Color(0xFF38BDF8)];
      default:
        return [const Color(0xFF1A1030), const Color(0xFF4A1F8F)];
    }
  }
}

// ── Animated Bookmark Button ──────────────────────────────────────────────────

class _AnimatedBookmark extends StatefulWidget {
  final bool isBookmarked;
  final VoidCallback? onTap;

  const _AnimatedBookmark({required this.isBookmarked, this.onTap});

  @override
  State<_AnimatedBookmark> createState() => _AnimatedBookmarkState();
}

class _AnimatedBookmarkState extends State<_AnimatedBookmark>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;
  late final Animation<double> _scale;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
        vsync: this, duration: const Duration(milliseconds: 200));
    _scale = TweenSequence([
      TweenSequenceItem(tween: Tween(begin: 1.0, end: 1.3), weight: 50),
      TweenSequenceItem(tween: Tween(begin: 1.3, end: 1.0), weight: 50),
    ]).animate(CurvedAnimation(parent: _ctrl, curve: Curves.easeOut));
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  void _handleTap() {
    HapticFeedback.lightImpact();
    _ctrl.forward(from: 0);
    widget.onTap?.call();
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: _handleTap,
      child: ScaleTransition(
        scale: _scale,
        child: Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: Colors.black.withValues(alpha: 0.5),
            shape: BoxShape.circle,
            border: Border.all(
              color: widget.isBookmarked
                  ? AppColors.electricPurple
                  : Colors.white.withValues(alpha: 0.2),
              width: 1,
            ),
          ),
          child: Icon(
            widget.isBookmarked
                ? Icons.bookmark_rounded
                : Icons.bookmark_border_rounded,
            color:
                widget.isBookmarked ? AppColors.electricPurple : Colors.white,
            size: 20,
          ),
        ),
      ),
    );
  }
}
