// =============================================================================
// Consumer Mobile — Featured Hero Carousel  (Phase 16 UI/UX Overhaul)
//
// Full-bleed cinematic carousel for top 3-5 events.
// Auto-scrolls every 4s. Animated dot indicators. Social proof pill.
// Replaces the static gradient header card on the Home screen.
// =============================================================================

import 'dart:async';
import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../theme/app_colors.dart';
import '../utils/animations.dart';

class FeaturedCarousel extends StatefulWidget {
  final List<Map<String, dynamic>> events;
  final void Function(Map<String, dynamic> event)? onEventTap;

  const FeaturedCarousel({
    super.key,
    required this.events,
    this.onEventTap,
  });

  @override
  State<FeaturedCarousel> createState() => _FeaturedCarouselState();
}

class _FeaturedCarouselState extends State<FeaturedCarousel> {
  late final PageController _pageController;
  int _currentPage = 0;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _pageController = PageController(viewportFraction: 1.0);
    _startAutoScroll();
  }

  void _startAutoScroll() {
    _timer = Timer.periodic(const Duration(seconds: 4), (_) {
      if (!mounted || widget.events.isEmpty) return;
      final next = (_currentPage + 1) % widget.events.length;
      _pageController.animateToPage(
        next,
        duration: const Duration(milliseconds: 600),
        curve: Curves.easeInOutCubic,
      );
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (widget.events.isEmpty) return const SizedBox.shrink();

    return FadeSlideIn(
      duration: const Duration(milliseconds: 700),
      child: Container(
        margin: const EdgeInsets.fromLTRB(16, 12, 16, 0),
        height: 310,
        child: Stack(
          children: [
            // ── Pages ────────────────────────────────────────────────────
            ClipRRect(
              borderRadius: BorderRadius.circular(24),
              child: PageView.builder(
                controller: _pageController,
                itemCount: widget.events.length,
                onPageChanged: (i) => setState(() => _currentPage = i),
                itemBuilder: (context, index) {
                  final event = widget.events[index];
                  return _CarouselPage(
                    event: event,
                    onTap: () => widget.onEventTap?.call(event),
                  );
                },
              ),
            ),

            // ── Dot Indicators ───────────────────────────────────────────
            Positioned(
              bottom: 16,
              left: 0,
              right: 0,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(widget.events.length, (i) {
                  final isActive = i == _currentPage;
                  return AnimatedContainer(
                    duration: const Duration(milliseconds: 300),
                    curve: Curves.easeOutCubic,
                    margin: const EdgeInsets.symmetric(horizontal: 3),
                    width: isActive ? 22 : 6,
                    height: 6,
                    decoration: BoxDecoration(
                      color: isActive
                          ? Colors.white
                          : Colors.white.withValues(alpha: 0.35),
                      borderRadius: BorderRadius.circular(3),
                    ),
                  );
                }),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Single Carousel Page ──────────────────────────────────────────────────────

class _CarouselPage extends StatelessWidget {
  final Map<String, dynamic> event;
  final VoidCallback? onTap;

  const _CarouselPage({required this.event, this.onTap});

  String _extractImage() {
    final media = event['media'];
    if (media is List && media.isNotEmpty) {
      final first = media[0];
      if (first is Map) return first['url'] ?? first['src'] ?? '';
      if (first is String) return first;
    }
    return event['heroImage'] ??
        event['hero_image'] ??
        event['imageUrl'] ??
        event['image_url'] ??
        '';
  }

  String _formatDate(dynamic dateStr) {
    if (dateStr == null) return 'TBA';
    try {
      final dt = DateTime.parse(dateStr.toString()).toLocal();
      const months = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
      ];
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      return '${days[dt.weekday - 1]}, ${months[dt.month - 1]} ${dt.day}';
    } catch (_) {
      return dateStr.toString();
    }
  }

  String _extractVenue() {
    final venue = event['venue'];
    if (venue is Map) return venue['name'] ?? venue['city'] ?? 'TBD';
    if (venue is String) return venue;
    return event['venueName'] ?? event['venue_name'] ?? event['city'] ?? 'TBD';
  }

  String? _formatPrice() {
    final priceMin = event['priceMin'] ??
        event['price_min'] ??
        event['minPrice'] ??
        event['min_price'];
    if (priceMin == null) return null;
    final amount =
        priceMin is int ? priceMin / 100 : (priceMin as num).toDouble();
    if (amount == 0) return 'Free';
    final currency = event['currency'] ?? 'INR';
    if (currency == 'INR') return '₹${amount.toStringAsFixed(0)} onwards';
    return '\$${amount.toStringAsFixed(2)} onwards';
  }

  @override
  Widget build(BuildContext context) {
    final imageUrl = _extractImage();
    final title = event['title'] ?? event['name'] ?? 'Event';
    final date = _formatDate(event['startDate'] ?? event['start_date']);
    final venue = _extractVenue();
    final price = _formatPrice();
    final category = event['category'] is Map
        ? event['category']['name']
        : event['category']?.toString();

    return GestureDetector(
      onTap: onTap,
      child: Stack(
        fit: StackFit.expand,
        children: [
          // ── Background Image ──────────────────────────────────────────
          if (imageUrl.isNotEmpty)
            CachedNetworkImage(
              imageUrl: imageUrl,
              fit: BoxFit.cover,
              placeholder: (_, __) => Container(
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [Color(0xFF3D1080), Color(0xFF7B2FFF)],
                  ),
                ),
              ),
              errorWidget: (_, __, ___) => _PlaceholderBg(category: category),
            )
          else
            _PlaceholderBg(category: category),

          // ── Deep Cinematic Gradient Overlay ───────────────────────────
          Positioned.fill(
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Colors.transparent,
                    Colors.black.withValues(alpha: 0.15),
                    Colors.black.withValues(alpha: 0.75),
                    Colors.black.withValues(alpha: 0.92),
                  ],
                  stops: const [0.0, 0.35, 0.72, 1.0],
                ),
              ),
            ),
          ),

          // ── Top badges row ────────────────────────────────────────────
          Positioned(
            top: 16,
            left: 16,
            right: 16,
            child: Row(
              children: [
                // Category badge
                if (category != null && category.isNotEmpty)
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: AppColors.neonPink,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      category.toUpperCase(),
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 10,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.8,
                      ),
                    ),
                  ),
                const Spacer(),
                // Social proof pill
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: Colors.black.withValues(alpha: 0.5),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: Colors.white.withValues(alpha: 0.2),
                      width: 0.8,
                    ),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text('🔥', style: TextStyle(fontSize: 12)),
                      SizedBox(width: 4),
                      Text(
                        'Trending',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // ── Bottom Content ────────────────────────────────────────────
          Positioned(
            left: 20,
            right: 20,
            bottom: 32,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                // Event Title
                Text(
                  title,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 22,
                    fontWeight: FontWeight.w800,
                    height: 1.15,
                    letterSpacing: -0.3,
                    shadows: [
                      Shadow(blurRadius: 12, color: Colors.black54),
                    ],
                  ),
                ),
                const SizedBox(height: 8),
                // Date + Venue row
                Row(
                  children: [
                    const Icon(Icons.calendar_today_rounded,
                        color: AppColors.neonPink, size: 13),
                    const SizedBox(width: 5),
                    Text(
                      date,
                      style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.9),
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    Container(
                      margin: const EdgeInsets.symmetric(horizontal: 8),
                      width: 3,
                      height: 3,
                      decoration: const BoxDecoration(
                        color: Colors.white54,
                        shape: BoxShape.circle,
                      ),
                    ),
                    const Icon(Icons.location_on_rounded,
                        color: AppColors.electricPurpleLight, size: 13),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Text(
                        venue,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          color: Colors.white.withValues(alpha: 0.9),
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                // CTA row
                Row(
                  children: [
                    // Price badge
                    if (price != null)
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          gradient: AppColors.primaryGradient,
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          price,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    const Spacer(),
                    // Get Tickets button
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 18, vertical: 9),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            'Get Tickets',
                            style: TextStyle(
                              color: AppColors.electricPurple,
                              fontSize: 13,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                          SizedBox(width: 5),
                          Icon(Icons.arrow_forward_rounded,
                              size: 14, color: AppColors.electricPurple),
                        ],
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ── Placeholder background for events without images ──────────────────────────

class _PlaceholderBg extends StatelessWidget {
  final String? category;
  const _PlaceholderBg({this.category});

  static const _gradients = {
    'Music': [Color(0xFF2D1B69), Color(0xFF7B2FFF)],
    'Concert': [Color(0xFF2D1B69), Color(0xFF7B2FFF)],
    'Festival': [Color(0xFF1A0533), Color(0xFFB830A0)],
    'Comedy': [Color(0xFF1A2A0A), Color(0xFF4ADE80)],
    'Theatre': [Color(0xFF2A0A0A), Color(0xFFEE3D5A)],
    'Art': [Color(0xFF0A1A2A), Color(0xFF38BDF8)],
    'Sports': [Color(0xFF0A2A0A), Color(0xFF4ADE80)],
    'Food': [Color(0xFF2A1A0A), Color(0xFFFB923C)],
  };

  @override
  Widget build(BuildContext context) {
    final colors = (category != null ? _gradients[category] : null) ??
        [const Color(0xFF1A1030), const Color(0xFF4A1F8F)];
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: colors,
        ),
      ),
      child: const Center(
        child: Icon(Icons.event_rounded,
            color: Colors.white24, size: 64),
      ),
    );
  }
}
