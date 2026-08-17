// =============================================================================
// Reusable — Large Hero Event Card  (Phase 15)
// Full-bleed image, gradient overlay, price badge (purple gradient),
// category pill (neon pink), bookmark (purple), title + venue.
// Used in Home "Upcoming Events" section.
// All data from real APIs — no mock data.
// =============================================================================

import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../theme/app_colors.dart';

class EventCardLarge extends StatelessWidget {
  final String title;
  final String venue;
  final String date;
  final String? imageUrl;
  final String? category;
  final String? price;
  final bool isBookmarked;
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
    this.onTap,
    this.onBookmark,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        height: 240,
        width: double.infinity,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(20),
          color: AppColors.card,
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
                errorWidget: (context, url, error) => _buildPlaceholderImage(),
              )
            else
              _buildPlaceholderImage(),

            // ── Gradient Overlay (top subtle, heavy at bottom) ────────────
            Positioned.fill(
              child: DecoratedBox(
                decoration: const BoxDecoration(
                  gradient: AppColors.cardOverlayGradient,
                ),
              ),
            ),

            // ── Top-left badges row ───────────────────────────────────────
            Positioned(
              top: 12,
              left: 12,
              right: 56, // leave space for bookmark
              child: Row(
                children: [
                  // Date badge — electric purple pill
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
                    // Category badge — neon pink pill
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(
                        color: AppColors.neonPink,
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
                ],
              ),
            ),

            // ── Bookmark Icon (top-right) ────────────────────────────────
            Positioned(
              top: 8,
              right: 8,
              child: GestureDetector(
                onTap: onBookmark,
                child: Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: Colors.black.withValues(alpha: 0.45),
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: isBookmarked
                          ? AppColors.electricPurple
                          : Colors.white.withValues(alpha: 0.2),
                      width: 1,
                    ),
                  ),
                  child: Icon(
                    isBookmarked
                        ? Icons.bookmark_rounded
                        : Icons.bookmark_border_rounded,
                    color: isBookmarked
                        ? AppColors.electricPurple
                        : Colors.white,
                    size: 20,
                  ),
                ),
              ),
            ),

            // ── Title + Venue + Price (bottom) ───────────────────────────
            Positioned(
              left: 16,
              right: 16,
              bottom: 16,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 19,
                      fontWeight: FontWeight.w700,
                      height: 1.2,
                      shadows: [
                        Shadow(
                          blurRadius: 8,
                          color: Colors.black54,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      const Icon(
                        Icons.location_on_outlined,
                        color: AppColors.textSecondary,
                        size: 13,
                      ),
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
                        // Price badge — gradient pill
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

  Widget _buildPlaceholderImage() {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [AppColors.card, AppColors.surface],
        ),
      ),
      child: const Center(
        child: Icon(Icons.event_rounded, color: AppColors.textTertiary, size: 52),
      ),
    );
  }
}
