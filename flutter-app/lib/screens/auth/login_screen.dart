import 'package:flutter/material.dart';
import '../../services/auth_api_service.dart';
import '../../services/auth_service.dart';
import '../../services/emr_api_service.dart';
import '../../main.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  bool _isRegisterTab = false;
  bool _loading = false;
  bool _showPass = false;
  bool _showConfirmPass = false;

  // Sign In Controllers
  final _emailCtrl = TextEditingController();
  final _passCtrl = TextEditingController();

  // Registration Controllers
  final _fullNameCtrl = TextEditingController();
  final _regEmailCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _nicCtrl = TextEditingController();
  final _regPassCtrl = TextEditingController();
  final _confirmPassCtrl = TextEditingController();
  String _selectedGender = 'Select Gender';

  @override
  void dispose() {
    _emailCtrl.dispose();
    _passCtrl.dispose();
    _fullNameCtrl.dispose();
    _regEmailCtrl.dispose();
    _phoneCtrl.dispose();
    _nicCtrl.dispose();
    _regPassCtrl.dispose();
    _confirmPassCtrl.dispose();
    super.dispose();
  }

  Future<void> _login() async {
    final email = _emailCtrl.text.trim();
    final pass = _passCtrl.text;
    if (email.isEmpty || pass.isEmpty) {
      _showError('Please enter both email and password.');
      return;
    }
    setState(() => _loading = true);
    try {
      final result = await AuthApiService.login(email, pass);
      await AuthService.saveUser(result);

      // Sync global application session & auth state
      AppSession.isLoggedIn = true;
      AppSession.loggedInUserEmail = result.email;
      AppSession.userName = result.name;

      AuthState.token = result.token;
      AuthState.userId = result.userId;
      AuthState.name = result.name;
      AuthState.email = result.email;
      AuthState.role = result.role;
      AuthState.patientCode = 'PAT-${result.userId}';

      if (mounted) Navigator.pushReplacementNamed(context, '/emr');
    } catch (e) {
      final cleanMsg = e.toString().replaceAll('Exception: ', '');
      _showError(cleanMsg);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _register() async {
    final name = _fullNameCtrl.text.trim();
    final email = _regEmailCtrl.text.trim();
    final phone = _phoneCtrl.text.trim();
    final nic = _nicCtrl.text.trim();
    final pass = _regPassCtrl.text;
    final confirmPass = _confirmPassCtrl.text;
    final gender = _selectedGender;

    if (name.isEmpty || email.isEmpty || pass.isEmpty || phone.isEmpty || nic.isEmpty) {
      _showError('Please fill in all required fields (*).');
      return;
    }
    if (!email.contains('@')) {
      _showError('Email address must contain @');
      return;
    }
    if (phone.length != 10 || int.tryParse(phone) == null) {
      _showError('Phone number must be exactly 10 digits (e.g. 0771234567).');
      return;
    }
    if (gender == 'Select Gender') {
      _showError('Please select your gender.');
      return;
    }
    if (pass.length < 6) {
      _showError('Password must be at least 6 characters.');
      return;
    }
    if (pass != confirmPass) {
      _showError('Passwords do not match.');
      return;
    }

    setState(() => _loading = true);
    try {
      final result = await AuthApiService.register(
        name: name,
        email: email,
        password: pass,
        phone: phone,
        nic: nic,
        gender: gender == 'Other' ? 'Prefer not to say' : gender,
      );
      await AuthService.saveUser(result);

      // Sync global application session & auth state
      AppSession.isLoggedIn = true;
      AppSession.loggedInUserEmail = result.email;
      AppSession.userName = result.name;

      AuthState.token = result.token;
      AuthState.userId = result.userId;
      AuthState.name = result.name;
      AuthState.email = result.email;
      AuthState.role = result.role;
      AuthState.patientCode = 'PAT-${result.userId}';
      AuthState.phoneNumber = phone;

      if (mounted) {
        _showSuccess('Account created successfully!');
        Navigator.pushReplacementNamed(context, '/emr');
      }
    } catch (e) {
      final cleanMsg = e.toString().replaceAll('Exception: ', '');
      _showError(cleanMsg);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _showError(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg),
        backgroundColor: const Color(0xFFDC2626),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  void _showSuccess(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg),
        backgroundColor: const Color(0xFF059669),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          // ── Hospital Background Image (Matching Screenshot 1 & 2) ──────────
          Positioned.fill(
            child: Image.asset(
              'assets/images/login_bg_green.jpg',
              fit: BoxFit.cover,
              errorBuilder: (context, error, stackTrace) => Image.asset(
                'assets/images/doctor.jpg',
                fit: BoxFit.cover,
              ),
            ),
          ),

          // Dark Overlay Tint
          Positioned.fill(
            child: Container(
              color: Colors.black.withValues(alpha: 0.15),
            ),
          ),

          // ── Centered Auth Card Container ────────────────────────────────────
          SafeArea(
            child: Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
                child: Container(
                  constraints: const BoxConstraints(maxWidth: 440),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.95),
                    borderRadius: BorderRadius.circular(24),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.25),
                        blurRadius: 30,
                        offset: const Offset(0, 10),
                      ),
                    ],
                    border: Border.all(color: Colors.white, width: 1.5),
                  ),
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      // ── Logo Header ────────────────────────────────────────
                      Container(
                        width: 60,
                        height: 60,
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF0FDF4),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: const Color(0xFFCCFBF1), width: 1),
                        ),
                        child: Image.asset(
                          'assets/images/logo.png',
                          fit: BoxFit.contain,
                          errorBuilder: (context, error, stackTrace) => const Icon(
                            Icons.local_hospital,
                            color: Color(0xFF0D9488),
                            size: 34,
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),

                      // Title (Changes dynamically between Welcome Back and Create Account)
                      Text(
                        !_isRegisterTab ? 'Welcome Back' : 'Create Account',
                        style: const TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.w900,
                          color: Color(0xFF064E3B),
                          letterSpacing: -0.5,
                        ),
                      ),
                      const SizedBox(height: 6),

                      // Pill Badge (Updated to Health Bridge Patient Portal as requested)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 5),
                        decoration: BoxDecoration(
                          color: const Color(0xFFE6F5F2),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: const Color(0xFF99F6E4)),
                        ),
                        child: const Text(
                          'Health Bridge Patient Portal',
                          style: TextStyle(
                            color: Color(0xFF0D9488),
                            fontSize: 11.5,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
                      const SizedBox(height: 18),

                      // ── Tab Switcher (Sign In | Register) (Screenshot 1 & 2) ─────
                      Container(
                        padding: const EdgeInsets.all(4),
                        decoration: BoxDecoration(
                          color: const Color(0xFFE6F5F2),
                          borderRadius: BorderRadius.circular(14),
                        ),
                        child: Row(
                          children: [
                            Expanded(
                              child: GestureDetector(
                                onTap: () => setState(() => _isRegisterTab = false),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(vertical: 10),
                                  decoration: BoxDecoration(
                                    color: !_isRegisterTab ? Colors.white : Colors.transparent,
                                    borderRadius: BorderRadius.circular(10),
                                    boxShadow: !_isRegisterTab
                                        ? [
                                            BoxShadow(
                                              color: Colors.black.withValues(alpha: 0.08),
                                              blurRadius: 4,
                                              offset: const Offset(0, 2),
                                            ),
                                          ]
                                        : null,
                                  ),
                                  child: Text(
                                    'Sign In',
                                    textAlign: TextAlign.center,
                                    style: TextStyle(
                                      color: !_isRegisterTab ? const Color(0xFF0D9488) : const Color(0xFF64748B),
                                      fontWeight: !_isRegisterTab ? FontWeight.w800 : FontWeight.w600,
                                      fontSize: 13.5,
                                    ),
                                  ),
                                ),
                              ),
                            ),
                            Expanded(
                              child: GestureDetector(
                                onTap: () => setState(() => _isRegisterTab = true),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(vertical: 10),
                                  decoration: BoxDecoration(
                                    color: _isRegisterTab ? Colors.white : Colors.transparent,
                                    borderRadius: BorderRadius.circular(10),
                                    boxShadow: _isRegisterTab
                                        ? [
                                            BoxShadow(
                                              color: Colors.black.withValues(alpha: 0.08),
                                              blurRadius: 4,
                                              offset: const Offset(0, 2),
                                            ),
                                          ]
                                        : null,
                                  ),
                                  child: Text(
                                    'Register',
                                    textAlign: TextAlign.center,
                                    style: TextStyle(
                                      color: _isRegisterTab ? const Color(0xFF0D9488) : const Color(0xFF64748B),
                                      fontWeight: _isRegisterTab ? FontWeight.w800 : FontWeight.w600,
                                      fontSize: 13.5,
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 20),

                      // ── Dynamic Form: Sign In Form vs Registration Form ────
                      if (!_isRegisterTab) ...[
                        // ── SIGN IN FORM (Screenshot 1) ───────────────────────
                        _buildLabel('EMAIL ADDRESS'),
                        const SizedBox(height: 6),
                        _buildTextField(
                          controller: _emailCtrl,
                          hint: 'e.g. john@gmail.com',
                          icon: Icons.email_outlined,
                          keyboardType: TextInputType.emailAddress,
                        ),
                        const SizedBox(height: 16),
                        _buildLabel('PASSWORD'),
                        const SizedBox(height: 6),
                        _buildTextField(
                          controller: _passCtrl,
                          hint: '••••••••',
                          icon: Icons.lock_outline,
                          obscureText: !_showPass,
                          suffixIcon: IconButton(
                            icon: Icon(
                              _showPass ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                              color: const Color(0xFF64748B),
                              size: 18,
                            ),
                            onPressed: () => setState(() => _showPass = !_showPass),
                          ),
                        ),
                        const SizedBox(height: 22),
                        _buildSubmitButton(
                          label: 'Sign In',
                          onPressed: _login,
                        ),
                      ] else ...[
                        // ── REGISTRATION FORM (Screenshot 2) ─────────────────
                        _buildLabel('FULL NAME *'),
                        const SizedBox(height: 6),
                        _buildTextField(
                          controller: _fullNameCtrl,
                          hint: 'Enter your full name',
                          icon: Icons.person_outline,
                        ),
                        const SizedBox(height: 14),

                        _buildLabel('EMAIL ADDRESS * (MUST CONTAIN @)'),
                        const SizedBox(height: 6),
                        _buildTextField(
                          controller: _regEmailCtrl,
                          hint: 'e.g. john@gmail.com',
                          icon: Icons.email_outlined,
                          keyboardType: TextInputType.emailAddress,
                        ),
                        const SizedBox(height: 14),

                        // Telephone & Gender Row (Screenshot 2)
                        Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  _buildLabel('TELEPHONE (10 DIGITS) *'),
                                  const SizedBox(height: 6),
                                  _buildTextField(
                                    controller: _phoneCtrl,
                                    hint: 'e.g. 0771234567',
                                    icon: Icons.phone_outlined,
                                    keyboardType: TextInputType.phone,
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  _buildLabel('GENDER *'),
                                  const SizedBox(height: 6),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 12),
                                    decoration: BoxDecoration(
                                      color: Colors.white,
                                      borderRadius: BorderRadius.circular(12),
                                      border: Border.all(color: const Color(0xFFCBD5E1)),
                                    ),
                                    child: DropdownButtonHideUnderline(
                                      child: DropdownButton<String>(
                                        value: _selectedGender,
                                        isExpanded: true,
                                        icon: const Icon(Icons.keyboard_arrow_down, color: Color(0xFF64748B), size: 18),
                                        style: const TextStyle(color: Color(0xFF0F172A), fontSize: 12.5),
                                        items: ['Select Gender', 'Male', 'Female', 'Other']
                                            .map((g) => DropdownMenuItem(value: g, child: Text(g)))
                                            .toList(),
                                        onChanged: (val) {
                                          if (val != null) setState(() => _selectedGender = val);
                                        },
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 14),

                        _buildLabel('NIC NUMBER * (MUST BE UNIQUE)'),
                        const SizedBox(height: 6),
                        _buildTextField(
                          controller: _nicCtrl,
                          hint: 'e.g. 199012345678 or 901234567V',
                          icon: Icons.badge_outlined,
                        ),
                        const SizedBox(height: 14),

                        // Password & Confirm Password Row (Screenshot 2)
                        Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  _buildLabel('PASSWORD *'),
                                  const SizedBox(height: 6),
                                  _buildTextField(
                                    controller: _regPassCtrl,
                                    hint: 'Min 6 characters',
                                    icon: Icons.lock_outline,
                                    obscureText: !_showPass,
                                    suffixIcon: IconButton(
                                      icon: Icon(
                                        _showPass ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                                        color: const Color(0xFF64748B),
                                        size: 16,
                                      ),
                                      onPressed: () => setState(() => _showPass = !_showPass),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  _buildLabel('CONFIRM PASSWORD *'),
                                  const SizedBox(height: 6),
                                  _buildTextField(
                                    controller: _confirmPassCtrl,
                                    hint: 'Re-enter password',
                                    icon: Icons.lock_outline,
                                    obscureText: !_showConfirmPass,
                                    suffixIcon: IconButton(
                                      icon: Icon(
                                        _showConfirmPass ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                                        color: const Color(0xFF64748B),
                                        size: 16,
                                      ),
                                      onPressed: () => setState(() => _showConfirmPass = !_showConfirmPass),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 22),

                        _buildSubmitButton(
                          label: 'Create Account',
                          onPressed: _register,
                        ),
                      ],

                      const SizedBox(height: 20),

                      // ── Security Footer ─────────────────────────────────────
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: const [
                          Icon(Icons.verified_user_outlined, size: 14, color: Color(0xFF0D9488)),
                          SizedBox(width: 6),
                          Text(
                            'Protected by Health Bridge Security System.',
                            style: TextStyle(
                              fontSize: 11.5,
                              fontWeight: FontWeight.w600,
                              color: Color(0xFF0D9488),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLabel(String text) {
    return Align(
      alignment: Alignment.centerLeft,
      child: Text(
        text,
        style: const TextStyle(
          fontSize: 10.5,
          fontWeight: FontWeight.w800,
          color: Color(0xFF064E3B),
          letterSpacing: 0.6,
        ),
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String hint,
    required IconData icon,
    TextInputType keyboardType = TextInputType.text,
    bool obscureText = false,
    Widget? suffixIcon,
  }) {
    return TextField(
      controller: controller,
      keyboardType: keyboardType,
      obscureText: obscureText,
      style: const TextStyle(color: Color(0xFF0F172A), fontSize: 13),
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12.5),
        prefixIcon: Icon(icon, color: const Color(0xFF0D9488), size: 18),
        suffixIcon: suffixIcon,
        filled: true,
        fillColor: Colors.white,
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFFCBD5E1)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFFCBD5E1)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFF0D9488), width: 1.8),
        ),
      ),
    );
  }

  Widget _buildSubmitButton({
    required String label,
    required VoidCallback onPressed,
  }) {
    return SizedBox(
      width: double.infinity,
      height: 46,
      child: ElevatedButton(
        onPressed: _loading ? null : onPressed,
        style: ElevatedButton.styleFrom(
          backgroundColor: const Color(0xFF0D9488), // Exact Web Teal
          foregroundColor: Colors.white,
          elevation: 3,
          shadowColor: const Color(0xFF0D9488).withValues(alpha: 0.4),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
        child: _loading
            ? const SizedBox(
                width: 22,
                height: 22,
                child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5),
              )
            : Text(
                label,
                style: const TextStyle(
                  fontSize: 14.5,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 0.3,
                ),
              ),
      ),
    );
  }
}
