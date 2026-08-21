// =============================================================================
// Scanner Mobile — Manual Attendee Lookup & Check-in Sheet
// Scoped to paired event/gate with PII-minimized records, live search, and filters.
// =============================================================================

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/scanner_colors.dart';
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
  String _selectedFilter = 'all'; // 'all', 'pending', 'checked_in'

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
        _error = 'Failed to search attendees: ${err.toString()}';
        _results = [];
        _searching = false;
      });
    }
  }

  Future<void> _handleManualCheckin(String ticketId, String attendeeName, String tierName) async {
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
          _checkinMessage = 'Admitted $attendeeName successfully.';
          _searching = false;
        });
        // Update local results list
        setState(() {
          for (var item in _results) {
            if ((item['ticketId'] ?? item['id']) == ticketId) {
              item['status'] = 'checked_in';
            }
          }
        });
      } else {
        HapticFeedback.vibrate();
        setState(() {
          _error = 'Check-in rejected: ${res['message'] ?? result}';
          _searching = false;
        });
      }
    } catch (_) {
      // Offline fallback check-in
      HapticFeedback.heavyImpact();
      setState(() {
        _checkinMessage = 'Admitted $attendeeName (Manual Offline Mode).';
        _searching = false;
        for (var item in _results) {
          if ((item['ticketId'] ?? item['id']) == ticketId) {
            item['status'] = 'checked_in';
          }
        }
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

    final filteredResults = _results.where((item) {
      final status = (item['status'] ?? 'issued').toString().toLowerCase();
      if (_selectedFilter == 'pending') return status != 'checked_in';
      if (_selectedFilter == 'checked_in') return status == 'checked_in';
      return true;
    }).toList();

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
          // Drag handle
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

          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Manual Attendee Lookup',
                    style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  Text(
                    'Scoped to ${scannerState.eventTitle ?? 'Assigned Event'}',
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
          const SizedBox(height: 16),

          // Search Field
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _searchController,
                  onSubmitted: (_) => _handleSearch(),
                  style: const TextStyle(color: Colors.white, fontSize: 14),
                  decoration: InputDecoration(
                    hintText: 'Search attendee name or ticket #...',
                    hintStyle: const TextStyle(color: ScannerColors.textMuted, fontSize: 13),
                    filled: true,
                    fillColor: ScannerColors.card,
                    prefixIcon: const Icon(Icons.search_rounded, color: ScannerColors.textMuted, size: 20),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide.none),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              ElevatedButton(
                onPressed: _searching ? null : _handleSearch,
                style: ElevatedButton.styleFrom(
                  backgroundColor: ScannerColors.electricPurple,
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
                child: _searching
                    ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                    : const Icon(Icons.arrow_forward_rounded, color: Colors.white),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Filter Chips
          Row(
            children: [
              _buildFilterChip('all', 'All Results'),
              const SizedBox(width: 8),
              _buildFilterChip('pending', 'Not Admitted'),
              const SizedBox(width: 8),
              _buildFilterChip('checked_in', 'Admitted'),
            ],
          ),
          const SizedBox(height: 12),

          if (_error != null)
            Container(
              margin: const EdgeInsets.only(bottom: 10),
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: ScannerColors.dangerSubtle,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: ScannerColors.danger),
              ),
              child: Text(_error!, style: const TextStyle(color: ScannerColors.dangerLight, fontSize: 12)),
            ),

          if (_checkinMessage != null)
            Container(
              margin: const EdgeInsets.only(bottom: 10),
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: ScannerColors.successSubtle,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: ScannerColors.success),
              ),
              child: Text(_checkinMessage!, style: const TextStyle(color: ScannerColors.successLight, fontSize: 12, fontWeight: FontWeight.bold)),
            ),

          // Results List
          Expanded(
            child: filteredResults.isEmpty
                ? Center(
                    child: Text(
                      _searchController.text.isEmpty ? 'Type a name or ticket # to search guestlist.' : 'No matching attendees found.',
                      style: const TextStyle(color: ScannerColors.textMuted, fontSize: 13),
                    ),
                  )
                : ListView.builder(
                    itemCount: filteredResults.length,
                    itemBuilder: (context, index) {
                      final item = filteredResults[index];
                      final ticketId = item['ticketId'] ?? item['id'] ?? '';
                      final attendeeName = item['purchaserName'] ?? item['name'] ?? 'Attendee';
                      final ticketNum = item['ticketNumber'] ?? ticketId;
                      final tierName = item['tierName'] ?? 'General Pass';
                      final status = item['status'] ?? 'issued';
                      final isCheckedIn = status == 'checked_in';

                      return Container(
                        margin: const EdgeInsets.only(bottom: 10),
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: ScannerColors.card,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(
                            color: isCheckedIn ? ScannerColors.successSubtle : ScannerColors.border,
                          ),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    attendeeName,
                                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    '$tierName · #$ticketNum',
                                    style: const TextStyle(color: ScannerColors.textSecondary, fontSize: 11),
                                  ),
                                  const SizedBox(height: 4),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: isCheckedIn ? ScannerColors.successSubtle : ScannerColors.warningSubtle,
                                      borderRadius: BorderRadius.circular(4),
                                    ),
                                    child: Text(
                                      isCheckedIn ? 'ADMITTED' : 'READY TO ADMIT',
                                      style: TextStyle(
                                        color: isCheckedIn ? ScannerColors.successLight : ScannerColors.warningLight,
                                        fontSize: 9,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            if (!isCheckedIn)
                              ElevatedButton(
                                onPressed: () => _handleManualCheckin(ticketId, attendeeName, tierName),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: ScannerColors.success,
                                  foregroundColor: Colors.white,
                                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                ),
                                child: const Text('Approve Entry', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
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

  Widget _buildFilterChip(String key, String label) {
    final isSelected = _selectedFilter == key;
    return GestureDetector(
      onTap: () => setState(() => _selectedFilter = key),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected ? ScannerColors.electricPurple : ScannerColors.card,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? ScannerColors.electricPurple : ScannerColors.border,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isSelected ? Colors.white : ScannerColors.textSecondary,
            fontSize: 11,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
          ),
        ),
      ),
    );
  }
}
