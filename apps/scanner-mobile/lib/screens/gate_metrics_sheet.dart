// =============================================================================
// Scanner Mobile — Gate Attendance & Metrics Sheet
// Real-time capacity gauge, tier-by-tier breakdown, and live scan history log.
// =============================================================================

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/scanner_colors.dart';
import '../providers/scanner_provider.dart';

class GateMetricsSheet extends ConsumerWidget {
  const GateMetricsSheet({super.key});

  String _formatTime(DateTime dt) {
    final hour = dt.hour.toString().padLeft(2, '0');
    final minute = dt.minute.toString().padLeft(2, '0');
    final second = dt.second.toString().padLeft(2, '0');
    return '$hour:$minute:$second';
  }

  Color _getStatusColor(ScanProcessingStatus status) {
    switch (status) {
      case ScanProcessingStatus.success:
      case ScanProcessingStatus.offlineAccepted:
        return ScannerColors.success;
      case ScanProcessingStatus.alreadyUsed:
      case ScanProcessingStatus.revoked:
        return ScannerColors.danger;
      case ScanProcessingStatus.wrongEvent:
      case ScanProcessingStatus.expired:
      case ScanProcessingStatus.invalid:
        return ScannerColors.warning;
      default:
        return ScannerColors.textMuted;
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(scannerProvider);
    final totalScanned = state.validCount + state.deniedCount;
    final approvalRate = totalScanned == 0 ? 100 : ((state.validCount / totalScanned) * 100).round();

    return Container(
      height: MediaQuery.of(context).size.height * 0.88,
      padding: const EdgeInsets.only(top: 16, left: 20, right: 20, bottom: 24),
      decoration: const BoxDecoration(
        color: ScannerColors.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Drag Handle
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: ScannerColors.borderHighlight,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Gate Analytics & History',
                    style: TextStyle(
                      color: ScannerColors.textPrimary,
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  Text(
                    '${state.gateName ?? 'Main Gate'} · ${state.eventTitle ?? 'Event'}',
                    style: const TextStyle(color: ScannerColors.electricPurpleLight, fontSize: 12),
                  ),
                ],
              ),
              IconButton(
                icon: const Icon(Icons.close_rounded, color: ScannerColors.textSecondary),
                onPressed: () => Navigator.of(context).pop(),
              ),
            ],
          ),
          const SizedBox(height: 20),

          // Top Stats Metric Cards
          Row(
            children: [
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: ScannerColors.card,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: ScannerColors.border),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: const [
                          Icon(Icons.check_circle_rounded, color: ScannerColors.success, size: 16),
                          SizedBox(width: 6),
                          Text('Admitted', style: TextStyle(color: ScannerColors.textSecondary, fontSize: 11)),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Text(
                        '${state.validCount}',
                        style: const TextStyle(
                          color: ScannerColors.textPrimary,
                          fontSize: 24,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: ScannerColors.card,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: ScannerColors.border),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: const [
                          Icon(Icons.cancel_rounded, color: ScannerColors.danger, size: 16),
                          SizedBox(width: 6),
                          Text('Denied / Dupe', style: TextStyle(color: ScannerColors.textSecondary, fontSize: 11)),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Text(
                        '${state.deniedCount}',
                        style: const TextStyle(
                          color: ScannerColors.danger,
                          fontSize: 24,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: ScannerColors.card,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: ScannerColors.border),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: const [
                          Icon(Icons.percent_rounded, color: ScannerColors.electricPurpleLight, size: 16),
                          SizedBox(width: 6),
                          Text('Pass Rate', style: TextStyle(color: ScannerColors.textSecondary, fontSize: 11)),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Text(
                        '$approvalRate%',
                        style: const TextStyle(
                          color: ScannerColors.electricPurpleLight,
                          fontSize: 24,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Tier Breakdown Section
          if (state.tierAdmissions.isNotEmpty) ...[
            const Text(
              'ADMISSION BY TICKET TIER',
              style: TextStyle(
                color: ScannerColors.textMuted,
                fontSize: 11,
                fontWeight: FontWeight.bold,
                letterSpacing: 1,
              ),
            ),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: ScannerColors.card,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: ScannerColors.border),
              ),
              child: Column(
                children: state.tierAdmissions.entries.map((entry) {
                  return Padding(
                    padding: const EdgeInsets.symmetric(vertical: 4),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          entry.key,
                          style: const TextStyle(color: ScannerColors.textPrimary, fontSize: 13, fontWeight: FontWeight.w600),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
                          decoration: BoxDecoration(
                            color: ScannerColors.electricPurpleSubtle,
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            '${entry.value} scanned',
                            style: const TextStyle(
                              color: ScannerColors.electricPurpleLight,
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ],
                    ),
                  );
                }).toList(),
              ),
            ),
            const SizedBox(height: 16),
          ],

          // Recent Scans Feed Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'RECENT SCANS LOG',
                style: TextStyle(
                  color: ScannerColors.textMuted,
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 1,
                ),
              ),
              Text(
                '${state.history.length} logged',
                style: const TextStyle(color: ScannerColors.textSecondary, fontSize: 11),
              ),
            ],
          ),
          const SizedBox(height: 8),

          // Recent Scans List
          Expanded(
            child: state.history.isEmpty
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: const [
                        Icon(Icons.history_toggle_off_rounded, color: ScannerColors.textMuted, size: 40),
                        SizedBox(height: 10),
                        Text(
                          'No tickets scanned yet this session.',
                          style: TextStyle(color: ScannerColors.textSecondary, fontSize: 13),
                        ),
                      ],
                    ),
                  )
                : ListView.builder(
                    itemCount: state.history.length,
                    itemBuilder: (context, index) {
                      final item = state.history[index];
                      final color = _getStatusColor(item.status);

                      return Container(
                        margin: const EdgeInsets.only(bottom: 8),
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        decoration: BoxDecoration(
                          color: ScannerColors.card,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: color.withValues(alpha: 0.3)),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Row(
                              children: [
                                Container(
                                  width: 8,
                                  height: 8,
                                  decoration: BoxDecoration(
                                    shape: BoxShape.circle,
                                    color: color,
                                  ),
                                ),
                                const SizedBox(width: 10),
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      item.attendeeName,
                                      style: const TextStyle(
                                        color: ScannerColors.textPrimary,
                                        fontSize: 13,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      '${item.ticketTier} · #${item.ticketId.length > 8 ? item.ticketId.substring(0, 8) : item.ticketId}',
                                      style: const TextStyle(color: ScannerColors.textSecondary, fontSize: 11),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.end,
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: color.withValues(alpha: 0.15),
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: Text(
                                    item.status == ScanProcessingStatus.success
                                        ? 'ADMITTED'
                                        : item.status == ScanProcessingStatus.alreadyUsed
                                            ? 'ALREADY USED'
                                            : item.status == ScanProcessingStatus.offlineAccepted
                                                ? 'OFFLINE'
                                                : 'DENIED',
                                    style: TextStyle(color: color, fontSize: 9, fontWeight: FontWeight.bold),
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  _formatTime(item.timestamp),
                                  style: const TextStyle(
                                    color: ScannerColors.textMuted,
                                    fontSize: 10,
                                    fontFamily: 'monospace',
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}
