import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../services/doctor_api_service.dart';
import '../../services/auth_service.dart';
import '../../utils/theme.dart';
import 'payment_confirmation_screen.dart';

class PatientDetailsScreen extends StatefulWidget {
  final Doctor doctor;
  final DoctorSession session;
  final String sessionDate;

  const PatientDetailsScreen({
    super.key,
    required this.doctor,
    required this.session,
    required this.sessionDate,
  });

  @override
  State<PatientDetailsScreen> createState() => _PatientDetailsScreenState();
}

class _PatientDetailsScreenState extends State<PatientDetailsScreen> {
  final _formKey = GlobalKey<FormState>();
  final ScrollController _scrollCtrl = ScrollController();

  final TextEditingController _nameCtrl = TextEditingController();
  final TextEditingController _nicCtrl = TextEditingController();
  final TextEditingController _phoneCtrl = TextEditingController();
  final TextEditingController _emailCtrl = TextEditingController();
  final TextEditingController _addressCtrl = TextEditingController();
  final TextEditingController _notesCtrl = TextEditingController();

  AutovalidateMode _autoValidateMode = AutovalidateMode.disabled;
  String _bookingType = 'Reservation'; // 'Reservation' or 'OnlinePayment'
  bool _reserving = false;

  @override
  void initState() {
    super.initState();
    _prefillUserData();
  }

  Future<void> _prefillUserData() async {
    final user = await AuthService.getUser();
    if (user != null && mounted) {
      setState(() {
        _nameCtrl.text = user.name;
        _emailCtrl.text = user.email;
      });
    }
  }

  @override
  void dispose() {
    _scrollCtrl.dispose();
    _nameCtrl.dispose();
    _nicCtrl.dispose();
    _phoneCtrl.dispose();
    _emailCtrl.dispose();
    _addressCtrl.dispose();
    _notesCtrl.dispose();
    super.dispose();
  }

  bool _validateForm() {
    setState(() => _autoValidateMode = AutovalidateMode.onUserInteraction);
    if (!_formKey.currentState!.validate()) {
      HapticFeedback.heavyImpact();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please correct the highlighted errors in the form.'),
          backgroundColor: Colors.red,
          behavior: SnackBarBehavior.floating,
          duration: Duration(seconds: 3),
        ),
      );
      if (_scrollCtrl.hasClients) {
        _scrollCtrl.animateTo(
          200,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
      return false;
    }
    return true;
  }

  Future<void> _confirmReservation() async {
    if (!_validateForm()) return;
    HapticFeedback.lightImpact();
    setState(() => _reserving = true);
    try {
      final appointment = await DoctorApiService.bookAppointment({
        'doctorId': widget.doctor.id,
        'doctorSessionId': widget.session.id,
        'bookingType': 'Reservation',
        'patientName': _nameCtrl.text.trim(),
        'patientNic': _nicCtrl.text.trim(),
        'patientPhone': _phoneCtrl.text.trim(),
        'patientEmail': _emailCtrl.text.trim(),
        'patientAddress': _addressCtrl.text.trim(),
        'notes': _notesCtrl.text.trim(),
      });

      if (mounted) {
        HapticFeedback.mediumImpact();
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (_) => PaymentConfirmationScreen(
              doctor: widget.doctor,
              session: widget.session,
              sessionDate: widget.sessionDate,
              patientName: _nameCtrl.text.trim(),
              patientNic: _nicCtrl.text.trim(),
              patientPhone: _phoneCtrl.text.trim(),
              patientEmail: _emailCtrl.text.trim(),
              patientAddress: _addressCtrl.text.trim(),
              notes: _notesCtrl.text.trim(),
              initialConfirmedAppointment: appointment,
            ),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Reservation failed: $e'),
            backgroundColor: Colors.red.shade700,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _reserving = false);
    }
  }

  void _proceedToPayment() {
    if (!_validateForm()) return;
    HapticFeedback.lightImpact();
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => PaymentConfirmationScreen(
          doctor: widget.doctor,
          session: widget.session,
          sessionDate: widget.sessionDate,
          patientName: _nameCtrl.text.trim(),
          patientNic: _nicCtrl.text.trim(),
          patientPhone: _phoneCtrl.text.trim(),
          patientEmail: _emailCtrl.text.trim(),
          patientAddress: _addressCtrl.text.trim(),
          notes: _notesCtrl.text.trim(),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final totalFee = widget.doctor.consultationFee + 300.0;

    return Scaffold(
      backgroundColor: kBg,
      appBar: AppBar(
        backgroundColor: kPrimaryDark,
        foregroundColor: Colors.white,
        elevation: 0,
        title: const Text('Patient Details & Booking', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
      ),
      bottomNavigationBar: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: Colors.white,
          border: const Border(top: BorderSide(color: kBorder)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.08),
              blurRadius: 10,
              offset: const Offset(0, -2),
            ),
          ],
        ),
        child: SafeArea(
          child: SizedBox(
            height: 48,
            child: ElevatedButton(
              onPressed: _reserving
                  ? null
                  : _bookingType == 'Reservation'
                      ? _confirmReservation
                      : _proceedToPayment,
              style: ElevatedButton.styleFrom(
                backgroundColor: _bookingType == 'Reservation' ? const Color(0xFF047857) : kPrimary,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                elevation: 0,
              ),
              child: _reserving
                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          _bookingType == 'Reservation'
                              ? 'Confirm Reservation (Pay at Desk)'
                              : 'Proceed to Payment (LKR ${totalFee.toStringAsFixed(0)})',
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                        ),
                        const SizedBox(width: 8),
                        const Icon(Icons.arrow_forward, size: 16),
                      ],
                    ),
            ),
          ),
        ),
      ),
      body: SingleChildScrollView(
        controller: _scrollCtrl,
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          autovalidateMode: _autoValidateMode,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Appointment Summary Banner
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: kPrimaryDark,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('CONSULTATION SUMMARY', style: TextStyle(color: Color(0xFF80CBC4), fontSize: 10, fontWeight: FontWeight.w800, letterSpacing: 0.5)),
                    const SizedBox(height: 4),
                    Text(
                      '${widget.doctor.fullName} (${widget.doctor.specialization})',
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '${widget.session.sessionType} Session • ${widget.sessionDate} (${widget.session.timeRange.isNotEmpty ? widget.session.timeRange : widget.session.timeFormatted})',
                      style: const TextStyle(color: Color(0xFFE0F2F1), fontSize: 12),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 18),

              // Booking Choice Header
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: const Color(0xFFE0F2F1),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: const Text('STEP 3', style: TextStyle(color: kPrimaryDark, fontWeight: FontWeight.w800, fontSize: 10)),
                  ),
                  const SizedBox(width: 8),
                  const Text(
                    'Choose Booking Preference',
                    style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: kPrimaryDark),
                  ),
                ],
              ),
              const SizedBox(height: 10),

              // Two Differentiated Option Cards (Reservation vs Book & Pay Online)
              _buildBookingOptionCard(
                type: 'Reservation',
                title: 'Reserve & Pay at Counter',
                subtitle: 'Guaranteed queue token. Pay cash or card at the hospital channeling desk upon arrival.',
                badge: 'No advance payment',
                badgeColor: const Color(0xFFD97706),
                icon: Icons.storefront_outlined,
              ),
              const SizedBox(height: 10),
              _buildBookingOptionCard(
                type: 'OnlinePayment',
                title: 'Pay Online Now (Instant Pass)',
                subtitle: 'Instant confirmation with digital receipt and hospital check-in QR code.',
                badge: 'Fast-track Check-in',
                badgeColor: const Color(0xFF047857),
                icon: Icons.credit_card_outlined,
              ),
              const SizedBox(height: 20),

              // Form Container
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: kBorder),
                  boxShadow: const [
                    BoxShadow(color: Color(0x06000000), blurRadius: 6, offset: Offset(0, 2)),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Patient Identity & Contact Details',
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: kText),
                    ),
                    const SizedBox(height: 14),

                    // Full Name
                    TextFormField(
                      controller: _nameCtrl,
                      decoration: InputDecoration(
                        labelText: 'Patient Full Name *',
                        hintText: 'e.g. Nuwan Perera',
                        filled: true,
                        fillColor: const Color(0xFFF9FAFB),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: kBorder)),
                        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: kBorder)),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                      ),
                      validator: (val) {
                        final trimmed = val?.trim() ?? '';
                        if (trimmed.isEmpty) return 'Full Name is required';
                        if (trimmed.length < 2) return 'Please enter at least 2 characters';
                        return null;
                      },
                    ),
                    const SizedBox(height: 12),

                    // NIC
                    TextFormField(
                      controller: _nicCtrl,
                      decoration: InputDecoration(
                        labelText: 'National ID / Passport *',
                        hintText: 'e.g. 199512345678 or 987654321V',
                        filled: true,
                        fillColor: const Color(0xFFF9FAFB),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: kBorder)),
                        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: kBorder)),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                      ),
                      validator: (val) {
                        final trimmed = val?.trim() ?? '';
                        if (trimmed.isEmpty) return 'NIC / Passport number is required';
                        final nicRegex = RegExp(r'^([0-9]{9}[vVxX]|[0-9]{12}|[A-Za-z0-9]{7,10})$');
                        if (!nicRegex.hasMatch(trimmed)) {
                          return 'Invalid format (e.g. 199512345678 or 987654321V)';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 12),

                    // Phone
                    TextFormField(
                      controller: _phoneCtrl,
                      keyboardType: TextInputType.phone,
                      decoration: InputDecoration(
                        labelText: 'Contact Phone Number *',
                        hintText: 'e.g. +94 77 123 4567',
                        filled: true,
                        fillColor: const Color(0xFFF9FAFB),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: kBorder)),
                        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: kBorder)),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                      ),
                      validator: (val) {
                        final clean = (val ?? '').replaceAll(RegExp(r'[\s\-]+'), '');
                        if (clean.isEmpty) return 'Contact phone number is required';
                        final phoneRegex = RegExp(r'^(?:07[0-9]{8}|\+947[0-9]{8}|0[0-9]{9})$');
                        if (!phoneRegex.hasMatch(clean)) {
                          return 'Invalid phone number (e.g. 0771234567 or +94771234567)';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 12),

                    // Email
                    TextFormField(
                      controller: _emailCtrl,
                      keyboardType: TextInputType.emailAddress,
                      decoration: InputDecoration(
                        labelText: 'Email Address (for QR pass & delays) *',
                        hintText: 'e.g. patient@gmail.com',
                        filled: true,
                        fillColor: const Color(0xFFF9FAFB),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: kBorder)),
                        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: kBorder)),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                      ),
                      validator: (val) {
                        final trimmed = val?.trim() ?? '';
                        if (trimmed.isEmpty) {
                          return 'Email is required for confirmation & QR pass';
                        }
                        final emailRegex = RegExp(r'^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$');
                        if (!emailRegex.hasMatch(trimmed)) {
                          return 'Invalid email address (e.g. name@gmail.com)';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 12),

                    // Address
                    TextFormField(
                      controller: _addressCtrl,
                      decoration: InputDecoration(
                        labelText: 'Residential Address (Optional)',
                        hintText: 'e.g. 45 Galle Road, Colombo',
                        filled: true,
                        fillColor: const Color(0xFFF9FAFB),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: kBorder)),
                        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: kBorder)),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                      ),
                    ),
                    const SizedBox(height: 12),

                    // Notes
                    TextFormField(
                      controller: _notesCtrl,
                      maxLines: 2,
                      decoration: InputDecoration(
                        labelText: 'Clinical Notes / Symptoms (Optional)',
                        hintText: 'Brief note for the doctor...',
                        filled: true,
                        fillColor: const Color(0xFFF9FAFB),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: kBorder)),
                        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: kBorder)),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildBookingOptionCard({
    required String type,
    required String title,
    required String subtitle,
    required String badge,
    required Color badgeColor,
    required IconData icon,
  }) {
    final isSelected = _bookingType == type;

    return InkWell(
      onTap: () {
        HapticFeedback.lightImpact();
        setState(() => _bookingType = type);
      },
      borderRadius: BorderRadius.circular(14),
      child: Container(
        constraints: const BoxConstraints(minHeight: 64),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFFF0FDF4) : Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: isSelected ? kPrimary : kBorder,
            width: isSelected ? 2 : 1,
          ),
          boxShadow: isSelected
              ? [BoxShadow(color: kPrimary.withValues(alpha: 0.12), blurRadius: 8, offset: const Offset(0, 2))]
              : [const BoxShadow(color: Color(0x06000000), blurRadius: 4, offset: Offset(0, 1))],
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: isSelected ? const Color(0xFFDCFCE7) : const Color(0xFFF1F5F9),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: isSelected ? kPrimary : const Color(0xFF64748B), size: 22),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          title,
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            color: isSelected ? kPrimaryDark : kText,
                          ),
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: badgeColor.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          badge,
                          style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: badgeColor),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    subtitle,
                    style: const TextStyle(fontSize: 12, color: Color(0xFF64748B), height: 1.35),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            Container(
              width: 22,
              height: 22,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(color: isSelected ? kPrimary : Colors.grey, width: 2),
                color: isSelected ? kPrimary : Colors.transparent,
              ),
              child: isSelected ? const Icon(Icons.check, size: 14, color: Colors.white) : null,
            ),
          ],
        ),
      ),
    );
  }
}
