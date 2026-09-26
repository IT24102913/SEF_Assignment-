import 'package:flutter/material.dart';
import '../../services/emr_api_service.dart';
import '../../services/auth_service.dart';
import '../../main.dart';
import '../../utils/theme.dart';

class CustomerProfileScreen extends StatefulWidget {
  const CustomerProfileScreen({super.key});

  @override
  State<CustomerProfileScreen> createState() => _CustomerProfileScreenState();
}

class _CustomerProfileScreenState extends State<CustomerProfileScreen> {
  bool _loading = true;
  bool _saving = false;
  String _error = '';
  String _success = '';

  Patient? _patient;

  // Controllers
  final _addressCtrl = TextEditingController();
  final _emergencyNameCtrl = TextEditingController();
  final _emergencyPhoneCtrl = TextEditingController();
  final _allergiesCtrl = TextEditingController();

  DateTime? _selectedDob;
  String _selectedGender = 'Other';
  String _selectedBloodGroup = 'Unknown';

  final List<String> _genders = ['Male', 'Female', 'Other'];
  final List<String> _bloodGroups = ['Unknown', 'A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

  @override
  void initState() {
    super.initState();
    _fetchProfile();
  }

  @override
  void dispose() {
    _addressCtrl.dispose();
    _emergencyNameCtrl.dispose();
    _emergencyPhoneCtrl.dispose();
    _allergiesCtrl.dispose();
    super.dispose();
  }

  Future<void> _fetchProfile() async {
    setState(() {
      _loading = true;
      _error = '';
    });
    try {
      final patient = await EmrApiService.getMyPatient();
      if (mounted) {
        setState(() {
          _patient = patient;
          _addressCtrl.text = patient.address;
          _emergencyNameCtrl.text = patient.emergencyContactName;
          _emergencyPhoneCtrl.text = patient.emergencyContactPhone;
          _allergiesCtrl.text = patient.allergies;
          _selectedDob = (patient.dateOfBirth != null && patient.dateOfBirth != DateTime.fromMillisecondsSinceEpoch(0))
              ? patient.dateOfBirth
              : null;
          if (_genders.contains(patient.gender)) _selectedGender = patient.gender;
          if (_bloodGroups.contains(patient.bloodGroup)) _selectedBloodGroup = patient.bloodGroup;
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = 'Could not load profile from server.';
          _loading = false;
        });
      }
    }
  }

  Future<void> _handleSave() async {
    setState(() {
      _saving = true;
      _error = '';
      _success = '';
    });
    final patientCode = _patient?.patientCode ?? AuthState.patientCode ?? EmrApiService.activePatientCode;

    try {
      final payload = {
        'fullName': _patient?.fullName ?? AuthState.name ?? 'Patient',
        'contactPhone': _patient?.contactPhone ?? AuthState.phoneNumber ?? '',
        'email': _patient?.email ?? AuthState.email ?? '',
        'dateOfBirth': _selectedDob?.toIso8601String(),
        'gender': _selectedGender,
        'bloodGroup': _selectedBloodGroup,
        'address': _addressCtrl.text.trim(),
        'emergencyContactName': _emergencyNameCtrl.text.trim(),
        'emergencyContactPhone': _emergencyPhoneCtrl.text.trim(),
        'allergies': _allergiesCtrl.text.trim(),
        'chronicConditions': _patient?.chronicConditions ?? '',
      };

      final updated = await EmrApiService.updatePatientProfile(patientCode, payload);

      if (mounted) {
        setState(() {
          _patient = updated;
          _saving = false;
          _success = 'Profile updated successfully!';
        });

        // Update local auth state if needed
        AuthState.phoneNumber = updated.contactPhone;
        AuthState.age = updated.age;
        if (updated.fullName.isNotEmpty) {
          AuthState.name = updated.fullName;
        }

        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Medical Profile saved successfully!'),
            backgroundColor: HealthBridgeTheme.accentTeal,
            duration: Duration(seconds: 2),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _saving = false;
          _error = 'Failed to save profile. Please check server connection.';
        });
      }
    }
  }

  Future<void> _confirmLogout() async {
    final shouldLogout = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: const [
            Icon(Icons.logout_rounded, color: Color(0xFFDC2626)),
            SizedBox(width: 10),
            Text('Log Out', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 18)),
          ],
        ),
        content: const Text(
          'Are you sure you want to log out of your Health Bridge account?',
          style: TextStyle(fontSize: 14, color: Color(0xFF475569)),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Cancel', style: TextStyle(color: Color(0xFF64748B), fontWeight: FontWeight.w600)),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFDC2626),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            ),
            child: const Text('Log Out', style: TextStyle(fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    );

    if (shouldLogout == true && mounted) {
      await AuthService.logout();
      AuthState.clear();
      AppSession.isLoggedIn = false;
      AppSession.loggedInUserEmail = null;
      AppSession.userName = null;
      if (mounted) {
        Navigator.of(context).pushNamedAndRemoveUntil('/login', (route) => false);
      }
    }
  }

  Future<void> _pickDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDob ?? DateTime(2000, 1, 1),
      firstDate: DateTime(1920),
      lastDate: now,
      builder: (context, child) {
        return Theme(
          data: ThemeData.light().copyWith(
            colorScheme: const ColorScheme.light(
              primary: HealthBridgeTheme.primaryTeal,
            ),
          ),
          child: child!,
        );
      },
    );
    if (picked != null) {
      setState(() => _selectedDob = picked);
    }
  }

  String _getInitials(String name) {
    if (name.trim().isEmpty) return 'P';
    final parts = name.trim().split(RegExp(r'\s+'));
    if (parts.length >= 2 && parts[0].isNotEmpty && parts[1].isNotEmpty) {
      return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    }
    return parts[0][0].toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    final name = _patient?.fullName.isNotEmpty == true
        ? _patient!.fullName
        : ((AuthState.name?.isNotEmpty == true) ? AuthState.name! : 'Patient');
    final age = _patient?.age != null && _patient!.age > 0 ? _patient!.age : AuthState.age;
    final phone = _patient?.contactPhone.isNotEmpty == true
        ? _patient!.contactPhone
        : (AuthState.phoneNumber?.isNotEmpty == true ? AuthState.phoneNumber! : 'Not provided');
    final email = _patient?.email.isNotEmpty == true
        ? _patient!.email
        : (AuthState.email ?? '');
    final patientCode = _patient?.patientCode.isNotEmpty == true
        ? _patient!.patientCode
        : (AuthState.patientCode ?? EmrApiService.activePatientCode);
    final initials = _getInitials(name);

    return Scaffold(
      backgroundColor: HealthBridgeTheme.lightBg,
      appBar: AppBar(
        backgroundColor: HealthBridgeTheme.primaryTeal,
        foregroundColor: Colors.white,
        title: const Text(
          'Patient Profile',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
        ),
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.logout_rounded, color: Colors.white),
            tooltip: 'Log Out',
            onPressed: _confirmLogout,
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: HealthBridgeTheme.primaryTeal))
          : SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // ── Patient Header Card ──────────────────────────────────────
                  Container(
                    padding: const EdgeInsets.all(18),
                    decoration: HealthBridgeTheme.cardDecoration(),
                    child: Row(
                      children: [
                        Container(
                          width: 54,
                          height: 54,
                          decoration: const BoxDecoration(
                            gradient: LinearGradient(
                              colors: [HealthBridgeTheme.primaryTeal, HealthBridgeTheme.accentTeal],
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                            ),
                            shape: BoxShape.circle,
                          ),
                          child: Center(
                            child: Text(
                              initials,
                              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 20),
                            ),
                          ),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                name,
                                style: const TextStyle(
                                  fontSize: 17,
                                  fontWeight: FontWeight.w800,
                                  color: HealthBridgeTheme.textPrimary,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                email,
                                style: const TextStyle(
                                  fontSize: 12.5,
                                  color: HealthBridgeTheme.textSecondary,
                                ),
                              ),
                            ],
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                          decoration: BoxDecoration(
                            color: HealthBridgeTheme.mintAccent,
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: HealthBridgeTheme.accentTeal.withValues(alpha: 0.3)),
                          ),
                          child: Text(
                            patientCode,
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w800,
                              color: HealthBridgeTheme.primaryTeal,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 18),

                  // ── Feedback alerts ──────────────────────────────────────────
                  if (_success.isNotEmpty)
                    Container(
                      margin: const EdgeInsets.only(bottom: 16),
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF0FDF4),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: const Color(0xFFBBF7D0)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.check_circle_outline, color: Color(0xFF16A34A), size: 18),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              _success,
                              style: const TextStyle(color: Color(0xFF16A34A), fontWeight: FontWeight.w600, fontSize: 13),
                            ),
                          ),
                        ],
                      ),
                    ),

                  if (_error.isNotEmpty)
                    Container(
                      margin: const EdgeInsets.only(bottom: 16),
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFEF2F2),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: const Color(0xFFFECACA)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.error_outline, color: Color(0xFFDC2626), size: 18),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              _error,
                              style: const TextStyle(color: Color(0xFFDC2626), fontWeight: FontWeight.w600, fontSize: 13),
                            ),
                          ),
                        ],
                      ),
                    ),

                  // ── Registration Details (Read-only) ─────────────────────────
                  const Text(
                    'Account Registration Info',
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                      color: HealthBridgeTheme.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 10),

                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: HealthBridgeTheme.cardDecoration(),
                    child: Column(
                      children: [
                        _buildInfoRow(Icons.person_outline, 'Full Name', name),
                        const Divider(height: 20),
                        _buildInfoRow(Icons.numbers, 'Age', age != null && age > 0 ? '$age years' : 'Not specified'),
                        const Divider(height: 20),
                        _buildInfoRow(Icons.phone_outlined, 'Phone Number', phone),
                        const Divider(height: 20),
                        _buildInfoRow(Icons.email_outlined, 'Email Address', email),
                      ],
                    ),
                  ),

                  const SizedBox(height: 24),

                  // ── Editable Medical Details ─────────────────────────────────
                  const Text(
                    'Medical & Emergency Details',
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                      color: HealthBridgeTheme.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 10),

                  Container(
                    padding: const EdgeInsets.all(18),
                    decoration: HealthBridgeTheme.cardDecoration(),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Date of Birth Field
                        const Text('Date of Birth', style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: HealthBridgeTheme.textSecondary)),
                        const SizedBox(height: 6),
                        InkWell(
                          onTap: _pickDate,
                          borderRadius: BorderRadius.circular(10),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF2FAF8),
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(color: const Color(0xFFCCE8E3), width: 1.5),
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.calendar_today_outlined, size: 18, color: HealthBridgeTheme.textSecondary),
                                const SizedBox(width: 10),
                                Text(
                                  _selectedDob != null
                                      ? '${_selectedDob!.year}-${_selectedDob!.month.toString().padLeft(2, '0')}-${_selectedDob!.day.toString().padLeft(2, '0')}'
                                      : 'Select Date of Birth',
                                  style: TextStyle(
                                    fontSize: 14,
                                    color: _selectedDob != null ? HealthBridgeTheme.textPrimary : HealthBridgeTheme.textSecondary,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),

                        const SizedBox(height: 16),

                        // Gender & Blood Group Row
                        Row(
                          children: [
                            // Gender Dropdown
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text('Gender', style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: HealthBridgeTheme.textSecondary)),
                                  const SizedBox(height: 6),
                                  DropdownButtonFormField<String>(
                                    initialValue: _selectedGender,
                                    decoration: _inputDecoration(Icons.transgender),
                                    items: _genders
                                        .map((g) => DropdownMenuItem(value: g, child: Text(g, style: const TextStyle(fontSize: 13.5))))
                                        .toList(),
                                    onChanged: (v) {
                                      if (v != null) setState(() => _selectedGender = v);
                                    },
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(width: 12),
                            // Blood Group Dropdown
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text('Blood Group', style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: HealthBridgeTheme.textSecondary)),
                                  const SizedBox(height: 6),
                                  DropdownButtonFormField<String>(
                                    initialValue: _selectedBloodGroup,
                                    decoration: _inputDecoration(Icons.bloodtype_outlined),
                                    items: _bloodGroups
                                        .map((b) => DropdownMenuItem(value: b, child: Text(b, style: const TextStyle(fontSize: 13.5))))
                                        .toList(),
                                    onChanged: (v) {
                                      if (v != null) setState(() => _selectedBloodGroup = v);
                                    },
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),

                        const SizedBox(height: 16),

                        // Address Field
                        const Text('Residential Address', style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: HealthBridgeTheme.textSecondary)),
                        const SizedBox(height: 6),
                        TextField(
                          controller: _addressCtrl,
                          decoration: _inputDecoration(Icons.home_outlined, hint: 'e.g. 12/4 Temple Road, Colombo'),
                          style: const TextStyle(fontSize: 14),
                        ),

                        const SizedBox(height: 16),

                        // Emergency Contact Name
                        const Text('Emergency Contact Name', style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: HealthBridgeTheme.textSecondary)),
                        const SizedBox(height: 6),
                        TextField(
                          controller: _emergencyNameCtrl,
                          decoration: _inputDecoration(Icons.contact_phone_outlined, hint: 'e.g. Jane Doe (Spouse)'),
                          style: const TextStyle(fontSize: 14),
                        ),

                        const SizedBox(height: 16),

                        // Emergency Contact Phone
                        const Text('Emergency Contact Phone', style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: HealthBridgeTheme.textSecondary)),
                        const SizedBox(height: 6),
                        TextField(
                          controller: _emergencyPhoneCtrl,
                          keyboardType: TextInputType.phone,
                          decoration: _inputDecoration(Icons.phone_outlined, hint: 'e.g. +94 77 123 4567'),
                          style: const TextStyle(fontSize: 14),
                        ),

                        const SizedBox(height: 16),

                        // Allergies
                        const Text('Known Allergies', style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: HealthBridgeTheme.textSecondary)),
                        const SizedBox(height: 6),
                        TextField(
                          controller: _allergiesCtrl,
                          decoration: _inputDecoration(Icons.warning_amber_rounded, hint: 'e.g. Penicillin, Peanuts, None'),
                          style: const TextStyle(fontSize: 14),
                        ),
                        const SizedBox(height: 4),
                        const Text(
                          'Checked by clinical engine against prescribed drugs.',
                          style: TextStyle(fontSize: 11, color: Color(0xFF94A3B8)),
                        ),

                        const SizedBox(height: 24),

                        // Save Button
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton.icon(
                            onPressed: _saving ? null : _handleSave,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: HealthBridgeTheme.accentTeal,
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            ),
                            icon: _saving
                                ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                                : const Icon(Icons.save_outlined, color: Colors.white),
                            label: Text(
                              _saving ? 'Saving...' : 'Save Medical Profile',
                              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 15),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 20),

                  // ── Logout Section Card ───────────────────────────────────────
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(18),
                    decoration: HealthBridgeTheme.cardDecoration(),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: const [
                            Icon(Icons.shield_outlined, size: 20, color: HealthBridgeTheme.textPrimary),
                            SizedBox(width: 8),
                            Text(
                              'Account Session',
                              style: TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.w700,
                                color: HealthBridgeTheme.textPrimary,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        const Text(
                          'Log out from this device to end your secure session and protect your health data.',
                          style: TextStyle(
                            fontSize: 12.5,
                            color: HealthBridgeTheme.textSecondary,
                            height: 1.35,
                          ),
                        ),
                        const SizedBox(height: 16),
                        SizedBox(
                          width: double.infinity,
                          child: OutlinedButton.icon(
                            onPressed: _confirmLogout,
                            style: OutlinedButton.styleFrom(
                              foregroundColor: const Color(0xFFDC2626),
                              side: const BorderSide(color: Color(0xFFFCA5A5), width: 1.5),
                              backgroundColor: const Color(0xFFFEF2F2),
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            ),
                            icon: const Icon(Icons.logout_rounded, color: Color(0xFFDC2626), size: 20),
                            label: const Text(
                              'Log Out',
                              style: TextStyle(
                                color: Color(0xFFDC2626),
                                fontWeight: FontWeight.w700,
                                fontSize: 15,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 30),
                ],
              ),
            ),
    );
  }

  InputDecoration _inputDecoration(IconData icon, {String? hint}) {
    return InputDecoration(
      hintText: hint,
      hintStyle: const TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
      prefixIcon: Icon(icon, size: 18, color: HealthBridgeTheme.textSecondary),
      filled: true,
      fillColor: const Color(0xFFF2FAF8),
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: Color(0xFFCCE8E3), width: 1.5),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: Color(0xFFCCE8E3), width: 1.5),
      ),
      focusedBorder: const OutlineInputBorder(
        borderRadius: BorderRadius.all(Radius.circular(10)),
        borderSide: BorderSide(color: HealthBridgeTheme.accentTeal, width: 2),
      ),
    );
  }

  Widget _buildInfoRow(IconData icon, String label, String value) {
    return Row(
      children: [
        Icon(icon, size: 18, color: HealthBridgeTheme.accentTeal),
        const SizedBox(width: 12),
        Text(
          label,
          style: const TextStyle(fontSize: 13, color: HealthBridgeTheme.textSecondary, fontWeight: FontWeight.w500),
        ),
        const Spacer(),
        Text(
          value,
          style: const TextStyle(fontSize: 13.5, color: HealthBridgeTheme.textPrimary, fontWeight: FontWeight.w700),
        ),
      ],
    );
  }
}
