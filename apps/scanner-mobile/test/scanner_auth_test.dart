import 'package:flutter_test/flutter_test.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:scanner_mobile/services/scanner_auth_service.dart';

void main() {
  group('Scanner Mobile Auth & Service Tests', () {
    test('FakeScannerAuthService tracks authentication state transitions', () async {
      final fakeAuth = _MockScannerAuthService();
      expect(fakeAuth.isAuthenticated, false);

      final loggedIn = await fakeAuth.signIn('staff@event.com', 'password123');
      expect(loggedIn, true);
      expect(fakeAuth.isAuthenticated, true);

      final token = await fakeAuth.getAuthorizationHeader();
      expect(token, 'Bearer fake-access-token');

      await fakeAuth.signOut();
      expect(fakeAuth.isAuthenticated, false);
      expect(await fakeAuth.getAuthorizationHeader(), null);
    });

    test('Scanner device credential remains isolated from user session', () async {
      final fakeAuth = _MockScannerAuthService();
      expect(await fakeAuth.getDeviceCredential(), null);
    });
  });
}

class _MockScannerAuthService implements ScannerAuthService {
  bool _authenticated = false;

  @override
  bool get isAuthenticated => _authenticated;

  @override
  Session? get currentSession => null;

  @override
  Future<bool> signIn(String email, String password) async {
    if (email.isNotEmpty && password.isNotEmpty) {
      _authenticated = true;
      return true;
    }
    return false;
  }

  @override
  Future<void> signOut() async {
    _authenticated = false;
  }

  @override
  Future<String?> getAuthorizationHeader() async {
    return _authenticated ? 'Bearer fake-access-token' : null;
  }

  @override
  Future<String?> getDeviceCredential() async => null;

  @override
  Future<void> persistSession() async {}

  @override
  Future<void> restoreSession() async {}
}
