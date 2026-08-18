// =============================================================================
// consumer-mobile — Ticket Selection Sheet
// Modal bottom sheet to select ticket tier, quantity, and lock reservation hold
// Designed with Dark theme & Lime primary accents.
// PRESERVES ALL RESERVATION & CHECKOUT LOGIC UNCHANGED.
// =============================================================================

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../models/ticket_model.dart';
import '../../providers/auth_provider.dart';
import '../../providers/ticketing_provider.dart';
import '../../theme/app_colors.dart';
import '../../widgets/lime_button.dart';

class TicketSelectionSheet extends ConsumerStatefulWidget {
  final String eventId;
  final List<TicketTypeModel> ticketTypes;

  const TicketSelectionSheet({
    super.key,
    required this.eventId,
    required this.ticketTypes,
  });

  @override
  ConsumerState<TicketSelectionSheet> createState() => _TicketSelectionSheetState();
}

class _TicketSelectionSheetState extends ConsumerState<TicketSelectionSheet> {
  late List<TicketTypeModel> _tiers;
  bool _isLoading = false;
  String? _selectedTypeId;
  int _quantity = 1;
  String? _localError;

  @override
  void initState() {
    super.initState();
    _tiers = List.from(widget.ticketTypes);
    if (_tiers.isNotEmpty) {
      final firstAvailable = _tiers.where((t) => !t.isSoldOut).firstOrNull;
      if (firstAvailable != null) {
        _selectedTypeId = firstAvailable.id;
        _quantity = firstAvailable.minPerOrder;
      }
    } else {
      _loadTiers();
    }
  }

  Future<void> _loadTiers() async {
    setState(() => _isLoading = true);
    try {
      final api = ref.read(apiServiceProvider);
      final fetched = await api.getEventTicketTypes(widget.eventId);
      if (mounted) {
        setState(() {
          _tiers = fetched;
          _isLoading = false;
          final firstAvailable = _tiers.where((t) => !t.isSoldOut).firstOrNull;
          if (firstAvailable != null) {
            _selectedTypeId = firstAvailable.id;
            _quantity = firstAvailable.minPerOrder;
          }
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  TicketTypeModel? get _selectedTier =>
      _tiers.where((t) => t.id == _selectedTypeId).firstOrNull;

  Future<void> _handleReserve() async {
    final tier = _selectedTier;
    if (tier == null) {
      setState(() => _localError = 'Please select a ticket tier.');
      return;
    }

    setState(() => _localError = null);

    final reservation = await ref.read(ticketingProvider.notifier).reserveTickets(
          ticketTypeId: tier.id,
          quantity: _quantity,
        );

    if (reservation != null && mounted) {
      Navigator.of(context).pop(); // Close sheet
      context.push('/checkout');
    }
  }

  String _formatPrice(int minor, String currency) {
    final symbol = currency == 'INR' ? '₹' : '$currency ';
    return '$symbol${(minor / 100).toStringAsFixed(0)}';
  }

  @override
  Widget build(BuildContext context) {
    final checkoutState = ref.watch(ticketingProvider);
    final error = _localError ?? checkoutState.errorMessage;

    return Container(
      decoration: const BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: EdgeInsets.only(
        top: 16,
        left: 20,
        right: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Drag Handle
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: AppColors.border,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Title
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Select Tickets',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.electricPurpleSubtle,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Text(
                  '⏱️ 10-Min Hold',
                  style: TextStyle(
                    color: AppColors.electricPurple,
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          if (error != null) ...[
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.dangerSubtle,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.danger),
              ),
              child: Text(
                error,
                style: const TextStyle(color: AppColors.danger, fontSize: 13),
              ),
            ),
            const SizedBox(height: 12),
          ],

          // Ticket Tiers List
          if (_isLoading)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 32),
              child: Center(
                child: CircularProgressIndicator(
                  color: AppColors.electricPurple,
                  strokeWidth: 2.5,
                ),
              ),
            )
          else if (_tiers.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 24),
              child: Center(
                child: Text(
                  'No ticket tiers available for this event.',
                  style: TextStyle(color: AppColors.textSecondary, fontSize: 14),
                ),
              ),
            )
          else
            ..._tiers.map((tier) {
              final isSelected = tier.id == _selectedTypeId;
              final isSoldOut = tier.isSoldOut;

              return GestureDetector(
                onTap: isSoldOut
                    ? null
                    : () {
                        setState(() {
                          _selectedTypeId = tier.id;
                          _quantity = tier.minPerOrder;
                          _localError = null;
                        });
                      },
                child: Container(
                  margin: const EdgeInsets.only(bottom: 10),
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: isSelected ? AppColors.cardHover : AppColors.card,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: isSelected ? AppColors.electricPurple : AppColors.border,
                      width: isSelected ? 1.5 : 0.5,
                    ),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Text(
                                  tier.name,
                                  style: const TextStyle(
                                    color: AppColors.textPrimary,
                                    fontSize: 15,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                const SizedBox(width: 8),
                                if (isSoldOut)
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: AppColors.dangerSubtle,
                                      borderRadius: BorderRadius.circular(4),
                                    ),
                                    child: const Text(
                                      'SOLD OUT',
                                      style: TextStyle(color: AppColors.danger, fontSize: 10, fontWeight: FontWeight.bold),
                                    ),
                                  ),
                              ],
                            ),
                            if (tier.description != null && tier.description!.isNotEmpty) ...[
                              const SizedBox(height: 2),
                              Text(
                                tier.description!,
                                style: const TextStyle(color: AppColors.textSecondary, fontSize: 12),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ],
                          ],
                        ),
                      ),
                      Text(
                        _formatPrice(tier.priceMinor, tier.currency),
                        style: const TextStyle(
                          color: AppColors.electricPurple,
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }),

          // Quantity Stepper
          if (_selectedTier != null) ...[
            const SizedBox(height: 6),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              decoration: BoxDecoration(
                color: AppColors.card,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppColors.border, width: 0.5),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Quantity',
                        style: TextStyle(color: AppColors.textPrimary, fontSize: 14, fontWeight: FontWeight.w600),
                      ),
                      Text(
                        'Max ${_selectedTier!.maxPerOrder} tickets',
                        style: const TextStyle(color: AppColors.textTertiary, fontSize: 11),
                      ),
                    ],
                  ),
                  Row(
                    children: [
                      IconButton(
                        icon: const Icon(Icons.remove_circle_outline_rounded, color: AppColors.textSecondary, size: 22),
                        onPressed: _quantity > _selectedTier!.minPerOrder
                            ? () => setState(() => _quantity--)
                            : null,
                      ),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 8),
                        child: Text(
                          '$_quantity',
                          style: const TextStyle(color: AppColors.textPrimary, fontSize: 16, fontWeight: FontWeight.bold),
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.add_circle_outline_rounded, color: AppColors.electricPurple, size: 22),
                        onPressed: _quantity < _selectedTier!.maxPerOrder
                            ? () => setState(() => _quantity++)
                            : null,
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],

          const SizedBox(height: 20),

          // Reserve CTA Button
          LimeButton(
            label: 'Lock Tickets & Proceed',
            icon: Icons.lock_outline_rounded,
            isLoading: checkoutState.isLoading,
            onPressed: checkoutState.isLoading || _selectedTier == null ? null : _handleReserve,
          ),
        ],
      ),
    );
  }
}
