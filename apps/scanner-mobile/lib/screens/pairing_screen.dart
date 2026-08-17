// =============================================================================
// Scanner Mobile — Event & Gate Pairing Screen
// Pairs staff handheld scanner with assigned event and gate, downloading
// and verifying the signed Event Authorization Package.
// =============================================================================

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/scanner_provider.dart';
import 'scan_screen.dart';

class PairingScreen extends ConsumerStatefulWidget {
  const PairingScreen({super.key});

  @override
  ConsumerState<PairingScreen> createState() => _PairingScreenState();
}

class _PairingScreenState extends ConsumerState<PairingScreen> {
  final _eventIdController = TextEditingController(text: 'evt-summer-2026');
  final _eventTitleController = TextEditingController(text: 'Summer Fest 2026');
  final _gateIdController = TextEditingController(text: 'gate-main-north');
  final _gateNameController = TextEditingController(text: 'Gate 1 — Main North Entry');

  bool _pairing = false;
  String? _error;

  Future<void> _handlePair() async {
    final eventId = _eventIdController.text.trim();
    final eventTitle = _eventTitleController.text.trim();
    final gateId = _gateIdController.text.trim();
    final gateName = _gateNameController.text.trim();

    if (eventId.isEmpty || gateId.isEmpty) {
      setState(() => _error = 'Event ID and Gate ID are required.');
      return;
    }

    setState(() {
      _pairing = true;
      _error = null;
    });

    final success = await ref.read(scannerProvider.notifier).pairDevice(
      eventId: eventId,
      gateId: gateId,
      eventTitle: eventTitle.isEmpty ? eventId : eventTitle,
      gateName: gateName.isEmpty ? gateId : gateName,
    );

    if (success && mounted) {
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => const ScanScreen()),
      );
    } else if (mounted) {
      final err = ref.read(scannerProvider).errorMessage;
      setState(() {
        _error = err ?? 'Pairing failed. Ensure device is registered and authorized.';
        _pairing = false;
      });
    }
  }

  @override
  void dispose() {
    _eventIdController.dispose();
    _eventTitleController.dispose();
    _gateIdController.dispose();
    _gateNameController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final scannerState = ref.watch(scannerProvider);

    return Scaffold(
      backgroundColor: const Color(0xFF090D16),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: const Text('Pair Scanner Device', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18)),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFF1E293B),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.grey.shade800),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Device Identity', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14)),
                  const SizedBox(height: 4),
                  Text(
                    'Device ID: ${scannerState.deviceId ?? 'Registering...'}',
                    style: const TextStyle(color: Color(0xFFA78BFA), fontFamily: 'monospace', fontSize: 12),
                  ),
                  const SizedBox(height: 2),
                  const Text(
                    'Keypair: ECDSA P-256 (Protected in Secure Keyring)',
                    style: TextStyle(color: Colors.grey, fontSize: 11),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            if (_error != null) ...[
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(color: const Color(0xFF7F1D1D), borderRadius: BorderRadius.circular(12)),
                child: Text(_error!, style: const TextStyle(color: Colors.redAccent, fontSize: 12)),
              ),
              const SizedBox(height: 16),
            ],

            // Form inputs
            TextField(
              controller: _eventIdController,
              style: const TextStyle(color: Colors.white, fontSize: 14),
              decoration: InputDecoration(
                labelText: 'Assigned Event ID *',
                labelStyle: const TextStyle(color: Colors.grey),
                filled: true,
                fillColor: const Color(0xFF161922),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
              ),
            ),
            const SizedBox(height: 12),

            TextField(
              controller: _eventTitleController,
              style: const TextStyle(color: Colors.white, fontSize: 14),
              decoration: InputDecoration(
                labelText: 'Event Title (Display)',
                labelStyle: const TextStyle(color: Colors.grey),
                filled: true,
                fillColor: const Color(0xFF161922),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
              ),
            ),
            const SizedBox(height: 12),

            TextField(
              controller: _gateIdController,
              style: const TextStyle(color: Colors.white, fontSize: 14),
              decoration: InputDecoration(
                labelText: 'Assigned Gate ID *',
                labelStyle: const TextStyle(color: Colors.grey),
                filled: true,
                fillColor: const Color(0xFF161922),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
              ),
            ),
            const SizedBox(height: 12),

            TextField(
              controller: _gateNameController,
              style: const TextStyle(color: Colors.white, fontSize: 14),
              decoration: InputDecoration(
                labelText: 'Gate Name (Display)',
                labelStyle: const TextStyle(color: Colors.grey),
                filled: true,
                fillColor: const Color(0xFF161922),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
              ),
            ),
            const SizedBox(height: 24),

            ElevatedButton(
              onPressed: _pairing ? null : _handlePair,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF7C3AED),
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              ),
              child: _pairing
                  ? const SizedBox(
                      width: 22,
                      height: 22,
                      child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                    )
                  : const Text(
                      '🔒 Download Auth Package & Activate',
                      style: TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.bold),
                    ),
            ),
          ],
        ),
      ),
    );
  }
}
