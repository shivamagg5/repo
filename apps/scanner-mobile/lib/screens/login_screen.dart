// =============================================================================
// Scanner Mobile — Staff Gate Authorization & Login Screen
// =============================================================================

import 'package:flutter/material.dart';
import '../core/scanner_colors.dart';
import '../services/scanner_auth_service.dart';
import 'scan_screen.dart';

class ScannerLoginScreen extends StatefulWidget {
  final ScannerAuthService authService;

  const ScannerLoginScreen({super.key, required this.authService});

  @override
  State<ScannerLoginScreen> createState() => _ScannerLoginScreenState();
}

class _ScannerLoginScreenState extends State<ScannerLoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscurePassword = true;
  bool _isLoading = false;
  String? _errorMessage;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _handleLogin() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final success = await widget.authService.signIn(
        _emailController.text.trim(),
        _passwordController.text,
      );

      if (success && mounted) {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => const ScanScreen()),
        );
      } else if (mounted) {
        setState(() {
          _errorMessage = 'Invalid staff credentials or unauthorized gate access.';
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _errorMessage = 'Authentication error. Please check your network connection.';
        });
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: ScannerColors.background,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 16.0),
            child: Form(
              key: _formKey,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // App Icon
                  Center(
                    child: Container(
                      width: 68,
                      height: 68,
                      decoration: BoxDecoration(
                        gradient: ScannerColors.primaryGradient,
                        borderRadius: BorderRadius.circular(22),
                        boxShadow: [
                          BoxShadow(
                            color: ScannerColors.electricPurple.withValues(alpha: 0.4),
                            blurRadius: 20,
                            offset: const Offset(0, 6),
                          ),
                        ],
                      ),
                      child: const Icon(Icons.qr_code_scanner_rounded, color: Colors.white, size: 34),
                    ),
                  ),
                  const SizedBox(height: 20),
                  const Text(
                    'Gate Control Terminal',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 24,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  const SizedBox(height: 6),
                  const Text(
                    'Sign in with authorized event scanner credentials',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: ScannerColors.textSecondary, fontSize: 13),
                  ),
                  const SizedBox(height: 32),

                  if (_errorMessage != null) ...[
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: ScannerColors.dangerSubtle,
                        border: Border.all(color: ScannerColors.danger),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.error_outline_rounded, color: ScannerColors.danger, size: 18),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              _errorMessage!,
                              style: const TextStyle(color: ScannerColors.dangerLight, fontSize: 13),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],

                  // Email Field
                  TextFormField(
                    controller: _emailController,
                    keyboardType: TextInputType.emailAddress,
                    style: const TextStyle(color: Colors.white),
                    decoration: InputDecoration(
                      labelText: 'Staff Email',
                      labelStyle: const TextStyle(color: ScannerColors.textMuted),
                      filled: true,
                      fillColor: ScannerColors.card,
                      prefixIcon: const Icon(Icons.badge_outlined, color: ScannerColors.textMuted),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                        borderSide: BorderSide.none,
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                        borderSide: const BorderSide(color: ScannerColors.electricPurple),
                      ),
                    ),
                    validator: (val) {
                      if (val == null || val.trim().isEmpty) return 'Email is required';
                      if (!val.contains('@')) return 'Enter a valid email';
                      return null;
                    },
                  ),
                  const SizedBox(height: 16),

                  // Password Field
                  TextFormField(
                    controller: _passwordController,
                    obscureText: _obscurePassword,
                    style: const TextStyle(color: Colors.white),
                    decoration: InputDecoration(
                      labelText: 'Password',
                      labelStyle: const TextStyle(color: ScannerColors.textMuted),
                      filled: true,
                      fillColor: ScannerColors.card,
                      prefixIcon: const Icon(Icons.lock_outline_rounded, color: ScannerColors.textMuted),
                      suffixIcon: IconButton(
                        icon: Icon(
                          _obscurePassword ? Icons.visibility_off_rounded : Icons.visibility_rounded,
                          color: ScannerColors.textMuted,
                        ),
                        onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                      ),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                        borderSide: BorderSide.none,
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                        borderSide: const BorderSide(color: ScannerColors.electricPurple),
                      ),
                    ),
                    validator: (val) {
                      if (val == null || val.isEmpty) return 'Password is required';
                      return null;
                    },
                  ),
                  const SizedBox(height: 24),

                  // Login Button
                  ElevatedButton(
                    onPressed: _isLoading ? null : _handleLogin,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: ScannerColors.electricPurple,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                      elevation: 4,
                    ),
                    child: _isLoading
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : const Text(
                            'Authorize Scanner',
                            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                          ),
                  ),

                  const SizedBox(height: 16),

                  // Demo Quick Autofill
                  OutlinedButton.icon(
                    onPressed: () {
                      setState(() {
                        _emailController.text = 'staff@eventplatform.com';
                        _passwordController.text = 'Staff123!';
                        _errorMessage = null;
                      });
                    },
                    icon: const Icon(Icons.bolt_rounded, color: ScannerColors.electricPurpleLight, size: 18),
                    label: const Text(
                      'Auto-Fill Demo Staff Credentials',
                      style: TextStyle(color: ScannerColors.electricPurpleLight, fontSize: 13, fontWeight: FontWeight.w600),
                    ),
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: ScannerColors.borderHighlight),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
