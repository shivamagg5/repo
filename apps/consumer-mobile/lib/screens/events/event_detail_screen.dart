// =============================================================================
// Consumer Mobile — Event Detail Screen
// Real data from GET /public/events/:slug.
// Slivers header with hero image, event metadata, description, venue info,
// and sticky bottom "Find Tickets" CTA opening the TicketSelectionSheet.
// =============================================================================

import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:http/http.dart' as http;
import '../../models/ticket_model.dart';
import '../../providers/auth_provider.dart';
import '../../theme/app_colors.dart';
import '../../widgets/lime_button.dart';
import '../../widgets/loading_state.dart';
import '../../widgets/error_state.dart';
import 'ticket_selection_sheet.dart';

final _eventDetailProvider = FutureProvider.family<Map<String, dynamic>, String>((ref, slug) async {
  final apiService = ref.watch(apiServiceProvider);
  final uri = Uri.parse('${apiService.baseUrl}/public/events/$slug');
  final res = await http.get(uri, headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  });
  if (res.statusCode >= 200 && res.statusCode < 300) {
    final decoded = jsonDecode(res.body);
    final data = decoded is Map<String, dynamic> && decoded.containsKey('data')
        ? decoded['data'] as Map<String, dynamic>
        : (decoded is Map<String, dynamic> ? decoded : <String, dynamic>{});
    return data;
  }
  throw Exception('Failed to load event details (${res.statusCode})');
});

class EventDetailScreen extends ConsumerStatefulWidget {
  final String slug;

  const EventDetailScreen({
    super.key,
    required this.slug,
  });

  @override
  ConsumerState<EventDetailScreen> createState() => _EventDetailScreenState();
}

class _EventDetailScreenState extends ConsumerState<EventDetailScreen> {
  bool _isDescriptionExpanded = false;

  Future<void> _openTicketSelection(BuildContext context, String eventId, List<dynamic>? rawTiers) async {
    List<TicketTypeModel> ticketTypes = [];
    if (rawTiers != null && rawTiers.isNotEmpty) {
      ticketTypes = rawTiers.map((t) => TicketTypeModel.fromJson(t as Map<String, dynamic>)).toList();
    }

    if (ticketTypes.isEmpty) {
      try {
        final api = ref.read(apiServiceProvider);
        ticketTypes = await api.getEventTicketTypes(eventId);
      } catch (_) {}
    }

    if (!context.mounted) return;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => TicketSelectionSheet(
        eventId: eventId,
        ticketTypes: ticketTypes,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final eventAsync = ref.watch(_eventDetailProvider(widget.slug));

    return Scaffold(
      backgroundColor: AppColors.background,
      body: eventAsync.when(
        data: (event) {
          final title = event['title'] ?? event['name'] ?? 'Event Details';
          final description = event['description'] ?? 'No description provided.';
          final venue = _extractVenue(event);
          final date = _formatDate(event['startDate'] ?? event['start_date']);
          final time = _formatTime(event['startDate'] ?? event['start_date']);
          final imageUrl = _extractImage(event);
          final category = event['category'] is Map ? event['category']['name'] : event['category']?.toString();
          final eventId = event['id']?.toString() ?? widget.slug;
          final rawTiers = event['ticketTypes'] as List<dynamic>?;

          return Stack(
            children: [
              CustomScrollView(
                slivers: [
                  // ── Hero SliverAppBar ────────────────────────────────────
                  SliverAppBar(
                    expandedHeight: 320,
                    pinned: true,
                    backgroundColor: AppColors.surface,
                    leading: Padding(
                      padding: const EdgeInsets.all(8.0),
                      child: CircleAvatar(
                        backgroundColor: Colors.black.withValues(alpha: 0.5),
                        child: IconButton(
                          icon: const Icon(Icons.arrow_back, color: Colors.white, size: 20),
                          onPressed: () => context.pop(),
                        ),
                      ),
                    ),
                    flexibleSpace: FlexibleSpaceBar(
                      background: Stack(
                        fit: StackFit.expand,
                        children: [
                          if (imageUrl != null && imageUrl.isNotEmpty)
                            CachedNetworkImage(
                              imageUrl: imageUrl,
                              fit: BoxFit.cover,
                              placeholder: (context, url) => Container(color: AppColors.shimmerBase),
                              errorWidget: (context, url, error) => Container(
                                color: AppColors.card,
                                child: const Icon(Icons.event, size: 64, color: AppColors.textTertiary),
                              ),
                            )
                          else
                            Container(
                              color: AppColors.card,
                              child: const Icon(Icons.event, size: 64, color: AppColors.textTertiary),
                            ),
                          // Dark gradient overlay
                          DecoratedBox(
                            decoration: BoxDecoration(
                              gradient: LinearGradient(
                                begin: Alignment.topCenter,
                                end: Alignment.bottomCenter,
                                colors: [
                                  Colors.transparent,
                                  Colors.black.withValues(alpha: 0.8),
                                ],
                                stops: const [0.5, 1.0],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),

                  // ── Content ──────────────────────────────────────────────
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(20, 20, 20, 100),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Category Chip
                          if (category != null) ...[
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: AppColors.electricPurpleSubtle,
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                category.toUpperCase(),
                                style: const TextStyle(
                                  color: AppColors.electricPurple,
                                  fontSize: 11,
                                  fontWeight: FontWeight.w700,
                                  letterSpacing: 0.5,
                                ),
                              ),
                            ),
                            const SizedBox(height: 12),
                          ],

                          // Title
                          Text(
                            title,
                            style: Theme.of(context).textTheme.displaySmall,
                          ),
                          const SizedBox(height: 20),

                          // Metadata Cards
                          Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: AppColors.card,
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(color: AppColors.border, width: 0.5),
                            ),
                            child: Column(
                              children: [
                                _MetaRow(
                                  icon: Icons.calendar_today_rounded,
                                  title: date,
                                  subtitle: time,
                                ),
                                const Divider(color: AppColors.divider, height: 24),
                                _MetaRow(
                                  icon: Icons.location_on_rounded,
                                  title: venue,
                                  subtitle: 'Venue location',
                                ),
                              ],
                            ),
                          ),

                          const SizedBox(height: 24),

                          // Description
                          Text(
                            'About Event',
                            style: Theme.of(context).textTheme.titleLarge,
                          ),
                          const SizedBox(height: 10),
                          Text(
                            description,
                            maxLines: _isDescriptionExpanded ? null : 4,
                            overflow: _isDescriptionExpanded ? TextOverflow.visible : TextOverflow.ellipsis,
                            style: const TextStyle(
                              color: AppColors.textSecondary,
                              fontSize: 14,
                              height: 1.5,
                            ),
                          ),
                          if (description.length > 150)
                            GestureDetector(
                              onTap: () => setState(() => _isDescriptionExpanded = !_isDescriptionExpanded),
                              child: Padding(
                                padding: const EdgeInsets.only(top: 6),
                                child: Text(
                                  _isDescriptionExpanded ? 'Read less' : 'Read more',
                                  style: const TextStyle(
                                    color: AppColors.electricPurple,
                                    fontSize: 13,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ),
                            ),

                          const SizedBox(height: 24),

                          // Ticket Types Preview
                          if (rawTiers != null && rawTiers.isNotEmpty) ...[
                            Text(
                              'Available Tiers',
                              style: Theme.of(context).textTheme.titleLarge,
                            ),
                            const SizedBox(height: 12),
                            ...rawTiers.map((t) {
                              final tierMap = t as Map<String, dynamic>;
                              final tierName = tierMap['name'] ?? 'Tier';
                              final priceMinor = tierMap['priceMinor'] ?? tierMap['price_minor'] ?? 0;
                              final currency = tierMap['currency'] ?? 'INR';
                              final isSoldOut = (tierMap['soldQuantity'] ?? 0) >= (tierMap['quantity'] ?? 1);

                              return Container(
                                margin: const EdgeInsets.only(bottom: 10),
                                padding: const EdgeInsets.all(14),
                                decoration: BoxDecoration(
                                  color: AppColors.card,
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(color: AppColors.border, width: 0.5),
                                ),
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          tierName,
                                          style: const TextStyle(
                                            color: AppColors.textPrimary,
                                            fontWeight: FontWeight.w600,
                                            fontSize: 14,
                                          ),
                                        ),
                                        if (isSoldOut)
                                          const Text(
                                            'Sold Out',
                                            style: TextStyle(color: AppColors.danger, fontSize: 11),
                                          ),
                                      ],
                                    ),
                                    Text(
                                      currency == 'INR'
                                          ? '₹${(priceMinor / 100).toStringAsFixed(0)}'
                                          : '\$${(priceMinor / 100).toStringAsFixed(2)}',
                                      style: const TextStyle(
                                        color: AppColors.electricPurple,
                                        fontWeight: FontWeight.w700,
                                        fontSize: 15,
                                      ),
                                    ),
                                  ],
                                ),
                              );
                            }),
                          ],
                        ],
                      ),
                    ),
                  ),
                ],
              ),

              // ── Sticky Bottom CTA ────────────────────────────────────────
              Positioned(
                bottom: 0,
                left: 0,
                right: 0,
                child: Container(
                  padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    border: const Border(
                      top: BorderSide(color: AppColors.border, width: 0.5),
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.4),
                        blurRadius: 10,
                        offset: const Offset(0, -4),
                      ),
                    ],
                  ),
                  child: SafeArea(
                    top: false,
                    child: LimeButton(
                      label: 'Find Tickets',
                      icon: Icons.confirmation_num_rounded,
                      onPressed: () => _openTicketSelection(context, eventId, rawTiers),
                    ),
                  ),
                ),
              ),
            ],
          );
        },
        loading: () => const Scaffold(
          backgroundColor: AppColors.background,
          body: LoadingState(message: 'Loading event details...'),
        ),
        error: (err, _) => Scaffold(
          backgroundColor: AppColors.background,
          appBar: AppBar(backgroundColor: Colors.transparent),
          body: ErrorState(
            message: 'Could not load event details',
            onRetry: () => ref.invalidate(_eventDetailProvider(widget.slug)),
          ),
        ),
      ),
    );
  }

  String _extractVenue(Map<String, dynamic> event) {
    final venue = event['venue'];
    if (venue is Map) return venue['name'] ?? venue['city'] ?? 'TBD';
    if (venue is String) return venue;
    return event['venueName'] ?? event['venue_name'] ?? 'TBD';
  }

  String? _extractImage(Map<String, dynamic> event) {
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
      return '${dt.day} ${months[dt.month - 1]} ${dt.year}';
    } catch (_) {
      return dateStr.toString();
    }
  }

  String _formatTime(dynamic dateStr) {
    if (dateStr == null) return '';
    try {
      final dt = DateTime.parse(dateStr.toString());
      final hour = dt.hour > 12 ? dt.hour - 12 : (dt.hour == 0 ? 12 : dt.hour);
      final period = dt.hour >= 12 ? 'PM' : 'AM';
      final minute = dt.minute.toString().padLeft(2, '0');
      return '$hour:$minute $period';
    } catch (_) {
      return '';
    }
  }
}

class _MetaRow extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;

  const _MetaRow({
    required this.icon,
    required this.title,
    required this.subtitle,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: AppColors.electricPurpleSubtle,
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(icon, color: AppColors.electricPurple, size: 20),
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(
                  color: AppColors.textPrimary,
                  fontWeight: FontWeight.w600,
                  fontSize: 14,
                ),
              ),
              if (subtitle.isNotEmpty) ...[
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: const TextStyle(
                    color: AppColors.textTertiary,
                    fontSize: 12,
                  ),
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }
}
