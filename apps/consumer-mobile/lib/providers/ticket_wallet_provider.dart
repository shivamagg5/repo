// =============================================================================
// consumer-mobile — Ticket Wallet Provider
// Secure Encrypted-at-Rest Offline Ticket Storage & Wallet State
// =============================================================================

import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../models/ticket_model.dart';
import '../services/api_service.dart';
import 'auth_provider.dart';

class TicketWalletState {
  final List<TicketModel> tickets;
  final bool isLoading;
  final bool isOffline;
  final String? errorMessage;

  const TicketWalletState({
    this.tickets = const [],
    this.isLoading = false,
    this.isOffline = false,
    this.errorMessage,
  });

  TicketWalletState copyWith({
    List<TicketModel>? tickets,
    bool? isLoading,
    bool? isOffline,
    String? errorMessage,
    bool clearError = false,
  }) {
    return TicketWalletState(
      tickets: tickets ?? this.tickets,
      isLoading: isLoading ?? this.isLoading,
      isOffline: isOffline ?? this.isOffline,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
    );
  }

  List<TicketModel> get upcomingTickets =>
      tickets.where((t) => t.status == 'issued').toList();

  List<TicketModel> get pastTickets =>
      tickets.where((t) => t.status != 'issued').toList();
}

class TicketWalletNotifier extends StateNotifier<TicketWalletState> {
  final ApiService _apiService;
  final FlutterSecureStorage _secureStorage = const FlutterSecureStorage();
  static const String _storageKey = 'cached_consumer_tickets_v1';

  TicketWalletNotifier(this._apiService) : super(const TicketWalletState()) {
    loadTickets();
  }

  /// Load tickets from server with fallback to encrypted local cache
  Future<void> loadTickets({bool forceRefresh = false}) async {
    state = state.copyWith(isLoading: true, clearError: true);

    try {
      final remoteTickets = await _apiService.getUserTickets();

      // Cache securely at rest (encrypted storage)
      await _cacheTicketsSecurely(remoteTickets);

      state = state.copyWith(
        tickets: remoteTickets,
        isLoading: false,
        isOffline: false,
      );
    } catch (e) {
      // Offline fallback: load from secure storage
      final cached = await _loadCachedTickets();
      if (cached.isNotEmpty) {
        state = state.copyWith(
          tickets: cached,
          isLoading: false,
          isOffline: true,
          errorMessage: 'Showing cached tickets (Offline mode). Live status requires connection.',
        );
      } else {
        state = state.copyWith(
          isLoading: false,
          errorMessage: e is ApiException ? e.message : 'Failed to load tickets.',
        );
      }
    }
  }

  /// Save encrypted JSON array in secure storage
  Future<void> _cacheTicketsSecurely(List<TicketModel> tickets) async {
    try {
      final jsonList = tickets.map((t) => t.toJson()).toList();
      await _secureStorage.write(
        key: _storageKey,
        value: jsonEncode(jsonList),
      );
    } catch (_) {
      // Secure storage write failure is non-fatal
    }
  }

  /// Read and parse cached tickets from secure storage
  Future<List<TicketModel>> _loadCachedTickets() async {
    try {
      final raw = await _secureStorage.read(key: _storageKey);
      if (raw == null || raw.isEmpty) return [];
      final list = jsonDecode(raw) as List<dynamic>;
      return list.map((item) => TicketModel.fromJson(item as Map<String, dynamic>)).toList();
    } catch (_) {
      return [];
    }
  }
}

final ticketWalletProvider = StateNotifierProvider<TicketWalletNotifier, TicketWalletState>((ref) {
  final apiService = ref.watch(apiServiceProvider);
  return TicketWalletNotifier(apiService);
});
