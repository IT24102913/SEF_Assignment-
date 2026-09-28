import 'package:flutter/material.dart';
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

  final TextEditingController _nameCtrl = TextEditingController();
  final TextEditingController _nicCtrl = TextEditingController();
  final TextEditingController _phoneCtrl = TextEditingController();
  final TextEditingController _emailCtrl = TextEditingController();
  final TextEditingController _addressCtrl = TextEditingController();
  final TextEditingController _notesCtrl = TextEditingController();

  bool _validatingSlot = false;
  bool _slotValidated = false;
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
    _nameCtrl.dispose();
    _nicCtrl.dispose();
    _phoneCtrl.dispose();
    _emailCtrl.dispose();
    _addressCtrl.dispose();
    _notesCtrl.dispose();
    super.dispose();
  }

  Future<void> _validateAvailability() async {
    setState(() => _validatingSlot = true);
    try {
      final sessions = await DoctorApiService.getDoctorSessions(widget.doctor.id, date: widget.sessionDate);
      final match = sessions.firstWhere(
        (s) => s.id == widget.session.id,
        orElse: () => widget.session,
      );

      if (mounted) {
        if (match.isAvailable) {
          setState(() => _slotValidated = true);
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Session slot verified! Space is open.'), backgroundColor: Colors.green),
          );
        } else {
          setState(() => _slotValidated = false);
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('This slot is now fully booked. Please pick another session.'), backgroundColor: Colors.red),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Could not re-verify slot availability.')),
        );
      }
    } finally {
      if (mounted) setState(() => _validatingSlot = false);
    }
  }

  Future<void> _confirmReservation() async {
    if (!_formKey.currentState!.validate()) return;
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
          SnackBar(content: Text('Reservation failed: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _reserving = false);
    }
  }

  void _proceedToPayment() {
    if (_formKey.currentState!.validate()) {
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
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: kBg,
      appBar: AppBar(
        backgroundColor: kPrimaryDark,
        foregroundColor: Colors.white,
        title: const Text('Patient Details', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17)),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Persistent Teal Appointment Summary Banner
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
                    const Text('STEP 3: PATIENT DETAILS FORM', style: TextStyle(color: Color(0xFF80CBC4), fontSize: 10, fontWeight: FontWeight.w800)),
                    const SizedBox(height: 4),
                    Text(
                      'Doctor: ${widget.doctor.fullName} (${widget.doctor.specialization})',
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'Date: ${widget.sessionDate}, ${widget.session.timeFormatted} | Fee: LKR ${widget.doctor.consultationFee.toStringAsFixed(0)}',
                      style: const TextStyle(color: Color(0xFFE0F2F1), fontSize: 12),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 18),

              // Form Container
              Container(
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: kBorder),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Patient Identity & Contact Information',
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: kText),
                    ),
                    const SizedBox(height: 14),

                    // Full Name
                    TextFormField(
                      controller: _nameCtrl,
                      decoration: const InputDecoration(
                        labelText: 'Full Name *',
                        hintText: 'e.g. Nuwan Perera',
                        border: OutlineInputBorder(),
                        contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      ),
                      validator: (val) => val == null || val.trim().isEmpty ? 'Full Name is required' : null,
                    ),
                    const SizedBox(height: 12),

                    // NIC
                    TextFormField(
                      controller: _nicCtrl,
                      decoration: const InputDecoration(
                        labelText: 'NIC / Passport *',
                        hintText: 'e.g. 199512345678 or 987654321V',
                        border: OutlineInputBorder(),
                        contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      ),
                      validator: (val) => val == null || val.trim().isEmpty ? 'NIC / Passport is required' : null,
                    ),
                    const SizedBox(height: 12),

                    // Phone
                    TextFormField(
                      controller: _phoneCtrl,
                      keyboardType: TextInputType.phone,
                      decoration: const InputDecoration(
                        labelText: 'Contact Phone Number *',
                        hintText: 'e.g. +94 77 123 4567',
                        border: OutlineInputBorder(),
                        contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      ),
                      validator: (val) => val == null || val.trim().isEmpty ? 'Phone number is required' : null,
                    ),
                    const SizedBox(height: 12),

                    // Email
                    TextFormField(
                      controller: _emailCtrl,
                      keyboardType: TextInputType.emailAddress,
                      decoration: const InputDecoration(
                        labelText: 'Email Address',
                        hintText: 'e.g. patient@gmail.com',
                        border: OutlineInputBorder(),
                        contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      ),
                    ),
                    const SizedBox(height: 12),

                    // Address
                    TextFormField(
                      controller: _addressCtrl,
                      decoration: const InputDecoration(
                        labelText: 'Address (Optional)',
                        hintText: 'e.g. 45 Galle Road, Colombo',
                        border: OutlineInputBorder(),
                        contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      ),
                    ),
                    const SizedBox(height: 12),

                    // Notes
                    TextFormField(
                      controller: _notesCtrl,
                      maxLines: 2,
                      decoration: const InputDecoration(
                        labelText: 'Clinical Notes / Symptoms (Optional)',
                        hintText: 'Brief note for the doctor...',
                        border: OutlineInputBorder(),
                        contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Booking Type Preference Card Selector
                    const Text('Booking & Payment Preference *', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: kText)),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Expanded(
                          child: InkWell(
                            onTap: () => setState(() => _bookingType = 'Reservation'),
                            borderRadius: BorderRadius.circular(8),
                            child: Container(
                              padding: const EdgeInsets.all(10),
                              decoration: BoxDecoration(
                                color: _bookingType == 'Reservation' ? const Color(0xFFE0F2F1) : Colors.white,
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(
                                  color: _bookingType == 'Reservation' ? kPrimary : kBorder,
                                  width: _bookingType == 'Reservation' ? 2 : 1,
                                ),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      const Text('Reserve Place', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: kPrimaryDark)),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                                        decoration: BoxDecoration(color: Colors.green.shade100, borderRadius: BorderRadius.circular(4)),
                                        child: Text('Pay at Desk', style: TextStyle(color: Colors.green.shade800, fontSize: 9, fontWeight: FontWeight.bold)),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 4),
                                  const Text('Get queue & QR immediately. Pay at hospital counter.', style: TextStyle(fontSize: 10, color: Colors.grey)),
                                ],
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: InkWell(
                            onTap: () => setState(() => _bookingType = 'OnlinePayment'),
                            borderRadius: BorderRadius.circular(8),
                            child: Container(
                              padding: const EdgeInsets.all(10),
                              decoration: BoxDecoration(
                                color: _bookingType == 'OnlinePayment' ? const Color(0xFFE0F2F1) : Colors.white,
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(
                                  color: _bookingType == 'OnlinePayment' ? kPrimary : kBorder,
                                  width: _bookingType == 'OnlinePayment' ? 2 : 1,
                                ),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      const Text('Pay Online', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: kPrimaryDark)),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                                        decoration: BoxDecoration(color: Colors.blue.shade100, borderRadius: BorderRadius.circular(4)),
                                        child: Text('Card/Wallet', style: TextStyle(color: Colors.blue.shade800, fontSize: 9, fontWeight: FontWeight.bold)),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 4),
                                  const Text('Pay with Card or Mobile Wallet for fast-track arrival.', style: TextStyle(fontSize: 10, color: Colors.grey)),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),

                    // Action Buttons
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: _validatingSlot ? null : _validateAvailability,
                            icon: _validatingSlot
                                ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2))
                                : Icon(_slotValidated ? Icons.check : Icons.refresh, size: 16),
                            label: Text(_slotValidated ? 'Validated' : 'Validate Slot', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                            style: OutlinedButton.styleFrom(
                              foregroundColor: kPrimary,
                              side: const BorderSide(color: kPrimary),
                              padding: const EdgeInsets.symmetric(vertical: 12),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: _bookingType == 'Reservation'
                              ? ElevatedButton.icon(
                                  onPressed: _reserving ? null : _confirmReservation,
                                  icon: _reserving
                                      ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                                      : const Icon(Icons.check_circle, size: 16),
                                  label: Text(_reserving ? 'Reserving...' : 'Reserve Place', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: kPrimary,
                                    foregroundColor: Colors.white,
                                    padding: const EdgeInsets.symmetric(vertical: 12),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                  ),
                                )
                              : ElevatedButton.icon(
                                  onPressed: _proceedToPayment,
                                  icon: const Icon(Icons.payment, size: 16),
                                  label: const Text('To Payment', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: kPrimary,
                                    foregroundColor: Colors.white,
                                    padding: const EdgeInsets.symmetric(vertical: 12),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                  ),
                                ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
