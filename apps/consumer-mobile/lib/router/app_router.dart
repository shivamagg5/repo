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
      final isAuth = authState.isAuthenticated;
      final location = state.uri.path;
      final isAuthScreen = location == '/login' ||
          location == '/register' ||
          location == '/forgot-password';
      final isOnboarding = location == '/onboarding';

      // 1. If user is NOT authenticated
      if (!isAuth) {
        final hasCompletedOnboarding = onboardingState.value ?? false;

        // If user has not completed onboarding, force onboarding screen
        if (!hasCompletedOnboarding) {
          return isOnboarding ? null : '/onboarding';
        }

        // If onboarding is completed, user MUST be on /login, /register, or /forgot-password
        if (!isAuthScreen) {
          final redirectTo = (location != '/' && !location.startsWith('/login') && !location.startsWith('/onboarding'))
              ? '?redirectTo=${Uri.encodeComponent(location)}'
              : '';
          return '/login$redirectTo';
        }

        return null;
      }

      // 2. If user IS authenticated, redirect away from auth & onboarding screens to home
      if (isAuth && (isAuthScreen || isOnboarding)) {
        return '/';
      }

      return null;
    },
  );
});
