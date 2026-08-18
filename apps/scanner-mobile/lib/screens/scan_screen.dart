// =============================================================================
// Scanner Mobile — Production Camera QR Scanner Screen
// Two-Step Inspect-and-Approve Admission Workflow:
//   1. Scan QR -> Camera Pauses -> Attendee Details Card Displayed for Review
//   2. Staff Taps "Approve & Admit" -> Recorded in DB/SQLite -> Admitted Confirmed
//   3. Staff Taps "Scan Next Ticket ->" -> Camera Resumes for Next Attendee
// =============================================================================

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../core/scanner_colors.dart';
import '../providers/scanner_provider.dart';
import '../services/scanner_auth_service.dart';
import 'attendee_lookup_sheet.dart';
import 'gate_metrics_sheet.dart';
import 'login_screen.dart';
import 'pairing_screen.dart';

class ScanScreen extends ConsumerStatefulWidget {
  const ScanScreen({super.key});

  @override
  ConsumerState<ScanScreen> createState() => _ScanScreenState();
}

class _ScanScreenState extends ConsumerState<ScanScreen> with SingleTickerProviderStateMixin {
  late final MobileScannerController _cameraController;
  bool _isTorchOn = false;
  double _currentZoom = 1.0;
  late AnimationController _pulseController;

  @override
  void initState() {
    super.initState();
    _cameraController = MobileScannerController(
      detectionSpeed: DetectionSpeed.noDuplicates,
      facing: CameraFacing.back,
      torchEnabled: false,
    );

    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _cameraController.dispose();
    _pulseController.dispose();
    super.dispose();
  }

  void _onDetect(BarcodeCapture capture) {
    final scannerState = ref.read(scannerProvider);
    // Ignore camera detections while reviewing or processing an attendee
    if (scannerState.scanStatus != ScanProcessingStatus.idle) return;

    final barcodes = capture.barcodes;
    if (barcodes.isEmpty) return;

    final rawValue = barcodes.first.rawValue;
    if (rawValue != null && rawValue.isNotEmpty) {
      ref.read(scannerProvider.notifier).processScannedPayload(rawValue);
    }
  }

  Color _getStatusAccentColor(ScanProcessingStatus status) {
    switch (status) {
      case ScanProcessingStatus.inspecting:
        return ScannerColors.electricPurpleLight;
      case ScanProcessingStatus.success:
      case ScanProcessingStatus.offlineAccepted:
        return ScannerColors.success;
      case ScanProcessingStatus.alreadyUsed:
      case ScanProcessingStatus.revoked:
        return ScannerColors.danger;
      case ScanProcessingStatus.wrongEvent:
      case ScanProcessingStatus.invalid:
      case ScanProcessingStatus.expired:
        return ScannerColors.warning;
      default:
        return ScannerColors.border;
    }
  }

  IconData _getStatusIcon(ScanProcessingStatus status) {
    switch (status) {
      case ScanProcessingStatus.inspecting:
        return Icons.verified_user_rounded;
      case ScanProcessingStatus.success:
      case ScanProcessingStatus.offlineAccepted:
        return Icons.check_circle_rounded;
      case ScanProcessingStatus.alreadyUsed:
        return Icons.history_rounded;
      case ScanProcessingStatus.wrongEvent:
        return Icons.wrong_location_rounded;
      case ScanProcessingStatus.invalid:
        return Icons.block_rounded;
      case ScanProcessingStatus.expired:
        return Icons.timer_off_rounded;
      case ScanProcessingStatus.revoked:
        return Icons.security_update_warning_rounded;
      default:
        return Icons.qr_code_scanner_rounded;
    }
  }

  @override
  Widget build(BuildContext context) {
    final scannerState = ref.watch(scannerProvider);

    // If device is not paired, redirect to PairingScreen
    if (!scannerState.isPaired) {
      return const PairingScreen();
    }

    final isInspecting = scannerState.scanStatus == ScanProcessingStatus.inspecting;
    final isSuccess = scannerState.scanStatus == ScanProcessingStatus.success ||
        scannerState.scanStatus == ScanProcessingStatus.offlineAccepted;
    final isDenied = scannerState.scanStatus == ScanProcessingStatus.alreadyUsed ||
        scannerState.scanStatus == ScanProcessingStatus.wrongEvent ||
        scannerState.scanStatus == ScanProcessingStatus.invalid ||
        scannerState.scanStatus == ScanProcessingStatus.expired ||
        scannerState.scanStatus == ScanProcessingStatus.revoked;
    final isReviewCardActive = isInspecting || isSuccess || isDenied;

    final accentColor = _getStatusAccentColor(scannerState.scanStatus);

    return Scaffold(
      backgroundColor: ScannerColors.background,
      appBar: AppBar(
        backgroundColor: ScannerColors.surface,
        elevation: 0,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(
                  scannerState.gateName ?? 'Gate Scanner',
                  style: const TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.bold),
                ),
                const SizedBox(width: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: scannerState.isOnline ? ScannerColors.successSubtle : ScannerColors.warningSubtle,
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    scannerState.isOnline ? 'ONLINE' : 'OFFLINE',
                    style: TextStyle(
                      color: scannerState.isOnline ? ScannerColors.success : ScannerColors.warning,
                      fontSize: 9,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
            Text(
              '${scannerState.eventTitle ?? 'Event'} · Dev #${scannerState.deviceId?.substring(0, 8) ?? 'scanner'}',
              style: const TextStyle(color: ScannerColors.textSecondary, fontSize: 11),
            ),
          ],
        ),
        actions: [
          // Flashlight Toggle
          IconButton(
            icon: Icon(
              _isTorchOn ? Icons.flash_on_rounded : Icons.flash_off_rounded,
              color: _isTorchOn ? ScannerColors.warningLight : ScannerColors.textMuted,
            ),
            tooltip: 'Toggle Flashlight',
            onPressed: () async {
              await _cameraController.toggleTorch();
              setState(() => _isTorchOn = !_isTorchOn);
            },
          ),
          // Analytics & Stats Sheet
          IconButton(
            icon: const Icon(Icons.bar_chart_rounded, color: ScannerColors.electricPurpleLight),
            tooltip: 'Gate Analytics & History',
            onPressed: () {
              showModalBottomSheet(
                context: context,
                isScrollControlled: true,
                backgroundColor: Colors.transparent,
                builder: (_) => const GateMetricsSheet(),
              );
            },
          ),
          // Logout
          IconButton(
            icon: const Icon(Icons.logout_rounded, color: ScannerColors.danger),
            tooltip: 'Sign Out',
            onPressed: () async {
              final authService = BasicScannerAuthService();
              await authService.signOut();
              if (context.mounted) {
                Navigator.of(context).pushReplacement(
                  MaterialPageRoute(builder: (_) => ScannerLoginScreen(authService: authService)),
                );
              }
            },
          ),
        ],
      ),
      body: Column(
        children: [
          // Status & Sync Banner
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 16),
            color: scannerState.isOnline ? const Color(0xFF064E3B) : const Color(0xFF78350F),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Container(
                      width: 7,
                      height: 7,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: scannerState.isOnline ? ScannerColors.successLight : ScannerColors.warningLight,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      scannerState.isOnline ? 'Real-time Server Verification' : 'Offline Crypto Mode (Local Keys)',
                      style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w600),
                    ),
                  ],
                ),
                GestureDetector(
                  onTap: () => ref.read(scannerProvider.notifier).syncOfflineQueue(),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: Colors.black45,
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      scannerState.isSyncing
                          ? 'Syncing...'
                          : 'Queue: ${scannerState.pendingCount} 🔄',
                      style: const TextStyle(
                        color: ScannerColors.textPrimary,
                        fontSize: 10,
                        fontFamily: 'monospace',
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Camera Viewfinder & Interactive Overlay
          Expanded(
            child: Stack(
              children: [
                // Live Camera Layer
                Container(
                  margin: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(24),
                    border: Border.all(
                      color: isReviewCardActive ? accentColor : ScannerColors.border,
                      width: isReviewCardActive ? 3 : 1.5,
                    ),
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(22),
                    child: MobileScanner(
                      controller: _cameraController,
                      onDetect: _onDetect,
                    ),
                  ),
                ),

                // Viewfinder Reticle (Active when idle)
                if (scannerState.scanStatus == ScanProcessingStatus.idle)
                  Center(
                    child: AnimatedBuilder(
                      animation: _pulseController,
                      builder: (context, child) {
                        return Container(
                          width: 230 + (_pulseController.value * 10),
                          height: 230 + (_pulseController.value * 10),
                          decoration: BoxDecoration(
                            border: Border.all(
                              color: ScannerColors.electricPurpleLight.withValues(alpha: 0.6 + (_pulseController.value * 0.4)),
                              width: 2.5,
                            ),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Stack(
                            children: [
                              // Top-left corner bracket
                              Positioned(top: 0, left: 0, child: _buildCorner(0)),
                              Positioned(top: 0, right: 0, child: _buildCorner(1)),
                              Positioned(bottom: 0, left: 0, child: _buildCorner(2)),
                              Positioned(bottom: 0, right: 0, child: _buildCorner(3)),
                            ],
                          ),
                        );
                      },
                    ),
                  ),

                // Zoom Level Controls
                Positioned(
                  top: 24,
                  right: 24,
                  child: Container(
                    padding: const EdgeInsets.all(4),
                    decoration: BoxDecoration(
                      color: Colors.black.withValues(alpha: 0.65),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: Colors.white24),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        _buildZoomButton('1x', 1.0),
                        _buildZoomButton('1.5x', 1.5),
                        _buildZoomButton('2x', 2.0),
                      ],
                    ),
                  ),
                ),

                // Processing Spinner Overlay
                if (scannerState.scanStatus == ScanProcessingStatus.processing)
                  Center(
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                      decoration: BoxDecoration(
                        color: Colors.black.withValues(alpha: 0.85),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: ScannerColors.electricPurple),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: const [
                          SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(color: ScannerColors.electricPurpleLight, strokeWidth: 2.5),
                          ),
                          SizedBox(width: 14),
                          Text(
                            'Verifying Pass...',
                            style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                          ),
                        ],
                      ),
                    ),
                  ),

                // =============================================================
                // TWO-STEP INSPECTION & APPROVAL CARD (User Requirement)
                // =============================================================
                if (isReviewCardActive)
                  Positioned(
                    bottom: 20,
                    left: 16,
                    right: 16,
                    child: Container(
                      padding: const EdgeInsets.all(18),
                      decoration: BoxDecoration(
                        color: ScannerColors.surface.withValues(alpha: 0.98),
                        borderRadius: BorderRadius.circular(22),
                        border: Border.all(color: accentColor, width: 2),
                        boxShadow: [
                          BoxShadow(
                            color: accentColor.withValues(alpha: 0.35),
                            blurRadius: 24,
                            spreadRadius: 2,
                            offset: const Offset(0, 8),
                          ),
                        ],
                      ),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          // Top Status Badge & Icon
                          Row(
                            children: [
                              Container(
                                width: 44,
                                height: 44,
                                decoration: BoxDecoration(
                                  color: accentColor.withValues(alpha: 0.18),
                                  shape: BoxShape.circle,
                                ),
                                child: Icon(
                                  _getStatusIcon(scannerState.scanStatus),
                                  color: accentColor,
                                  size: 26,
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      isInspecting
                                          ? 'REVIEW ATTENDEE PASS'
                                          : isSuccess
                                              ? 'ADMITTED SUCCESSFULLY'
                                              : 'ADMISSION DENIED',
                                      style: TextStyle(
                                        color: accentColor,
                                        fontSize: 11,
                                        fontWeight: FontWeight.w900,
                                        letterSpacing: 1.2,
                                      ),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      scannerState.statusMessage,
                                      style: const TextStyle(
                                        color: ScannerColors.textPrimary,
                                        fontSize: 13,
                                        fontWeight: FontWeight.bold,
                                      ),
                                      maxLines: 2,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 14),

                          // Attendee & Ticket Info Container
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: ScannerColors.card,
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(color: ScannerColors.border),
                            ),
                            child: Column(
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    const Text('Attendee Name', style: TextStyle(color: ScannerColors.textSecondary, fontSize: 12)),
                                    Text(
                                      scannerState.lastAttendeeName ?? scannerState.pendingInspection?.attendeeName ?? 'Attendee',
                                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 14),
                                    ),
                                  ],
                                ),
                                const Divider(color: ScannerColors.border, height: 14),
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    const Text('Ticket Tier', style: TextStyle(color: ScannerColors.textSecondary, fontSize: 12)),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                      decoration: BoxDecoration(
                                        color: ScannerColors.electricPurpleSubtle,
                                        borderRadius: BorderRadius.circular(6),
                                      ),
                                      child: Text(
                                        scannerState.lastTicketType ?? scannerState.pendingInspection?.ticketTier ?? 'General',
                                        style: const TextStyle(
                                          color: ScannerColors.electricPurpleLight,
                                          fontWeight: FontWeight.bold,
                                          fontSize: 12,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                if (scannerState.lastTicketNumber != null) ...[
                                  const Divider(color: ScannerColors.border, height: 14),
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      const Text('Ticket Reference', style: TextStyle(color: ScannerColors.textSecondary, fontSize: 12)),
                                      Text(
                                        '#${scannerState.lastTicketNumber!.length > 12 ? scannerState.lastTicketNumber!.substring(0, 12) : scannerState.lastTicketNumber}',
                                        style: const TextStyle(
                                          color: ScannerColors.textPrimary,
                                          fontFamily: 'monospace',
                                          fontWeight: FontWeight.w600,
                                          fontSize: 11,
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                              ],
                            ),
                          ),
                          const SizedBox(height: 14),

                          // ===================================================
                          // ACTION BUTTONS BASED ON STEP
                          // ===================================================

                          // STEP 1: Inspecting -> Show "Approve & Admit" + "Reject"
                          if (isInspecting)
                            Row(
                              children: [
                                Expanded(
                                  flex: 3,
                                  child: ElevatedButton.icon(
                                    onPressed: () => ref.read(scannerProvider.notifier).approveAndAdmit(),
                                    icon: const Icon(Icons.check_circle_outline_rounded, color: Colors.white, size: 20),
                                    label: const Text(
                                      'Approve & Admit',
                                      style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 14),
                                    ),
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: ScannerColors.success,
                                      padding: const EdgeInsets.symmetric(vertical: 14),
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                                      elevation: 4,
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  flex: 2,
                                  child: OutlinedButton(
                                    onPressed: () => ref.read(scannerProvider.notifier).rejectCurrentInspection('Staff Rejected'),
                                    style: OutlinedButton.styleFrom(
                                      side: const BorderSide(color: ScannerColors.danger),
                                      padding: const EdgeInsets.symmetric(vertical: 14),
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                                    ),
                                    child: const Text(
                                      'Reject',
                                      style: TextStyle(color: ScannerColors.danger, fontWeight: FontWeight.bold, fontSize: 13),
                                    ),
                                  ),
                                ),
                              ],
                            ),

                          // STEP 2 & 3: Success or Denied -> Show "Scan Next Ticket ->"
                          if (isSuccess || isDenied)
                            ElevatedButton.icon(
                              onPressed: () => ref.read(scannerProvider.notifier).resetScanState(),
                              icon: const Icon(Icons.qr_code_scanner_rounded, color: Colors.black, size: 20),
                              label: const Text(
                                'Scan Next Ticket →',
                                style: TextStyle(color: Colors.black, fontWeight: FontWeight.w900, fontSize: 15),
                              ),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Colors.white,
                                padding: const EdgeInsets.symmetric(vertical: 14),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                                elevation: 6,
                              ),
                            ),
                        ],
                      ),
                    ),
                  ),
              ],
            ),
          ),

          // Bottom Action & Metrics Dock
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
            decoration: const BoxDecoration(
              color: ScannerColors.surface,
              borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
              border: Border(top: BorderSide(color: ScannerColors.border, width: 0.5)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                // Admitted Counter
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Total Admitted', style: TextStyle(color: ScannerColors.textSecondary, fontSize: 11)),
                    Text(
                      '${scannerState.validCount}',
                      style: const TextStyle(
                        color: ScannerColors.textPrimary,
                        fontSize: 22,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ],
                ),
                // Quick Actions
                Row(
                  children: [
                    // Manual Lookup
                    OutlinedButton.icon(
                      onPressed: () {
                        showModalBottomSheet(
                          context: context,
                          isScrollControlled: true,
                          backgroundColor: Colors.transparent,
                          builder: (_) => const AttendeeLookupSheet(),
                        );
                      },
                      icon: const Icon(Icons.search_rounded, color: ScannerColors.electricPurpleLight, size: 18),
                      label: const Text(
                        'Manual Lookup',
                        style: TextStyle(color: ScannerColors.electricPurpleLight, fontSize: 12, fontWeight: FontWeight.bold),
                      ),
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: ScannerColors.electricPurpleLight),
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                    const SizedBox(width: 8),
                    // Gate Pairing Settings
                    IconButton(
                      icon: const Icon(Icons.tune_rounded, color: ScannerColors.textSecondary),
                      tooltip: 'Change Gate / Event',
                      onPressed: () {
                        Navigator.of(context).pushReplacement(
                          MaterialPageRoute(builder: (_) => const PairingScreen()),
                        );
                      },
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildZoomButton(String label, double zoom) {
    final isSelected = _currentZoom == zoom;
    return GestureDetector(
      onTap: () async {
        setState(() => _currentZoom = zoom);
        await _cameraController.setZoomScale(zoom);
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(
          color: isSelected ? ScannerColors.electricPurple : Colors.transparent,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isSelected ? Colors.white : Colors.white70,
            fontSize: 11,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
    );
  }

  Widget _buildCorner(int corner) {
    // 0: top-left, 1: top-right, 2: bottom-left, 3: bottom-right
    return Container(
      width: 20,
      height: 20,
      decoration: BoxDecoration(
        border: Border(
          top: (corner == 0 || corner == 1) ? const BorderSide(color: ScannerColors.electricPurple, width: 4) : BorderSide.none,
          bottom: (corner == 2 || corner == 3) ? const BorderSide(color: ScannerColors.electricPurple, width: 4) : BorderSide.none,
          left: (corner == 0 || corner == 2) ? const BorderSide(color: ScannerColors.electricPurple, width: 4) : BorderSide.none,
          right: (corner == 1 || corner == 3) ? const BorderSide(color: ScannerColors.electricPurple, width: 4) : BorderSide.none,
        ),
      ),
    );
  }
}
