// =============================================================================
// Consumer Mobile — Home Screen (Redesigned)
// CultVibe + HYPERACTIVE inspired layout with real API data.
//
// REAL DATA ONLY: All events come from GET /public/events.
// When unavailable: Loading → Empty → Error → Retry.
// =============================================================================

import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:http/http.dart' as http;
import '../providers/auth_provider.dart';
import '../providers/city_provider.dart';
import '../theme/app_colors.dart';
import '../utils/animations.dart';
import '../widgets/event_card_large.dart';
import '../widgets/event_card_small.dart';
import '../widgets/category_chips.dart';
import '../widgets/section_header.dart';
import '../widgets/loading_state.dart';
import '../widgets/error_state.dart';
import '../widgets/empty_state.dart';
import '../widgets/city_selection_sheet.dart';

// ── Data Provider: Public Events Feed ───────────────────────────────────────
final _publicEventsProvider = FutureProvider.family<List<Map<String, dynamic>>, _EventQuery>((ref, query) async {
  final apiService = ref.watch(apiServiceProvider);
  final queryParams = <String, String>{
    'limit': query.limit.toString(),
  };
  if (query.category != null && query.category!.isNotEmpty && query.category != 'All') {
    queryParams['category'] = query.category!;
  }
  if (query.city != null && query.city!.isNotEmpty && query.city != 'All India') {
    queryParams['city'] = query.city!;
  }
  if (query.sort != null && query.sort!.isNotEmpty) {
    queryParams['sort'] = query.sort!;
  }

  final uri = Uri.parse('${apiService.baseUrl}/public/events').replace(queryParameters: queryParams);
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

// ── Categories Provider ─────────────────────────────────────────────────────
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
    return ['All', ...list.map((c) => c is Map ? (c['name'] ?? c['slug'] ?? '$c') : '$c').cast<String>()];
  }
  return ['All', 'Concerts', 'Festivals', 'Music', 'Theatre', 'Art', 'Comedy'];
});

class _EventQuery {
  final String? category;
  final String? city;
  final String? sort;
  final int limit;

  const _EventQuery({
    this.category,
    this.city,
    this.sort,
    this.limit = 10,
  });

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is _EventQuery &&
          category == other.category &&
          city == other.city &&
          sort == other.sort &&
          limit == other.limit;

  @override
  int get hashCode => Object.hash(category, city, sort, limit);
}

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  String? _selectedCategory;

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authNotifierProvider);
    final selectedCity = ref.watch(selectedCityProvider);
    final effectiveCity = selectedCity == 'All India' ? null : selectedCity;
    final categories = ref.watch(_categoriesProvider);
    final upcomingEvents = ref.watch(_publicEventsProvider(
      _EventQuery(category: _selectedCategory, city: effectiveCity, sort: 'date', limit: 5),
    ));
    final trendingEvents = ref.watch(_publicEventsProvider(
      _EventQuery(city: effectiveCity, sort: 'newest', limit: 10),
    ));

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: RefreshIndicator(
          color: AppColors.electricPurple,
          backgroundColor: AppColors.surface,
          onRefresh: () async {
            ref.invalidate(_publicEventsProvider);
            ref.invalidate(_categoriesProvider);
          },
          child: CustomScrollView(
            slivers: [
              // ── Header — Purple Gradient Header Band ─────────────────
              SliverToBoxAdapter(
                child: FadeSlideIn(
                  duration: const Duration(milliseconds: 600),
                  child: Container(
                    margin: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                    padding: const EdgeInsets.fromLTRB(18, 16, 18, 18),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                        colors: [
                          Color(0xFF3D1080), // deep purple
                          Color(0xFF7B2FFF), // electric purple
                          Color(0xFFB830A0), // purple-pink transition
                        ],
                        stops: [0.0, 0.55, 1.0],
                      ),
                      borderRadius: BorderRadius.circular(24),
                      boxShadow: [
                        BoxShadow(
                          color: AppColors.electricPurple.withValues(alpha: 0.35),
                          blurRadius: 24,
                          offset: const Offset(0, 8),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // ── Top Sub-Bar: City Location Selector Pill & Action ────
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            GestureDetector(
                              onTap: () => CitySelectionSheet.show(context),
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
                                decoration: BoxDecoration(
                                  color: Colors.black.withValues(alpha: 0.28),
                                  borderRadius: BorderRadius.circular(20),
                                  border: Border.all(
                                    color: Colors.white.withValues(alpha: 0.25),
                                    width: 1,
                                  ),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    const Icon(Icons.location_on_rounded, color: AppColors.neonPink, size: 16),
                                    const SizedBox(width: 6),
                                    Text(
                                      selectedCity,
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontWeight: FontWeight.w700,
                                        fontSize: 13,
                                      ),
                                    ),
                                    const SizedBox(width: 4),
                                    const Icon(Icons.keyboard_arrow_down_rounded, color: Colors.white70, size: 18),
                                  ],
                                ),
                              ),
                            ),
                            if (authState.isAuthenticated)
                              GestureDetector(
                                onTap: () => context.push('/notifications'),
                                child: Container(
                                  width: 38,
                                  height: 38,
                                  decoration: BoxDecoration(
                                    color: Colors.white.withValues(alpha: 0.15),
                                    shape: BoxShape.circle,
                                  ),
                                  child: const Icon(
                                    Icons.notifications_none_rounded,
                                    color: Colors.white,
                                    size: 20,
                                  ),
                                ),
                              )
                            else
                              GestureDetector(
                                onTap: () => context.go('/login'),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
                                  decoration: BoxDecoration(
                                    color: Colors.white,
                                    borderRadius: BorderRadius.circular(20),
                                  ),
                                  child: const Text(
                                    'Sign In',
                                    style: TextStyle(
                                      color: AppColors.electricPurple,
                                      fontWeight: FontWeight.w700,
                                      fontSize: 12,
                                    ),
                                  ),
                                ),
                              ),
                          ],
                        ),
                        const SizedBox(height: 16),

                        // ── Profile Avatar & Greeting ───────────────────────────
                        Row(
                          children: [
                            Container(
                              width: 44,
                              height: 44,
                              decoration: BoxDecoration(
                                color: Colors.white.withValues(alpha: 0.2),
                                shape: BoxShape.circle,
                                border: Border.all(
                                  color: Colors.white.withValues(alpha: 0.35),
                                  width: 1.5,
                                ),
                              ),
                              child: Center(
                                child: Text(
                                  _getInitials(authState),
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 16,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    _getGreeting(authState),
                                    style: Theme.of(context)
                                        .textTheme
                                        .headlineSmall
                                        ?.copyWith(
                                          color: Colors.white,
                                          fontWeight: FontWeight.w700,
                                          fontSize: 17,
                                        ),
                                  ),
                                  const SizedBox(height: 2),
                                  const Text(
                                    'Find your next adventure ✦',
                                    style: TextStyle(
                                      color: Colors.white70,
                                      fontSize: 12,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ),

              // ── Category Filters ──────────────────────────────────────
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.only(top: 24),
                  child: categories.when(
                    data: (cats) => CategoryChips(
                      categories: cats,
                      selected: _selectedCategory,
                      onSelected: (cat) => setState(() => _selectedCategory = cat),
                    ),
                    loading: () => const SizedBox(height: 40),
                    error: (error, stack) => const SizedBox(height: 40),
                  ),
                ),
              ),

              const SliverToBoxAdapter(child: SizedBox(height: 24)),

              // ── Upcoming Events (large cards) ─────────────────────────
              SliverToBoxAdapter(
                child: SectionHeader(
                  title: selectedCity == 'All India' ? 'Upcoming Events' : 'Upcoming in $selectedCity',
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
                      height: 256,
                      child: ListView.separated(
                        scrollDirection: Axis.horizontal,
                        padding: const EdgeInsets.symmetric(horizontal: 20),
                        itemCount: events.length,
                        separatorBuilder: (context, index) => const SizedBox(width: 16),
                        itemBuilder: (context, index) {
                          final e = events[index];
                          return SizedBox(
                            width: MediaQuery.of(context).size.width * 0.88,
                            child: EventCardLarge(
                              title: e['title'] ?? e['name'] ?? 'Untitled Event',
                              venue: _extractVenue(e),
                              date: _formatDate(e['startDate'] ?? e['start_date']),
                              imageUrl: _extractImage(e),
                              category: e['category'] is Map ? e['category']['name'] : e['category']?.toString(),
                              price: _formatPrice(e),
                              onTap: () {
                                final slug = e['slug'] ?? e['id'];
                                if (slug != null) context.push('/event/$slug');
                              },
                            ),
                          );
                        },
                      ),
                    );
                  },
                  loading: () => const SizedBox(
                    height: 256,
                    child: LoadingState(),
                  ),
                  error: (err, stack) => Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    child: ErrorState(
                      message: 'Could not load events',
                      onRetry: () => ref.invalidate(_publicEventsProvider),
                    ),
                  ),
                ),
              ),

              const SliverToBoxAdapter(child: SizedBox(height: 32)),

              // ── Trending Events (small horizontal cards) ──────────────
              SliverToBoxAdapter(
                child: SectionHeader(
                  title: selectedCity == 'All India' ? 'Trending Events' : 'Trending in $selectedCity',
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
                        separatorBuilder: (context, index) => const SizedBox(width: 12),
                        itemBuilder: (context, index) {
                          final e = events[index];
                          return EventCardSmall(
                            title: e['title'] ?? e['name'] ?? 'Untitled Event',
                            venue: _extractVenue(e),
                            date: _formatDate(e['startDate'] ?? e['start_date']),
                            imageUrl: _extractImage(e),
                            category: e['category'] is Map ? e['category']['name'] : e['category']?.toString(),
                            price: _formatPrice(e),
                            onTap: () {
                              final slug = e['slug'] ?? e['id'];
                              if (slug != null) context.push('/event/$slug');
                            },
                          );
                        },
                      ),
                    );
                  },
                  loading: () => const SizedBox(
                    height: 240,
                    child: LoadingState(),
                  ),
                  error: (error, stack) => const SizedBox.shrink(),
                ),
              ),

              // ── Quick Actions (auth-only) ─────────────────────────────
              if (authState.isAuthenticated) ...[
                const SliverToBoxAdapter(child: SizedBox(height: 32)),
                SliverToBoxAdapter(
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
              ],

              const SliverToBoxAdapter(child: SizedBox(height: 40)),
            ],
          ),
        ),
      ),
    );
  }

  String _getGreeting(AuthState authState) {
    if (authState.isAuthenticated) {
      final name = authState.profile?.name ?? authState.user?.email?.split('@').first ?? 'there';
      final firstName = name.split(' ').first;
      return 'Hello, $firstName!';
    }
    return 'Discover Events';
  }

  String _getInitials(AuthState authState) {
    if (authState.isAuthenticated) {
      final name = authState.profile?.name ?? authState.user?.email ?? 'U';
      final parts = name.split(' ');
      if (parts.length >= 2) return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
      return name[0].toUpperCase();
    }
    return 'E';
  }

  String _extractVenue(Map<String, dynamic> event) {
    final venue = event['venue'];
    if (venue is Map) return venue['name'] ?? venue['city'] ?? 'TBD';
    if (venue is String) return venue;
    return event['venueName'] ?? event['venue_name'] ?? event['city'] ?? 'TBD';
  }

  String? _extractImage(Map<String, dynamic> event) {
    // Try common shapes from the API
    final media = event['media'];
    if (media is List && media.isNotEmpty) {
      final first = media[0];
      if (first is Map) return first['url'] ?? first['src'];
      if (first is String) return first;
    }
    final heroImage = event['heroImage'] ?? event['hero_image'] ?? event['imageUrl'] ?? event['image_url'];
    if (heroImage is String && heroImage.isNotEmpty) return heroImage;
    return null;
  }

  String _formatDate(dynamic dateStr) {
    if (dateStr == null) return 'TBA';
    try {
      final dt = DateTime.parse(dateStr.toString());
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return '${months[dt.month - 1]} ${dt.day}';
    } catch (_) {
      return dateStr.toString();
    }
  }

  String? _formatPrice(Map<String, dynamic> event) {
    final priceMin = event['priceMin'] ?? event['price_min'] ?? event['minPrice'] ?? event['min_price'];
    if (priceMin == null) return null;
    final amount = priceMin is int ? priceMin / 100 : (priceMin as num).toDouble();
    if (amount == 0) return 'Free';
    final currency = event['currency'] ?? 'INR';
    if (currency == 'INR') return '₹${amount.toStringAsFixed(0)}';
    return '\$${amount.toStringAsFixed(2)}';
  }
}

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
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.card,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.border, width: 0.5),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: color, size: 22),
            ),
            const SizedBox(height: 12),
            Text(
              label,
              style: const TextStyle(
                color: AppColors.textPrimary,
                fontWeight: FontWeight.w600,
                fontSize: 15,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              subtitle,
              style: const TextStyle(color: AppColors.textTertiary, fontSize: 12),
            ),
          ],
        ),
      ),
    );
  }
}
