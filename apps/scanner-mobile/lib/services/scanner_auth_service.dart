import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

// =============================================================================
// ScannerAuthService — Abstract Interface
//
// This interface is designed to accommodate device-scoped credentials in
// Task 7.x without rewriting the scanner app architecture.
//
// Future evolution (Task 7.x):
//   BasicScannerAuthService  →  DeviceScopedScannerAuthService
//   (standard Supabase session) (device-registered, event-scoped, short-lived token)
//
// ADR-15: Scanner Auth Abstraction
//   The eventual security model requires:
//     Scanner User → Registered Device → Device-scoped Credentials
//     → Event/Gate Assignment → Short-lived Authorization
//     → Encrypted Offline Data
//   Task 1.1 creates the interface and a basic implementation only.
//   The [getDeviceCredential] method returns null until Task 7.x.
// =============================================================================

abstract class ScannerAuthService {
  /// Sign in with email and password.
  Future<bool> signIn(String email, String password);

  /// Sign out — clear session and any stored credentials.
  Future<void> signOut();

  /// Get the current Supabase session.
  Session? get currentSession;

  /// Get the authorization header for API calls.
  Future<String?> getAuthorizationHeader();

  /// Persist the current session to secure storage.
  /// Task 1.1: stores Supabase refresh token.
  /// Task 7.x: will be replaced with device-scoped credential storage.
  Future<void> persistSession();

  /// Restore session from secure storage on app launch.
  Future<void> restoreSession();

  /// Get a device-scoped credential for offline authorization.
  ///
  /// Returns null in Task 1.1 (not yet implemented).
  /// Task 7.x will return an encrypted, event-scoped, short-lived credential.
  ///
  /// IMPORTANT: This method existing in the interface ensures that no
  /// architectural rewrite is required when Task 7.x is implemented —
  /// only this method's implementation changes.
  Future<String?> getDeviceCredential();

  /// Whether the user is currently authenticated.
  bool get isAuthenticated;
}

// =============================================================================
// BasicScannerAuthService — Task 1.1 Implementation
//
// DOCUMENTED LIMITATION:
// This uses a standard Supabase refresh token stored in secure storage.
// This is NOT the final offline security model.
// Task 7.x will replace this with device-scoped, event-scoped credentials.
// =============================================================================
class BasicScannerAuthService implements ScannerAuthService {
  final SupabaseClient _supabase;
  final FlutterSecureStorage _storage;

  static const _sessionKey = 'scanner_session_refresh_token';

  BasicScannerAuthService({
    SupabaseClient? client,
    FlutterSecureStorage? storage,
  })  : _supabase = client ?? Supabase.instance.client,
        _storage = storage ?? const FlutterSecureStorage();

  @override
  Future<bool> signIn(String email, String password) async {
    try {
      final response = await _supabase.auth.signInWithPassword(
        email: email,
        password: password,
      );
      if (response.session != null) {
        await persistSession();
        return true;
      }
      return false;
    } catch (_) {
      return false;
    }
  }

  @override
  Future<void> signOut() async {
    await _supabase.auth.signOut();
    await _storage.delete(key: _sessionKey);
  }

  @override
  Session? get currentSession => _supabase.auth.currentSession;

  @override
  bool get isAuthenticated => currentSession != null;

  @override
  Future<String?> getAuthorizationHeader() async {
    final session = currentSession;
    if (session == null) return null;

    // Refresh if close to expiry
    if (_isExpiringSoon(session)) {
      try {
        final refreshed = await _supabase.auth.refreshSession();
        if (refreshed.session != null) {
          return 'Bearer ${refreshed.session!.accessToken}';
        }
        return null;
      } catch (_) {
        return null;
      }
    }
    return 'Bearer ${session.accessToken}';
  }

  @override
  Future<void> persistSession() async {
    final token = currentSession?.refreshToken;
    if (token != null) {
      // DOCUMENTED: Standard refresh token storage.
      // Task 7.x replaces this with encrypted device-scoped credential.
      await _storage.write(key: _sessionKey, value: token);
    }
  }

  @override
  Future<void> restoreSession() async {
    final refreshToken = await _storage.read(key: _sessionKey);
    if (refreshToken != null) {
      try {
        await _supabase.auth.setSession(refreshToken);
      } catch (_) {
        // Session invalid — clear storage, user must sign in again
        await _storage.delete(key: _sessionKey);
      }
    }
  }

  @override
  Future<String?> getDeviceCredential() async {
    // Task 1.1: Not implemented — returns null.
    // Task 7.x: Returns device-scoped, event-scoped, encrypted credential.
    return null;
  }

  bool _isExpiringSoon(Session session) {
    final expiresAt = session.expiresAt;
    if (expiresAt == null) return false;
    final expiryTime = DateTime.fromMillisecondsSinceEpoch(expiresAt * 1000);
    return DateTime.now().isAfter(expiryTime.subtract(const Duration(minutes: 5)));
  }
}
