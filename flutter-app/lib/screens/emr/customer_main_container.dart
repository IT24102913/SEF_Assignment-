import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../services/emr_api_service.dart';
import '../../main.dart';
import 'customer_profile_screen.dart';
import 'customer_overview_screen.dart';
import 'customer_pharmacy_screen.dart';
import '../../screens/doctor/doctor_search_screen.dart';
import '../../screens/lab/lab_hub_screen.dart';
import 'emr_patient_screen.dart';
import '../../my_pharmacy_orders_page.dart';

import '../../widgets/draggable_floating_support_buttons.dart';

class CustomerMainContainer extends StatefulWidget {
  final int initialTabIndex;

  const CustomerMainContainer({
    super.key,
    this.initialTabIndex = 0,
  });

  @override
  State<CustomerMainContainer> createState() => _CustomerMainContainerState();
}

class _CustomerMainContainerState extends State<CustomerMainContainer> {
  late int _currentIndex;

  @override
  void initState() {
    super.initState();
    _currentIndex = widget.initialTabIndex;
    if (AuthState.patientCode != null && AuthState.patientCode!.isNotEmpty) {
      EmrApiService.setActivePatient(AuthState.patientCode!, AuthState.name ?? 'Patient');
    }
  }

  void _onSelectTab(int index) {
    setState(() => _currentIndex = index);
  }

  Future<void> _launchWhatsApp() async {
    final uri = Uri.parse("https://wa.me/94764887396?text=Hello%20Health%20Bridge%20Support");
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  Future<void> _makeCall() async {
    final uri = Uri.parse("tel:0764887396");
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    }
  }

  @override
  Widget build(BuildContext context) {
    final userName = AuthState.name ?? AppSession.userName ?? 'Patient';
    final userInitial = userName.isNotEmpty ? userName[0].toUpperCase() : 'P';

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      // ─── HEALTH BRIDGE WEB STYLED APP BAR (Screenshot 2) ────────────────
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 1,
        foregroundColor: const Color(0xFF0F172A),
        shadowColor: Colors.black.withValues(alpha: 0.05),
        titleSpacing: 0,
        title: Row(
          children: [
            // Logo Image / Container
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                color: const Color(0xFFF0FDF4),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Image.asset(
                'assets/images/logo.png',
                fit: BoxFit.contain,
                errorBuilder: (context, error, stackTrace) => const Icon(Icons.favorite, color: Color(0xFF0D9488), size: 20),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: const [
                  Text(
                    'HEALTH BRIDGE',
                    style: TextStyle(
                      color: Color(0xFF0D9488),
                      fontSize: 13,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 0.3,
                    ),
                  ),
                  Text(
                    'PATIENT PORTAL',
                    style: TextStyle(
                      color: Color(0xFF64748B),
                      fontSize: 9.5,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.5,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          // Notification Bell Icon with Dot
          Stack(
            alignment: Alignment.center,
            children: [
              IconButton(
                icon: const Icon(Icons.notifications_none, color: Color(0xFF475569)),
                onPressed: () => _showNotificationsBottomSheet(context),
              ),
              Positioned(
                right: 12,
                top: 14,
                child: Container(
                  width: 8,
                  height: 8,
                  decoration: const BoxDecoration(
                    color: Color(0xFF0D9488),
                    shape: BoxShape.circle,
                  ),
                ),
              ),
            ],
          ),

          // User Profile Pill (Matching Screenshot 2 Top-Right Pill)
          GestureDetector(
            onTap: () {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const CustomerProfileScreen()),
              );
            },
            child: Container(
              margin: const EdgeInsets.only(right: 12, top: 10, bottom: 10),
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: const Color(0xFFF1F5F9),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 12,
                    backgroundColor: const Color(0xFF0D9488),
                    child: Text(
                      userInitial,
                      style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                    ),
                  ),
                  const SizedBox(width: 6),
                  Text(
                    userName,
                    style: const TextStyle(color: Color(0xFF0F172A), fontSize: 12, fontWeight: FontWeight.w700),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),

      // ─── SIDEBAR DRAWER ──────────────────────────────────────────────────
      drawer: Drawer(
        backgroundColor: Colors.white,
        child: Column(
          children: [
            // Drawer Header
            DrawerHeader(
              decoration: const BoxDecoration(color: Color(0xFFF8FAFC)),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Row(
                    children: [
                      Container(
                        width: 42,
                        height: 42,
                        padding: const EdgeInsets.all(6),
                        decoration: BoxDecoration(
                          color: const Color(0xFFE6F5F2),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Image.asset(
                          'assets/images/logo.png',
                          fit: BoxFit.contain,
                          errorBuilder: (context, error, stackTrace) => const Icon(Icons.favorite, color: Color(0xFF0D9488)),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: const [
                          Text(
                            'HEALTH BRIDGE',
                            style: TextStyle(color: Color(0xFF0D9488), fontWeight: FontWeight.w900, fontSize: 15),
                          ),
                          Text(
                            'PRIVATE HOSPITAL',
                            style: TextStyle(color: Color(0xFF64748B), fontWeight: FontWeight.w700, fontSize: 11),
                          ),
                        ],
                      ),
                    ],
                  ),
                ],
              ),
            ),

            // Sidebar Menu Links
            Expanded(
              child: ListView(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                children: [
                  _buildDrawerItem(
                    icon: Icons.home_outlined,
                    label: 'Overview',
                    selected: _currentIndex == 0,
                    onTap: () {
                      Navigator.pop(context);
                      _onSelectTab(0);
                    },
                  ),
                  _buildDrawerItem(
                    icon: Icons.medical_services_outlined,
                    label: 'Health Services',
                    selected: false,
                    onTap: () {
                      Navigator.pop(context);
                      _onSelectTab(0);
                    },
                  ),
                  _buildDrawerItem(
                    icon: Icons.description_outlined,
                    label: 'EMR Medical Records',
                    selected: _currentIndex == 1,
                    onTap: () {
                      Navigator.pop(context);
                      _onSelectTab(1);
                    },
                  ),
                  _buildDrawerItem(
                    icon: Icons.person_search_outlined,
                    label: 'Doctor Channeling',
                    selected: _currentIndex == 4,
                    onTap: () {
                      Navigator.pop(context);
                      _onSelectTab(4);
                    },
                  ),
                  _buildDrawerItem(
                    icon: Icons.medication_outlined,
                    label: 'Pharmacy Store',
                    selected: _currentIndex == 3,
                    onTap: () {
                      Navigator.pop(context);
                      _onSelectTab(3);
                    },
                  ),
                  _buildDrawerItem(
                    icon: Icons.science_outlined,
                    label: 'Lab Tests & Reports',
                    selected: _currentIndex == 2,
                    onTap: () {
                      Navigator.pop(context);
                      _onSelectTab(2);
                    },
                  ),
                  _buildDrawerItem(
                    icon: Icons.assignment_outlined,
                    label: 'My Orders',
                    selected: false,
                    onTap: () {
                      Navigator.pop(context);
                      Navigator.push(context, MaterialPageRoute(builder: (_) => const MyPharmacyOrdersPage()));
                    },
                  ),
                  _buildDrawerItem(
                    icon: Icons.person_outline,
                    label: 'My Profile',
                    selected: false,
                    onTap: () {
                      Navigator.pop(context);
                      Navigator.push(context, MaterialPageRoute(builder: (_) => const CustomerProfileScreen()));
                    },
                  ),
                ],
              ),
            ),

            // Bottom Support Action Buttons (WhatsApp & Call)
            Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                children: [
                  SizedBox(
                    width: double.infinity,
                    height: 42,
                    child: ElevatedButton.icon(
                      onPressed: _launchWhatsApp,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF25D366),
                        foregroundColor: Colors.white,
                        elevation: 0,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      icon: const Icon(Icons.chat_bubble_outline, size: 18),
                      label: const Text('WhatsApp Support', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 12.5)),
                    ),
                  ),
                  const SizedBox(height: 8),
                  SizedBox(
                    width: double.infinity,
                    height: 42,
                    child: ElevatedButton.icon(
                      onPressed: _makeCall,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF0284C7),
                        foregroundColor: Colors.white,
                        elevation: 0,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      icon: const Icon(Icons.phone, size: 18),
                      label: const Text('Call: 0764887396', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 12.5)),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),

      // ─── BODY STACK WITH FLOATING DRAGGABLE SUPPORT BUTTONS ──────────
      body: Stack(
        children: [
          IndexedStack(
            index: _currentIndex,
            children: [
              CustomerOverviewScreen(onNavigateTab: _onSelectTab),
              const EmrPatientScreen(),
              const LabHubScreen(),
              const CustomerPharmacyScreen(),
              const DoctorSearchScreen(),
            ],
          ),
          const DraggableFloatingSupportButtons(),
        ],
      ),

      // ─── BOTTOM NAVIGATION BAR (Android Mobile Navigation) ─────────────
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          border: Border(top: BorderSide(color: Color(0xFFE2E8F0), width: 1)),
        ),
        child: BottomNavigationBar(
          currentIndex: _currentIndex,
          onTap: _onSelectTab,
          type: BottomNavigationBarType.fixed,
          backgroundColor: Colors.white,
          selectedItemColor: const Color(0xFF0D9488),
          unselectedItemColor: const Color(0xFF64748B),
          selectedFontSize: 11,
          unselectedFontSize: 11,
          selectedLabelStyle: const TextStyle(fontWeight: FontWeight.w800),
          unselectedLabelStyle: const TextStyle(fontWeight: FontWeight.w600),
          items: const [
            BottomNavigationBarItem(
              icon: Icon(Icons.grid_view_outlined),
              activeIcon: Icon(Icons.grid_view_rounded),
              label: 'Overview',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.description_outlined),
              activeIcon: Icon(Icons.description),
              label: 'EMR Records',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.biotech_outlined),
              activeIcon: Icon(Icons.biotech),
              label: 'Lab Hub',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.medication_outlined),
              activeIcon: Icon(Icons.medication),
              label: 'Pharmacy',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.calendar_today_outlined),
              activeIcon: Icon(Icons.calendar_today),
              label: 'Channeling',
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDrawerItem({
    required IconData icon,
    required String label,
    required bool selected,
    required VoidCallback onTap,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 4),
      decoration: BoxDecoration(
        color: selected ? const Color(0xFFE6F5F2) : Colors.transparent,
        borderRadius: BorderRadius.circular(10),
      ),
      child: ListTile(
        leading: Icon(icon, color: selected ? const Color(0xFF0D9488) : const Color(0xFF64748B), size: 20),
        title: Text(
          label,
          style: TextStyle(
            color: selected ? const Color(0xFF0D9488) : const Color(0xFF334155),
            fontWeight: selected ? FontWeight.w800 : FontWeight.w600,
            fontSize: 13,
          ),
        ),
        dense: true,
        onTap: onTap,
      ),
    );
  }

  Future<void> _sendAppealEmail(String orderNumber) async {
    final Uri emailLaunchUri = Uri(
      scheme: 'mailto',
      path: 'medibridge@gmail.com',
      queryParameters: {
        'subject': 'Prescription Violation Appeal - Order #$orderNumber',
        'body': 'Dear MediBridge Support Team,\n\nI am submitting an appeal regarding the prescription violation warning issued for Order #$orderNumber.\n\nPlease find my explanation and doctor letter details below:\n',
      },
    );
    if (await canLaunchUrl(emailLaunchUri)) {
      await launchUrl(emailLaunchUri);
    } else {
      await launchUrl(Uri.parse('mailto:medibridge@gmail.com?subject=Prescription%20Violation%20Appeal%20-%20Order%20%23$orderNumber'));
    }
  }

  void _showPrescriptionViolationModal(BuildContext context, Map<String, dynamic> notif) {
    final orderNumber = notif['targetOrderNumber'] ?? 'ORD-20260923-7862';
    final message = notif['message'] ?? 'We detected that you uploaded an invalid non-medical image for prescription verification (Order #ORD-20260923-7862). Your account may be blocked if this continues. If you have valid reasons or a doctor letter, please send an appeal to medibridge@gmail.com.';

    showDialog(
      context: context,
      barrierDismissible: true,
      builder: (ctx) => Dialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        child: Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: const Color(0xFFFCA5A5), width: 1.5),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header with Close Button
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Row(
                      children: [
                        Container(
                          width: 40,
                          height: 40,
                          decoration: BoxDecoration(
                            color: const Color(0xFFFEE2E2),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: const Color(0xFFFCA5A5)),
                          ),
                          child: const Icon(Icons.warning_amber_rounded, color: Color(0xFFDC2626), size: 22),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'PRESCRIPTION VIOLATION',
                                style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w900, color: Color(0xFF991B1B)),
                                overflow: TextOverflow.ellipsis,
                              ),
                              Text(
                                'Order: #$orderNumber',
                                style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w800, color: Color(0xFFDC2626)),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close, color: Color(0xFF64748B)),
                    onPressed: () => Navigator.pop(ctx),
                    tooltip: 'Close Window',
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // Official Warning Notice Box
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: const Color(0xFFFEF2F2),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: const Color(0xFFFCA5A5)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      '⚠️ OFFICIAL NOTICE FROM PHARMACY ADMIN:',
                      style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w900, color: Color(0xFF991B1B)),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      message,
                      style: const TextStyle(fontSize: 12.5, color: Color(0xFF7F1D1D), height: 1.5, fontWeight: FontWeight.w600),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 14),

              // Identified Order Badge Box
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Identified Offending Order:',
                      style: TextStyle(fontWeight: FontWeight.w800, fontSize: 12, color: Color(0xFF0F172A)),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'Order #: $orderNumber',
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w900, color: Color(0xFFDC2626)),
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'To appeal this decision or attach a doctor letter, tap the button below to email medibridge@gmail.com.',
                      style: TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 18),

              // Action Buttons Row
              Row(
                children: [
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () {
                        Navigator.pop(ctx);
                        _sendAppealEmail(orderNumber);
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFFDC2626),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        elevation: 0,
                      ),
                      icon: const Icon(Icons.mail_outline, size: 16),
                      label: const Text('Send Appeal', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 11.5)),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () {
                        Navigator.pop(ctx);
                        Navigator.push(context, MaterialPageRoute(builder: (_) => const MyPharmacyOrdersPage()));
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF0F172A),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        elevation: 0,
                      ),
                      icon: const Icon(Icons.assignment_outlined, size: 16),
                      label: const Text('View Orders', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 11.5)),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showNotificationsBottomSheet(BuildContext context) {
    final notificationsList = [
      {
        'id': 'notif-7862',
        'title': '⚠️ URGENT PRESCRIPTION VIOLATION WARNING: #ORD-20260923-7862',
        'message': 'We detected that you uploaded an invalid non-medical image for prescription verification (Order #ORD-20260923-7862). Your account may be blocked if this continues. If you have valid reasons or a doctor letter, please send an appeal to medibridge@gmail.com.',
        'targetOrderNumber': 'ORD-20260923-7862',
        'isViolationWarning': true,
        'time': '3:19:11 PM',
      },
      {
        'id': 'notif-102',
        'title': 'Lab Report Ready: CBC Pathology',
        'message': 'Your Complete Blood Count (CBC) pathology report is certified and ready.',
        'targetOrderNumber': '',
        'isViolationWarning': false,
        'time': '11:45:00 AM',
      },
    ];

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) {
        return Padding(
          padding: const EdgeInsets.all(20.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Notifications Center',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFEF2F2),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFFCA5A5)),
                    ),
                    child: Text(
                      '${notificationsList.length} New',
                      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFFDC2626)),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              const Divider(height: 1),
              const SizedBox(height: 14),
              Flexible(
                child: ListView.separated(
                  shrinkWrap: true,
                  itemCount: notificationsList.length,
                  separatorBuilder: (context, index) => const SizedBox(height: 10),
                  itemBuilder: (ctx, idx) {
                    final item = notificationsList[idx];
                    final isWarning = item['isViolationWarning'] == true;
                    return InkWell(
                      onTap: () {
                        Navigator.pop(context);
                        if (isWarning) {
                          _showPrescriptionViolationModal(context, item);
                        } else {
                          Navigator.push(context, MaterialPageRoute(builder: (_) => const MyPharmacyOrdersPage()));
                        }
                      },
                      borderRadius: BorderRadius.circular(12),
                      child: Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: isWarning ? const Color(0xFFFEF2F2) : const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: isWarning ? const Color(0xFFFCA5A5) : const Color(0xFFE2E8F0)),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Icon(
                                  isWarning ? Icons.warning_amber_rounded : Icons.info_outline,
                                  color: isWarning ? const Color(0xFFDC2626) : const Color(0xFF0D9488),
                                  size: 20,
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    item['title'].toString(),
                                    style: TextStyle(
                                      fontWeight: FontWeight.w800,
                                      fontSize: 13,
                                      color: isWarning ? const Color(0xFF991B1B) : const Color(0xFF0F172A),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 6),
                            Text(
                              item['message'].toString(),
                              style: TextStyle(
                                fontSize: 12,
                                color: isWarning ? const Color(0xFF7F1D1D) : const Color(0xFF64748B),
                                height: 1.4,
                              ),
                            ),
                            const SizedBox(height: 6),
                            Text(
                              '${item['time']} • 🔍 Tap to Open Warning Window',
                              style: TextStyle(
                                fontSize: 10.5,
                                fontWeight: FontWeight.w700,
                                color: isWarning ? const Color(0xFFDC2626) : const Color(0xFF94A3B8),
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
