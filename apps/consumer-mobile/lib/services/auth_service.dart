import 'package:supabase_flutter/supabase_flutter.dart';

/// Result of an authentication operation.
class AuthResult {
  final User? user;
  final Session? session;
  final String? error;

  const AuthResult({this.user, this.session, this.error});

  bool get isSuccess => error == null && user != null;
}

/// AuthService — handles all authentication for the consumer mobile app.
///
/// Supports:
///   - Email/password sign in and sign up
///   - Google OAuth (via Supabase)
///   - Apple Sign In (via Supabase OAuth provider)
///
/// After a successful sign in, callers must call POST /api/v1/auth/sync
/// via ApiService to create/update the application user record.
class AuthService {
  final SupabaseClient _supabase;

  AuthService({SupabaseClient? client})
      : _supabase = client ?? Supabase.instance.client;

  // ---------------------------------------------------------------------------
  // Email / Password
  // ---------------------------------------------------------------------------

  /// Sign in with email and password.
  Future<AuthResult> signInWithEmail(String email, String password) async {
    try {
      final response = await _supabase.auth.signInWithPassword(
        email: email,
        password: password,
      );
      return AuthResult(user: response.user, session: response.session);
    } on AuthException catch (e) {
      return AuthResult(error: e.message);
    } catch (e) {
      return AuthResult(error: 'Authentication failed. Please try again.');
    }
  }

  /// Sign up with email and password.
  Future<AuthResult> signUpWithEmail(
    String email,
    String password, {
    String? name,
  }) async {
    try {
      final response = await _supabase.auth.signUp(
        email: email,
        password: password,
        data: name != null ? {'name': name} : null,
      );
      return AuthResult(user: response.user, session: response.session);
    } on AuthException catch (e) {
      return AuthResult(error: e.message);
    } catch (e) {
      return AuthResult(error: 'Sign up failed. Please try again.');
    }
  }

  // ---------------------------------------------------------------------------
  // OAuth — Google
  // ---------------------------------------------------------------------------

  /// Sign in with Google via Supabase OAuth.
  /// Opens the Google OAuth flow in a browser view.
  Future<void> signInWithGoogle() async {
    await _supabase.auth.signInWithOAuth(
      OAuthProvider.google,
      redirectTo: 'io.eventhub.consumer://auth/callback',
    );
  }

  // ---------------------------------------------------------------------------
  // OAuth — Apple Sign In
  // ---------------------------------------------------------------------------

  /// Sign in with Apple via Supabase OAuth.
  ///
  /// Requirements (configured at build/infrastructure level):
  ///   - Apple Developer account with Sign In with Apple capability
  ///   - App ID with Sign In with Apple entitlement
  ///   - Service ID configured in Supabase Dashboard → Auth → Providers → Apple
  ///   - Private key (.p8) uploaded to Supabase
  ///
  /// The abstraction is complete. Apple-specific entitlements and certificates
  /// are configured at build time, not in this service.
  Future<void> signInWithApple() async {
    await _supabase.auth.signInWithOAuth(
      OAuthProvider.apple,
      redirectTo: 'io.eventhub.consumer://auth/callback',
    );
  }

  // ---------------------------------------------------------------------------
  // Session management
  // ---------------------------------------------------------------------------

  /// Sign out the current user.
  Future<void> signOut() async {
    await _supabase.auth.signOut();
  }

  /// Get the current authenticated session.
  Session? get currentSession => _supabase.auth.currentSession;

  /// Get the current authenticated user.
  User? get currentUser => _supabase.auth.currentUser;

  /// Check if a user is currently authenticated.
  bool get isAuthenticated => currentSession != null;

  /// Stream of auth state changes.
  Stream<AuthState> get authStateStream => _supabase.auth.onAuthStateChange;

  /// Get the authorization header for API calls.
  /// Returns 'Bearer [token]' or null if not authenticated.
  Future<String?> getAuthorizationHeader() async {
    final session = currentSession;
    if (session == null) return null;

    // Refresh the session if the token is close to expiry
    if (_isTokenExpiringSoon(session)) {
      try {
        final refreshed = await _supabase.auth.refreshSession();
        if (refreshed.session != null) {
          return 'Bearer ${refreshed.session!.accessToken}';
        }
      } catch (_) {
        return null;
      }
    }

    return 'Bearer ${session.accessToken}';
  }

  bool _isTokenExpiringSoon(Session session) {
    final expiresAt = session.expiresAt;
    if (expiresAt == null) return false;
    final expiryTime = DateTime.fromMillisecondsSinceEpoch(expiresAt * 1000);
    return DateTime.now().isAfter(expiryTime.subtract(const Duration(minutes: 5)));
  }
}
