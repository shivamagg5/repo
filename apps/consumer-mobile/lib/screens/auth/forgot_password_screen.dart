// =============================================================================
// Consumer Mobile — Forgot Password Screen
// Password recovery via Supabase Auth resetPasswordForEmail.
// =============================================================================

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../theme/app_colors.dart';
import '../../widgets/lime_button.dart';

class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  bool _isLoading = false;
  bool _isSent = false;
  String? _errorMessage;

  @override
  void dispose() {
    _emailController.dispose();
    super.dispose();
  }

  Future<void> _handleReset() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      await Supabase.instance.client.auth.resetPasswordForEmail(
        _emailController.text.trim(),
      );
      setState(() {
        _isSent = true;
        _isLoading = false;
      });
    } on AuthException catch (e) {
      setState(() {
        _errorMessage = e.message;
        _isLoading = false;
      });
    } catch (_) {
      setState(() {
        _errorMessage = 'Could not send recovery email. Please try again.';
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: AppColors.textPrimary),
          onPressed: () => context.pop(),
        ),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 16.0),
          child: _isSent ? _buildSuccessView() : _buildFormView(),
        ),
      ),
    );
  }

  Widget _buildFormView() {
    return Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SizedBox(height: 20),
          Text(
            'Reset Password',
            style: Theme.of(context).textTheme.displaySmall,
          ),
          const SizedBox(height: 8),
          const Text(
            'Enter the email address associated with your account and we\'ll send you a link to reset your password.',
            style: TextStyle(color: AppColors.textSecondary, fontSize: 14, height: 1.4),
          ),
          const SizedBox(height: 32),

          if (_errorMessage != null) ...[
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.dangerSubtle,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.danger),
              ),
              child: Text(
                _errorMessage!,
                style: const TextStyle(color: AppColors.danger, fontSize: 13),
              ),
            ),
            const SizedBox(height: 16),
          ],

          TextFormField(
            controller: _emailController,
            keyboardType: TextInputType.emailAddress,
            style: const TextStyle(color: AppColors.textPrimary),
            decoration: const InputDecoration(
              labelText: 'Email Address',
              prefixIcon: Icon(Icons.email_outlined, color: AppColors.textTertiary),
            ),
            validator: (val) {
              if (val == null || val.trim().isEmpty) return 'Email is required';
              if (!val.contains('@')) return 'Enter a valid email';
              return null;
            },
          ),
          const SizedBox(height: 28),

          LimeButton(
            label: 'Send Recovery Email',
            isLoading: _isLoading,
            onPressed: _handleReset,
          ),
        ],
      ),
    );
  }

  Widget _buildSuccessView() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 72,
            height: 72,
            decoration: const BoxDecoration(
              color: AppColors.electricPurpleSubtle,
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.mark_email_read_rounded, color: AppColors.electricPurple, size: 36),
          ),
          const SizedBox(height: 24),
          Text(
            'Check Your Email',
            style: Theme.of(context).textTheme.headlineMedium,
          ),
          const SizedBox(height: 8),
          Text(
            'We\'ve sent password reset instructions to\n${_emailController.text}',
            textAlign: TextAlign.center,
            style: const TextStyle(color: AppColors.textSecondary, fontSize: 14),
          ),
          const SizedBox(height: 32),
          LimeButton(
            label: 'Back to Sign In',
            onPressed: () => context.go('/login'),
          ),
        ],
      ),
    );
  }
}
