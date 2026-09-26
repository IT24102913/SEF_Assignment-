import 'package:flutter/material.dart';
import '../../services/auth_api_service.dart';
import '../../services/auth_service.dart';
import '../../utils/theme.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});
  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _nameCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _nicCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  final _confirmCtrl = TextEditingController();
  String _gender = 'Male';
  bool _loading = false;
  bool _showPass = false;

  @override
  void dispose() {
    _nameCtrl.dispose();
    _emailCtrl.dispose();
    _phoneCtrl.dispose();
    _nicCtrl.dispose();
    _passCtrl.dispose();
    _confirmCtrl.dispose();
    super.dispose();
  }

  Future<void> _register() async {
    if (_nameCtrl.text.isEmpty || _emailCtrl.text.isEmpty || _passCtrl.text.isEmpty) {
      _showError('Please fill in all required fields');
      return;
    }
    if (_passCtrl.text != _confirmCtrl.text) {
      _showError('Passwords do not match');
      return;
    }
    if (_passCtrl.text.length < 6) {
      _showError('Password must be at least 6 characters');
      return;
    }

    // Normalize phone number (strip whitespace, dashes, handle +94)
    String cleanPhone = _phoneCtrl.text.replaceAll(RegExp(r'[\s\-]'), '');
    if (cleanPhone.startsWith('+94')) {
      cleanPhone = '0${cleanPhone.substring(3)}';
    } else if (cleanPhone.startsWith('94') && cleanPhone.length == 11) {
      cleanPhone = '0${cleanPhone.substring(2)}';
    }

    if (cleanPhone.isNotEmpty && !RegExp(r'^\d{10}$').hasMatch(cleanPhone)) {
      _showError('Phone number must be 10 digits (e.g. 0771234567 or +94771234567)');
      return;
    }

    // Normalize NIC (strip whitespace, uppercase)
    String cleanNic = _nicCtrl.text.replaceAll(RegExp(r'\s+'), '').toUpperCase();
    if (cleanNic.isNotEmpty && !RegExp(r'^(\d{9}[VX]|\d{12})$').hasMatch(cleanNic)) {
      _showError('NIC must be 9 digits + V/X or 12 digits');
      return;
    }

    setState(() => _loading = true);
    try {
      final result = await AuthApiService.register(
        name: _nameCtrl.text.trim(),
        email: _emailCtrl.text.trim(),
        password: _passCtrl.text,
        phone: cleanPhone.isNotEmpty ? cleanPhone : null,
        nic: cleanNic.isNotEmpty ? cleanNic : null,
        gender: _gender,
      );
      await AuthService.saveUser(result);
      if (mounted) Navigator.pushReplacementNamed(context, '/home');
    } catch (e) {
      if (mounted) _showError(e.toString().replaceAll('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _showError(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(msg), backgroundColor: kDanger),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: kBg,
      appBar: AppBar(
        backgroundColor: kBg,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios, color: kText),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text('Create Account', style: TextStyle(color: kText, fontWeight: FontWeight.w700)),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Patient Registration', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: kText)),
                const SizedBox(height: 4),
                const Text('Create your account to book lab tests', style: TextStyle(color: kTextMuted, fontSize: 13)),
                const SizedBox(height: 24),

                // Full Name
                const Text('Full Name *', style: TextStyle(color: kTextMuted, fontSize: 13, fontWeight: FontWeight.w600)),
                const SizedBox(height: 6),
                TextField(
                  controller: _nameCtrl,
                  textCapitalization: TextCapitalization.words,
                  style: const TextStyle(color: kText),
                  decoration: const InputDecoration(
                    hintText: 'Your full name',
                    prefixIcon: Icon(Icons.person_outline, color: kPrimary),
                  ),
                ),
                const SizedBox(height: 16),

                // Email
                const Text('Email Address *', style: TextStyle(color: kTextMuted, fontSize: 13, fontWeight: FontWeight.w600)),
                const SizedBox(height: 6),
                TextField(
                  controller: _emailCtrl,
                  keyboardType: TextInputType.emailAddress,
                  style: const TextStyle(color: kText),
                  decoration: const InputDecoration(
                    hintText: 'your@email.com',
                    prefixIcon: Icon(Icons.email_outlined, color: kPrimary),
                  ),
                ),
                const SizedBox(height: 16),

                // Phone & NIC
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Phone Number', style: TextStyle(color: kTextMuted, fontSize: 13, fontWeight: FontWeight.w600)),
                          const SizedBox(height: 6),
                          TextField(
                            controller: _phoneCtrl,
                            keyboardType: TextInputType.phone,
                            style: const TextStyle(color: kText),
                            decoration: const InputDecoration(
                              hintText: '07XXXXXXXX',
                              prefixIcon: Icon(Icons.phone_outlined, color: kPrimary),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('NIC Number', style: TextStyle(color: kTextMuted, fontSize: 13, fontWeight: FontWeight.w600)),
                          const SizedBox(height: 6),
                          TextField(
                            controller: _nicCtrl,
                            style: const TextStyle(color: kText),
                            decoration: const InputDecoration(
                              hintText: 'e.g. 1998... / ...V',
                              prefixIcon: Icon(Icons.badge_outlined, color: kPrimary),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),

                // Gender
                const Text('Gender', style: TextStyle(color: kTextMuted, fontSize: 13, fontWeight: FontWeight.w600)),
                const SizedBox(height: 6),
                DropdownButtonFormField<String>(
                  initialValue: _gender,
                  decoration: const InputDecoration(
                    prefixIcon: Icon(Icons.transgender_outlined, color: kPrimary),
                  ),
                  items: const [
                    DropdownMenuItem(value: 'Male', child: Text('Male')),
                    DropdownMenuItem(value: 'Female', child: Text('Female')),
                    DropdownMenuItem(value: 'Prefer not to say', child: Text('Prefer not to say')),
                  ],
                  onChanged: (val) => setState(() => _gender = val ?? 'Male'),
                ),
                const SizedBox(height: 16),

                // Password
                const Text('Password *', style: TextStyle(color: kTextMuted, fontSize: 13, fontWeight: FontWeight.w600)),
                const SizedBox(height: 6),
                TextField(
                  controller: _passCtrl,
                  obscureText: !_showPass,
                  style: const TextStyle(color: kText),
                  decoration: InputDecoration(
                    hintText: 'Minimum 6 characters',
                    prefixIcon: const Icon(Icons.lock_outline, color: kPrimary),
                    suffixIcon: IconButton(
                      icon: Icon(_showPass ? Icons.visibility_off : Icons.visibility, color: kTextMuted),
                      onPressed: () => setState(() => _showPass = !_showPass),
                    ),
                  ),
                ),
                const SizedBox(height: 16),

                // Confirm Password
                const Text('Confirm Password *', style: TextStyle(color: kTextMuted, fontSize: 13, fontWeight: FontWeight.w600)),
                const SizedBox(height: 6),
                TextField(
                  controller: _confirmCtrl,
                  obscureText: true,
                  style: const TextStyle(color: kText),
                  decoration: const InputDecoration(
                    hintText: 'Re-enter your password',
                    prefixIcon: Icon(Icons.lock_outline, color: kPrimary),
                  ),
                ),
                const SizedBox(height: 28),

                // Register Button
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: _loading ? null : _register,
                    child: _loading
                        ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                        : const Text('Create Account'),
                  ),
                ),
                const SizedBox(height: 16),

                // Login link
                Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                  const Text('Already have an account? ', style: TextStyle(color: kTextMuted)),
                  GestureDetector(
                    onTap: () => Navigator.pop(context),
                    child: const Text('Sign In', style: TextStyle(color: kPrimary, fontWeight: FontWeight.w700)),
                  ),
                ]),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
