// =============================================================================
// Consumer Mobile — Search Screen
// Full-text search + filter chips using GET /public/events API.
// REAL DATA ONLY — no mock results.
// =============================================================================

import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:http/http.dart' as http;
import '../../providers/auth_provider.dart';
import '../../providers/city_provider.dart';
import '../../theme/app_colors.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/error_state.dart';
import '../../widgets/loading_state.dart';
import '../../widgets/city_selection_sheet.dart';
import 'filters_sheet.dart';

class SearchScreen extends ConsumerStatefulWidget {
  const SearchScreen({super.key});

  @override
  ConsumerState<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends ConsumerState<SearchScreen> {
  final _searchController = TextEditingController();
  Timer? _debounce;
  String _query = '';
  String? _category;
  String? _datePreset;
  String _sort = 'date';

  List<Map<String, dynamic>>? _results;
  bool _isLoading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _fetchEvents();
  }

  @override
  void dispose() {
    _searchController.dispose();
    _debounce?.cancel();
    super.dispose();
  }

  Future<void> _fetchEvents() async {
    if (!mounted) return;
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final apiService = ref.read(apiServiceProvider);
      final selectedCity = ref.read(selectedCityProvider);
      final params = <String, String>{
        'limit': '30',
        'sort': _sort,
        if (_query.isNotEmpty) 'q': _query,
        if (selectedCity.isNotEmpty && selectedCity != 'All India') 'city': selectedCity,
        'category': ?_category,
        'datePreset': ?_datePreset,
      };
      final uri = Uri.parse('${apiService.baseUrl}/public/events').replace(queryParameters: params);
      final res = await http.get(uri, headers: {'Accept': 'application/json'});

      if (res.statusCode >= 200 && res.statusCode < 300) {
        final decoded = jsonDecode(res.body);
        final data = decoded is Map<String, dynamic> && decoded.containsKey('data')
            ? decoded['data']
            : decoded;
        final list = data is Map<String, dynamic> && data.containsKey('items')
            ? data['items'] as List<dynamic>
            : (data is List ? data : []);
        if (!mounted) return;
        setState(() {
          _results = list.cast<Map<String, dynamic>>();
          _isLoading = false;
        });
      } else {
        if (!mounted) return;
        setState(() {
          _error = 'Failed to load events';
          _isLoading = false;
        });
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = 'Could not connect to server';
        _isLoading = false;
      });
    }
  }

  void _onSearchChanged(String value) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 500), () {
      setState(() => _query = value.trim());
      _fetchEvents();
    });
  }

  void _openFilters() async {
    final result = await showModalBottomSheet<Map<String, String?>>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => FiltersSheet(
        selectedCategory: _category,
        selectedDatePreset: _datePreset,
        selectedSort: _sort,
      ),
    );

    if (result != null) {
      setState(() {
        _category = result['category'];
        _datePreset = result['datePreset'];
        _sort = result['sort'] ?? 'date';
      });
      _fetchEvents();
    }
  }

  @override
  Widget build(BuildContext context) {
    final selectedCity = ref.watch(selectedCityProvider);

    ref.listen<String>(selectedCityProvider, (previous, next) {
      if (previous != next) {
        _fetchEvents();
      }
    });

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Column(
          children: [
            // ── Search Bar + Filter ──────────────────────────────────────
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
              child: Row(
                children: [
                  Expanded(
                    child: Container(
                      decoration: BoxDecoration(
                        color: AppColors.card,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: AppColors.border, width: 0.5),
                      ),
                      child: TextField(
                        controller: _searchController,
                        onChanged: _onSearchChanged,
                        style: const TextStyle(color: AppColors.textPrimary, fontSize: 15),
                        decoration: const InputDecoration(
                          hintText: 'Search events...',
                          hintStyle: TextStyle(color: AppColors.textTertiary),
                          prefixIcon: Icon(Icons.search_rounded, color: AppColors.textTertiary, size: 22),
                          border: InputBorder.none,
                          contentPadding: EdgeInsets.symmetric(vertical: 14),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  GestureDetector(
                    onTap: _openFilters,
                    child: Container(
                      width: 48,
                      height: 48,
                      decoration: BoxDecoration(
                        color: _hasActiveFilters ? AppColors.electricPurple : AppColors.card,
                        borderRadius: BorderRadius.circular(14),
                        border: _hasActiveFilters
                            ? null
                            : Border.all(color: AppColors.border, width: 0.5),
                      ),
                      child: Icon(
                        Icons.tune_rounded,
                        color: _hasActiveFilters ? AppColors.textOnAccent : AppColors.textSecondary,
                        size: 22,
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // ── City & Active Filter Tags ──────────────────────────────
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
              child: SizedBox(
                width: double.infinity,
                child: Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    // Location Pill
                    GestureDetector(
                      onTap: () => CitySelectionSheet.show(context),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                        decoration: BoxDecoration(
                          color: AppColors.card,
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(
                            color: selectedCity != 'All India'
                                ? AppColors.electricPurple
                                : AppColors.border,
                            width: 1,
                          ),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.location_on_rounded, color: AppColors.neonPink, size: 13),
                            const SizedBox(width: 4),
                            Text(
                              selectedCity,
                              style: TextStyle(
                                color: selectedCity != 'All India'
                                    ? AppColors.electricPurple
                                    : AppColors.textSecondary,
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            const SizedBox(width: 2),
                            const Icon(Icons.keyboard_arrow_down_rounded, color: AppColors.textSecondary, size: 14),
                          ],
                        ),
                      ),
                    ),

                    if (_category != null)
                      _buildFilterTag(_category!, () {
                        setState(() => _category = null);
                        _fetchEvents();
                      }),
                    if (_datePreset != null)
                      _buildFilterTag(_datePreset!, () {
                        setState(() => _datePreset = null);
                        _fetchEvents();
                      }),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 16),

            // ── Results ─────────────────────────────────────────────────
            Expanded(
              child: _isLoading
                  ? const LoadingState(message: 'Searching events...')
                  : _error != null
                      ? ErrorState(message: _error!, onRetry: _fetchEvents)
                      : _results == null || _results!.isEmpty
                          ? const EmptyState(
                              icon: Icons.search_off_rounded,
                              title: 'No events found',
                              subtitle: 'Try adjusting your search or filters',
                            )
                          : ListView.separated(
                              padding: const EdgeInsets.symmetric(horizontal: 20),
                              itemCount: _results!.length,
                              separatorBuilder: (context, index) => const SizedBox(height: 12),
                              itemBuilder: (context, index) {
                                final e = _results![index];
                                return _SearchResultCard(
                                  event: e,
                                  onTap: () {
                                    final slug = e['slug'] ?? e['id'];
                                    if (slug != null) context.push('/event/$slug');
                                  },
                                );
                              },
                            ),
            ),
          ],
        ),
      ),
    );
  }

  bool get _hasActiveFilters => _category != null || _datePreset != null;

  Widget _buildFilterTag(String label, VoidCallback onRemove) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: AppColors.electricPurpleSubtle,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(label, style: const TextStyle(color: AppColors.electricPurple, fontSize: 12, fontWeight: FontWeight.w500)),
          const SizedBox(width: 4),
          GestureDetector(
            onTap: onRemove,
            child: const Icon(Icons.close_rounded, color: AppColors.electricPurple, size: 14),
          ),
        ],
      ),
    );
  }
}

class _SearchResultCard extends StatelessWidget {
  final Map<String, dynamic> event;
  final VoidCallback? onTap;

  const _SearchResultCard({required this.event, this.onTap});

  @override
  Widget build(BuildContext context) {
    final title = event['title'] ?? event['name'] ?? 'Untitled Event';
    final venue = _extractVenue();
    final date = _formatDate(event['startDate'] ?? event['start_date']);
    final category = event['category'] is Map ? event['category']['name'] : event['category']?.toString();
    final imageUrl = _extractImage();
    final price = _formatPrice();

    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.card,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.border, width: 0.5),
        ),
        clipBehavior: Clip.antiAlias,
        child: Row(
          children: [
            // Image
            Container(
              width: 100,
              height: 100,
              color: AppColors.shimmerBase,
              child: imageUrl != null
                  ? Image.network(imageUrl, fit: BoxFit.cover, errorBuilder: (context, error, stackTrace) => const Icon(Icons.event, color: AppColors.textTertiary))
                  : const Icon(Icons.event_rounded, color: AppColors.textTertiary),
            ),
            const SizedBox(width: 14),
            // Details
            Expanded(
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 4),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (category != null)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        margin: const EdgeInsets.only(bottom: 4),
                        decoration: BoxDecoration(
                          color: AppColors.electricPurpleSubtle,
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          category,
                          style: const TextStyle(color: AppColors.electricPurple, fontSize: 10, fontWeight: FontWeight.w600),
                        ),
                      ),
                    Text(
                      title,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(color: AppColors.textPrimary, fontSize: 15, fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        const Icon(Icons.location_on_outlined, size: 12, color: AppColors.textTertiary),
                        const SizedBox(width: 3),
                        Expanded(
                          child: Text(
                            venue,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(color: AppColors.textTertiary, fontSize: 12),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        const Icon(Icons.calendar_today_outlined, size: 12, color: AppColors.textTertiary),
                        const SizedBox(width: 3),
                        Text(date, style: const TextStyle(color: AppColors.textTertiary, fontSize: 12)),
                        const Spacer(),
                        if (price != null)
                          Text(
                            price,
                            style: const TextStyle(color: AppColors.electricPurple, fontSize: 14, fontWeight: FontWeight.w700),
                          ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(width: 8),
          ],
        ),
      ),
    );
  }

  String _extractVenue() {
    final venue = event['venue'];
    if (venue is Map) return venue['name'] ?? venue['city'] ?? 'TBD';
    if (venue is String) return venue;
    return event['venueName'] ?? event['venue_name'] ?? 'TBD';
  }

  String? _extractImage() {
    final media = event['media'];
    if (media is List && media.isNotEmpty) {
      final first = media[0];
      if (first is Map) return first['url'] ?? first['src'];
      if (first is String) return first;
    }
    return event['heroImage'] ?? event['hero_image'] ?? event['imageUrl'] ?? event['image_url'];
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

  String? _formatPrice() {
    final priceMin = event['priceMin'] ?? event['price_min'] ?? event['minPrice'] ?? event['min_price'];
    if (priceMin == null) return null;
    final amount = priceMin is int ? priceMin / 100 : (priceMin as num).toDouble();
    if (amount == 0) return 'Free';
    final currency = event['currency'] ?? 'INR';
    if (currency == 'INR') return '₹${amount.toStringAsFixed(0)}';
    return '\$${amount.toStringAsFixed(2)}';
  }
}
