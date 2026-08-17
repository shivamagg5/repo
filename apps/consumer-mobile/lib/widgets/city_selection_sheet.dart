// =============================================================================
// Consumer Mobile — City Selection Modal Bottom Sheet
// Sleek dark-mode city selector with instant search, popular metro chips & A-Z list.
// =============================================================================

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../data/indian_cities.dart';
import '../providers/city_provider.dart';
import '../theme/app_colors.dart';

class CitySelectionSheet extends ConsumerStatefulWidget {
  const CitySelectionSheet({super.key});

  static Future<void> show(BuildContext context) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => const CitySelectionSheet(),
    );
  }

  @override
  ConsumerState<CitySelectionSheet> createState() => _CitySelectionSheetState();
}

class _CitySelectionSheetState extends ConsumerState<CitySelectionSheet> {
  final _searchController = TextEditingController();
  String _searchQuery = '';

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  List<CityInfo> get _filteredCities {
    if (_searchQuery.trim().isEmpty) return allIndianCities;
    final query = _searchQuery.toLowerCase().trim();
    return allIndianCities.where((c) {
      return c.name.toLowerCase().contains(query) ||
          c.state.toLowerCase().contains(query);
    }).toList();
  }

  void _onCitySelected(String cityName) {
    ref.read(selectedCityProvider.notifier).setCity(cityName);
    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    final selectedCity = ref.watch(selectedCityProvider);
    final isSearching = _searchQuery.trim().isNotEmpty;
    final filtered = _filteredCities;

    return Container(
      height: MediaQuery.of(context).size.height * 0.86,
      decoration: const BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
        border: Border(
          top: BorderSide(color: AppColors.border, width: 1),
        ),
      ),
      child: Column(
        children: [
          // ── Drag Handle ───────────────────────────────────────────────────
          const SizedBox(height: 12),
          Container(
            width: 44,
            height: 4,
            decoration: BoxDecoration(
              color: AppColors.border,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(height: 16),

          // ── Header Row ────────────────────────────────────────────────────
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: AppColors.electricPurple.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(
                    Icons.location_on_rounded,
                    color: AppColors.electricPurple,
                    size: 20,
                  ),
                ),
                const SizedBox(width: 12),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Select City',
                        style: TextStyle(
                          color: AppColors.textPrimary,
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      Text(
                        'Events & nightlife near you',
                        style: TextStyle(
                          color: AppColors.textSecondary,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  onPressed: () => Navigator.of(context).pop(),
                  icon: const Icon(Icons.close_rounded, color: AppColors.textSecondary),
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // ── Search Input ──────────────────────────────────────────────────
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Container(
              decoration: BoxDecoration(
                color: AppColors.card,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.border),
              ),
              child: TextField(
                controller: _searchController,
                onChanged: (val) => setState(() => _searchQuery = val),
                style: const TextStyle(color: AppColors.textPrimary, fontSize: 14),
                decoration: InputDecoration(
                  hintText: 'Search 100+ cities in India...',
                  hintStyle: const TextStyle(color: AppColors.textTertiary, fontSize: 14),
                  prefixIcon: const Icon(Icons.search_rounded, color: AppColors.textSecondary, size: 20),
                  suffixIcon: _searchQuery.isNotEmpty
                      ? IconButton(
                          icon: const Icon(Icons.clear_rounded, color: AppColors.textSecondary, size: 18),
                          onPressed: () {
                            _searchController.clear();
                            setState(() => _searchQuery = '');
                          },
                        )
                      : null,
                  border: InputBorder.none,
                  contentPadding: const EdgeInsets.symmetric(vertical: 14),
                ),
              ),
            ),
          ),
          const SizedBox(height: 16),

          // ── Cities Content List / Search Results ─────────────────────────
          Expanded(
            child: isSearching
                ? _buildSearchResults(filtered, selectedCity)
                : _buildFullList(selectedCity),
          ),
        ],
      ),
    );
  }

  Widget _buildSearchResults(List<CityInfo> filtered, String selectedCity) {
    if (filtered.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.location_off_rounded, size: 48, color: AppColors.textTertiary.withValues(alpha: 0.5)),
            const SizedBox(height: 12),
            Text(
              'No cities found for "$_searchQuery"',
              style: const TextStyle(color: AppColors.textSecondary, fontSize: 14),
            ),
          ],
        ),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
      itemCount: filtered.length,
      separatorBuilder: (context, index) => const Divider(color: AppColors.border, height: 1),
      itemBuilder: (context, index) {
        final city = filtered[index];
        final isSelected = city.name == selectedCity;
        return _buildCityTile(city, isSelected);
      },
    );
  }

  Widget _buildFullList(String selectedCity) {
    return ListView(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 4),
      children: [
        // Popular / Metro Hubs Section
        const Row(
          children: [
            Icon(Icons.whatshot_rounded, color: AppColors.neonPink, size: 16),
            SizedBox(width: 6),
            Text(
              'POPULAR CITIES',
              style: TextStyle(
                color: AppColors.neonPink,
                fontSize: 11,
                fontWeight: FontWeight.w800,
                letterSpacing: 1.2,
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),

        // Grid of popular cities
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 3,
            crossAxisSpacing: 10,
            mainAxisSpacing: 10,
            childAspectRatio: 1.9,
          ),
          itemCount: popularCities.length,
          itemBuilder: (context, index) {
            final city = popularCities[index];
            final isSelected = city.name == selectedCity;

            return GestureDetector(
              onTap: () => _onCitySelected(city.name),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                decoration: BoxDecoration(
                  color: isSelected
                      ? AppColors.electricPurple.withValues(alpha: 0.18)
                      : AppColors.card,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: isSelected ? AppColors.electricPurple : AppColors.border,
                    width: isSelected ? 1.5 : 1,
                  ),
                ),
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    if (city.emoji != null) ...[
                      Text(city.emoji!, style: const TextStyle(fontSize: 14)),
                      const SizedBox(width: 5),
                    ],
                    Flexible(
                      child: Text(
                        city.name,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          color: isSelected ? Colors.white : AppColors.textPrimary,
                          fontSize: 12,
                          fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        ),
        const SizedBox(height: 24),

        // All Indian Cities Header
        const Row(
          children: [
            Icon(Icons.explore_outlined, color: AppColors.textSecondary, size: 16),
            SizedBox(width: 6),
            Text(
              'ALL CITIES (A - Z)',
              style: TextStyle(
                color: AppColors.textSecondary,
                fontSize: 11,
                fontWeight: FontWeight.w800,
                letterSpacing: 1.2,
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),

        // All cities list
        ...allIndianCities.map((city) {
          final isSelected = city.name == selectedCity;
          return Column(
            children: [
              _buildCityTile(city, isSelected),
              const Divider(color: AppColors.border, height: 1),
            ],
          );
        }),
        const SizedBox(height: 24),
      ],
    );
  }

  Widget _buildCityTile(CityInfo city, bool isSelected) {
    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      onTap: () => _onCitySelected(city.name),
      leading: Container(
        width: 36,
        height: 36,
        decoration: BoxDecoration(
          color: isSelected
              ? AppColors.electricPurple.withValues(alpha: 0.2)
              : AppColors.card,
          shape: BoxShape.circle,
          border: Border.all(
            color: isSelected ? AppColors.electricPurple : AppColors.border,
          ),
        ),
        child: Center(
          child: city.emoji != null
              ? Text(city.emoji!, style: const TextStyle(fontSize: 16))
              : const Icon(
                  Icons.location_city_rounded,
                  color: AppColors.textSecondary,
                  size: 16,
                ),
        ),
      ),
      title: Text(
        city.name,
        style: TextStyle(
          color: isSelected ? AppColors.electricPurple : AppColors.textPrimary,
          fontSize: 14,
          fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
        ),
      ),
      subtitle: Text(
        city.state,
        style: const TextStyle(
          color: AppColors.textTertiary,
          fontSize: 12,
        ),
      ),
      trailing: isSelected
          ? const Icon(
              Icons.check_circle_rounded,
              color: AppColors.electricPurple,
              size: 20,
            )
          : null,
    );
  }
}
