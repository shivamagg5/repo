// =============================================================================
// Scanner Mobile — Event & Gate Pairing Screen
// Fetches live events from backend, allows 1-tap event/gate selection,
// and cryptographically activates the staff handheld device.
// =============================================================================

import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http/http.dart' as http;
import '../core/scanner_colors.dart';
import '../providers/scanner_provider.dart';
import 'scan_screen.dart';

class PairingScreen extends ConsumerStatefulWidget {
  const PairingScreen({super.key});

  @override
  ConsumerState<PairingScreen> createState() => _PairingScreenState();
}

class _PairingScreenState extends ConsumerState<PairingScreen> {
  final _eventIdController = TextEditingController();
  final _eventTitleController = TextEditingController();
  final _gateIdController = TextEditingController(text: 'gate-main-01');
  final _gateNameController = TextEditingController(text: 'Gate 1 — Main North Entrance');

  List<Map<String, dynamic>> _liveEvents = [];
  bool _loadingEvents = true;
  String? _selectedEventId;
  String? _selectedGateId = 'gate-main-01';
  bool _pairing = false;
  String? _error;
  bool _showManualEntry = false;

  final List<Map<String, String>> _defaultGates = [
    {'id': 'gate-main-01', 'name': 'Gate 1 — Main Entrance'},
    {'id': 'gate-vip-02', 'name': 'VIP Gate A — Fast Track'},
    {'id': 'gate-backstage-03', 'name': 'Backstage / Artist Entry'},
    {'id': 'gate-ga-north-04', 'name': 'General Admission North'},
  ];

  @override
  void initState() {
    super.initState();
    _fetchLiveEvents();
  }

  Future<void> _fetchLiveEvents() async {
    setState(() => _loadingEvents = true);
    const apiUrl = String.fromEnvironment(
      'API_URL',
      defaultValue: 'https://event-platform-api-r4og.onrender.com/api/v1',
    );

    try {
      final res = await http.get(
        Uri.parse('$apiUrl/public/events'),
        headers: {'Accept': 'application/json'},
      );

      if (res.statusCode == 200) {
        final body = jsonDecode(res.body);
        final list = body is Map && body.containsKey('data')
            ? (body['data'] is Map && body['data'].containsKey('items') ? body['data']['items'] as List : body['data'] as List)
            : (body is List ? body : []);

        final events = list.map((item) => item as Map<String, dynamic>).toList();

        if (mounted) {
          setState(() {
            _liveEvents = events;
            _loadingEvents = false;
            if (_liveEvents.isNotEmpty) {
              _selectEvent(_liveEvents.first);
            }
          });
        }
      } else {
        if (mounted) setState(() => _loadingEvents = false);
      }
    } catch (err) {
      if (mounted) {
        setState(() {
          _loadingEvents = false;
          _liveEvents = [];
          _error = 'Failed to load events: ${err.toString()}';
        });
      }
    }
  }

  void _selectEvent(Map<String, dynamic> event) {
    setState(() {
      _selectedEventId = event['id']?.toString() ?? '';
      _eventIdController.text = _selectedEventId!;
      _eventTitleController.text = event['title']?.toString() ?? 'Event';
    });
  }

  void _selectGate(Map<String, String> gate) {
    setState(() {
      _selectedGateId = gate['id'];
      _gateIdController.text = gate['id']!;
      _gateNameController.text = gate['name']!;
    });
  }

  Future<void> _handlePair() async {
    final eventId = _eventIdController.text.trim();
    final eventTitle = _eventTitleController.text.trim();
    final gateId = _gateIdController.text.trim();
    final gateName = _gateNameController.text.trim();

    if (eventId.isEmpty || gateId.isEmpty) {
      setState(() => _error = 'Please select or enter an Event and Gate.');
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
        _error = err ?? 'Pairing failed. Ensure device credentials are valid.';
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
      backgroundColor: ScannerColors.background,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: const Text(
          'Pair Scanner Device',
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Device Identity Card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: ScannerColors.card,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: ScannerColors.border),
              ),
              child: Row(
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: ScannerColors.electricPurpleSubtle,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(Icons.devices_other_rounded, color: ScannerColors.electricPurpleLight, size: 24),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Handheld Terminal Identity',
                          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'Device ID: ${scannerState.deviceId ?? 'Registering...'}',
                          style: const TextStyle(
                            color: ScannerColors.electricPurpleLight,
                            fontFamily: 'monospace',
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const Text(
                          'Crypto: ECDSA P-256 (Secure Hardware Keyring)',
                          style: TextStyle(color: ScannerColors.textMuted, fontSize: 10),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            if (_error != null) ...[
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: ScannerColors.dangerSubtle,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: ScannerColors.danger),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.error_outline_rounded, color: ScannerColors.danger, size: 18),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(_error!, style: const TextStyle(color: ScannerColors.dangerLight, fontSize: 12)),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
            ],

            // Section 1: Event Selection
            const Text(
              '1. SELECT ASSIGNED EVENT',
              style: TextStyle(
                color: ScannerColors.textMuted,
                fontSize: 11,
                fontWeight: FontWeight.bold,
                letterSpacing: 1,
              ),
            ),
            const SizedBox(height: 8),

            if (_loadingEvents)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 24),
                child: Center(
                  child: CircularProgressIndicator(color: ScannerColors.electricPurple, strokeWidth: 2.5),
                ),
              )
            else if (_liveEvents.isEmpty)
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: ScannerColors.card,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: ScannerColors.border),
                ),
                child: const Text(
                  'No live events found. Enter Event ID manually below.',
                  style: TextStyle(color: ScannerColors.textSecondary, fontSize: 13),
                ),
              )
            else
              ..._liveEvents.map((event) {
                final id = event['id']?.toString() ?? '';
                final isSelected = id == _selectedEventId;

                return GestureDetector(
                  onTap: () => _selectEvent(event),
                  child: Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: isSelected ? ScannerColors.cardHover : ScannerColors.card,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(
                        color: isSelected ? ScannerColors.electricPurple : ScannerColors.border,
                        width: isSelected ? 1.5 : 0.5,
                      ),
                    ),
                    child: Row(
                      children: [
                        Icon(
                          isSelected ? Icons.radio_button_checked_rounded : Icons.radio_button_off_rounded,
                          color: isSelected ? ScannerColors.electricPurpleLight : ScannerColors.textMuted,
                          size: 20,
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                event['title'] ?? event['name'] ?? 'Event',
                                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                              ),
                              if (event['venueName'] != null || event['city'] != null) ...[
                                const SizedBox(height: 2),
                                Text(
                                  '${event['venueName'] ?? ''} ${event['city'] != null ? '· ${event['city']}' : ''}',
                                  style: const TextStyle(color: ScannerColors.textSecondary, fontSize: 11),
                                ),
                              ],
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              }),

            const SizedBox(height: 18),

            // Section 2: Gate Selection
            const Text(
              '2. SELECT ENTRY GATE',
              style: TextStyle(
                color: ScannerColors.textMuted,
                fontSize: 11,
                fontWeight: FontWeight.bold,
                letterSpacing: 1,
              ),
            ),
            const SizedBox(height: 8),

            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: _defaultGates.map((gate) {
                final isSelected = gate['id'] == _selectedGateId;
                return ChoiceChip(
                  label: Text(gate['name']!),
                  selected: isSelected,
                  onSelected: (_) => _selectGate(gate),
                  selectedColor: ScannerColors.electricPurple,
                  backgroundColor: ScannerColors.card,
                  labelStyle: TextStyle(
                    color: isSelected ? Colors.white : ScannerColors.textSecondary,
                    fontSize: 12,
                    fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                  ),
                  side: BorderSide(
                    color: isSelected ? ScannerColors.electricPurple : ScannerColors.border,
                  ),
                );
              }).toList(),
            ),
            const SizedBox(height: 20),

            // Toggle Manual Entry
            GestureDetector(
              onTap: () => setState(() => _showManualEntry = !_showManualEntry),
              child: Row(
                children: [
                  Icon(
                    _showManualEntry ? Icons.keyboard_arrow_up_rounded : Icons.keyboard_arrow_down_rounded,
                    color: ScannerColors.electricPurpleLight,
                    size: 18,
                  ),
                  const SizedBox(width: 6),
                  Text(
                    _showManualEntry ? 'Hide Manual IDs' : 'Enter Custom Event / Gate ID manually',
                    style: const TextStyle(color: ScannerColors.electricPurpleLight, fontSize: 12, fontWeight: FontWeight.w600),
                  ),
                ],
              ),
            ),

            if (_showManualEntry) ...[
              const SizedBox(height: 12),
              TextField(
                controller: _eventIdController,
                style: const TextStyle(color: Colors.white, fontSize: 13),
                decoration: InputDecoration(
                  labelText: 'Custom Event ID',
                  labelStyle: const TextStyle(color: ScannerColors.textMuted),
                  filled: true,
                  fillColor: ScannerColors.card,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                ),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: _gateIdController,
                style: const TextStyle(color: Colors.white, fontSize: 13),
                decoration: InputDecoration(
                  labelText: 'Custom Gate ID',
                  labelStyle: const TextStyle(color: ScannerColors.textMuted),
                  filled: true,
                  fillColor: ScannerColors.card,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                ),
              ),
            ],

            const SizedBox(height: 28),

            // Activate Button
            ElevatedButton(
              onPressed: _pairing ? null : _handlePair,
              style: ElevatedButton.styleFrom(
                backgroundColor: ScannerColors.electricPurple,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                elevation: 4,
              ),
              child: _pairing
                  ? const SizedBox(
                      width: 22,
                      height: 22,
                      child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                    )
                  : const Text(
                      '🔒 Download Auth Keys & Activate Gate',
                      style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                    ),
            ),
          ],
        ),
      ),
    );
  }
}
