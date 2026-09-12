import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import '../../utils/theme.dart';

// ─── Simple in-memory auth state ─────────────────────────────────────────────
class AuthState {
  static String? token;
  static String? userId;
  static String? name;
  static String? email;
  static String? role;
  static String? patientCode;
  static int? age;
  static String? phoneNumber;

  static bool get isLoggedIn => token != null && token!.isNotEmpty;

  static void setUser(Map<String, dynamic> data) {
    token       = data['token']  as String?;
    userId      = data['userId'] as String?;
    name        = data['name']   as String?;
    email       = data['email']  as String?;
    role        = data['role']   as String?;
    patientCode = data['patientCode'] as String? ?? 'PAT-1001';
    age         = data['age'] is int ? data['age'] as int : (data['age'] != null ? int.tryParse(data['age'].toString()) : null);
    phoneNumber = data['phoneNumber'] as String?;
  }

  static void clear() {
    token = userId = name = email = role = patientCode = phoneNumber = null;
    age = null;
  }

  static String get initials {
    if (name == null || name!.isEmpty) return 'P';
    final parts = name!.trim().split(' ');
    if (parts.length >= 2) return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    return parts[0][0].toUpperCase();
  }
}

// ─── API base ─────────────────────────────────────────────────────────────────
String get _apiBase {
  // Auto-detect platform: Android emulator uses 10.0.2.2, otherwise localhost
  const bool isAndroid = bool.fromEnvironment('dart.library.io', defaultValue: false);
  return isAndroid ? 'http://10.0.2.2:5238/api' : 'http://localhost:5238/api';
}

// ─── Login Screen ─────────────────────────────────────────────────────────────
class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  bool _obscurePass    = true;
  bool _obscureConfirm = true;
  bool _loading        = false;
  String _error        = '';
  String _success      = '';

  // Login form
  final _loginEmailCtrl = TextEditingController();
  final _loginPassCtrl  = TextEditingController();

  // Signup form
  final _nameCtrl    = TextEditingController();
  final _ageCtrl     = TextEditingController();
  final _phoneCtrl   = TextEditingController();
  final _emailCtrl   = TextEditingController();
  final _passCtrl    = TextEditingController();
  final _confirmCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _tabController.addListener(() {
      if (_tabController.indexIsChanging) setState(() { _error = ''; _success = ''; });
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    _loginEmailCtrl.dispose();
    _loginPassCtrl.dispose();
    _nameCtrl.dispose();
    _ageCtrl.dispose();
    _phoneCtrl.dispose();
    _emailCtrl.dispose();
    _passCtrl.dispose();
    _confirmCtrl.dispose();
    super.dispose();
  }

  // ── Login ──────────────────────────────────────────────────────────────────
  Future<void> _handleLogin() async {
    final email = _loginEmailCtrl.text.trim();
    final pass  = _loginPassCtrl.text;
    if (email.isEmpty || pass.isEmpty) {
      setState(() => _error = 'Please fill in all fields.');
      return;
    }
    setState(() { _loading = true; _error = ''; _success = ''; });
    try {
      final res = await http.post(
        Uri.parse('$_apiBase/auth/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'email': email, 'password': pass}),
      );
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      if (res.statusCode == 200) {
        AuthState.setUser(data);
        if (mounted) {
          Navigator.of(context).pushReplacementNamed('/home');
        }
      } else {
        setState(() => _error = data['message'] as String? ?? 'Login failed.');
      }
    } catch (_) {
      // Fallback: allow demo login when server is unreachable
      if (_loginEmailCtrl.text.isNotEmpty) {
        AuthState.setUser({
          'token':  'demo-token',
          'userId': 'demo-001',
          'name':   email.split('@')[0].replaceAll('.', ' ').split(' ').map((w) => w.isEmpty ? '' : '${w[0].toUpperCase()}${w.substring(1)}').join(' '),
          'email':  email,
          'role':   'Patient',
        });
        if (mounted) Navigator.of(context).pushReplacementNamed('/home');
      } else {
        setState(() => _error = 'Cannot reach server. Check your connection.');
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  // ── Sign Up ────────────────────────────────────────────────────────────────
  Future<void> _handleSignup() async {
    final name    = _nameCtrl.text.trim();
    final ageStr  = _ageCtrl.text.trim();
    final phone   = _phoneCtrl.text.trim();
    final email   = _emailCtrl.text.trim();
    final pass    = _passCtrl.text;
    final confirm = _confirmCtrl.text;
    if (name.isEmpty || email.isEmpty || pass.isEmpty || confirm.isEmpty) {
      setState(() => _error = 'Please fill in all required fields.');
      return;
    }
    if (pass.length < 6) {
      setState(() => _error = 'Password must be at least 6 characters.');
      return;
    }
    if (pass != confirm) {
      setState(() => _error = 'Passwords do not match.');
      return;
    }
    setState(() { _loading = true; _error = ''; _success = ''; });
    try {
      final parsedAge = int.tryParse(ageStr);
      final res = await http.post(
        Uri.parse('$_apiBase/auth/register'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'name': name,
          'email': email,
          'password': pass,
          'age': parsedAge,
          'phoneNumber': phone.isNotEmpty ? phone : null,
        }),
      );
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      if (res.statusCode == 200) {
        AuthState.setUser(data);
        setState(() => _success = 'Account created! Welcome, $name 🎉');
        await Future.delayed(const Duration(milliseconds: 1200));
        if (mounted) Navigator.of(context).pushReplacementNamed('/home');
      } else {
        setState(() => _error = data['message'] as String? ?? 'Registration failed.');
      }
    } catch (_) {
      setState(() => _error = 'Cannot reach server. Check your connection.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  // ── Build ──────────────────────────────────────────────────────────────────
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              Color(0xFF095e51),
              Color(0xFF0d7c6b),
              Color(0xFF0a9e87),
            ],
          ),
        ),
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
              child: Column(
                children: [
                  // ── Brand header
                  Container(
                    width: 64,
                    height: 64,
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(color: Colors.white.withValues(alpha: 0.25), width: 1.5),
                      boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.2), blurRadius: 16, offset: const Offset(0, 6))],
                    ),
                    child: const Icon(Icons.favorite, color: Colors.white, size: 32),
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'Health Bridge',
                    style: TextStyle(color: Colors.white, fontSize: 26, fontWeight: FontWeight.w800, letterSpacing: -0.5),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Patient EMR Portal',
                    style: TextStyle(color: Colors.white.withValues(alpha: 0.75), fontSize: 13, fontWeight: FontWeight.w500),
                  ),
                  const SizedBox(height: 32),

                  // ── Card
                  Container(
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.2), blurRadius: 30, offset: const Offset(0, 12))],
                    ),
                    child: Column(
                      children: [
                        // Tab bar
                        Container(
                          decoration: const BoxDecoration(
                            border: Border(bottom: BorderSide(color: Color(0xFFCCE8E3), width: 1.5)),
                          ),
                          child: TabBar(
                            controller: _tabController,
                            labelColor: HealthBridgeTheme.accentTeal,
                            unselectedLabelColor: HealthBridgeTheme.textSecondary,
                            labelStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
                            indicatorColor: HealthBridgeTheme.accentTeal,
                            indicatorWeight: 2.5,
                            tabs: const [
                              Tab(text: 'Sign In'),
                              Tab(text: 'Create Account'),
                            ],
                          ),
                        ),

                        Padding(
                          padding: const EdgeInsets.all(24),
                          child: Column(
                            children: [
                              // Error banner
                              if (_error.isNotEmpty) _Banner(
                                text: _error,
                                isError: true,
                                onDismiss: () => setState(() => _error = ''),
                              ),
                              // Success banner
                              if (_success.isNotEmpty) _Banner(
                                text: _success,
                                isError: false,
                                onDismiss: () => setState(() => _success = ''),
                              ),

                              SizedBox(
                                height: _tabController.index == 0 ? 250 : 450,
                                child: TabBarView(
                                  controller: _tabController,
                                  children: [
                                    _LoginForm(
                                      emailCtrl:   _loginEmailCtrl,
                                      passCtrl:    _loginPassCtrl,
                                      obscurePass: _obscurePass,
                                      onTogglePass: () => setState(() => _obscurePass = !_obscurePass),
                                      loading:     _loading,
                                      onSubmit:    _handleLogin,
                                      onGoSignup:  () => _tabController.animateTo(1),
                                    ),
                                    _SignupForm(
                                      nameCtrl:       _nameCtrl,
                                      ageCtrl:        _ageCtrl,
                                      phoneCtrl:      _phoneCtrl,
                                      emailCtrl:      _emailCtrl,
                                      passCtrl:       _passCtrl,
                                      confirmCtrl:    _confirmCtrl,
                                      obscurePass:    _obscurePass,
                                      obscureConfirm: _obscureConfirm,
                                      onTogglePass:    () => setState(() => _obscurePass    = !_obscurePass),
                                      onToggleConfirm: () => setState(() => _obscureConfirm = !_obscureConfirm),
                                      loading:         _loading,
                                      onSubmit:        _handleSignup,
                                      onGoLogin:       () => _tabController.animateTo(0),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 24),
                  Text(
                    '© 2026 Health Bridge · Secure Patient Portal',
                    style: TextStyle(color: Colors.white.withValues(alpha: 0.5), fontSize: 11),
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

// ─── Banner widget ────────────────────────────────────────────────────────────
class _Banner extends StatelessWidget {
  final String text;
  final bool isError;
  final VoidCallback onDismiss;
  const _Banner({required this.text, required this.isError, required this.onDismiss});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
      decoration: BoxDecoration(
        color: isError ? const Color(0xFFFEF2F2) : const Color(0xFFF0FDF4),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
          color: isError ? const Color(0xFFFECACA) : const Color(0xFFBBF7D0),
        ),
      ),
      child: Row(
        children: [
          Icon(isError ? Icons.error_outline : Icons.check_circle_outline,
              size: 16,
              color: isError ? const Color(0xFFDC2626) : const Color(0xFF16A34A)),
          const SizedBox(width: 8),
          Expanded(
            child: Text(text,
                style: TextStyle(
                    fontSize: 13,
                    color: isError ? const Color(0xFFDC2626) : const Color(0xFF16A34A))),
          ),
          GestureDetector(onTap: onDismiss, child: const Icon(Icons.close, size: 14, color: Colors.grey)),
        ],
      ),
    );
  }
}

// ─── Shared input field ───────────────────────────────────────────────────────
class _AuthField extends StatelessWidget {
  final TextEditingController controller;
  final String hint;
  final IconData icon;
  final bool obscure;
  final VoidCallback? onToggleObscure;
  final TextInputType keyboardType;
  final TextInputAction action;
  final VoidCallback? onAction;

  const _AuthField({
    required this.controller,
    required this.hint,
    required this.icon,
    this.obscure = false,
    this.onToggleObscure,
    this.keyboardType = TextInputType.text,
    this.action = TextInputAction.next,
    this.onAction,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      child: TextField(
        controller: controller,
        obscureText: obscure,
        keyboardType: keyboardType,
        textInputAction: action,
        onSubmitted: onAction != null ? (_) => onAction!() : null,
        style: const TextStyle(fontSize: 14, color: Color(0xFF0D2B27)),
        decoration: InputDecoration(
          hintText: hint,
          hintStyle: const TextStyle(color: Color(0xFF4D7A73), fontSize: 14),
          prefixIcon: Icon(icon, size: 18, color: const Color(0xFF4D7A73)),
          suffixIcon: onToggleObscure != null
              ? IconButton(
                  icon: Icon(obscure ? Icons.visibility_off : Icons.visibility,
                      size: 18, color: const Color(0xFF4D7A73)),
                  onPressed: onToggleObscure,
                )
              : null,
          filled: true,
          fillColor: const Color(0xFFF2FAF8),
          contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(10),
            borderSide: const BorderSide(color: Color(0xFFCCE8E3), width: 1.5),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(10),
            borderSide: const BorderSide(color: Color(0xFFCCE8E3), width: 1.5),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(10),
            borderSide: BorderSide(color: HealthBridgeTheme.accentTeal, width: 2),
          ),
        ),
      ),
    );
  }
}

// ─── Submit button ────────────────────────────────────────────────────────────
class _SubmitButton extends StatelessWidget {
  final String label;
  final bool loading;
  final VoidCallback onTap;
  const _SubmitButton({required this.label, required this.loading, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton(
        onPressed: loading ? null : onTap,
        style: ElevatedButton.styleFrom(
          backgroundColor: HealthBridgeTheme.accentTeal,
          disabledBackgroundColor: HealthBridgeTheme.textSecondary,
          padding: const EdgeInsets.symmetric(vertical: 14),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          elevation: 0,
        ),
        child: loading
            ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
            : Text(label, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 15)),
      ),
    );
  }
}

// ─── Login form ───────────────────────────────────────────────────────────────
class _LoginForm extends StatelessWidget {
  final TextEditingController emailCtrl;
  final TextEditingController passCtrl;
  final bool obscurePass;
  final VoidCallback onTogglePass;
  final bool loading;
  final VoidCallback onSubmit;
  final VoidCallback onGoSignup;

  const _LoginForm({
    required this.emailCtrl, required this.passCtrl,
    required this.obscurePass, required this.onTogglePass,
    required this.loading, required this.onSubmit, required this.onGoSignup,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        const SizedBox(height: 8),
        _AuthField(controller: emailCtrl, hint: 'Email address', icon: Icons.mail_outline, keyboardType: TextInputType.emailAddress),
        _AuthField(controller: passCtrl,  hint: 'Password', icon: Icons.lock_outline, obscure: obscurePass, onToggleObscure: onTogglePass, action: TextInputAction.done, onAction: onSubmit),
        const SizedBox(height: 4),
        _SubmitButton(label: 'Sign In', loading: loading, onTap: onSubmit),
        const SizedBox(height: 16),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text("Don't have an account? ", style: TextStyle(color: HealthBridgeTheme.textSecondary, fontSize: 13)),
            GestureDetector(
              onTap: onGoSignup,
              child: Text('Create one', style: TextStyle(color: HealthBridgeTheme.accentTeal, fontWeight: FontWeight.w700, fontSize: 13)),
            ),
          ],
        ),
      ],
    );
  }
}

// ─── Signup form ──────────────────────────────────────────────────────────────
class _SignupForm extends StatelessWidget {
  final TextEditingController nameCtrl;
  final TextEditingController ageCtrl;
  final TextEditingController phoneCtrl;
  final TextEditingController emailCtrl;
  final TextEditingController passCtrl;
  final TextEditingController confirmCtrl;
  final bool obscurePass;
  final bool obscureConfirm;
  final VoidCallback onTogglePass;
  final VoidCallback onToggleConfirm;
  final bool loading;
  final VoidCallback onSubmit;
  final VoidCallback onGoLogin;

  const _SignupForm({
    required this.nameCtrl,
    required this.ageCtrl,
    required this.phoneCtrl,
    required this.emailCtrl,
    required this.passCtrl,
    required this.confirmCtrl,
    required this.obscurePass,
    required this.obscureConfirm,
    required this.onTogglePass,
    required this.onToggleConfirm,
    required this.loading,
    required this.onSubmit,
    required this.onGoLogin,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        const SizedBox(height: 8),
        _AuthField(controller: nameCtrl, hint: 'Full name', icon: Icons.person_outline),
        Row(
          children: [
            Expanded(
              flex: 1,
              child: _AuthField(controller: ageCtrl, hint: 'Age', icon: Icons.numbers, keyboardType: TextInputType.number),
            ),
            const SizedBox(width: 8),
            Expanded(
              flex: 2,
              child: _AuthField(controller: phoneCtrl, hint: 'Phone number', icon: Icons.phone_outlined, keyboardType: TextInputType.phone),
            ),
          ],
        ),
        _AuthField(controller: emailCtrl,   hint: 'Email address',          icon: Icons.mail_outline, keyboardType: TextInputType.emailAddress),
        _AuthField(controller: passCtrl,    hint: 'Password (min 6 chars)', icon: Icons.lock_outline,  obscure: obscurePass,    onToggleObscure: onTogglePass),
        _AuthField(controller: confirmCtrl, hint: 'Confirm password',       icon: Icons.lock_outline,  obscure: obscureConfirm, onToggleObscure: onToggleConfirm, action: TextInputAction.done, onAction: onSubmit),
        _SubmitButton(label: 'Create Account', loading: loading, onTap: onSubmit),
        const SizedBox(height: 16),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text('Already have an account? ', style: TextStyle(color: HealthBridgeTheme.textSecondary, fontSize: 13)),
            GestureDetector(
              onTap: onGoLogin,
              child: Text('Sign in', style: TextStyle(color: HealthBridgeTheme.accentTeal, fontWeight: FontWeight.w700, fontSize: 13)),
            ),
          ],
        ),
      ],
    );
  }
}
