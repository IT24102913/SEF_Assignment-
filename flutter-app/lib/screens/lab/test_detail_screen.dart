import 'package:flutter/material.dart';
import '../../services/lab_api_service.dart';
import '../../services/auth_service.dart';
import '../../utils/theme.dart';
import 'booking_screen.dart';

class TestDetailScreen extends StatefulWidget {
  final LabTest test;
  const TestDetailScreen({super.key, required this.test});

  @override
  State<TestDetailScreen> createState() => _TestDetailScreenState();
}

class _TestDetailScreenState extends State<TestDetailScreen> {
  bool _isLoggedIn = false;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _checkAuth();
  }

  Future<void> _checkAuth() async {
    final loggedIn = await AuthService.isLoggedIn();
    if (mounted) {
      setState(() {
        _isLoggedIn = loggedIn;
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final test = widget.test;
    final categoryColor = kCategoryColors[test.category] ?? kPrimary;

    return Scaffold(
      appBar: AppBar(
        title: Text(test.name),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(18, 16, 18, 100),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Hero Header Card
            FadeSlideAnimation(
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [categoryColor.withOpacity(0.85), categoryColor],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: [
                    BoxShadow(
                      color: categoryColor.withOpacity(0.3),
                      blurRadius: 16,
                      offset: const Offset(0, 6),
                    )
                  ],
                ),
                child: Row(
                  children: [
                    Container(
                      width: 64,
                      height: 64,
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(18),
                      ),
                      child: const Icon(Icons.science, color: Colors.white, size: 34),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(999),
                            ),
                            child: Text(
                              test.category,
                              style: TextStyle(color: categoryColor, fontSize: 11, fontWeight: FontWeight.w800),
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            test.name,
                            style: const TextStyle(
                              fontWeight: FontWeight.w800,
                              fontSize: 18,
                              color: Colors.white,
                              letterSpacing: -0.3,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 18),

            // Key Highlights Info Tiles
            Row(
              children: [
                Expanded(
                  child: _InfoTile(
                    icon: Icons.payments_outlined,
                    label: 'Standard Fee',
                    value: 'LKR ${test.price.toStringAsFixed(0)}',
                    color: kPrimary,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _InfoTile(
                    icon: Icons.timer_outlined,
                    label: 'Turnaround Time',
                    value: '${test.turnaroundDays} Day${test.turnaroundDays > 1 ? "s" : ""}',
                    color: const Color(0xFF2563EB),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 14),

            // Prescription Policy Card
            AppCard(
              color: test.isRestricted ? const Color(0xFFFFFBEB) : const Color(0xFFF0FDF4),
              border: Border.all(
                color: test.isRestricted ? kWarning.withOpacity(0.4) : kSuccess.withOpacity(0.4),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(
                    test.isRestricted ? Icons.lock_outline : Icons.check_circle_outline,
                    color: test.isRestricted ? kWarning : kSuccess,
                    size: 24,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          test.isRestricted ? 'Prescription Required' : 'Direct Booking Available',
                          style: TextStyle(
                            fontWeight: FontWeight.w800,
                            fontSize: 14,
                            color: test.isRestricted ? const Color(0xFFB45309) : const Color(0xFF047857),
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          test.isRestricted
                              ? 'This diagnostic procedure requires a valid doctor\'s prescription. Upload a photo during booking for instant Gemini Vision AI verification.'
                              : 'No doctor prescription is required. You can book this test directly.',
                          style: const TextStyle(color: kTextMuted, fontSize: 12.5, height: 1.4),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 16),

            // About This Test Description
            AppCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    children: [
                      Icon(Icons.info_outline, size: 18, color: kPrimary),
                      SizedBox(width: 8),
                      Text('About This Test', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: kText)),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Text(
                    test.description.isNotEmpty
                        ? test.description
                        : 'Standard diagnostic procedure conducted under accredited laboratory conditions by certified technicians.',
                    style: const TextStyle(color: kTextMuted, fontSize: 13.5, height: 1.6),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 14),

            // Laboratory Protocol Notice
            AppCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    children: [
                      Icon(Icons.verified_user_outlined, size: 18, color: kPrimary),
                      SizedBox(width: 8),
                      Text('Laboratory Standards', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: kText)),
                    ],
                  ),
                  const SizedBox(height: 10),
                  const _CheckItem(text: 'ISO accredited clinical laboratory testing facility'),
                  const _CheckItem(text: 'Barcode-tracked specimen collection for complete accuracy'),
                  const _CheckItem(text: 'Instant digital notification when results are verified'),
                ],
              ),
            ),
          ],
        ),
      ),

      // Bottom Sticky Booking Button Bar
      bottomSheet: Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: Colors.white,
          border: const Border(top: BorderSide(color: kBorder)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.06),
              blurRadius: 16,
              offset: const Offset(0, -4),
            )
          ],
        ),
        child: SafeArea(
          child: Row(
            children: [
              Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Total Fee', style: TextStyle(fontSize: 11, color: kTextMuted, fontWeight: FontWeight.w600)),
                  Text(
                    'LKR ${test.price.toStringAsFixed(0)}',
                    style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: kPrimaryDark),
                  ),
                ],
              ),
              const SizedBox(width: 20),
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: _loading ? null : () {
                    if (_isLoggedIn) {
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => BookingScreen(tests: [test])),
                      );
                    } else {
                      Navigator.pushNamed(context, '/login');
                    }
                  },
                  icon: Icon(_isLoggedIn ? Icons.calendar_month_outlined : Icons.login),
                  label: Text(_isLoggedIn ? 'Book Appointment' : 'Log in to Book'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _InfoTile extends StatelessWidget {
  final IconData icon;
  final String label, value;
  final Color color;
  const _InfoTile({required this.icon, required this.label, required this.value, required this.color});

  @override
  Widget build(BuildContext context) {
    return AppCard(
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: color, size: 22),
          const SizedBox(height: 8),
          Text(label, style: const TextStyle(color: kTextMuted, fontSize: 11.5, fontWeight: FontWeight.w600)),
          const SizedBox(height: 2),
          Text(value, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16, color: kText)),
        ],
      ),
    );
  }
}

class _CheckItem extends StatelessWidget {
  final String text;
  const _CheckItem({required this.text});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.check_circle, color: kSuccess, size: 16),
          const SizedBox(width: 8),
          Expanded(
            child: Text(text, style: const TextStyle(color: kTextMuted, fontSize: 12.5)),
          ),
        ],
      ),
    );
  }
}
