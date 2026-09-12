import 'package:flutter/material.dart';
import '../../services/emr_api_service.dart';
import '../../utils/theme.dart';
import '../auth/login_screen.dart';
import 'customer_profile_screen.dart';
import 'customer_overview_screen.dart';
import 'customer_consultations_screen.dart';
import 'customer_lab_reports_screen.dart';
import 'customer_pharmacy_screen.dart';
import 'customer_channeling_screen.dart';
import 'customer_health_passport_dialog.dart';

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


  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: HealthBridgeTheme.lightBg,
      // ─── Health Bridge Teal AppBar ──────────────────────────────────────────
      appBar: AppBar(
        backgroundColor: HealthBridgeTheme.primaryTeal,
        elevation: 0,
        foregroundColor: Colors.white,
        titleSpacing: 16,
        title: Row(
          children: [
            // Logo Container with Heartbeat Icon
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: HealthBridgeTheme.accentTeal,
                borderRadius: BorderRadius.circular(10),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.2),
                    blurRadius: 4,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: const Icon(Icons.favorite, color: Colors.white, size: 20),
            ),
            const SizedBox(width: 12),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text(
                  'Health Bridge',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                    letterSpacing: -0.2,
                  ),
                ),
                Text(
                  'EMR PORTAL • ${EmrApiService.activePatientCode}',
                  style: const TextStyle(
                    color: Color(0xFFA8D5CE),
                    fontSize: 10.5,
                    fontWeight: FontWeight.w600,
                    letterSpacing: 0.6,
                  ),
                ),
              ],
            ),
          ],
        ),
        actions: [
          // ── User Account Popup (replaces patient switcher)
          PopupMenuButton<String>(
            tooltip: 'My Profile & Account',
            offset: const Offset(0, 48),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            icon: Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.2),
                shape: BoxShape.circle,
                border: Border.all(color: Colors.white.withValues(alpha: 0.4), width: 1.5),
              ),
              child: Center(
                child: Text(
                  AuthState.initials,
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 14),
                ),
              ),
            ),
            itemBuilder: (context) => [
              // User info header (tappable to view profile)
              PopupMenuItem<String>(
                value: 'profile',
                height: 68,
                child: Row(
                  children: [
                    Container(
                      width: 38, height: 38,
                      decoration: const BoxDecoration(
                        gradient: LinearGradient(
                          colors: [HealthBridgeTheme.primaryTeal, HealthBridgeTheme.accentTeal],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        shape: BoxShape.circle,
                      ),
                      child: Center(
                        child: Text(AuthState.initials,
                          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 15)),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            AuthState.name ?? 'Patient',
                            style: const TextStyle(color: HealthBridgeTheme.textPrimary, fontWeight: FontWeight.w700, fontSize: 14),
                            overflow: TextOverflow.ellipsis,
                          ),
                          Text(
                            'ID: ${AuthState.patientCode ?? EmrApiService.activePatientCode}',
                            style: const TextStyle(color: HealthBridgeTheme.textSecondary, fontSize: 11),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),
                    const Icon(Icons.arrow_forward_ios, size: 12, color: Colors.grey),
                  ],
                ),
              ),
              const PopupMenuDivider(),
              const PopupMenuItem<String>(
                value: 'profile',
                child: Row(
                  children: [
                    Icon(Icons.badge_outlined, size: 18, color: HealthBridgeTheme.accentTeal),
                    SizedBox(width: 10),
                    Text('Patient Medical Profile', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13.5)),
                  ],
                ),
              ),
              const PopupMenuItem<String>(
                value: 'login',
                child: Row(
                  children: [
                    Icon(Icons.switch_account_outlined, size: 18, color: HealthBridgeTheme.textSecondary),
                    SizedBox(width: 10),
                    Text('Switch Account / Login', style: TextStyle(fontWeight: FontWeight.w500, fontSize: 13.5)),
                  ],
                ),
              ),
              const PopupMenuItem<String>(
                value: 'logout',
                child: Row(
                  children: [
                    Icon(Icons.logout, size: 18, color: Color(0xFFDC2626)),
                    SizedBox(width: 10),
                    Text('Logout', style: TextStyle(color: Color(0xFFDC2626), fontWeight: FontWeight.w600, fontSize: 13.5)),
                  ],
                ),
              ),
            ],
            onSelected: (value) {
              if (value == 'profile') {
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const CustomerProfileScreen()),
                );
              } else if (value == 'login') {
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const LoginScreen()),
                );
              } else if (value == 'logout') {
                AuthState.clear();
                Navigator.of(context).pushAndRemoveUntil(
                  MaterialPageRoute(builder: (_) => const LoginScreen()),
                  (_) => false,
                );
              }
            },
          ),

          // Clinical Health Passport Button
          IconButton(
            tooltip: 'Clinical Passport',
            icon: const Icon(Icons.health_and_safety_outlined, color: Colors.white),
            onPressed: () {
              showDialog(
                context: context,
                builder: (context) => CustomerHealthPassportDialog(
                  patientCode: EmrApiService.activePatientCode,
                ),
              );
            },
          ),

          // Notification Bell with Badge
          Stack(
            alignment: Alignment.center,
            children: [
              IconButton(
                tooltip: 'Notifications',
                icon: const Icon(Icons.notifications_none, color: Colors.white),
                onPressed: () => _showNotificationsBottomSheet(context),
              ),
              Positioned(
                right: 12,
                top: 14,
                child: Container(
                  width: 8,
                  height: 8,
                  decoration: const BoxDecoration(
                    color: Color(0xFFF97316), // Orange alert dot
                    shape: BoxShape.circle,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(width: 4),
        ],
      ),

      // ─── Body (IndexedStack preserves scroll and state) ─────────────────────
      body: IndexedStack(
        index: _currentIndex,
        children: [
          CustomerOverviewScreen(onNavigateTab: _onSelectTab),
          const CustomerConsultationsScreen(),
          const CustomerLabReportsScreen(),
          const CustomerPharmacyScreen(),
          const CustomerChannelingScreen(),
        ],
      ),

      // ─── Bottom Navigation Bar (Health Bridge Style) ─────────────────────────
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          border: Border(
            top: BorderSide(color: HealthBridgeTheme.cardBorder, width: 1),
          ),
          boxShadow: [
            BoxShadow(
              color: Color(0x0A000000),
              blurRadius: 10,
              offset: Offset(0, -2),
            ),
          ],
        ),
        child: BottomNavigationBar(
          currentIndex: _currentIndex,
          onTap: _onSelectTab,
          type: BottomNavigationBarType.fixed,
          backgroundColor: Colors.white,
          selectedItemColor: HealthBridgeTheme.primaryTeal,
          unselectedItemColor: HealthBridgeTheme.textSecondary,
          selectedFontSize: 11,
          unselectedFontSize: 11,
          selectedLabelStyle: const TextStyle(fontWeight: FontWeight.w700),
          unselectedLabelStyle: const TextStyle(fontWeight: FontWeight.w500),
          items: const [
            BottomNavigationBarItem(
              icon: Icon(Icons.grid_view),
              activeIcon: Icon(Icons.grid_view_rounded),
              label: 'Overview',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.description_outlined),
              activeIcon: Icon(Icons.description),
              label: 'Consults',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.biotech_outlined),
              activeIcon: Icon(Icons.biotech),
              label: 'Labs',
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

  void _showNotificationsBottomSheet(BuildContext context) {
    final notifications = [
      {
        'title': 'Lab Report Ready',
        'message': 'Complete Blood Count (CBC) results certified by pathologist.',
        'time': '5 mins ago',
        'unread': true,
      },
      {
        'title': 'Prescription Refilled',
        'message': 'Lisinopril 10mg processed by Central Pharmacy.',
        'time': '1 hour ago',
        'unread': true,
      },
      {
        'title': 'Appointment Confirmed',
        'message': 'Session with Dr. Sarah Chen confirmed for Aug 24.',
        'time': '3 hours ago',
        'unread': false,
      },
      {
        'title': 'Consultation Note Added',
        'message': 'Dr. Michael Chang added notes for allergic asthma.',
        'time': '1 day ago',
        'unread': false,
      },
    ];

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
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
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: HealthBridgeTheme.textPrimary,
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: HealthBridgeTheme.mintAccent,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Text(
                      '2 New',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        color: HealthBridgeTheme.primaryTeal,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              const Divider(height: 1),
              const SizedBox(height: 10),
              ...notifications.map((n) {
                final isUnread = n['unread'] == true;
                return Container(
                  margin: const EdgeInsets.only(bottom: 10),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: isUnread ? HealthBridgeTheme.lightBg : Colors.white,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                      color: isUnread ? const Color(0xFFCCE8E3) : HealthBridgeTheme.cardBorder,
                    ),
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        width: 8,
                        height: 8,
                        margin: const EdgeInsets.only(top: 5),
                        decoration: BoxDecoration(
                          color: isUnread ? HealthBridgeTheme.accentTeal : Colors.transparent,
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              n['title'] as String,
                              style: TextStyle(
                                fontWeight: isUnread ? FontWeight.bold : FontWeight.w600,
                                fontSize: 13,
                                color: HealthBridgeTheme.textPrimary,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              n['message'] as String,
                              style: const TextStyle(fontSize: 12, color: HealthBridgeTheme.textSecondary),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              n['time'] as String,
                              style: const TextStyle(fontSize: 10.5, color: HealthBridgeTheme.textMuted),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                );
              }),
            ],
          ),
        );
      },
    );
  }
}
