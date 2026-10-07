import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../services/doctor_api_service.dart';
import '../../utils/theme.dart';
import 'my_appointments_screen.dart';

class CardNumberFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(TextEditingValue oldValue, TextEditingValue newValue) {
    final text = newValue.text.replaceAll(RegExp(r'\D'), '');
    if (text.isEmpty) return newValue.copyWith(text: '');
    final buffer = StringBuffer();
    for (int i = 0; i < text.length; i++) {
      if (i > 0 && i % 4 == 0) buffer.write(' ');
      buffer.write(text[i]);
    }
    final string = buffer.toString();
    return TextEditingValue(
      text: string,
      selection: TextSelection.collapsed(offset: string.length),
    );
  }
}

class CardExpiryFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(TextEditingValue oldValue, TextEditingValue newValue) {
    var text = newValue.text.replaceAll(RegExp(r'\D'), '');
    if (text.length > 4) text = text.substring(0, 4);
    if (text.length >= 3) {
      text = '${text.substring(0, 2)}/${text.substring(2)}';
    }
    return TextEditingValue(
      text: text,
      selection: TextSelection.collapsed(offset: text.length),
    );
  }
}

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
  final DoctorAppointment? initialConfirmedAppointment;

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
    this.initialConfirmedAppointment,
  });

  @override
  State<PaymentConfirmationScreen> createState() => _PaymentConfirmationScreenState();
}

class _PaymentConfirmationScreenState extends State<PaymentConfirmationScreen> {
  final _formKey = GlobalKey<FormState>();
  bool _autoValidate = false;
  String _paymentMethod = 'CreditCard'; // CreditCard, BankTransfer
  final TextEditingController _cardNumCtrl = TextEditingController(text: '4532 8912 3456 7890');
  final TextEditingController _expiryCtrl = TextEditingController(text: '12/28');
  final TextEditingController _cvvCtrl = TextEditingController(text: '123');
  final TextEditingController _bankRefCtrl = TextEditingController();

  bool _isProcessing = false;
  String? _errorMessage;
  DoctorAppointment? _confirmedAppointment;

  @override
  void initState() {
    super.initState();
    if (widget.initialConfirmedAppointment != null) {
      _confirmedAppointment = widget.initialConfirmedAppointment;
    }
  }

  @override
  void dispose() {
    _cardNumCtrl.dispose();
    _expiryCtrl.dispose();
    _cvvCtrl.dispose();
    _bankRefCtrl.dispose();
    super.dispose();
  }

  double get _totalFee => widget.doctor.consultationFee + 300.0;

  Future<void> _processPayment() async {
    HapticFeedback.lightImpact();

    // 1. Strictly Validate Payment Inputs
    if (_formKey.currentState == null || !_formKey.currentState!.validate()) {
      HapticFeedback.heavyImpact();
      setState(() => _autoValidate = true);
      ScaffoldMessenger.of(context).hideCurrentSnackBar();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please complete and correct all highlighted payment fields.'),
          backgroundColor: Color(0xFFDC2626),
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    setState(() {
      _isProcessing = true;
      _errorMessage = null;
    });

    try {

      // Online Payment (CreditCard or BankTransfer)
      final booking = await DoctorApiService.bookAppointment({
        'doctorId': widget.doctor.id,
        'doctorSessionId': widget.session.id,
        'bookingType': 'OnlinePayment',
        'patientName': widget.patientName,
        'patientPhone': widget.patientPhone,
        'patientEmail': widget.patientEmail,
        'patientNic': widget.patientNic,
        'patientAddress': widget.patientAddress,
        'notes': widget.notes,
      });

      String? cardRef;
      if (_paymentMethod == 'CreditCard') {
        final cleanDigits = _cardNumCtrl.text.replaceAll(RegExp(r'\D'), '');
        final last4 = cleanDigits.length >= 4 ? cleanDigits.substring(cleanDigits.length - 4) : '7890';
        cardRef = '**** **** **** $last4';
      }

      final paid = await DoctorApiService.payAppointment(booking.id, {
        'paymentMethod': _paymentMethod,
        'cardMaskedReference': cardRef,
        'bankReference': _paymentMethod == 'BankTransfer' ? _bankRefCtrl.text.trim().toUpperCase() : null,
      });

      if (mounted) {
        HapticFeedback.mediumImpact();
        setState(() {
          _confirmedAppointment = paid;
          _isProcessing = false;
        });
      }
    } catch (e) {
      if (mounted) {
        HapticFeedback.heavyImpact();
        setState(() {
          _isProcessing = false;
          _errorMessage = e.toString().replaceFirst('Exception: ', '');
        });
      }
    }
  }

  void _showPaymentMethodBottomSheet() {
    HapticFeedback.lightImpact();
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      backgroundColor: Colors.white,
      builder: (ctx) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Select Payment Method', style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold, color: kPrimaryDark)),
                const SizedBox(height: 14),
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: const CircleAvatar(backgroundColor: Color(0xFFE0F2F1), child: Icon(Icons.credit_card, color: kPrimary)),
                  title: const Text('Credit / Debit Card', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                  subtitle: const Text('Visa, MasterCard, Amex', style: TextStyle(fontSize: 12, color: Colors.grey)),
                  trailing: _paymentMethod == 'CreditCard' ? const Icon(Icons.check_circle, color: kPrimary) : null,
                  onTap: () {
                    HapticFeedback.lightImpact();
                    setState(() => _paymentMethod = 'CreditCard');
                    Navigator.pop(ctx);
                  },
                ),
                const Divider(),
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: const CircleAvatar(backgroundColor: Color(0xFFFEF3C7), child: Icon(Icons.account_balance, color: Color(0xFFD97706))),
                  title: const Text('Bank Transfer / Deposit', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                  subtitle: const Text('Direct deposit slip / online banking ref', style: TextStyle(fontSize: 12, color: Colors.grey)),
                  trailing: _paymentMethod == 'BankTransfer' ? const Icon(Icons.check_circle, color: kPrimary) : null,
                  onTap: () {
                    HapticFeedback.lightImpact();
                    setState(() => _paymentMethod = 'BankTransfer');
                    Navigator.pop(ctx);
                  },
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final confirmed = _confirmedAppointment;

    return Scaffold(
      backgroundColor: kBg,
      appBar: AppBar(
        backgroundColor: kPrimaryDark,
        foregroundColor: Colors.white,
        elevation: 0,
        title: Text(
          confirmed != null
              ? (confirmed.bookingType == 'Reservation' ? 'Reservation Confirmed' : 'Appointment Confirmed')
              : 'Secure Payment',
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
        ),
      ),
      bottomNavigationBar: confirmed == null
          ? Container(
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
                    onPressed: _isProcessing ? null : _processPayment,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: kPrimary,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      elevation: 0,
                    ),
                    child: _isProcessing
                        ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Icon(Icons.lock_outline, size: 16),
                              const SizedBox(width: 8),
                              Text(
                                _errorMessage != null
                                    ? 'Retry Payment (LKR ${_totalFee.toStringAsFixed(0)})'
                                    : 'Pay LKR ${_totalFee.toStringAsFixed(0)}',
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                              ),
                            ],
                          ),
                  ),
                ),
              ),
            )
          : null,
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
        // Error Banner (Real Failure Handling)
        if (_errorMessage != null) ...[
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: const Color(0xFFFEF2F2),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFF87171)),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(Icons.error_outline, color: Color(0xFFDC2626), size: 22),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Payment Could Not Be Processed',
                        style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF991B1B), fontSize: 13),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        _errorMessage!,
                        style: const TextStyle(color: Color(0xFF7F1D1D), fontSize: 12),
                      ),
                      const SizedBox(height: 8),
                      const Text(
                        'Please verify your card details or switch to Bank Transfer and tap Retry.',
                        style: TextStyle(color: Color(0xFFB91C1C), fontSize: 11, fontWeight: FontWeight.w600),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
        ],

        // Itemized Breakdown Card
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: kBorder),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Consultation Breakdown', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: kPrimaryDark)),
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('Doctor Fee (${widget.doctor.fullName})', style: const TextStyle(fontSize: 13, color: Color(0xFF334155))),
                  Text('LKR ${widget.doctor.consultationFee.toStringAsFixed(0)}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: const [
                  Text('Hospital Channeling Fee', style: TextStyle(fontSize: 13, color: Color(0xFF334155))),
                  Text('LKR 300', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                ],
              ),
              const Padding(padding: EdgeInsets.symmetric(vertical: 8), child: Divider()),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Total Amount Payable', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: kPrimaryDark)),
                  Text(
                    'LKR ${_totalFee.toStringAsFixed(0)}',
                    style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 17, color: kPrimary),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),

        // Payment Method Selector (Triggers Native Bottom Sheet)
        InkWell(
          onTap: _showPaymentMethodBottomSheet,
          borderRadius: BorderRadius.circular(14),
          child: Container(
            constraints: const BoxConstraints(minHeight: 56),
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: kBorder),
            ),
            child: Row(
              children: [
                CircleAvatar(
                  radius: 18,
                  backgroundColor: const Color(0xFFE0F2F1),
                  child: Icon(
                    _paymentMethod == 'CreditCard' ? Icons.credit_card : Icons.account_balance,
                    color: kPrimary,
                    size: 20,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Payment Method', style: TextStyle(fontSize: 11, color: Colors.grey)),
                      Text(
                        _paymentMethod == 'CreditCard'
                            ? 'Credit / Debit Card'
                            : 'Bank Transfer / Deposit',
                        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: kPrimaryDark),
                      ),
                    ],
                  ),
                ),
                const Text('Change', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: kPrimary)),
                const SizedBox(width: 4),
                const Icon(Icons.arrow_forward_ios, size: 12, color: kPrimary),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),

        // Payment Input Form Card with Live Validation
        Form(
          key: _formKey,
          autovalidateMode: _autoValidate ? AutovalidateMode.onUserInteraction : AutovalidateMode.disabled,
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: kBorder),
            ),
            child: _paymentMethod == 'CreditCard'
                ? Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Card Information', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: kText)),
                          TextButton.icon(
                            onPressed: () {
                              HapticFeedback.lightImpact();
                              setState(() {
                                _cardNumCtrl.text = '4532 8912 3456 7890';
                                _expiryCtrl.text = '12/28';
                                _cvvCtrl.text = '123';
                              });
                            },
                            icon: const Icon(Icons.flash_on, size: 14, color: kPrimary),
                            label: const Text('Fill Test Card', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: kPrimary)),
                            style: TextButton.styleFrom(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              minimumSize: Size.zero,
                              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: _cardNumCtrl,
                        keyboardType: TextInputType.number,
                        inputFormatters: [
                          FilteringTextInputFormatter.digitsOnly,
                          LengthLimitingTextInputFormatter(16),
                          CardNumberFormatter(),
                        ],
                        validator: (val) {
                          if (val == null || val.trim().isEmpty) {
                            return 'Card number is required';
                          }
                          final digits = val.replaceAll(RegExp(r'\D'), '');
                          if (digits.length != 16 && digits.length != 15) {
                            return 'Enter a valid 16-digit card number';
                          }
                          return null;
                        },
                        decoration: InputDecoration(
                          labelText: 'Card Number *',
                          hintText: '4532 8912 3456 7890',
                          prefixIcon: const Icon(Icons.credit_card, size: 20),
                          filled: true,
                          fillColor: const Color(0xFFF9FAFB),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: kBorder)),
                          enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: kBorder)),
                          errorBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Colors.red)),
                          focusedErrorBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Colors.red, width: 2)),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                        ),
                      ),
                      const SizedBox(height: 12),
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(
                            child: TextFormField(
                              controller: _expiryCtrl,
                              keyboardType: TextInputType.number,
                              inputFormatters: [
                                FilteringTextInputFormatter.digitsOnly,
                                LengthLimitingTextInputFormatter(4),
                                CardExpiryFormatter(),
                              ],
                              validator: (val) {
                                if (val == null || val.trim().isEmpty) {
                                  return 'Required';
                                }
                                if (!RegExp(r'^(0[1-9]|1[0-2])\/\d{2}$').hasMatch(val.trim())) {
                                  return 'MM/YY (01-12)';
                                }
                                final parts = val.trim().split('/');
                                final mm = int.tryParse(parts[0]) ?? 0;
                                final yy = int.tryParse(parts[1]) ?? 0;
                                final now = DateTime.now();
                                final currentCenturyYear = now.year % 100;
                                final currentMonth = now.month;
                                if (yy < currentCenturyYear || (yy == currentCenturyYear && mm < currentMonth)) {
                                  return 'Card expired';
                                }
                                if (yy > currentCenturyYear + 20) {
                                  return 'Invalid year';
                                }
                                return null;
                              },
                              decoration: InputDecoration(
                                labelText: 'MM/YY *',
                                hintText: '12/28',
                                filled: true,
                                fillColor: const Color(0xFFF9FAFB),
                                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: kBorder)),
                                enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: kBorder)),
                                errorBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Colors.red)),
                                focusedErrorBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Colors.red, width: 2)),
                                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: TextFormField(
                              controller: _cvvCtrl,
                              keyboardType: TextInputType.number,
                              obscureText: true,
                              inputFormatters: [
                                FilteringTextInputFormatter.digitsOnly,
                                LengthLimitingTextInputFormatter(4),
                              ],
                              validator: (val) {
                                if (val == null || val.trim().isEmpty) {
                                  return 'Required';
                                }
                                final digits = val.replaceAll(RegExp(r'\D'), '');
                                if (digits.length < 3 || digits.length > 4) {
                                  return '3-4 digits';
                                }
                                return null;
                              },
                              decoration: InputDecoration(
                                labelText: 'CVV *',
                                hintText: '123',
                                filled: true,
                                fillColor: const Color(0xFFF9FAFB),
                                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: kBorder)),
                                enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: kBorder)),
                                errorBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Colors.red)),
                                focusedErrorBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Colors.red, width: 2)),
                                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  )
                : Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Bank Transfer Details', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: kText)),
                          const SizedBox(height: 8),
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF8FAFC),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: const [
                                Text('Bank: Bank of Ceylon (BOC)', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                                Text('Account: 88219012 (Health Bridge Hospital Group)', style: TextStyle(fontSize: 12)),
                                Text('Branch: Colombo City Branch', style: TextStyle(fontSize: 11, color: Colors.grey)),
                              ],
                            ),
                          ),
                          const SizedBox(height: 12),
                          TextFormField(
                            controller: _bankRefCtrl,
                            validator: (val) {
                              if (val == null || val.trim().isEmpty) {
                                return 'Transaction reference / slip number is required';
                              }
                              if (val.trim().length < 5) {
                                return 'Reference must be at least 5 characters (e.g. BOC-882190)';
                              }
                              return null;
                            },
                            decoration: InputDecoration(
                              labelText: 'Bank Deposit / Transfer Reference *',
                              hintText: 'e.g. TXN-982182 or Deposit Slip No',
                              filled: true,
                              fillColor: const Color(0xFFF9FAFB),
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: kBorder)),
                              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: kBorder)),
                              errorBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Colors.red)),
                              focusedErrorBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Colors.red, width: 2)),
                              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                            ),
                          ),
                        ],
                      ),
          ),
        ),
        const SizedBox(height: 24),
      ],
    );
  }

  Widget _buildConfirmedView(DoctorAppointment apt) {
    final token = apt.queueLabel ?? 'Token #${apt.queueNumber.toString().padLeft(2, '0')}';
    final isReservation = apt.bookingType == 'Reservation' || apt.status == 'Reserved';

    // Strictly encode opaque qrToken — zero PHI
    final safeQrPayload = apt.qrToken.isNotEmpty ? apt.qrToken : apt.appointmentNumber;

    return Column(
      children: [
        // Boarding Pass Ticket Card
        Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: kBorder),
            boxShadow: const [
              BoxShadow(color: Color(0x0A000000), blurRadius: 10, offset: Offset(0, 4)),
            ],
          ),
          child: Column(
            children: [
              // Ticket Header
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: isReservation ? const Color(0xFF92400E) : kPrimaryDark,
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(15)),
                ),
                child: Row(
                  children: [
                    CircleAvatar(
                      backgroundColor: Colors.white.withValues(alpha: 0.2),
                      radius: 20,
                      child: const Icon(Icons.check, color: Colors.white, size: 22),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            isReservation ? 'Hospital Reservation Confirmed' : 'Appointment Confirmed & Paid',
                            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                          ),
                          Text(
                            'Ref: ${apt.appointmentNumber}',
                            style: const TextStyle(color: Color(0xFFE0F2F1), fontSize: 11),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              // Queue Token Hero Badge
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
                child: Column(
                  children: [
                    const Text(
                      'ASSIGNED QUEUE TOKEN',
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF64748B), letterSpacing: 0.8),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      token,
                      style: TextStyle(
                        fontSize: 34,
                        fontWeight: FontWeight.w900,
                        color: isReservation ? const Color(0xFF92400E) : kPrimaryDark,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${apt.doctorName} • Room ${apt.roomNumber ?? "Consultation Suite"}',
                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF334155)),
                    ),
                  ],
                ),
              ),

              // Schedule Banner
              Container(
                margin: const EdgeInsets.symmetric(horizontal: 16),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: const Color(0xFFF0F9FF),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: const Color(0xFFBAE6FD)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.schedule, size: 16, color: Color(0xFF0369A1)),
                        const SizedBox(width: 6),
                        Text(
                          '${apt.sessionType ?? "OPD"} Session • ${apt.appointmentDate}',
                          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF0369A1)),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Estimated Consultation: ${apt.estimatedConsultationTime ?? "approximate"}',
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF0C4A6E)),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'Please arrive by: ${apt.recommendedArrivalTime ?? "20 minutes before session"}',
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF0284C7)),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // QR Code Section (Pure Opaque Token)
              Container(
                margin: const EdgeInsets.symmetric(horizontal: 16),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFFF0FDF4),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFBBF7D0), style: BorderStyle.solid),
                ),
                child: Column(
                  children: [
                    const Text(
                      'HOSPITAL CHECK-IN QR CODE',
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF15803D), letterSpacing: 0.5),
                    ),
                    const SizedBox(height: 10),
                    Container(
                      padding: const EdgeInsets.all(8),
                      color: Colors.white,
                      child: Image.network(
                        'https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${Uri.encodeComponent(safeQrPayload)}',
                        width: 140,
                        height: 140,
                        errorBuilder: (context, error, stackTrace) => const Icon(Icons.qr_code, size: 90, color: kPrimary),
                      ),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Present this pass at the Channeling Desk on arrival for expedited check-in.',
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 11, color: Color(0xFF475569)),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),
            ],
          ),
        ),
        const SizedBox(height: 20),

        // Go to My Appointments Button
        SizedBox(
          width: double.infinity,
          height: 48,
          child: ElevatedButton(
            onPressed: () {
              HapticFeedback.lightImpact();
              Navigator.pushReplacement(
                context,
                MaterialPageRoute(builder: (_) => const MyAppointmentsScreen()),
              );
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: kPrimary,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              elevation: 0,
            ),
            child: const Text('View in My Appointments', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
          ),
        ),
      ],
    );
  }
}
