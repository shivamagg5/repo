// =============================================================================
// Consumer Mobile — Riverpod Auth Provider & Notifier
// =============================================================================

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/user_profile.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';

enum AuthStatus { initial, loading, authenticated, unauthenticated }

class AuthState {
  final AuthStatus status;
  final User? user;
  final UserProfile? profile;
  final String? error;

  const AuthState({
    this.status = AuthStatus.initial,
    this.user,
    this.profile,
    this.error,
  });

  bool get isAuthenticated => status == AuthStatus.authenticated && user != null;
  bool get isLoading => status == AuthStatus.loading;

  AuthState copyWith({
    AuthStatus? status,
    User? user,
    UserProfile? profile,
    String? error,
    bool clearError = false,
  }) {
    return AuthState(
      status: status ?? this.status,
      user: user ?? this.user,
      profile: profile ?? this.profile,
      error: clearError ? null : (error ?? this.error),
    );
  }
}

final authServiceProvider = Provider<AuthService>((ref) {
  return AuthService();
});

final apiServiceProvider = Provider<ApiService>((ref) {
  final authService = ref.watch(authServiceProvider);
  const baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://event-platform-api-r4og.onrender.com/api/v1',
  );
  return ApiService(baseUrl: baseUrl, authService: authService);
});

class AuthNotifier extends StateNotifier<AuthState> {
  final AuthService _authService;
  final ApiService _apiService;

  AuthNotifier({
    required AuthService authService,
    required ApiService apiService,
  })  : _authService = authService,
        _apiService = apiService,
        super(const AuthState()) {
    _init();
  }

  void _init() {
    final currentSession = _authService.currentSession;
    if (currentSession != null) {
      state = state.copyWith(
        status: AuthStatus.authenticated,
        user: currentSession.user,
      );
      _syncAndHydrate(currentSession.user);
    } else {
      state = state.copyWith(status: AuthStatus.unauthenticated);
    }

    _authService.authStateStream.listen((data) {
      final session = data.session;
      if (session != null) {
        state = state.copyWith(
          status: AuthStatus.authenticated,
          user: session.user,
          clearError: true,
        );
        _syncAndHydrate(session.user);
      } else {
        state = const AuthState(status: AuthStatus.unauthenticated);
      }
    });
  }

  Future<void> _syncAndHydrate(User user) async {
    try {
      final name = user.userMetadata?['name'] as String?;
      // Step 1: POST /api/v1/auth/sync (idempotent)
      try {
        await _apiService.post<Map<String, dynamic>>(
          '/auth/sync',
          {'name': name},
          (json) => json,
        );
      } catch (_) {
        // Non-blocking
      }

      // Step 2: GET /api/v1/auth/me
      final profile = await _apiService.get<UserProfile>(
        '/auth/me',
        (json) => UserProfile.fromJson(json),
      );

      state = state.copyWith(profile: profile);
    } catch (_) {
      // Fallback: minimal profile from Supabase user
      state = state.copyWith(
        profile: UserProfile(
          id: user.id,
          email: user.email,
          name: (user.userMetadata?['name'] as String?) ?? user.email?.split('@').first ?? 'User',
          status: 'active',
          createdAt: DateTime.now().toIso8601String(),
        ),
      );
    }
  }

  Future<bool> signInWithEmail(String email, String password) async {
    state = state.copyWith(status: AuthStatus.loading, clearError: true);
    final result = await _authService.signInWithEmail(email, password);
    if (result.isSuccess) {
      state = state.copyWith(
        status: AuthStatus.authenticated,
        user: result.user,
      );
      await _syncAndHydrate(result.user!);
      return true;
    } else {
      state = state.copyWith(
        status: AuthStatus.unauthenticated,
        error: result.error ?? 'Invalid email or password.',
      );
      return false;
    }
  }

  Future<bool> signUpWithEmail(String email, String password, String name) async {
    state = state.copyWith(status: AuthStatus.loading, clearError: true);
    final result = await _authService.signUpWithEmail(email, password, name: name);
    if (result.isSuccess) {
      state = state.copyWith(
        status: AuthStatus.authenticated,
        user: result.user,
      );
      await _syncAndHydrate(result.user!);
      return true;
    } else {
      state = state.copyWith(
        status: AuthStatus.unauthenticated,
        error: result.error ?? 'Sign up failed.',
      );
      return false;
    }
  }

  Future<void> signInWithGoogle() async {
    await _authService.signInWithGoogle();
  }

  Future<void> signInWithApple() async {
    await _authService.signInWithApple();
  }

  Future<void> signOut() async {
    try {
      // Notify backend audit log
      try {
        await _apiService.post<Map<String, dynamic>>(
          '/auth/logout',
          null,
          (json) => json,
        );
      } catch (_) {}
      await _authService.signOut();
    } finally {
      state = const AuthState(status: AuthStatus.unauthenticated);
    }
  }
}

final authNotifierProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  final authService = ref.watch(authServiceProvider);
  final apiService = ref.watch(apiServiceProvider);
  return AuthNotifier(authService: authService, apiService: apiService);
});
