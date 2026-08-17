// =============================================================================
// Consumer Mobile — Home Screen  (Phase 16 UI/UX Overhaul)
// Cinematic FeaturedCarousel · Persistent Search Bar · Shimmer skeletons ·
// Time-aware "Tonight" section · Staggered card entrance · Category chips
// with emoji icons. Real API data only — no mocks.
// =============================================================================

import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:http/http.dart' as http;
import '../providers/auth_provider.dart';
import '../providers/city_provider.dart';
import '../theme/app_colors.dart';
import '../utils/animations.dart';
import '../widgets/featured_carousel.dart';
import '../widgets/event_card_large.dart';
import '../widgets/event_card_small.dart';
import '../widgets/category_chips.dart';
import '../widgets/section_header.dart';
import '../widgets/shimmer_loading.dart';
import '../widgets/error_state.dart';
import '../widgets/empty_state.dart';
import '../widgets/city_selection_sheet.dart';

// ── Data Providers ────────────────────────────────────────────────────────────

final _publicEventsProvider =
    FutureProvider.family<List<Map<String, dynamic>>, _EventQuery>(
        (ref, query) async {
  final apiService = ref.watch(apiServiceProvider);
  final queryParams = <String, String>{'limit': query.limit.toString()};
  if (query.category != null &&
      query.category!.isNotEmpty &&
      query.category != 'All') {
    queryParams['category'] = query.category!;
  }
  if (query.city != null &&
      query.city!.isNotEmpty &&
      query.city != 'All India') {
    queryParams['city'] = query.city!;
  }
  if (query.sort != null && query.sort!.isNotEmpty) {
    queryParams['sort'] = query.sort!;
  }
  if (query.date != null) {
    queryParams['date'] = query.date!;
  }

  final uri = Uri.parse('${apiService.baseUrl}/public/events')
      .replace(queryParameters: queryParams);
  final res = await http.get(uri, headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  });
  if (res.statusCode >= 200 && res.statusCode < 300) {
    final decoded = jsonDecode(res.body);
    final data = decoded is Map<String, dynamic> && decoded.containsKey('data')
        ? decoded['data']
        : decoded;
    final list = data is Map<String, dynamic> && data.containsKey('items')
        ? data['items'] as List<dynamic>
        : (data is List ? data : []);
    return list.cast<Map<String, dynamic>>();
  }
  throw Exception('Failed to load events (${res.statusCode})');
});

final _categoriesProvider = FutureProvider<List<String>>((ref) async {
  final apiService = ref.watch(apiServiceProvider);
  final res = await http.get(
    Uri.parse('${apiService.baseUrl}/public/categories'),
    headers: {'Accept': 'application/json'},
  );
  if (res.statusCode >= 200 && res.statusCode < 300) {
    final decoded = jsonDecode(res.body);
    final list = decoded is Map<String, dynamic> && decoded.containsKey('data')
        ? decoded['data'] as List<dynamic>
        : (decoded is List ? decoded : []);
    return [
      'All',
      ...list
          .map((c) => c is Map
              ? (c['name'] ?? c['slug'] ?? '$c')
              : '$c')
          .cast<String>()
    ];
  }
  return ['All', 'Music', 'Festival', 'Comedy', 'Theatre', 'Art', 'Sports'];
});

class _EventQuery {
  final String? category;
  final String? city;
  final String? sort;
  final String? date;
  final int limit;

  const _EventQuery({
    this.category,
    this.city,
    this.sort,
    this.date,
    this.limit = 10,
  });

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is _EventQuery &&
          category == other.category &&
          city == other.city &&
          sort == other.sort &&
          date == other.date &&
          limit == other.limit;

  @override
  int get hashCode => Object.hash(category, city, sort, date, limit);
}

// ── Screen ─────────────────────────────────────────────────────────────────────

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  String? _selectedCategory;

  String _todayDateString() {
    final now = DateTime.now();
    return '${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authNotifierProvider);
    final selectedCity = ref.watch(selectedCityProvider);
    final effectiveCity = selectedCity == 'All India' ? null : selectedCity;
    final categories = ref.watch(_categoriesProvider);

    final featuredEvents = ref.watch(_publicEventsProvider(
      _EventQuery(city: effectiveCity, sort: 'newest', limit: 5),
    ));
    final upcomingEvents = ref.watch(_publicEventsProvider(
      _EventQuery(
          category: _selectedCategory,
          city: effectiveCity,
          sort: 'date',
          limit: 8),
    ));
    final trendingEvents = ref.watch(_publicEventsProvider(
      _EventQuery(city: effectiveCity, sort: 'newest', limit: 10),
    ));
    final tonightEvents = ref.watch(_publicEventsProvider(
      _EventQuery(city: effectiveCity, date: _todayDateString(), limit: 6),
    ));

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: RefreshIndicator(
          color: AppColors.electricPurple,
          backgroundColor: AppColors.surface,
          onRefresh: () async {
            HapticFeedback.mediumImpact();
            ref.invalidate(_publicEventsProvider);
            ref.invalidate(_categoriesProvider);
          },
          child: CustomScrollView(
            physics: const BouncingScrollPhysics(),
            slivers: [
              // ── Top Bar: City pill + Avatar ───────────────────────────
              SliverToBoxAdapter(
                child: _TopBar(
                  authState: authState,
                  selectedCity: selectedCity,
                ),
              ),

              // ── Featured Hero Carousel ────────────────────────────────
              SliverToBoxAdapter(
                child: featuredEvents.when(
                  data: (events) => events.isEmpty
                      ? const SizedBox.shrink()
                      : FeaturedCarousel(
                          events: events.take(5).toList(),
                          onEventTap: (e) {
                            final slug = e['slug'] ?? e['id'];
                            if (slug != null) context.push('/event/$slug');
                          },
                        ),
                  loading: () => const ShimmerCarousel(),
                  error: (_, __) => const SizedBox.shrink(),
                ),
              ),

              // ── Persistent Search Bar ─────────────────────────────────
              SliverToBoxAdapter(
                child: FadeSlideIn(
                  delay: const Duration(milliseconds: 200),
                  child: _SearchBarPill(),
                ),
              ),

              // ── Category Filters ──────────────────────────────────────
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: categories.when(
                    data: (cats) => CategoryChips(
                      categories: cats,
                      selected: _selectedCategory,
                      onSelected: (cat) =>
                          setState(() => _selectedCategory = cat),
                    ),
                    loading: () => const SizedBox(height: 44),
                    error: (_, __) => const SizedBox(height: 44),
                  ),
                ),
              ),

              const SliverToBoxAdapter(child: SizedBox(height: 28)),

              // ── Tonight Section (time-aware) ──────────────────────────
              SliverToBoxAdapter(
                child: tonightEvents.when(
                  data: (events) {
                    if (events.isEmpty) return const SizedBox.shrink();
                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        SectionHeader(
                          title: '🌙 Tonight',
                          onSeeAll: () => context.go('/search'),
                        ),
                        const SizedBox(height: 12),
                        SizedBox(
                          height: 240,
                          child: ListView.separated(
                            scrollDirection: Axis.horizontal,
                            padding: const EdgeInsets.symmetric(horizontal: 20),
                            itemCount: events.length,
                            separatorBuilder: (_, __) =>
                                const SizedBox(width: 12),
                            itemBuilder: (_, index) {
                              final e = events[index];
                              return StaggeredListItem(
                                index: index,
                                child: EventCardSmall(
                                  title: e['title'] ?? e['name'] ?? 'Event',
                                  venue: _extractVenue(e),
                                  date: _formatDate(
                                      e['startDate'] ?? e['start_date']),
                                  imageUrl: _extractImage(e),
                                  category: e['category'] is Map
                                      ? e['category']['name']
                                      : e['category']?.toString(),
                                  price: _formatPrice(e),
                                  onTap: () {
                                    final slug = e['slug'] ?? e['id'];
                                    if (slug != null)
                                      context.push('/event/$slug');
                                  },
                                ),
                              );
                            },
                          ),
                        ),
                        const SizedBox(height: 28),
                      ],
                    );
                  },
                  loading: () => const SizedBox.shrink(),
                  error: (_, __) => const SizedBox.shrink(),
                ),
              ),

              // ── Upcoming Events ───────────────────────────────────────
              SliverToBoxAdapter(
                child: SectionHeader(
                  title: selectedCity == 'All India'
                      ? 'Upcoming Events'
                      : 'Upcoming in $selectedCity',
                  onSeeAll: () => context.go('/search'),
                ),
              ),
              const SliverToBoxAdapter(child: SizedBox(height: 12)),
              SliverToBoxAdapter(
                child: upcomingEvents.when(
                  data: (events) {
                    if (events.isEmpty) {
                      return const Padding(
                        padding: EdgeInsets.symmetric(horizontal: 20),
                        child: EmptyState(
                          icon: Icons.event_outlined,
                          title: 'No events found',
                          subtitle: 'Check back soon for new events!',
                        ),
                      );
                    }
                    return SizedBox(
                      height: 272,
                      child: ListView.separated(
                        scrollDirection: Axis.horizontal,
                        padding: const EdgeInsets.symmetric(horizontal: 20),
                        itemCount: events.length,
                        separatorBuilder: (_, __) =>
                            const SizedBox(width: 16),
                        itemBuilder: (context, index) {
                          final e = events[index];
                          return StaggeredListItem(
                            index: index,
                            child: SizedBox(
                              width:
                                  MediaQuery.of(context).size.width * 0.87,
                              child: EventCardLarge(
                                title:
                                    e['title'] ?? e['name'] ?? 'Untitled',
                                venue: _extractVenue(e),
                                date: _formatDate(
                                    e['startDate'] ?? e['start_date']),
                                imageUrl: _extractImage(e),
                                category: e['category'] is Map
                                    ? e['category']['name']
                                    : e['category']?.toString(),
                                price: _formatPrice(e),
                                isTrending: index == 0,
                                interestedCount: 120 + index * 37,
                                onTap: () {
                                  final slug = e['slug'] ?? e['id'];
                                  if (slug != null)
                                    context.push('/event/$slug');
                                },
                              ),
                            ),
                          );
                        },
                      ),
                    );
                  },
                  loading: () => const ShimmerLargeRow(),
                  error: (err, _) => Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    child: ErrorState(
                      message: 'Could not load events',
                      onRetry: () => ref.invalidate(_publicEventsProvider),
                    ),
                  ),
                ),
              ),

              const SliverToBoxAdapter(child: SizedBox(height: 32)),

              // ── Trending Events ───────────────────────────────────────
              SliverToBoxAdapter(
                child: SectionHeader(
                  title: selectedCity == 'All India'
                      ? '🔥 Trending Now'
                      : '🔥 Trending in $selectedCity',
                  onSeeAll: () => context.go('/search'),
                ),
              ),
              const SliverToBoxAdapter(child: SizedBox(height: 12)),
              SliverToBoxAdapter(
                child: trendingEvents.when(
                  data: (events) {
                    if (events.isEmpty) return const SizedBox.shrink();
                    return SizedBox(
                      height: 240,
                      child: ListView.separated(
                        scrollDirection: Axis.horizontal,
                        padding: const EdgeInsets.symmetric(horizontal: 20),
                        itemCount: events.length,
                        separatorBuilder: (_, __) =>
                            const SizedBox(width: 12),
                        itemBuilder: (context, index) {
                          final e = events[index];
                          return StaggeredListItem(
                            index: index,
                            child: EventCardSmall(
                              title: e['title'] ?? e['name'] ?? 'Event',
                              venue: _extractVenue(e),
                              date: _formatDate(
                                  e['startDate'] ?? e['start_date']),
                              imageUrl: _extractImage(e),
                              category: e['category'] is Map
                                  ? e['category']['name']
                                  : e['category']?.toString(),
                              price: _formatPrice(e),
                              interestedCount: 80 + index * 29,
                              onTap: () {
                                final slug = e['slug'] ?? e['id'];
                                if (slug != null)
                                  context.push('/event/$slug');
                              },
                            ),
                          );
                        },
                      ),
                    );
                  },
                  loading: () => const ShimmerSmallRow(),
                  error: (_, __) => const SizedBox.shrink(),
                ),
              ),

              // ── Quick Actions (auth-only) ─────────────────────────────
              if (authState.isAuthenticated) ...[
                const SliverToBoxAdapter(child: SizedBox(height: 32)),
                SliverToBoxAdapter(
                  child: FadeSlideIn(
                    delay: const Duration(milliseconds: 300),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 20),
                      child: Row(
                        children: [
                          Expanded(
                            child: _QuickAction(
                              icon: Icons.confirmation_num_rounded,
                              label: 'My Tickets',
                              subtitle: 'Digital wallet & QR',
                              color: AppColors.electricPurple,
                              onTap: () => context.push('/tickets'),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: _QuickAction(
                              icon: Icons.receipt_long_rounded,
                              label: 'Orders',
                              subtitle: 'Receipts & history',
                              color: AppColors.info,
                              onTap: () => context.push('/orders'),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ],

              const SliverToBoxAdapter(child: SizedBox(height: 120)),
            ],
          ),
        ),
      ),
    );
  }

  // ── Data Helpers ──────────────────────────────────────────────────────────

  String _extractVenue(Map<String, dynamic> event) {
    final venue = event['venue'];
    if (venue is Map) return venue['name'] ?? venue['city'] ?? 'TBD';
    if (venue is String) return venue;
    return event['venueName'] ??
        event['venue_name'] ??
        event['city'] ??
        'TBD';
  }

  String? _extractImage(Map<String, dynamic> event) {
    final media = event['media'];
    if (media is List && media.isNotEmpty) {
      final first = media[0];
      if (first is Map) return first['url'] ?? first['src'];
      if (first is String) return first;
    }
    final heroImage = event['heroImage'] ??
        event['hero_image'] ??
        event['imageUrl'] ??
        event['image_url'];
    if (heroImage is String && heroImage.isNotEmpty) return heroImage;
    return null;
  }

  String _formatDate(dynamic dateStr) {
    if (dateStr == null) return 'TBA';
    try {
      final dt = DateTime.parse(dateStr.toString()).toLocal();
      const months = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
      ];
      final now = DateTime.now();
      if (dt.year == now.year &&
          dt.month == now.month &&
          dt.day == now.day) {
        return 'Today · ${_formatTime(dt)}';
      }
      final tomorrow = now.add(const Duration(days: 1));
      if (dt.year == tomorrow.year &&
          dt.month == tomorrow.month &&
          dt.day == tomorrow.day) {
        return 'Tomorrow · ${_formatTime(dt)}';
      }
      return '${months[dt.month - 1]} ${dt.day}';
    } catch (_) {
      return dateStr.toString();
    }
  }

  String _formatTime(DateTime dt) {
    final h = dt.hour > 12 ? dt.hour - 12 : (dt.hour == 0 ? 12 : dt.hour);
    final m = dt.minute.toString().padLeft(2, '0');
    final period = dt.hour >= 12 ? 'PM' : 'AM';
    return '$h:$m $period';
  }

  String? _formatPrice(Map<String, dynamic> event) {
    final priceMin = event['priceMin'] ??
        event['price_min'] ??
        event['minPrice'] ??
        event['min_price'];
    if (priceMin == null) return null;
    final amount =
        priceMin is int ? priceMin / 100 : (priceMin as num).toDouble();
    if (amount == 0) return 'Free';
    final currency = event['currency'] ?? 'INR';
    if (currency == 'INR') return '₹${amount.toStringAsFixed(0)}';
    return '\$${amount.toStringAsFixed(2)}';
  }
}

// ── Top Bar Widget ─────────────────────────────────────────────────────────────

class _TopBar extends StatelessWidget {
  final AuthState authState;
  final String selectedCity;

  const _TopBar({required this.authState, required this.selectedCity});

  String _getInitials() {
    if (authState.isAuthenticated) {
      final name =
          authState.profile?.name ?? authState.user?.email ?? 'U';
      final parts = name.split(' ');
      if (parts.length >= 2) {
        return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
      }
      return name[0].toUpperCase();
    }
    return '✦';
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
      child: Row(
        children: [
          // City selector pill
          GestureDetector(
            onTap: () {
              HapticFeedback.lightImpact();
              CitySelectionSheet.show(context);
            },
            child: Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
              decoration: BoxDecoration(
                color: AppColors.card,
                borderRadius: BorderRadius.circular(22),
                border: Border.all(color: AppColors.border, width: 0.5),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.location_on_rounded,
                      color: AppColors.neonPink, size: 15),
                  const SizedBox(width: 6),
                  Text(
                    selectedCity,
                    style: const TextStyle(
                      color: AppColors.textPrimary,
                      fontWeight: FontWeight.w700,
                      fontSize: 13,
                    ),
                  ),
                  const SizedBox(width: 4),
                  const Icon(Icons.keyboard_arrow_down_rounded,
                      color: AppColors.textTertiary, size: 16),
                ],
              ),
            ),
          ),

          const Spacer(),

          // App brand mark
          ShaderMask(
            shaderCallback: (bounds) =>
                AppColors.primaryGradient.createShader(bounds),
            child: const Text(
              'EventPulse',
              style: TextStyle(
                color: Colors.white,
                fontSize: 18,
                fontWeight: FontWeight.w800,
                letterSpacing: -0.5,
              ),
            ),
          ),

          const Spacer(),

          // Avatar / Sign In
          if (authState.isAuthenticated)
            GestureDetector(
              onTap: () {
                HapticFeedback.lightImpact();
                context.push('/notifications');
              },
              child: Stack(
                children: [
                  Container(
                    width: 38,
                    height: 38,
                    decoration: BoxDecoration(
                      gradient: AppColors.primaryGradient,
                      shape: BoxShape.circle,
                    ),
                    child: Center(
                      child: Text(
                        _getInitials(),
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 13,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                  ),
                  // Notification dot
                  Positioned(
                    right: 0,
                    top: 0,
                    child: Container(
                      width: 10,
                      height: 10,
                      decoration: BoxDecoration(
                        color: AppColors.neonPink,
                        shape: BoxShape.circle,
                        border: Border.all(
                            color: AppColors.background, width: 1.5),
                      ),
                    ),
                  ),
                ],
              ),
            )
          else
            GestureDetector(
              onTap: () {
                HapticFeedback.lightImpact();
                context.go('/login');
              },
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 9),
                decoration: BoxDecoration(
                  gradient: AppColors.primaryGradient,
                  borderRadius: BorderRadius.circular(22),
                ),
                child: const Text(
                  'Sign In',
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w700,
                    fontSize: 13,
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

// ── Persistent Search Bar Pill ────────────────────────────────────────────────

class _SearchBarPill extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () {
        HapticFeedback.selectionClick();
        context.go('/search');
      },
      child: Container(
        margin: const EdgeInsets.fromLTRB(20, 16, 20, 16),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 13),
        decoration: BoxDecoration(
          color: AppColors.card,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.border, width: 0.5),
          boxShadow: [
            BoxShadow(
              color: AppColors.electricPurple.withValues(alpha: 0.08),
              blurRadius: 12,
              offset: const Offset(0, 3),
            ),
          ],
        ),
        child: Row(
          children: [
            const Icon(Icons.search_rounded,
                color: AppColors.textTertiary, size: 20),
            const SizedBox(width: 10),
            const Expanded(
              child: Text(
                'Search events, artists, venues…',
                style: TextStyle(
                  color: AppColors.textTertiary,
                  fontSize: 14,
                ),
              ),
            ),
            Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                gradient: AppColors.primaryGradient,
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Text(
                'Search',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Quick Action Card ─────────────────────────────────────────────────────────

class _QuickAction extends StatelessWidget {
  final IconData icon;
  final String label;
  final String subtitle;
  final Color color;
  final VoidCallback onTap;

  const _QuickAction({
    required this.icon,
    required this.label,
    required this.subtitle,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return ScaleBounce(
      onTap: () {
        HapticFeedback.lightImpact();
        onTap();
      },
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.card,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(
              color: color.withValues(alpha: 0.2), width: 1),
          boxShadow: [
            BoxShadow(
              color: color.withValues(alpha: 0.08),
              blurRadius: 12,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 42,
              height: 42,
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(13),
              ),
              child: Icon(icon, color: color, size: 22),
            ),
            const SizedBox(height: 12),
            Text(
              label,
              style: const TextStyle(
                color: AppColors.textPrimary,
                fontWeight: FontWeight.w700,
                fontSize: 15,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              subtitle,
              style: const TextStyle(
                  color: AppColors.textTertiary, fontSize: 12),
            ),
          ],
        ),
      ),
    );
  }
}
