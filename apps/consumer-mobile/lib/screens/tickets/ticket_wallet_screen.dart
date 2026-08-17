// =============================================================================
// consumer-mobile — Ticket Wallet Screen
// Physical ticket card metaphor with barcodes and active/used tabs.
// Offline mode distinction clearly indicated.
// Real data from GET /tickets. All cryptographic security preserved.
// =============================================================================

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:barcode_widget/barcode_widget.dart';
import '../../models/ticket_model.dart';
import '../../providers/ticket_wallet_provider.dart';
import '../../theme/app_colors.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/loading_state.dart';

class TicketWalletScreen extends ConsumerStatefulWidget {
  const TicketWalletScreen({super.key});

  @override
  ConsumerState<TicketWalletScreen> createState() => _TicketWalletScreenState();
}

class _TicketWalletScreenState extends ConsumerState<TicketWalletScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(ticketWalletProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        title: Text(
          'My Tickets',
          style: Theme.of(context).textTheme.headlineMedium,
        ),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(48),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Container(
              height: 42,
              decoration: BoxDecoration(
                color: AppColors.card,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.border, width: 0.5),
              ),
              child: TabBar(
                controller: _tabController,
                tabs: [
                  Tab(text: 'Active Tickets (${state.upcomingTickets.length})'),
                  Tab(text: 'Used / Past (${state.pastTickets.length})'),
                ],
              ),
            ),
          ),
        ),
      ),
      body: Column(
        children: [
          const SizedBox(height: 12),
          // Offline Mode Banner
          if (state.isOffline)
            Container(
              width: double.infinity,
              margin: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: AppColors.warning.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: AppColors.warning.withValues(alpha: 0.4)),
              ),
              child: const Row(
                children: [
                  Icon(Icons.cloud_off_rounded, color: AppColors.warning, size: 18),
                  SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      'Offline Mode: Displaying securely cached tickets.',
                      style: TextStyle(color: AppColors.warning, fontSize: 12, fontWeight: FontWeight.w500),
                    ),
                  ),
                ],
              ),
            ),

          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                _buildTicketList(state.upcomingTickets, isUpcoming: true, isLoading: state.isLoading),
                _buildTicketList(state.pastTickets, isUpcoming: false, isLoading: state.isLoading),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTicketList(List<TicketModel> tickets, {required bool isUpcoming, required bool isLoading}) {
    if (isLoading && tickets.isEmpty) {
      return const LoadingState(message: 'Loading your tickets...');
    }

    if (tickets.isEmpty) {
      return EmptyState(
        icon: Icons.confirmation_num_outlined,
        title: isUpcoming ? 'No active tickets' : 'No past tickets',
        subtitle: isUpcoming
            ? 'When you purchase tickets, they will appear here.'
            : 'Completed and used tickets will appear here.',
        actionLabel: isUpcoming ? 'Explore Events' : null,
        onAction: isUpcoming ? () => context.go('/') : null,
      );
    }

    return RefreshIndicator(
      color: AppColors.electricPurple,
      backgroundColor: AppColors.surface,
      onRefresh: () => ref.read(ticketWalletProvider.notifier).loadTickets(forceRefresh: true),
      child: ListView.separated(
        padding: const EdgeInsets.all(20),
        itemCount: tickets.length,
        separatorBuilder: (context, index) => const SizedBox(height: 16),
        itemBuilder: (context, index) {
          final ticket = tickets[index];
          return _PhysicalTicketCard(ticket: ticket);
        },
      ),
    );
  }
}

class _PhysicalTicketCard extends StatelessWidget {
  final TicketModel ticket;

  const _PhysicalTicketCard({required this.ticket});

  @override
  Widget build(BuildContext context) {
    final isValid = ticket.status == 'issued';

    return GestureDetector(
      onTap: () => context.push('/tickets/${ticket.id}'),
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.card,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: AppColors.border, width: 0.5),
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          children: [
            // Top Section — Event Info
            Padding(
              padding: const EdgeInsets.all(18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppColors.electricPurpleSubtle,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          ticket.ticketNumber,
                          style: const TextStyle(
                            color: AppColors.electricPurple,
                            fontFamily: 'monospace',
                            fontWeight: FontWeight.bold,
                            fontSize: 12,
                          ),
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: isValid ? AppColors.successSubtle : AppColors.cardHover,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          isValid ? 'VALID' : ticket.status.toUpperCase(),
                          style: TextStyle(
                            color: isValid ? AppColors.success : AppColors.textTertiary,
                            fontWeight: FontWeight.w700,
                            fontSize: 11,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  const Text(
                    'Admission Pass',
                    style: TextStyle(
                      color: AppColors.textPrimary,
                      fontSize: 17,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      const Icon(Icons.calendar_today_rounded, size: 13, color: AppColors.textTertiary),
                      const SizedBox(width: 5),
                      Text(
                        'Issued: ${ticket.issuedAt.day}/${ticket.issuedAt.month}/${ticket.issuedAt.year}',
                        style: const TextStyle(color: AppColors.textTertiary, fontSize: 12),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            // Perforated Line with Side Notches
            Row(
              children: [
                Container(
                  width: 14,
                  height: 28,
                  decoration: const BoxDecoration(
                    color: AppColors.background,
                    borderRadius: BorderRadius.horizontal(right: Radius.circular(14)),
                  ),
                ),
                Expanded(
                  child: LayoutBuilder(
                    builder: (context, constraints) {
                      final count = (constraints.constrainWidth() / 10).floor();
                      return Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: List.generate(
                          count,
                          (_) => const SizedBox(
                            width: 5,
                            height: 1,
                            child: DecoratedBox(
                              decoration: BoxDecoration(color: AppColors.border),
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
                Container(
                  width: 14,
                  height: 28,
                  decoration: const BoxDecoration(
                    color: AppColors.background,
                    borderRadius: BorderRadius.horizontal(left: Radius.circular(14)),
                  ),
                ),
              ],
            ),

            // Bottom Section — Barcode + QR Prompt
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 10, 20, 16),
              child: Column(
                children: [
                  SizedBox(
                    height: 44,
                    child: BarcodeWidget(
                      barcode: Barcode.code128(),
                      data: ticket.ticketNumber,
                      drawText: false,
                      color: AppColors.textPrimary.withValues(alpha: 0.7),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Tap to view QR Gate Pass',
                        style: TextStyle(color: AppColors.electricPurple, fontSize: 12, fontWeight: FontWeight.w600),
                      ),
                      Container(
                        width: 28,
                        height: 28,
                        decoration: BoxDecoration(
                          color: AppColors.electricPurple,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Icon(Icons.arrow_forward_rounded, color: AppColors.textOnAccent, size: 16),
                      ),
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
}
