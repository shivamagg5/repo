// =============================================================================
// consumer-mobile — Digital Ticket Detail & QR Gate Entry Pass
// High-contrast cryptographic QR presentation with perforated physical ticket styling.
// Preserves all ECDSA/vector QR generation & token strings unchanged.
// =============================================================================

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:barcode_widget/barcode_widget.dart';
import '../../providers/auth_provider.dart';
import '../../providers/ticket_wallet_provider.dart';
import '../../models/ticket_model.dart';
import '../../theme/app_colors.dart';

class TicketDetailScreen extends ConsumerWidget {
  final String ticketId;
  final TicketModel? ticketOverride;

  const TicketDetailScreen({
    super.key,
    required this.ticketId,
    this.ticketOverride,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final walletState = ref.watch(ticketWalletProvider);
    final authState = ref.watch(authNotifierProvider);
    final user = authState.user;

    final ticket = ticketOverride ?? walletState.tickets.where((t) => t.id == ticketId).firstOrNull;

    if (ticket == null) {
      return Scaffold(
        backgroundColor: AppColors.background,
        appBar: AppBar(
          backgroundColor: Colors.transparent,
          elevation: 0,
          leading: IconButton(
            icon: const Icon(Icons.arrow_back, color: AppColors.textPrimary),
            onPressed: () => context.pop(),
          ),
        ),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Text('Ticket not found in local wallet.', style: TextStyle(color: AppColors.textSecondary)),
              const SizedBox(height: 12),
              ElevatedButton(
                onPressed: () {
                  ref.read(ticketWalletProvider.notifier).loadTickets();
                  context.pop();
                },
                child: const Text('Refresh Wallet'),
              ),
            ],
          ),
        ),
      );
    }

    final qrData = ticket.qrToken ?? 'TICKET:${ticket.ticketNumber}:${ticket.id}';
    final isValid = ticket.status == 'issued';

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: AppColors.textPrimary),
          onPressed: () => context.pop(),
        ),
        title: Text(
          'Digital Entry Pass',
          style: Theme.of(context).textTheme.titleMedium,
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
        child: Center(
          child: Container(
            constraints: const BoxConstraints(maxWidth: 380),
            decoration: BoxDecoration(
              color: AppColors.card,
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: AppColors.border, width: 0.5),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Header Banner
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: const BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
                  ),
                  child: Column(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppColors.electricPurpleSubtle,
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: const Text(
                          'OFFICIAL ENTRY PASS',
                          style: TextStyle(
                            color: AppColors.electricPurple,
                            fontSize: 10,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 1,
                          ),
                        ),
                      ),
                      const SizedBox(height: 10),
                      const Text(
                        'Event Admission',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          color: AppColors.textPrimary,
                          fontSize: 18,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                ),

                // High-contrast Primary QR Turnstile Pass
                Container(
                  color: AppColors.surface,
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
                  child: Column(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        margin: const EdgeInsets.only(bottom: 12),
                        decoration: BoxDecoration(
                          color: AppColors.electricPurple,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: const Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.qr_code_scanner_rounded, color: AppColors.textOnAccent, size: 14),
                            SizedBox(width: 6),
                            Text(
                              'SCAN AT TURNSTILE GATE',
                              style: TextStyle(
                                color: AppColors.textOnAccent,
                                fontSize: 11,
                                fontWeight: FontWeight.w800,
                                letterSpacing: 0.5,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(20),
                          boxShadow: [
                            BoxShadow(
                              color: AppColors.electricPurple.withValues(alpha: 0.2),
                              blurRadius: 20,
                              spreadRadius: 2,
                            ),
                          ],
                        ),
                        child: QrImageView(
                          data: qrData,
                          version: QrVersions.auto,
                          size: 200,
                          backgroundColor: Colors.white,
                        ),
                      ),
                      const SizedBox(height: 16),
                      Text(
                        ticket.ticketNumber,
                        style: const TextStyle(
                          color: AppColors.electricPurple,
                          fontSize: 16,
                          fontFamily: 'monospace',
                          fontWeight: FontWeight.bold,
                          letterSpacing: 1,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Holder: ${user?.email ?? 'Verified Ticket Holder'}',
                        style: const TextStyle(color: AppColors.textSecondary, fontSize: 12),
                      ),
                    ],
                  ),
                ),

                // Perforated Border with Notches
                Row(
                  children: [
                    Container(
                      width: 16,
                      height: 32,
                      decoration: const BoxDecoration(
                        color: AppColors.background,
                        borderRadius: BorderRadius.horizontal(right: Radius.circular(16)),
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
                              (index) => const SizedBox(
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
                      width: 16,
                      height: 32,
                      decoration: const BoxDecoration(
                        color: AppColors.background,
                        borderRadius: BorderRadius.horizontal(left: Radius.circular(16)),
                      ),
                    ),
                  ],
                ),

                // Details Area & Secondary Serial Barcode
                Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('Status', style: TextStyle(color: AppColors.textTertiary, fontSize: 11)),
                              const SizedBox(height: 4),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                decoration: BoxDecoration(
                                  color: isValid ? AppColors.successSubtle : AppColors.cardHover,
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Text(
                                  isValid ? 'VALID FOR ENTRY' : ticket.status.toUpperCase(),
                                  style: TextStyle(
                                    color: isValid ? AppColors.success : AppColors.textTertiary,
                                    fontSize: 10,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Text('Gate Entry', style: TextStyle(color: AppColors.textTertiary, fontSize: 11)),
                              SizedBox(height: 4),
                              Text(
                                'Main Turnstile',
                                style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w600, fontSize: 13),
                              ),
                            ],
                          ),
                        ],
                      ),
                      const SizedBox(height: 20),
                      // Secondary Serial Barcode (Clearly labeled reference only)
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: AppColors.surface,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: AppColors.border, width: 0.5),
                        ),
                        child: Column(
                          children: [
                            const Text(
                              'SERIAL REFERENCE / TICKET ID',
                              style: TextStyle(color: AppColors.textTertiary, fontSize: 9, fontWeight: FontWeight.w600, letterSpacing: 0.8),
                            ),
                            const SizedBox(height: 6),
                            SizedBox(
                              height: 30,
                              child: BarcodeWidget(
                                barcode: Barcode.code128(),
                                data: ticket.ticketNumber,
                                drawText: false,
                                color: AppColors.textTertiary,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 12),
                      const Text(
                        'Present the QR pass above to the turnstile reader for contactless gate entry.',
                        textAlign: TextAlign.center,
                        style: TextStyle(color: AppColors.textTertiary, fontSize: 11),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
