// =============================================================================
// Consumer Mobile — GoRouter App Router
// Enforces protected route redirects and integrates 5-tab AppShell.
// Public: / (home), /search, /saved, /event/:slug, /login, /register, /forgot-password, /onboarding
// Protected: /checkout, /confirmation/:id, /tickets, /tickets/:id, /orders, /orders/:id, /profile, /notifications
// =============================================================================

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../providers/auth_provider.dart';
import '../providers/onboarding_provider.dart';
import '../screens/auth/login_screen.dart';
import '../screens/auth/register_screen.dart';
import '../screens/auth/forgot_password_screen.dart';
import '../screens/onboarding/onboarding_screen.dart';
import '../screens/shell/app_shell.dart';
import '../screens/events/event_detail_screen.dart';

import '../screens/checkout/checkout_screen.dart';
import '../screens/checkout/order_confirmation_screen.dart';
import '../screens/tickets/ticket_detail_screen.dart';
import '../screens/orders/orders_screen.dart';
import '../screens/orders/order_detail_screen.dart';
import '../screens/notifications/notifications_screen.dart';

final appRouterProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authNotifierProvider);
  final onboardingState = ref.watch(onboardingCompletedProvider);

  return GoRouter(
    initialLocation: '/',
    routes: [
      // ── Main Shell with 5 Tabs ──────────────────────────────────────────
      GoRoute(
        path: '/',
        builder: (context, state) => const AppShell(initialIndex: 0),
      ),
      GoRoute(
        path: '/search',
        builder: (context, state) => const AppShell(initialIndex: 1),
      ),
      GoRoute(
        path: '/tickets',
        builder: (context, state) => const AppShell(initialIndex: 2),
      ),
      GoRoute(
        path: '/saved',
        builder: (context, state) => const AppShell(initialIndex: 3),
      ),
      GoRoute(
        path: '/profile',
        builder: (context, state) => const AppShell(initialIndex: 4),
      ),

      // ── Full-Screen Routes ──────────────────────────────────────────────


      GoRoute(
        path: '/onboarding',
        builder: (context, state) => const OnboardingScreen(),
      ),
      GoRoute(
        path: '/event/:slug',
        builder: (context, state) => EventDetailScreen(
          slug: state.pathParameters['slug'] ?? '',
          extra: state.extra as Map<String, dynamic>?,
        ),
      ),
      GoRoute(
        path: '/login',
        builder: (context, state) {
          final redirectTo = state.uri.queryParameters['redirectTo'];
          return LoginScreen(redirectTo: redirectTo);
        },
      ),
      GoRoute(
        path: '/register',
        builder: (context, state) => const RegisterScreen(),
      ),
      GoRoute(
        path: '/forgot-password',
        builder: (context, state) => const ForgotPasswordScreen(),
      ),
      GoRoute(
        path: '/notifications',
        builder: (context, state) => const NotificationsScreen(),
      ),
      GoRoute(
        path: '/checkout',
        builder: (context, state) => const CheckoutScreen(),
      ),
      GoRoute(
        path: '/confirmation/:id',
        builder: (context, state) => OrderConfirmationScreen(
          orderId: state.pathParameters['id'] ?? '',
          isPending: state.uri.queryParameters['pending'] == 'true',
        ),
      ),
      GoRoute(
        path: '/tickets/:id',
        builder: (context, state) => TicketDetailScreen(
          ticketId: state.pathParameters['id'] ?? '',
        ),
      ),
      GoRoute(
        path: '/orders',
        builder: (context, state) => const OrdersScreen(),
        routes: [
          GoRoute(
            path: ':id',
            builder: (context, state) => OrderDetailScreen(
              orderId: state.pathParameters['id'] ?? '',
            ),
          ),
        ],
      ),
    ],
    redirect: (BuildContext context, GoRouterState state) {
      final location = state.uri.path;

      // ── Auth/onboarding screen checks ───────────────────────────────────
      final isAuthScreen = location == '/login' || location == '/register' || location == '/forgot-password';
      final isOnboarding = location == '/onboarding';

      // ── Protected routes — require authentication ───────────────────────
      const protectedRoutes = {'/checkout', '/tickets', '/notifications', '/orders', '/profile', '/confirmation'};
      final isProtectedRoute = protectedRoutes.any((r) => location.startsWith(r));

      // ── 1. Auth is still loading (initial state) — don't redirect yet ──
      if (authState.status == AuthStatus.initial) {
        // Only redirect to onboarding if needed, otherwise hold
        return isOnboarding ? null : null; // Wait for auth resolution
      }

      final isAuth = authState.isAuthenticated;

      // ── 2. Onboarding state (3 values: loading=null, true, false) ───────
      if (!isAuth && !isAuthScreen) {
        // Only redirect to onboarding when we KNOW it hasn't been completed
        // (value == false). If still loading (null), do NOT redirect.
        final onboardingValue = onboardingState.value;
        if (onboardingValue == false) {
          return isOnboarding ? null : '/onboarding';
        }
        // onboardingValue == true → onboarding done, show login for protected routes
        // onboardingValue == null → still loading, don't redirect
        if (onboardingValue == true && isProtectedRoute) {
          final redirectTo = (location != '/' && !location.startsWith('/login'))
              ? '?redirectTo=${Uri.encodeComponent(location)}'
              : '';
          return '/login$redirectTo';
        }
      }

      // ── 3. Authenticated users redirect away from auth/onboarding screens ──
      if (isAuth && (isAuthScreen || isOnboarding)) {
        return '/';
      }

      // ── 4. Protected routes require authentication ──────────────────────
      if (!isAuth && isProtectedRoute) {
        final redirectTo = '?redirectTo=${Uri.encodeComponent(location)}';
        return '/login$redirectTo';
      }

      return null;
    },
  );
});
