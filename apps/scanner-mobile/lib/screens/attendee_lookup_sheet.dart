// =============================================================================
// Scanner Mobile — Manual Attendee Lookup & Check-in Sheet
// Scoped to the paired event/gate with PII-minimized records and unified check-in.
// =============================================================================

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/scanner_provider.dart';
import '../services/scanner_api_service.dart';
import '../services/scanner_auth_service.dart';

class AttendeeLookupSheet extends ConsumerStatefulWidget {
  const AttendeeLookupSheet({super.key});

  @override
  ConsumerState<AttendeeLookupSheet> createState() => _AttendeeLookupSheetState();
}

class _AttendeeLookupSheetState extends ConsumerState<AttendeeLookupSheet> {
  final _searchController = TextEditingController();
  final _apiService = ScannerApiService();
  final _authService = BasicScannerAuthService();

  List<dynamic> _results = [];
  bool _searching = false;
  String? _error;
  String? _checkinMessage;

  Future<void> _handleSearch() async {
    final query = _searchController.text.trim();
    if (query.isEmpty) return;

    final scannerState = ref.read(scannerProvider);
    if (scannerState.eventId == null) return;

    setState(() {
      _searching = true;
      _error = null;
      _checkinMessage = null;
    });

    final authHeader = await _authService.getAuthorizationHeader();
    final token = authHeader?.replaceFirst('Bearer ', '') ?? '';

    try {
      final list = await _apiService.searchAttendees(
        eventId: scannerState.eventId!,
        query: query,
        authToken: token,
      );
      setState(() {
        _results = list;
        _searching = false;
      });
    } catch (err) {
      setState(() {
        _error = 'Failed to search attendees: $err';
        _searching = false;
      });
    }
  }

  Future<void> _handleManualCheckin(String ticketId) async {
    final scannerState = ref.read(scannerProvider);
    if (scannerState.eventId == null || scannerState.gateId == null || scannerState.deviceId == null) {
      return;
    }

    setState(() {
      _searching = true;
      _error = null;
    });

    final authHeader = await _authService.getAuthorizationHeader();
    final token = authHeader?.replaceFirst('Bearer ', '') ?? '';

    try {
      final res = await _apiService.manualCheckin(
        ticketId: ticketId,
        eventId: scannerState.eventId!,
        gateId: scannerState.gateId!,
        deviceId: scannerState.deviceId!,
        authToken: token,
      );

      final result = res['result'] as String? ?? 'success';
      if (result == 'success') {
        HapticFeedback.heavyImpact();
        setState(() {
          _checkinMessage = 'Attendee admitted successfully (Manual Check-in).';
          _searching = false;
        });
        await _handleSearch(); // Refresh list
      } else {
        HapticFeedback.vibrate();
        setState(() {
          _error = 'Manual check-in rejected: ${res['message'] ?? result}';
          _searching = false;
        });
      }
    } catch (err) {
      HapticFeedback.vibrate();
      setState(() {
        _error = 'Manual check-in failed: $err';
        _searching = false;
      });
    }
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final scannerState = ref.watch(scannerProvider);

    return Container(
      height: MediaQuery.of(context).size.height * 0.85,
      padding: const EdgeInsets.all(20),
      decoration: const BoxDecoration(
        color: Color(0xFF0F172A),
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Drag handle
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey.shade700,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 16),

          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Manual Attendee Lookup',
                style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
              ),
              IconButton(
                icon: const Icon(Icons.close, color: Colors.grey),
                onPressed: () => Navigator.of(context).pop(),
              ),
            ],
          ),
          Text(
            'Scoped to ${scannerState.eventTitle ?? 'Assigned Event'}',
            style: const TextStyle(color: Color(0xFFA78BFA), fontSize: 12),
          ),
          const SizedBox(height: 16),

          // Search Input Field
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _searchController,
                  onSubmitted: (_) => _handleSearch(),
                  style: const TextStyle(color: Colors.white, fontSize: 14),
                  decoration: InputDecoration(
                    hintText: 'Search name, email, or ticket #...',
                    hintStyle: TextStyle(color: Colors.grey.shade500, fontSize: 13),
                    filled: true,
                    fillColor: const Color(0xFF1E293B),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              ElevatedButton(
                onPressed: _searching ? null : _handleSearch,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF7C3AED),
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                child: _searching
                    ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                    : const Icon(Icons.search, color: Colors.white),
              ),
            ],
          ),
          const SizedBox(height: 12),

          if (_error != null)
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(color: const Color(0xFF7F1D1D), borderRadius: BorderRadius.circular(8)),
              child: Text(_error!, style: const TextStyle(color: Colors.redAccent, fontSize: 12)),
            ),

          if (_checkinMessage != null)
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(color: const Color(0xFF064E3B), borderRadius: BorderRadius.circular(8)),
              child: Text(_checkinMessage!, style: const TextStyle(color: Color(0xFF34D399), fontSize: 12, fontWeight: FontWeight.bold)),
            ),

          const SizedBox(height: 8),

          // Search Results List
          Expanded(
            child: _results.isEmpty
                ? Center(
                    child: Text(
                      _searchController.text.isEmpty ? 'Enter search query above.' : 'No attendees found.',
                      style: TextStyle(color: Colors.grey.shade500, fontSize: 13),
                    ),
                  )
                : ListView.builder(
                    itemCount: _results.length,
                    itemBuilder: (context, index) {
                      final item = _results[index];
                      final ticketId = item['ticketId'] ?? item['id'] ?? '';
                      final attendeeName = item['purchaserName'] ?? item['name'] ?? 'Attendee';
                      final ticketNum = item['ticketNumber'] ?? ticketId;
                      final status = item['status'] ?? 'issued';
                      final isCheckedIn = status == 'checked_in';

                      return Container(
                        margin: const EdgeInsets.only(bottom: 10),
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: const Color(0xFF1E293B),
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: Colors.grey.shade800),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(attendeeName, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14)),
                                const SizedBox(height: 2),
                                Text(ticketNum, style: const TextStyle(color: Color(0xFFA78BFA), fontFamily: 'monospace', fontSize: 11)),
                                const SizedBox(height: 4),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: isCheckedIn ? const Color(0xFF7F1D1D) : const Color(0xFF064E3B),
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: Text(
                                    isCheckedIn ? 'ALREADY CHECKED IN' : status.toUpperCase(),
                                    style: TextStyle(
                                      color: isCheckedIn ? Colors.redAccent : const Color(0xFF34D399),
                                      fontSize: 9,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            if (!isCheckedIn)
                              ElevatedButton(
                                onPressed: () => _handleManualCheckin(ticketId),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: const Color(0xFF059669),
                                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                ),
                                child: const Text('Check In', style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
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
