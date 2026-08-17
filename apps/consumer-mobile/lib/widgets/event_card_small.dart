// =============================================================================
// Reusable — Small Horizontal Event Card  (Phase 16 UI/UX Overhaul)
// Compact card: category-colored pill, spring tap, haptic, attendee count.
// =============================================================================

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../theme/app_colors.dart';
import '../utils/animations.dart';

class EventCardSmall extends StatelessWidget {
  final String title;
  final String venue;
  final String date;
  final String? imageUrl;
  final String? category;
  final String? price;
  final int? interestedCount;
  final VoidCallback? onTap;

  const EventCardSmall({
    super.key,
    required this.title,
    required this.venue,
    required this.date,
    this.imageUrl,
    this.category,
    this.price,
    this.interestedCount,
    this.onTap,
  });

  // Returns the category-appropriate chip color
  static Color _chipColor(String? category) {
    switch (category?.toLowerCase()) {
      case 'music':
      case 'concert':
        return AppColors.chipMusic;
      case 'art':
        return AppColors.chipArt;
      case 'food':
        return AppColors.chipFood;
      case 'sports':
        return AppColors.chipSports;
      case 'comedy':
        return AppColors.chipComedy;
      case 'theatre':
        return AppColors.chipTheatre;
      case 'festival':
        return AppColors.chipFestival;
      default:
        return AppColors.neonPink;
    }
  }

  // Category-specific gradient for placeholder
  static List<Color> _placeholderGradient(String? category) {
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

  @override
  Widget build(BuildContext context) {
    final chipColor = _chipColor(category);

    return ScaleBounce(
      scale: 0.96,
      onTap: () {
        HapticFeedback.lightImpact();
        onTap?.call();
      },
      child: Container(
        width: 190,
        decoration: BoxDecoration(
          color: AppColors.card,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
              color: AppColors.border.withValues(alpha: 0.7), width: 0.5),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.25),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── Image ────────────────────────────────────────────────────
            SizedBox(
              height: 128,
              width: double.infinity,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  if (imageUrl != null && imageUrl!.isNotEmpty)
                    CachedNetworkImage(
                      imageUrl: imageUrl!,
                      fit: BoxFit.cover,
                      placeholder: (context, url) =>
                          Container(color: AppColors.shimmerBase),
                      errorWidget: (context, url, error) =>
                          _buildPlaceholder(),
                    )
                  else
                    _buildPlaceholder(),

                  // Subtle bottom scrim
                  Positioned.fill(
                    child: DecoratedBox(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                          colors: [
                            Colors.transparent,
                            Colors.black.withValues(alpha: 0.4),
                          ],
                          stops: const [0.5, 1.0],
                        ),
                      ),
                    ),
                  ),

                  // Category pill — category-specific color
                  if (category != null)
                    Positioned(
                      top: 8,
                      left: 8,
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: chipColor.withValues(alpha: 0.92),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          category!,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),

            // ── Details ──────────────────────────────────────────────────
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 10, 12, 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: AppColors.textPrimary,
                      fontSize: 13.5,
                      fontWeight: FontWeight.w700,
                      height: 1.25,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    venue,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: AppColors.textSecondary,
                      fontSize: 11.5,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      const Icon(Icons.calendar_today_outlined,
                          size: 11, color: AppColors.textTertiary),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text(
                          date,
                          style: const TextStyle(
                            color: AppColors.textTertiary,
                            fontSize: 11,
                          ),
                        ),
                      ),
                      if (price != null)
                        Text(
                          price!,
                          style: TextStyle(
                            color: chipColor,
                            fontSize: 12,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                    ],
                  ),
                  // Attendee count
                  if (interestedCount != null && interestedCount! > 0) ...[
                    const SizedBox(height: 4),
                    Text(
                      '${_formatCount(interestedCount!)} interested',
                      style: const TextStyle(
                        color: AppColors.textTertiary,
                        fontSize: 10.5,
                      ),
                    ),
                  ],
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

  Widget _buildPlaceholder() {
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: _placeholderGradient(category),
        ),
      ),
      child: const Center(
        child: Icon(Icons.event_rounded, color: Colors.white24, size: 32),
      ),
    );
  }
}
