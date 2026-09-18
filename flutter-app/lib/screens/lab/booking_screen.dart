import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../../services/lab_api_service.dart';
import '../../services/auth_service.dart';
import '../../utils/theme.dart';
import 'my_bookings_screen.dart';

class BookingScreen extends StatefulWidget {
  final List<LabTest> tests;
  const BookingScreen({super.key, required this.tests});
  @override
  State<BookingScreen> createState() => _BookingScreenState();
}

class _BookingScreenState extends State<BookingScreen> {
  DateTime? _selectedDate;
  String? _selectedTime;
  bool _loading = false;
  String? _prescriptionImageUrl;
  File? _selectedImage;

  // Payment Selection
  String _paymentOption = 'OnlineCard'; // 'OnlineCard' or 'CounterCash'
  final _cardHolderController = TextEditingController(text: 'John Doe');
  final _cardNumberController = TextEditingController(text: '4242 4242 4242 4242');
  final _expiryController = TextEditingController(text: '12/28');
  final _cvvController = TextEditingController(text: '123');
  Map<String, dynamic>? _lastPaymentReceipt;

  final List<String> _defaultTimeSlots = [
    '08:00', '09:00', '10:00', '11:00', 
    '13:00', '14:00', '15:00', '16:00'
  ];
  Map<String, int> _slotCapacities = {};
  bool _loadingSlots = false;

  @override
  void initState() {
    super.initState();
    _checkAuth();
    // Default select tomorrow
    _selectedDate = DateTime.now().add(const Duration(days: 1));
    _fetchSlotsForDate(_selectedDate!);
  }

  Future<void> _checkAuth() async {
    final user = await AuthService.getUser();
    if (user == null && mounted) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Please log in with your patient account to book lab tests.'),
              backgroundColor: kPrimary,
            ),
          );
          Navigator.pushReplacementNamed(context, '/login');
        }
      });
    }
  }

  @override
  void dispose() {
    _cardHolderController.dispose();
    _cardNumberController.dispose();
    _expiryController.dispose();
    _cvvController.dispose();
    super.dispose();
  }

  Future<void> _pickImage(ImageSource source) async {
    try {
      final picker = ImagePicker();
      final picked = await picker.pickImage(source: source, imageQuality: 75);
      if (picked != null) {
        setState(() => _selectedImage = File(picked.path));
        final bytes = await _selectedImage!.readAsBytes();
        setState(() {
          _prescriptionImageUrl = 'data:image/jpeg;base64,${base64Encode(bytes)}';
        });
      }
    } catch (e) {
      _showError('Failed to pick image: $e');
    }
  }

  void _showImageSourcePicker() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(width: 40, height: 4, decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(2))),
              const SizedBox(height: 16),
              const Text('Select Prescription Image', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: kText)),
              const SizedBox(height: 16),
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(color: kPrimary.withOpacity(0.12), borderRadius: BorderRadius.circular(10)),
                  child: const Icon(Icons.camera_alt, color: kPrimary),
                ),
                title: const Text('Take Photo with Camera', style: TextStyle(fontWeight: FontWeight.w700)),
                subtitle: const Text('Capture clear photo of doctor\'s prescription', style: TextStyle(fontSize: 12)),
                onTap: () {
                  Navigator.pop(ctx);
                  _pickImage(ImageSource.camera);
                },
              ),
              const SizedBox(height: 8),
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(color: const Color(0xFF2563EB).withOpacity(0.12), borderRadius: BorderRadius.circular(10)),
                  child: const Icon(Icons.photo_library, color: Color(0xFF2563EB)),
                ),
                title: const Text('Choose from Gallery', style: TextStyle(fontWeight: FontWeight.w700)),
                subtitle: const Text('Select existing photo from storage', style: TextStyle(fontSize: 12)),
                onTap: () {
                  Navigator.pop(ctx);
                  _pickImage(ImageSource.gallery);
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _fetchSlotsForDate(DateTime date) async {
    setState(() => _loadingSlots = true);
    try {
      final dateStr = '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
      final slots = await LabApiService.getSlots(dateStr);
      final caps = <String, int>{};
      for (var s in slots) {
        final t = (s['time'] as String).substring(0, 5);
        caps[t] = (s['maxCapacity'] as int) - (s['currentBookings'] as int);
      }
      setState(() => _slotCapacities = caps);
    } catch (_) {
    } finally {
      if (mounted) setState(() => _loadingSlots = false);
    }
  }

  bool get _requiresPrescription {
    return widget.tests.any((t) => t.isRestricted);
  }

  double get _totalPrice {
    return widget.tests.fold<double>(0, (sum, t) => sum + t.price);
  }

  Future<void> _confirmBooking() async {
    if (_selectedDate == null) return _showError('Please select an appointment date');
    if (_selectedTime == null) return _showError('Please select a time slot');
    if (_requiresPrescription && _prescriptionImageUrl == null) {
      return _showError('One or more restricted tests require a doctor prescription document.');
    }

    if (_paymentOption == 'OnlineCard') {
      final cardNo = _cardNumberController.text.replaceAll(' ', '').trim();
      if (cardNo.length < 12) {
        return _showError('Please enter a valid 16-digit card number.');
      }
      if (_expiryController.text.trim().isEmpty) {
        return _showError('Please enter card expiration date (MM/YY).');
      }
      if (_cvvController.text.trim().length < 3) {
        return _showError('Please enter a valid 3-digit CVV.');
      }
    }

    setState(() => _loading = true);

    try {
      final user = await AuthService.getUser();
      if (user == null) {
        _showError('User session expired. Please log in again.');
        setState(() => _loading = false);
        return;
      }

      final dateStr = '${_selectedDate!.year}-${_selectedDate!.month.toString().padLeft(2, '0')}-${_selectedDate!.day.toString().padLeft(2, '0')}';

      // Create bookings sequentially for each test
      final List<LabBooking> bookings = [];
      final name = (user.name.isNotEmpty) ? user.name : 'Patient User';
      final email = (user.email.isNotEmpty && user.email.contains('@')) ? user.email : 'patient@medix.lk';

      for (var test in widget.tests) {
        var booking = await LabApiService.createBooking(
          patientId: user.userId,
          patientName: name,
          patientEmail: email,
          labTestId: test.id,
          bookingDate: dateStr,
          timeSlot: _selectedTime!,
        );

        if (test.isRestricted && _prescriptionImageUrl != null) {
          booking = await LabApiService.uploadPrescription(booking.id, _prescriptionImageUrl!);
        }

        // Process payment selection
        if (_paymentOption == 'OnlineCard') {
          try {
            final receipt = await LabApiService.payBookingOnline(
              bookingId: booking.id,
              amount: test.price,
              cardHolderName: _cardHolderController.text.trim(),
              cardNumber: _cardNumberController.text.replaceAll(' ', '').trim(),
              expiryDate: _expiryController.text.trim(),
              cvv: _cvvController.text.trim(),
              patientEmail: email,
            );
            _lastPaymentReceipt = receipt;
          } catch (payErr) {
            _showError('Payment notice: $payErr. Booking saved with counter payment.');
          }
        } else {
          try {
            await LabApiService.selectPayAtCounter(booking.id);
          } catch (_) {}
        }

        bookings.add(booking);
      }

      if (mounted) {
        _showSuccessDialog(bookings);
      }
    } catch (e) {
      _showError('Booking failed: $e');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(Icons.error_outline, color: Colors.white, size: 18),
            const SizedBox(width: 8),
            Expanded(child: Text(message)),
          ],
        ),
        backgroundColor: kDanger,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ),
    );
  }

  void _showSuccessDialog(List<LabBooking> bookings) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) => AlertDialog(
        backgroundColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 64,
              height: 64,
              decoration: const BoxDecoration(color: Color(0xFFD1FAE5), shape: BoxShape.circle),
              child: const Icon(Icons.check_circle, color: kSuccess, size: 40),
            ),
            const SizedBox(height: 16),
            const Text(
              'Appointments Scheduled!',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: kText),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              _requiresPrescription
                  ? 'Your prescription has been submitted. Gemini Vision AI and our laboratory staff are reviewing it.'
                  : 'Your bookings have been confirmed! Please proceed to the clinic at your scheduled appointment time.',
              style: const TextStyle(color: kTextMuted, fontSize: 13, height: 1.4),
              textAlign: TextAlign.center,
            ),
            if (_paymentOption == 'OnlineCard' && _lastPaymentReceipt != null) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: const Color(0xFFECFDF5),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: const Color(0xFFA7F3D0)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.receipt_long, color: Color(0xFF059669), size: 16),
                    const SizedBox(width: 6),
                    Text(
                      'Paid Online: #${_lastPaymentReceipt!['receiptNumber'] ?? 'RCP'}',
                      style: const TextStyle(color: Color(0xFF065F46), fontWeight: FontWeight.w800, fontSize: 12),
                    ),
                  ],
                ),
              ),
            ] else if (_paymentOption == 'CounterCash') ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: const Color(0xFFFFFBEB),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: const Color(0xFFFDE68A)),
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.storefront, color: Color(0xFFD97706), size: 16),
                    SizedBox(width: 6),
                    Text(
                      'Payment: Settle at Counter on Arrival',
                      style: TextStyle(color: Color(0xFF92400E), fontWeight: FontWeight.w800, fontSize: 12),
                    ),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 20),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () {
                      Navigator.pop(context);
                      Navigator.pop(context);
                    },
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: kBorder),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                    child: const Text('Back to Lab', style: TextStyle(color: kText, fontWeight: FontWeight.w700)),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: ElevatedButton(
                    onPressed: () {
                      Navigator.pop(context);
                      Navigator.pop(context);
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const MyBookingsScreen(statusFilter: 'ACTIVE')),
                      );
                    },
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                    child: const Text('Track Booking', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800)),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final days = List.generate(14, (i) => DateTime.now().add(Duration(days: i + 1)));

    return Scaffold(
      appBar: AppBar(title: const Text('Schedule Appointment')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Selected Tests Summary Card
            const Text(
              'Selected Diagnostic Tests',
              style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: kText),
            ),
            const SizedBox(height: 10),
            
            AppCard(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              child: Column(
                children: widget.tests.map((test) {
                  final color = kCategoryColors[test.category] ?? kPrimary;
                  final isLast = widget.tests.last.id == test.id;
                  return Column(
                    children: [
                      Row(
                        children: [
                          Container(
                            width: 36,
                            height: 36,
                            decoration: BoxDecoration(
                              color: color.withOpacity(0.12),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Icon(Icons.science, color: color, size: 18),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  test.name,
                                  style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13.5, color: kText),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  test.category,
                                  style: const TextStyle(color: kTextMuted, fontSize: 11, fontWeight: FontWeight.w500),
                                ),
                              ],
                            ),
                          ),
                          Text(
                            'LKR ${test.price.toStringAsFixed(0)}',
                            style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13.5, color: kText),
                          ),
                        ],
                      ),
                      if (!isLast) ...[
                        const SizedBox(height: 10),
                        const Divider(height: 1, color: kBorder),
                        const SizedBox(height: 10),
                      ]
                    ],
                  );
                }).toList(),
              ),
            ),

            const SizedBox(height: 22),

            // 1. Select Date (Horizontal Carousel)
            const Text(
              '1. Select Appointment Date',
              style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: kText),
            ),
            const SizedBox(height: 12),

            SizedBox(
              height: 72,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: days.length,
                separatorBuilder: (_, __) => const SizedBox(width: 10),
                itemBuilder: (context, idx) {
                  final date = days[idx];
                  final isSelected = _selectedDate != null &&
                      _selectedDate!.year == date.year &&
                      _selectedDate!.month == date.month &&
                      _selectedDate!.day == date.day;
                  final weekday = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][date.weekday - 1];

                  return GestureDetector(
                    onTap: () {
                      setState(() {
                        _selectedDate = date;
                        _selectedTime = null;
                      });
                      _fetchSlotsForDate(date);
                    },
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 200),
                      width: 58,
                      decoration: BoxDecoration(
                        color: isSelected ? kPrimary : Colors.white,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(
                          color: isSelected ? kPrimary : kBorder,
                          width: isSelected ? 1.5 : 1.0,
                        ),
                        boxShadow: isSelected
                            ? [
                                BoxShadow(
                                  color: kPrimary.withOpacity(0.35),
                                  blurRadius: 8,
                                  offset: const Offset(0, 3),
                                )
                              ]
                            : null,
                      ),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            weekday,
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              color: isSelected ? Colors.white70 : kTextMuted,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '${date.day}',
                            style: TextStyle(
                              fontSize: 17,
                              fontWeight: FontWeight.w900,
                              color: isSelected ? Colors.white : kText,
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),

            const SizedBox(height: 24),

            // 2. Select Time Slot
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  '2. Select Time Slot',
                  style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: kText),
                ),
                if (_loadingSlots)
                  const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: kPrimary)),
              ],
            ),
            const SizedBox(height: 12),

            Wrap(
              spacing: 10,
              runSpacing: 10,
              children: _defaultTimeSlots.map((time) {
                final isSelected = _selectedTime == time;
                final remaining = _slotCapacities[time];
                final isFull = remaining != null && remaining <= 0;

                return GestureDetector(
                  onTap: isFull ? null : () => setState(() => _selectedTime = time),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 150),
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                    decoration: BoxDecoration(
                      color: isFull
                          ? Colors.grey.shade100
                          : (isSelected ? kPrimary : Colors.white),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: isFull ? Colors.grey.shade300 : (isSelected ? kPrimary : kBorder),
                        width: isSelected ? 1.5 : 1.0,
                      ),
                      boxShadow: isSelected
                          ? [
                              BoxShadow(
                                color: kPrimary.withOpacity(0.3),
                                blurRadius: 6,
                                offset: const Offset(0, 2),
                              )
                            ]
                          : null,
                    ),
                    child: Text(
                      time,
                      style: TextStyle(
                        color: isFull ? Colors.grey.shade400 : (isSelected ? Colors.white : kText),
                        fontWeight: FontWeight.w800,
                        fontSize: 13.5,
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),

            const SizedBox(height: 24),

            // 3. Prescription Upload (If any test is restricted)
            if (_requiresPrescription) ...[
              const Text(
                '3. Doctor\'s Prescription',
                style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: kText),
              ),
              const SizedBox(height: 12),

              if (_selectedImage != null) ...[
                // Image Preview Card
                AppCard(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(10),
                        child: Image.file(
                          _selectedImage!,
                          height: 180,
                          width: double.infinity,
                          fit: BoxFit.cover,
                        ),
                      ),
                      const SizedBox(height: 10),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Row(
                            children: [
                              Icon(Icons.check_circle, color: kSuccess, size: 16),
                              SizedBox(width: 6),
                              Text('Prescription attached', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 12, color: kSuccess)),
                            ],
                          ),
                          TextButton.icon(
                            onPressed: _showImageSourcePicker,
                            icon: const Icon(Icons.refresh, size: 14),
                            label: const Text('Change Photo'),
                            style: TextButton.styleFrom(foregroundColor: kPrimary),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ] else ...[
                // Upload Box
                GestureDetector(
                  onTap: _showImageSourcePicker,
                  child: Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(22),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: kPrimary, width: 1.5, style: BorderStyle.solid),
                    ),
                    child: Column(
                      children: [
                        Container(
                          width: 52,
                          height: 52,
                          decoration: BoxDecoration(
                            color: kPrimary.withOpacity(0.1),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(Icons.cloud_upload_outlined, color: kPrimary, size: 28),
                        ),
                        const SizedBox(height: 12),
                        const Text(
                          'Upload Doctor\'s Prescription',
                          style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: kText),
                        ),
                        const SizedBox(height: 4),
                        const Text(
                          'Tap to capture photo or select from gallery',
                          style: TextStyle(color: kTextMuted, fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
              const SizedBox(height: 24),
            ],

            // Payment Method Selection
            Text(
              _requiresPrescription ? '4. Choose Payment Method' : '3. Choose Payment Method',
              style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: kText),
            ),
            const SizedBox(height: 6),
            const Text(
              'Pay online now with a card to pre-clear sample collection, or choose to pay at the counter on arrival.',
              style: TextStyle(color: kTextMuted, fontSize: 12),
            ),
            const SizedBox(height: 12),

            // Payment Options Selector Row
            Row(
              children: [
                Expanded(
                  child: GestureDetector(
                    onTap: () => setState(() => _paymentOption = 'OnlineCard'),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
                      decoration: BoxDecoration(
                        color: _paymentOption == 'OnlineCard' ? const Color(0xFFEFF6FF) : Colors.white,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(
                          color: _paymentOption == 'OnlineCard' ? const Color(0xFF2563EB) : kBorder,
                          width: _paymentOption == 'OnlineCard' ? 2 : 1,
                        ),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Icon(
                                Icons.credit_card,
                                color: _paymentOption == 'OnlineCard' ? const Color(0xFF2563EB) : kTextMuted,
                                size: 22,
                              ),
                              if (_paymentOption == 'OnlineCard')
                                const Icon(Icons.check_circle, color: Color(0xFF2563EB), size: 18),
                            ],
                          ),
                          const SizedBox(height: 8),
                          const Text(
                            'Pay Online',
                            style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13.5, color: kText),
                          ),
                          const SizedBox(height: 2),
                          const Text(
                            'Credit / Debit Card',
                            style: TextStyle(fontSize: 11, color: kTextMuted, fontWeight: FontWeight.w600),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: GestureDetector(
                    onTap: () => setState(() => _paymentOption = 'CounterCash'),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
                      decoration: BoxDecoration(
                        color: _paymentOption == 'CounterCash' ? const Color(0xFFECFDF5) : Colors.white,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(
                          color: _paymentOption == 'CounterCash' ? const Color(0xFF059669) : kBorder,
                          width: _paymentOption == 'CounterCash' ? 2 : 1,
                        ),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Icon(
                                Icons.storefront,
                                color: _paymentOption == 'CounterCash' ? const Color(0xFF059669) : kTextMuted,
                                size: 22,
                              ),
                              if (_paymentOption == 'CounterCash')
                                const Icon(Icons.check_circle, color: Color(0xFF059669), size: 18),
                            ],
                          ),
                          const SizedBox(height: 8),
                          const Text(
                            'Pay at Counter',
                            style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13.5, color: kText),
                          ),
                          const SizedBox(height: 2),
                          const Text(
                            'Cash or POS on Arrival',
                            style: TextStyle(fontSize: 11, color: kTextMuted, fontWeight: FontWeight.w600),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 14),

            // Online Card Form if selected
            if (_paymentOption == 'OnlineCard') ...[
              AppCard(
                border: Border.all(color: const Color(0xFFBFDBFE)),
                color: const Color(0xFFF0F7FF),
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Row(
                          children: [
                            Icon(Icons.lock_outline, size: 14, color: Color(0xFF1E40AF)),
                            SizedBox(width: 4),
                            Text(
                              'Instant Online Payment',
                              style: TextStyle(fontWeight: FontWeight.w800, fontSize: 12.5, color: Color(0xFF1E40AF)),
                            ),
                          ],
                        ),
                        InkWell(
                          onTap: () {
                            setState(() {
                              _cardHolderController.text = 'Dinith Gamage';
                              _cardNumberController.text = '4242 4242 4242 4242';
                              _expiryController.text = '08/29';
                              _cvvController.text = '888';
                            });
                          },
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: const Color(0xFFDBEAFE),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: const Row(
                              children: [
                                Icon(Icons.auto_awesome, size: 12, color: Color(0xFF1E40AF)),
                                SizedBox(width: 4),
                                Text(
                                  'Fill Demo Card',
                                  style: TextStyle(fontWeight: FontWeight.w800, fontSize: 11, color: Color(0xFF1E40AF)),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),

                    // Cardholder Name
                    const Text('Cardholder Name', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 11.5, color: kText)),
                    const SizedBox(height: 4),
                    TextField(
                      controller: _cardHolderController,
                      decoration: InputDecoration(
                        hintText: 'e.g. John Doe',
                        prefixIcon: const Icon(Icons.person_outline, size: 18),
                        filled: true,
                        fillColor: Colors.white,
                        isDense: true,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: kBorder)),
                      ),
                    ),
                    const SizedBox(height: 10),

                    // Card Number
                    const Text('Card Number', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 11.5, color: kText)),
                    const SizedBox(height: 4),
                    TextField(
                      controller: _cardNumberController,
                      keyboardType: TextInputType.number,
                      decoration: InputDecoration(
                        hintText: '4242 •••• •••• 4242',
                        prefixIcon: const Icon(Icons.payment, size: 18),
                        filled: true,
                        fillColor: Colors.white,
                        isDense: true,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: kBorder)),
                      ),
                    ),
                    const SizedBox(height: 10),

                    // Expiry and CVV Row
                    Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('Expiry (MM/YY)', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 11.5, color: kText)),
                              const SizedBox(height: 4),
                              TextField(
                                controller: _expiryController,
                                keyboardType: TextInputType.datetime,
                                decoration: InputDecoration(
                                  hintText: '12/28',
                                  filled: true,
                                  fillColor: Colors.white,
                                  isDense: true,
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: kBorder)),
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
                              const Text('CVV', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 11.5, color: kText)),
                              const SizedBox(height: 4),
                              TextField(
                                controller: _cvvController,
                                keyboardType: TextInputType.number,
                                obscureText: true,
                                decoration: InputDecoration(
                                  hintText: '123',
                                  filled: true,
                                  fillColor: Colors.white,
                                  isDense: true,
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: kBorder)),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),
            ] else ...[
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFF0FDF4),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFBBF7D0)),
                ),
                child: const Row(
                  children: [
                    Icon(Icons.info_outline, color: Color(0xFF059669), size: 18),
                    SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Your appointment will be confirmed immediately. You can pay at the laboratory reception counter via Cash or Card POS upon arrival.',
                        style: TextStyle(fontSize: 12, color: Color(0xFF065F46), fontWeight: FontWeight.w600),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),
            ],

            // Summary & Confirmation
            AppCard(
              color: const Color(0xFFF8FAFC),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Total Test Charges', style: TextStyle(color: kTextMuted, fontSize: 13)),
                      Text('LKR ${_totalPrice.toStringAsFixed(0)}', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: kText)),
                    ],
                  ),
                  const SizedBox(height: 6),
                  const Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('AI Verification Fee', style: TextStyle(color: kTextMuted, fontSize: 13)),
                      Text('FREE', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: kSuccess)),
                    ],
                  ),
                  const Divider(height: 20, color: kBorder),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Total Amount Payable', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: kText)),
                      Text('LKR ${_totalPrice.toStringAsFixed(0)}', style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 18, color: kPrimaryDark)),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // Confirm Button
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _loading ? null : _confirmBooking,
                child: _loading
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5),
                      )
                    : const Text('Confirm Lab Appointments'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
