// =============================================================================
// Scanner Mobile — Production Camera QR Scanner Screen
// Integrates MobileScanner with local cryptographic verification, DeviceAuthGuard
// online check-in, SQLite offline queue synchronization, and accessible feedback.
// =============================================================================

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../providers/scanner_provider.dart';
import '../services/scanner_auth_service.dart';
import 'attendee_lookup_sheet.dart';
import 'login_screen.dart';
import 'pairing_screen.dart';

class ScanScreen extends ConsumerStatefulWidget {
  const ScanScreen({super.key});

  @override
  ConsumerState<ScanScreen> createState() => _ScanScreenState();
}

class _ScanScreenState extends ConsumerState<ScanScreen> {
  late final MobileScannerController _cameraController;
  bool _isTorchOn = false;

  @override
  void initState() {
    super.initState();
    _cameraController = MobileScannerController(
      detectionSpeed: DetectionSpeed.noDuplicates,
      facing: CameraFacing.back,
      torchEnabled: false,
    );
  }

  @override
  void dispose() {
    _cameraController.dispose();
    super.dispose();
  }

  void _onDetect(BarcodeCapture capture) {
    final scannerState = ref.read(scannerProvider);
    if (scannerState.scanStatus == ScanProcessingStatus.processing) return;

    final barcodes = capture.barcodes;
    if (barcodes.isEmpty) return;

    final rawValue = barcodes.first.rawValue;
    if (rawValue != null && rawValue.isNotEmpty) {
      ref.read(scannerProvider.notifier).processScannedPayload(rawValue);
    }
  }

  Color _getResultColor(ScanProcessingStatus status) {
    switch (status) {
      case ScanProcessingStatus.success:
        return const Color(0xFF059669); // Green
      case ScanProcessingStatus.alreadyUsed:
      case ScanProcessingStatus.revoked:
        return const Color(0xFFDC2626); // Red
      case ScanProcessingStatus.wrongEvent:
      case ScanProcessingStatus.invalid:
      case ScanProcessingStatus.expired:
        return const Color(0xFFD97706); // Amber
      case ScanProcessingStatus.offlineAccepted:
        return const Color(0xFF0284C7); // Cyan/Blue
      default:
        return const Color(0xFF1E293B);
    }
  }

  IconData _getResultIcon(ScanProcessingStatus status) {
    switch (status) {
      case ScanProcessingStatus.success:
        return Icons.check_circle_rounded;
      case ScanProcessingStatus.alreadyUsed:
        return Icons.error_rounded;
      case ScanProcessingStatus.wrongEvent:
        return Icons.wrong_location_rounded;
      case ScanProcessingStatus.invalid:
        return Icons.block_rounded;
      case ScanProcessingStatus.expired:
        return Icons.timer_off_rounded;
      case ScanProcessingStatus.offlineAccepted:
        return Icons.cloud_done_rounded;
      case ScanProcessingStatus.revoked:
        return Icons.security_update_warning_rounded;
      default:
        return Icons.qr_code_scanner;
    }
  }

  @override
  Widget build(BuildContext context) {
    final scannerState = ref.watch(scannerProvider);

    // If device is not paired, redirect to PairingScreen
    if (!scannerState.isPaired) {
      return const PairingScreen();
    }

    final isResultActive = scannerState.scanStatus != ScanProcessingStatus.idle &&
        scannerState.scanStatus != ScanProcessingStatus.processing;

    return Scaffold(
      backgroundColor: const Color(0xFF090D16),
      appBar: AppBar(
        backgroundColor: const Color(0xFF111827),
        elevation: 0,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              scannerState.gateName ?? 'Gate Scanner',
              style: const TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.bold),
            ),
            Text(
              '${scannerState.eventTitle ?? 'Event'} · Dev: ${scannerState.deviceId?.substring(0, 8) ?? 'scanner'}',
              style: const TextStyle(color: Color(0xFF9CA3AF), fontSize: 11),
            ),
          ],
        ),
        actions: [
          // Flashlight Toggle
          IconButton(
            icon: Icon(
              _isTorchOn ? Icons.flash_on : Icons.flash_off,
              color: _isTorchOn ? const Color(0xFFFBBF24) : Colors.grey,
            ),
            tooltip: 'Flashlight',
            onPressed: () async {
              await _cameraController.toggleTorch();
              setState(() => _isTorchOn = !_isTorchOn);
            },
          ),
          // Online / Offline Toggle
          IconButton(
            icon: Icon(
              scannerState.isOnline ? Icons.wifi : Icons.wifi_off,
              color: scannerState.isOnline ? const Color(0xFF10B981) : const Color(0xFFF59E0B),
            ),
            tooltip: scannerState.isOnline ? 'Online Mode (Tap for Offline)' : 'Offline Mode (Tap for Online)',
            onPressed: () {
              ref.read(scannerProvider.notifier).toggleOnline(!scannerState.isOnline);
            },
          ),
          // Logout
          IconButton(
            icon: const Icon(Icons.logout_rounded, color: Color(0xFFEF4444)),
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
          // Connectivity & Sync Status Banner
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 16),
            color: scannerState.isOnline ? const Color(0xFF064E3B) : const Color(0xFF78350F),
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
                        color: scannerState.isOnline ? const Color(0xFF34D399) : const Color(0xFFFBBF24),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      scannerState.isOnline ? 'ONLINE — Real-time DB Gate' : 'OFFLINE MODE — Local Crypto Validation',
                      style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w600),
                    ),
                  ],
                ),
                GestureDetector(
                  onTap: () => ref.read(scannerProvider.notifier).syncOfflineQueue(),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: Colors.black38,
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      scannerState.isSyncing
                          ? 'Syncing...'
                          : 'Pending Sync: ${scannerState.pendingCount} 🔄',
                      style: const TextStyle(color: Color(0xFFE2E8F0), fontSize: 11, fontFamily: 'monospace', fontWeight: FontWeight.bold),
                    ),
                  ),
                ),
              ],
            ),
          ),

          if (scannerState.syncSummary != null)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 4, horizontal: 16),
              color: const Color(0xFF1E1B4B),
              child: Text(
                scannerState.syncSummary!,
                style: const TextStyle(color: Color(0xFFC7D2FE), fontSize: 11),
                textAlign: TextAlign.center,
              ),
            ),

          // Camera Viewfinder & Real Scanning Layer
          Expanded(
            child: Stack(
              children: [
                // Live Camera Stream
                ClipRRect(
                  borderRadius: BorderRadius.circular(20),
                  child: Container(
                    margin: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: _getResultColor(scannerState.scanStatus), width: 3),
                    ),
                    child: MobileScanner(
                      controller: _cameraController,
                      onDetect: _onDetect,
                    ),
                  ),
                ),

                // Viewfinder Reticle Overlay
                Center(
                  child: Container(
                    width: 240,
                    height: 240,
                    decoration: BoxDecoration(
                      border: Border.all(
                        color: _getResultColor(scannerState.scanStatus).withValues(alpha: 0.8),
                        width: 2,
                      ),
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                ),

                // Scan Result Overlay Card
                if (isResultActive)
                  Positioned(
                    bottom: 24,
                    left: 24,
                    right: 24,
                    child: Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: _getResultColor(scannerState.scanStatus).withValues(alpha: 0.95),
                        borderRadius: BorderRadius.circular(18),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.5),
                            blurRadius: 16,
                            offset: const Offset(0, 6),
                          ),
                        ],
                      ),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Row(
                            children: [
                              Icon(
                                _getResultIcon(scannerState.scanStatus),
                                color: Colors.white,
                                size: 32,
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      scannerState.statusMessage,
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontSize: 14,
                                        fontWeight: FontWeight.w900,
                                      ),
                                    ),
                                    if (scannerState.lastAttendeeName != null) ...[
                                      const SizedBox(height: 2),
                                      Text(
                                        'Attendee: ${scannerState.lastAttendeeName}',
                                        style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold),
                                      ),
                                    ],
                                    if (scannerState.lastTicketType != null) ...[
                                      Text(
                                        'Tier: ${scannerState.lastTicketType}',
                                        style: const TextStyle(color: Color(0xFFE0E7FF), fontSize: 11),
                                      ),
                                    ],
                                  ],
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 10),
                          SizedBox(
                            width: double.infinity,
                            child: ElevatedButton(
                              onPressed: () => ref.read(scannerProvider.notifier).resetScanState(),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Colors.white,
                                foregroundColor: Colors.black,
                                padding: const EdgeInsets.symmetric(vertical: 8),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                              ),
                              child: const Text('Next Attendee →', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
              ],
            ),
          ),

          // Bottom Action & Metrics Bar
          Container(
            padding: const EdgeInsets.all(16),
            decoration: const BoxDecoration(
              color: Color(0xFF111827),
              borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Admitted Today', style: TextStyle(color: Color(0xFF9CA3AF), fontSize: 11)),
                    Text(
                      '${scannerState.validCount}',
                      style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w900),
                    ),
                  ],
                ),
                Row(
                  children: [
                    OutlinedButton.icon(
                      onPressed: () {
                        showModalBottomSheet(
                          context: context,
                          isScrollControlled: true,
                          backgroundColor: Colors.transparent,
                          builder: (_) => const AttendeeLookupSheet(),
                        );
                      },
                      icon: const Icon(Icons.search, color: Color(0xFFA78BFA), size: 18),
                      label: const Text('Manual Lookup', style: TextStyle(color: Color(0xFFA78BFA), fontSize: 12, fontWeight: FontWeight.bold)),
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: Color(0xFFA78BFA)),
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                    const SizedBox(width: 8),
                    IconButton(
                      icon: const Icon(Icons.tune_rounded, color: Colors.grey),
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
}
