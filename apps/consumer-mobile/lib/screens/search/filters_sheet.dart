// =============================================================================
// Consumer Mobile — Filters Bottom Sheet
// Category, Date Preset, Sort — maps to GET /public/events query params.
// =============================================================================

import 'package:flutter/material.dart';
import '../../theme/app_colors.dart';
import '../../widgets/lime_button.dart';

class FiltersSheet extends StatefulWidget {
  final String? selectedCategory;
  final String? selectedDatePreset;
  final String selectedSort;

  const FiltersSheet({
    super.key,
    this.selectedCategory,
    this.selectedDatePreset,
    this.selectedSort = 'date',
  });

  @override
  State<FiltersSheet> createState() => _FiltersSheetState();
}

class _FiltersSheetState extends State<FiltersSheet> {
  late String? _category;
  late String? _datePreset;
  late String _sort;

  // These map directly to the backend API query parameters
  static const _datePresets = [
    {'label': 'All dates', 'value': null},
    {'label': 'Today', 'value': 'today'},
    {'label': 'Tomorrow', 'value': 'tomorrow'},
    {'label': 'This weekend', 'value': 'this_weekend'},
    {'label': 'This week', 'value': 'this_week'},
    {'label': 'This month', 'value': 'this_month'},
  ];

  static const _sortOptions = [
    {'label': 'By date', 'value': 'date'},
    {'label': 'Newest first', 'value': 'newest'},
    {'label': 'Relevance', 'value': 'relevance'},
  ];

  static const _defaultCategories = [
    'Concerts', 'Festivals', 'Music', 'Theatre', 'Art', 'Comedy', 'Sports', 'Food',
  ];

  @override
  void initState() {
    super.initState();
    _category = widget.selectedCategory;
    _datePreset = widget.selectedDatePreset;
    _sort = widget.selectedSort;
  }

  void _clearAll() {
    setState(() {
      _category = null;
      _datePreset = null;
      _sort = 'date';
    });
  }

  void _apply() {
    Navigator.of(context).pop({
      'category': _category,
      'datePreset': _datePreset,
      'sort': _sort,
    });
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: DraggableScrollableSheet(
        initialChildSize: 0.7,
        minChildSize: 0.5,
        maxChildSize: 0.9,
        expand: false,
        builder: (context, scrollController) {
          return Column(
            children: [
              // ── Handle ────────────────────────────────────────────────
              Padding(
                padding: const EdgeInsets.only(top: 12, bottom: 8),
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: AppColors.border,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),

              // ── Header ────────────────────────────────────────────────
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Filters', style: Theme.of(context).textTheme.headlineMedium),
                    TextButton(
                      onPressed: _clearAll,
                      child: const Text('Clear all', style: TextStyle(color: AppColors.danger, fontSize: 13)),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 8),

              // ── Scrollable Filters ────────────────────────────────────
              Expanded(
                child: ListView(
                  controller: scrollController,
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  children: [
                    // Category
                    _buildSectionTitle('Category'),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: _defaultCategories.map((cat) {
                        final isSelected = _category == cat;
                        return GestureDetector(
                          onTap: () => setState(() => _category = isSelected ? null : cat),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                            decoration: BoxDecoration(
                              color: isSelected ? AppColors.electricPurple : AppColors.card,
                              borderRadius: BorderRadius.circular(10),
                              border: isSelected ? null : Border.all(color: AppColors.border, width: 0.5),
                            ),
                            child: Text(
                              cat,
                              style: TextStyle(
                                color: isSelected ? AppColors.textOnAccent : AppColors.textSecondary,
                                fontSize: 13,
                                fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
                              ),
                            ),
                          ),
                        );
                      }).toList(),
                    ),

                    const SizedBox(height: 24),

                    // Date
                    _buildSectionTitle('Date'),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: _datePresets.map((preset) {
                        final value = preset['value'];
                        final isSelected = _datePreset == value;
                        return GestureDetector(
                          onTap: () => setState(() => _datePreset = value),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                            decoration: BoxDecoration(
                              color: isSelected ? AppColors.electricPurple : AppColors.card,
                              borderRadius: BorderRadius.circular(10),
                              border: isSelected ? null : Border.all(color: AppColors.border, width: 0.5),
                            ),
                            child: Text(
                              preset['label'] as String,
                              style: TextStyle(
                                color: isSelected ? AppColors.textOnAccent : AppColors.textSecondary,
                                fontSize: 13,
                                fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
                              ),
                            ),
                          ),
                        );
                      }).toList(),
                    ),

                    const SizedBox(height: 24),

                    // Sort
                    _buildSectionTitle('Sort by'),
                    const SizedBox(height: 8),
                    ...(_sortOptions.map((option) {
                      final value = option['value'] as String;
                      final isSelected = _sort == value;
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: GestureDetector(
                          onTap: () => setState(() => _sort = value),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                            decoration: BoxDecoration(
                              color: isSelected ? AppColors.electricPurpleSubtle : AppColors.card,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: isSelected ? AppColors.electricPurple : AppColors.border,
                                width: isSelected ? 1.5 : 0.5,
                              ),
                            ),
                            child: Row(
                              children: [
                                Text(
                                  option['label'] as String,
                                  style: TextStyle(
                                    color: isSelected ? AppColors.electricPurple : AppColors.textSecondary,
                                    fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
                                    fontSize: 14,
                                  ),
                                ),
                                const Spacer(),
                                if (isSelected)
                                  const Icon(Icons.check_rounded, color: AppColors.electricPurple, size: 20),
                              ],
                            ),
                          ),
                        ),
                      );
                    })),

                    const SizedBox(height: 24),
                  ],
                ),
              ),

              // ── Apply Button ──────────────────────────────────────────
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
                child: SafeArea(
                  child: LimeButton(
                    label: 'Apply Filters',
                    onPressed: _apply,
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Text(
      title,
      style: const TextStyle(
        color: AppColors.textPrimary,
        fontSize: 16,
        fontWeight: FontWeight.w600,
      ),
    );
  }
}
