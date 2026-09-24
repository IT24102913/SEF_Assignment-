import 'package:flutter/material.dart';
import '../../services/doctor_api_service.dart';
import '../../utils/theme.dart';
import 'my_appointments_screen.dart';

class PaymentConfirmationScreen extends StatefulWidget {
  final Doctor doctor;
  final DoctorSession session;
  final String sessionDate;
  final String patientName;
  final String patientNic;
  final String patientPhone;
  final String patientEmail;
  final String? patientAddress;
  final String? notes;

  const PaymentConfirmationScreen({
    super.key,
    required this.doctor,
    required this.session,
    required this.sessionDate,
    required this.patientName,
    required this.patientNic,
    required this.patientPhone,
    required this.patientEmail,
    this.patientAddress,
    this.notes,
  });

  @override
  State<PaymentConfirmationScreen> createState() => _PaymentConfirmationScreenState();
}

class _PaymentConfirmationScreenState extends State<PaymentConfirmationScreen> {
  String _paymentMethod = 'CreditCard';
  final TextEditingController _cardNumCtrl = TextEditingController(text: '4532 8912 3456 7890');
  final TextEditingController _expiryCtrl = TextEditingController(text: '12/28');
  final TextEditingController _cvvCtrl = TextEditingController(text: '123');
  final TextEditingController _walletCtrl = TextEditingController();
  final TextEditingController _bankRefCtrl = TextEditingController();

  bool _isProcessing = false;
  DoctorAppointment? _confirmedAppointment;

  @override
  void dispose() {
    _cardNumCtrl.dispose();
    _expiryCtrl.dispose();
    _cvvCtrl.dispose();
    _walletCtrl.dispose();
    _bankRefCtrl.dispose();
    super.dispose();
  }

  double get _totalFee => widget.doctor.consultationFee + 300.0;

  Future<void> _processPayment() async {
    setState(() => _isProcessing = true);
    try {
      // 1. Book Appointment
      final booking = await DoctorApiService.bookAppointment({
        'doctorId': widget.doctor.id,
        'doctorSessionId': widget.session.id,
        'patientName': widget.patientName,
        'patientPhone': widget.patientPhone,
        'patientEmail': widget.patientEmail,
        'patientNic': widget.patientNic,
        'patientAddress': widget.patientAddress,
        'notes': widget.notes,
      });

      // 2. Pay Appointment (Simulated)
      final paid = await DoctorApiService.payAppointment(booking.id, {
        'paymentMethod': _paymentMethod,
        'cardMaskedReference': '**** **** **** 7890',
        'bankReference': _bankRefCtrl.text.trim().isNotEmpty ? _bankRefCtrl.text.trim() : null,
      });

      if (mounted) {
        setState(() {
          _confirmedAppointment = paid;
          _isProcessing = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isProcessing = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Payment failed: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final confirmed = _confirmedAppointment;

    return Scaffold(
      backgroundColor: kBg,
      appBar: AppBar(
        backgroundColor: kPrimaryDark,
        foregroundColor: Colors.white,
        title: Text(confirmed != null ? 'Appointment Confirmed' : 'Secure Payment', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: confirmed != null ? _buildConfirmedView(confirmed) : _buildPaymentFormView(),
      ),
    );
  }

  Widget _buildPaymentFormView() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Fee Summary Card
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: kBorder),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Itemized Payment Breakdown', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: kPrimaryDark)),
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('Consultation Fee (${widget.doctor.fullName})', style: const TextStyle(fontSize: 12, color: Colors.black87)),
                  Text('LKR ${widget.doctor.consultationFee.toStringAsFixed(0)}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                ],
              ),
              const SizedBox(height: 6),
              const Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('Hospital Channeling Service Charge', style: TextStyle(fontSize: 12, color: Colors.black87)),
                  Text('LKR 300.00', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                ],
              ),
              const Divider(height: 18),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Total Payable', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 15, color: kPrimaryDark)),
                  Text('LKR ${_totalFee.toStringAsFixed(0)}', style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16, color: kPrimary)),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 18),

        // 3 Payment Tabs
        const Text('Select Payment Method', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: kText)),
        const SizedBox(height: 8),

        Row(
          children: [
            _buildPaymentMethodTab('Credit Card', 'CreditCard', Icons.credit_card),
            const SizedBox(width: 8),
            _buildPaymentMethodTab('Wallet', 'MobileWallet', Icons.phone_android),
            const SizedBox(width: 8),
            _buildPaymentMethodTab('Bank', 'BankTransfer', Icons.account_balance),
          ],
        ),
        const SizedBox(height: 14),

        // Method Input Container
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: kBorder),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (_paymentMethod == 'CreditCard') ...[
                const Text('Card Information (Simulated Sandbox)', style: TextStyle(fontSize: 11, color: Colors.grey)),
                const SizedBox(height: 10),
                TextField(
                  controller: _cardNumCtrl,
                  decoration: const InputDecoration(labelText: 'Card Number', border: OutlineInputBorder()),
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _expiryCtrl,
                        decoration: const InputDecoration(labelText: 'Expiry (MM/YY)', border: OutlineInputBorder()),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: TextField(
                        controller: _cvvCtrl,
                        obscureText: true,
                        decoration: const InputDecoration(labelText: 'CVV', border: OutlineInputBorder()),
                      ),
                    ),
                  ],
                ),
              ] else if (_paymentMethod == 'MobileWallet') ...[
                const Text('Supports eZ Cash, Dialog Genie, & FriMi', style: TextStyle(fontSize: 11, color: Colors.grey)),
                const SizedBox(height: 10),
                TextField(
                  controller: _walletCtrl,
                  decoration: const InputDecoration(labelText: 'Wallet Mobile Number', hintText: '077 123 4567', border: OutlineInputBorder()),
                ),
              ] else ...[
                const Text('BOC Corporate Account: 00812345678', style: TextStyle(fontSize: 11, color: Colors.grey)),
                const SizedBox(height: 10),
                TextField(
                  controller: _bankRefCtrl,
                  decoration: const InputDecoration(labelText: 'Bank Deposit / Transfer Reference', hintText: 'TXN-982182', border: OutlineInputBorder()),
                ),
              ],
            ],
          ),
        ),
        const SizedBox(height: 24),

        // Confirm & Pay Button
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: _isProcessing ? null : _processPayment,
            style: ElevatedButton.styleFrom(
              backgroundColor: kPrimary,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            child: _isProcessing
                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : Text('Confirm & Pay LKR ${_totalFee.toStringAsFixed(0)}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
          ),
        ),
      ],
    );
  }

  Widget _buildPaymentMethodTab(String label, String value, IconData icon) {
    final selected = _paymentMethod == value;
    return Expanded(
      child: InkWell(
        onTap: () => setState(() => _paymentMethod = value),
        borderRadius: BorderRadius.circular(8),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: selected ? const Color(0xFFE0F2F1) : Colors.white,
            border: Border.all(color: selected ? kPrimary : kBorder, width: selected ? 2 : 1),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Column(
            children: [
              Icon(icon, size: 20, color: selected ? kPrimaryDark : Colors.grey),
              const SizedBox(height: 4),
              Text(
                label,
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  color: selected ? kPrimaryDark : Colors.grey,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildConfirmedView(DoctorAppointment apt) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF80CBC4)),
      ),
      child: Column(
        children: [
          const CircleAvatar(
            radius: 28,
            backgroundColor: Color(0xFFE0F2F1),
            child: Icon(Icons.check_circle, color: kPrimary, size: 36),
          ),
          const SizedBox(height: 10),
          const Text('Appointment Confirmed!', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 18, color: kPrimaryDark)),
          Text('Ref: ${apt.appointmentNumber}', style: const TextStyle(fontSize: 12, color: Colors.grey)),
          const SizedBox(height: 16),

          // Queue Badge
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
            decoration: BoxDecoration(
              color: const Color(0xFFE0F2F1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Column(
              children: [
                const Text('ASSIGNED QUEUE NUMBER', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: kPrimaryDark)),
                Text('Queue #${apt.queueNumber.toString().padLeft(2, '0')}', style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: kPrimaryDark)),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Details List
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _detailRow('Doctor', '${apt.doctorName} (${apt.specialization})'),
                _detailRow('Date & Time', '${apt.appointmentDate} at ${apt.timeSlot}'),
                _detailRow('Hospital', apt.hospitalBranch),
                _detailRow('Patient', '${apt.patientName} (${apt.patientNic})'),
                _detailRow('Paid', 'LKR ${apt.totalAmount.toStringAsFixed(0)}'),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // QR Code via api.qrserver.com public URL scheme
          const Text('Check-in QR Code:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: kText)),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: Colors.white,
              border: Border.all(color: kBorder),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Image.network(
              'https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${Uri.encodeComponent(apt.qrCodeText.isNotEmpty ? apt.qrCodeText : apt.appointmentNumber)}',
              width: 150,
              height: 150,
              errorBuilder: (context, error, stackTrace) => const Icon(Icons.qr_code, size: 80, color: kPrimary),
            ),
          ),
          const SizedBox(height: 6),
          const Text('Show this QR at the Channeling Desk on visit date', style: TextStyle(fontSize: 10, color: Colors.grey)),
          const SizedBox(height: 20),

          // Go to My Appointments Button
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () {
                Navigator.pushReplacement(
                  context,
                  MaterialPageRoute(builder: (_) => const MyAppointmentsScreen()),
                );
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: kPrimary,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              child: const Text('Go to My Appointments', style: TextStyle(fontWeight: FontWeight.bold)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _detailRow(String label, String val) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(width: 80, child: Text('$label:', style: const TextStyle(fontSize: 11, color: Colors.grey))),
          Expanded(child: Text(val, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF1E293B)))),
        ],
      ),
    );
  }
}
