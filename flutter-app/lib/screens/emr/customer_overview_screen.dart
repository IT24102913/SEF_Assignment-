import 'dart:async';
import 'dart:math';
import 'package:flutter/material.dart';
import '../../services/emr_api_service.dart';
import 'customer_health_passport_dialog.dart';
import '../../widgets/health_bridge_footer.dart';

class CustomerOverviewScreen extends StatelessWidget {
  final Function(int targetIndex) onNavigateTab;

  const CustomerOverviewScreen({
    super.key,
    required this.onNavigateTab,
  });

  @override
  Widget build(BuildContext context) {
    final patientName = ((AuthState.name?.isNotEmpty ?? false) ? AuthState.name! : EmrApiService.activePatientName).trim().split(" ").first;

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: RefreshIndicator(
        color: const Color(0xFF0D9488),
        onRefresh: () async {
          await Future.delayed(const Duration(milliseconds: 600));
        },
        child: ListView(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
          children: [
            // ── 1. WELCOME BACK GREEN BANNER (Screenshot 2) ──────────────────
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF095E51), Color(0xFF0D9488)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(20),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF0D9488).withValues(alpha: 0.25),
                    blurRadius: 14,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Welcome back, $patientName! 👋',
                    style: const TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w800,
                      color: Colors.white,
                      letterSpacing: -0.3,
                    ),
                  ),
                  const SizedBox(height: 6),
                  const Text(
                    'Access channeling, pharmacy delivery, and lab reports all in one secured portal.',
                    style: TextStyle(
                      color: Color(0xFFE6F5F2),
                      fontSize: 13,
                      height: 1.4,
                    ),
                  ),
                  const SizedBox(height: 14),
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.2),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: Colors.white.withValues(alpha: 0.3)),
                        ),
                        child: const Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.shield_outlined, size: 14, color: Colors.white),
                            SizedBox(width: 5),
                            Text(
                              'HIPAA Secured',
                              style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w700),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.2),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: Colors.white.withValues(alpha: 0.3)),
                        ),
                        child: const Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.bolt, size: 14, color: Colors.white),
                            SizedBox(width: 4),
                            Text(
                              'Health Active',
                              style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w700),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(height: 18),

            // ── 2. HOSPITAL HERO BANNER CARD (Screenshot 2) ──────────────────
            Container(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(24),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.12),
                    blurRadius: 16,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              clipBehavior: Clip.antiAlias,
              child: Stack(
                children: [
                  SizedBox(
                    height: 240,
                    width: double.infinity,
                    child: Image.asset(
                      'assets/images/mhut.jpg',
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) => Image.asset(
                        'assets/images/doctor.jpg',
                        fit: BoxFit.cover,
                      ),
                    ),
                  ),
                  Positioned.fill(
                    child: Container(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: [
                            const Color(0xFF0F172A).withValues(alpha: 0.92),
                            const Color(0xFF0F172A).withValues(alpha: 0.65),
                          ],
                          begin: Alignment.bottomLeft,
                          end: Alignment.topRight,
                        ),
                      ),
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.all(20.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(color: Colors.white.withValues(alpha: 0.25)),
                          ),
                          child: const Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.local_hospital_outlined, size: 12, color: Color(0xFF2DD4BF)),
                              SizedBox(width: 6),
                              Text(
                                'HEALTH BRIDGE HOSPITAL & CARE',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 10,
                                  fontWeight: FontWeight.w800,
                                  letterSpacing: 0.6,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 12),
                        const Text(
                          'PROVIDING TOTAL CARE FOR YOU',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w900,
                            color: Colors.white,
                            letterSpacing: -0.3,
                          ),
                        ),
                        const SizedBox(height: 8),
                        const Text(
                          'World-class medical care through board-certified doctors, 24/7 emergency response, diagnostic labs, and a smart pharmacy vault.',
                          style: TextStyle(
                            color: Color(0xFFCBD5E1),
                            fontSize: 12,
                            height: 1.4,
                          ),
                        ),
                        const SizedBox(height: 16),
                        Row(
                          children: [
                            ElevatedButton.icon(
                              onPressed: () => onNavigateTab(4),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF0D9488),
                                foregroundColor: Colors.white,
                                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                              ),
                              icon: const Text('Book Appointment', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                              label: const Icon(Icons.arrow_forward, size: 14),
                            ),
                            const SizedBox(width: 10),
                            OutlinedButton(
                              onPressed: () {
                                showDialog(
                                  context: context,
                                  builder: (context) => CustomerHealthPassportDialog(
                                    patientCode: EmrApiService.activePatientCode,
                                  ),
                                );
                              },
                              style: OutlinedButton.styleFrom(
                                foregroundColor: Colors.white,
                                side: const BorderSide(color: Colors.white70),
                                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                              ),
                              child: const Text('View Details', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 20),

            // ── 3. QUICK STATS CARDS (4 Cards Grid) (Screenshot 3) ────────────
            GridView.count(
              crossAxisCount: 2,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
              childAspectRatio: 2.1,
              children: [
                _buildStatCard(
                  icon: Icons.medication_outlined,
                  count: '2',
                  label: 'Active Prescriptions',
                  iconColor: const Color(0xFFA78BFA),
                ),
                _buildStatCard(
                  icon: Icons.science_outlined,
                  count: '1',
                  label: 'Lab Tests Booked',
                  iconColor: const Color(0xFFFBBF24),
                ),
                _buildStatCard(
                  icon: Icons.assignment_outlined,
                  count: '1',
                  label: 'Pending Orders',
                  iconColor: const Color(0xFF34D399),
                ),
                _buildStatCard(
                  icon: Icons.calendar_today_outlined,
                  count: '0',
                  label: 'Appointments',
                  iconColor: const Color(0xFF60A5FA),
                ),
              ],
            ),

            const SizedBox(height: 24),

            // ── 4. CORE HEALTHCARE PORTAL SERVICES (Screenshot 3) ─────────────
            Row(
              children: const [
                Icon(Icons.favorite, size: 18, color: Color(0xFF0D9488)),
                SizedBox(width: 8),
                Text(
                  'Core Healthcare Portal Services',
                  style: TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF0F172A),
                    letterSpacing: -0.3,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),

            // 2x2 Big Service Cards Grid
            _buildCoreServiceCard(
              title: 'Doctor Appointments',
              description: 'Consult top-rated specialists with real-time slot booking.',
              assetImage: 'assets/images/doctor.jpg',
              onTap: () => onNavigateTab(4),
            ),
            const SizedBox(height: 14),

            _buildCoreServiceCard(
              title: 'Prescriptions & Pharmacy',
              description: 'Order medicines, upload prescriptions, fast home delivery.',
              assetImage: 'assets/images/medi.jpg',
              onTap: () => onNavigateTab(3),
            ),
            const SizedBox(height: 14),

            _buildCoreServiceCard(
              title: 'Medical Records',
              description: 'Complete medical history, doctor notes & prescriptions.',
              assetImage: 'assets/images/re.avif',
              onTap: () => onNavigateTab(1),
            ),
            const SizedBox(height: 14),

            _buildCoreServiceCard(
              title: 'Lab Tests & Reports',
              description: 'Book pathology tests and download certified lab reports.',
              assetImage: 'assets/images/test.jpeg',
              onTap: () => onNavigateTab(2),
            ),

            const SizedBox(height: 28),

            // ── 5. OUR SERVICES SECTION (6 CARDS GRID) (Screenshot 4) ─────────
            Center(
              child: Column(
                children: [
                  const Text(
                    'OUR SERVICES',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w900,
                      color: Color(0xFF0F172A),
                      letterSpacing: 0.5,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Container(
                    width: 48,
                    height: 3,
                    decoration: BoxDecoration(
                      color: const Color(0xFF0D9488),
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Comprehensive healthcare solutions for your complete well-being',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: Color(0xFF64748B),
                      fontSize: 12.5,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // 6 Grid Items
            GridView.count(
              crossAxisCount: 2,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              crossAxisSpacing: 10,
              mainAxisSpacing: 10,
              childAspectRatio: 1.15,
              children: [
                _buildServiceSmallCard(
                  icon: Icons.phone_in_talk,
                  iconBg: const Color(0xFFE0F2FE),
                  iconColor: const Color(0xFF0284C7),
                  title: '24/7 Emergency Service',
                  subtitle: 'Round-the-clock emergency medical response with standby ambulance.',
                ),
                _buildServiceSmallCard(
                  icon: Icons.bloodtype_outlined,
                  iconBg: const Color(0xFFFEE2E2),
                  iconColor: const Color(0xFFDC2626),
                  title: 'Blood Bank & Plasma',
                  subtitle: 'Safe, screened blood products and 24/7 emergency donor registry.',
                ),
                _buildServiceSmallCard(
                  icon: Icons.local_hospital,
                  iconBg: const Color(0xFFD1FAE5),
                  iconColor: const Color(0xFF059669),
                  title: 'Operation Theater',
                  subtitle: 'State-of-the-art sterile surgical suites with advanced laminar airflow.',
                ),
                _buildServiceSmallCard(
                  icon: Icons.medical_services_outlined,
                  iconBg: const Color(0xFFFEF3C7),
                  iconColor: const Color(0xFFD97706),
                  title: 'General Checkup',
                  subtitle: 'Comprehensive routine health screenings and specialist consultations.',
                ),
                _buildServiceSmallCard(
                  icon: Icons.medication_liquid_outlined,
                  iconBg: const Color(0xFFF3E8FF),
                  iconColor: const Color(0xFF9333EA),
                  title: 'Indoor & Online Pharmacy',
                  subtitle: '100% genuine medications, vault storage, and rapid home delivery.',
                ),
                _buildServiceSmallCard(
                  icon: Icons.monitor_heart_outlined,
                  iconBg: const Color(0xFFE0E7FF),
                  iconColor: const Color(0xFF4F46E5),
                  title: 'ICU & Critical Care',
                  subtitle: 'Continuous multi-parameter cardiac and vital monitoring in ICU.',
                ),
              ],
            ),

            const SizedBox(height: 28),

            // ── 6. AI DAILY HEALTH TIP CARD (SLIDESHOW MATCHING WEB) ────────
            const AnimatedDailyHealthTipCard(),

            const SizedBox(height: 24),

            // ── 7. WHY PATIENTS TRUST US SECTION (MATCHING WEB 3 EMERALD CARDS) ────────
            _buildWhyPatientsTrustUsSection(),

            const SizedBox(height: 32),

            // ── 8. HEALTH BRIDGE CORPORATE FOOTER ────────────────────────────
            const HealthBridgeFooter(),
          ],
        ),
      ),
    );
  }

  // ── Stat Card Component ──────────────────────────────────────────────────
  Widget _buildStatCard({
    required IconData icon,
    required String count,
    required String label,
    required Color iconColor,
  }) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFF0F172A),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF1E293B)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.08),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: iconColor.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, size: 20, color: iconColor),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  count,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                Text(
                  label,
                  style: const TextStyle(
                    color: Color(0xFF94A3B8),
                    fontSize: 10.5,
                    fontWeight: FontWeight.w600,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ── Core Service Card Component ──────────────────────────────────────────
  Widget _buildCoreServiceCard({
    required String title,
    required String description,
    required String assetImage,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: Container(
        height: 180,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.1),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        clipBehavior: Clip.antiAlias,
        child: Stack(
          children: [
            Positioned.fill(
              child: Image.asset(
                assetImage,
                fit: BoxFit.cover,
                errorBuilder: (context, error, stackTrace) => Container(color: const Color(0xFF0D9488)),
              ),
            ),
            Positioned.fill(
              child: Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      const Color(0xFF0F172A).withValues(alpha: 0.95),
                      const Color(0xFF0F172A).withValues(alpha: 0.5),
                    ],
                    begin: Alignment.bottomCenter,
                    end: Alignment.topCenter,
                  ),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.end,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          title,
                          style: const TextStyle(
                            fontSize: 17,
                            fontWeight: FontWeight.w800,
                            color: Colors.white,
                          ),
                        ),
                      ),
                      Container(
                        width: 36,
                        height: 36,
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.2),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.arrow_forward, size: 18, color: Colors.white),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    description,
                    style: const TextStyle(
                      color: Color(0xFFCBD5E1),
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ── Small Service Card Component ─────────────────────────────────────────
  Widget _buildServiceSmallCard({
    required IconData icon,
    required Color iconBg,
    required Color iconColor,
    required String title,
    required String subtitle,
  }) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 34,
            height: 34,
            decoration: BoxDecoration(
              color: iconBg,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, size: 18, color: iconColor),
          ),
          const SizedBox(height: 8),
          Text(
            title,
            style: const TextStyle(
              fontSize: 12.5,
              fontWeight: FontWeight.w800,
              color: Color(0xFF0F172A),
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 3),
          Expanded(
            child: Text(
              subtitle,
              style: const TextStyle(
                fontSize: 10.5,
                color: Color(0xFF64748B),
                height: 1.3,
              ),
              maxLines: 3,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }

  // ── Why Patients Trust Us Section (Matching Web Design & Emerald Cards) ────
  Widget _buildWhyPatientsTrustUsSection() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        children: [
          // Header Pill Badge
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
            decoration: BoxDecoration(
              color: const Color(0xFFECFDF5),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: const Color(0xFFA7F3D0)),
            ),
            child: const Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.auto_awesome, size: 13, color: Color(0xFF059669)),
                SizedBox(width: 6),
                Text(
                  'WHY PATIENTS TRUST US',
                  style: TextStyle(
                    color: Color(0xFF059669),
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.5,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          const Text(
            'Built for Precision & Compassionate Care',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w900,
              color: Color(0xFF0F172A),
              letterSpacing: -0.3,
            ),
          ),
          const SizedBox(height: 6),
          const Text(
            'Our network delivers seamless healthcare with the highest safety standards.',
            textAlign: TextAlign.center,
            style: TextStyle(
              color: Color(0xFF64748B),
              fontSize: 12.5,
              height: 1.4,
            ),
          ),
          const SizedBox(height: 24),

          // 3 Vibrant Emerald Green Cards Stack
          _buildTrustCard(
            title: 'Clinical Excellence',
            headerIcon: Icons.medical_services_outlined,
            points: const [
              _TrustPoint(
                icon: Icons.star_outline_rounded,
                label: 'Expert Doctors',
                desc: 'Top-tier board-certified specialists across all major medical fields.',
              ),
              _TrustPoint(
                icon: Icons.science_outlined,
                label: 'Advanced Diagnostics',
                desc: 'ISO-certified AI-assisted pathology reports ensuring rapid accuracy.',
              ),
              _TrustPoint(
                icon: Icons.favorite_border_rounded,
                label: 'Personalized Care',
                desc: 'Tailored treatment plans designed around individual patient history.',
              ),
            ],
          ),
          const SizedBox(height: 16),
          _buildTrustCard(
            title: 'Patient Safety & Speed',
            headerIcon: Icons.shield_outlined,
            points: const [
              _TrustPoint(
                icon: Icons.phone_outlined,
                label: '24/7 Emergency',
                desc: 'Round-the-clock medical response with dedicated ambulance dispatch.',
              ),
              _TrustPoint(
                icon: Icons.lock_outline_rounded,
                label: 'Secure Health Vault',
                desc: '100% encrypted medical records accessible anytime, anywhere.',
              ),
              _TrustPoint(
                icon: Icons.medication_outlined,
                label: 'In-Store & Online Pharmacy',
                desc: 'Genuine vault storage and rapid home delivery options.',
              ),
            ],
          ),
          const SizedBox(height: 16),
          _buildTrustCard(
            title: 'Convenience & Trust',
            headerIcon: Icons.calendar_today_outlined,
            points: const [
              _TrustPoint(
                icon: Icons.calendar_month_outlined,
                label: 'Instant Slot Booking',
                desc: 'Real-time doctor appointments with zero waiting hassle.',
              ),
              _TrustPoint(
                icon: Icons.show_chart_rounded,
                label: 'Transparent Tracking',
                desc: 'Live monitoring for all lab tests, prescriptions, and orders.',
              ),
              _TrustPoint(
                icon: Icons.chat_bubble_outline_rounded,
                label: 'Dedicated Support',
                desc: 'Direct priority assistance via phone and integrated chat lines.',
              ),
            ],
          ),
        ],
      ),
    );
  }

  // ── Emerald Green Card Component ──────────────────────────────────────────
  Widget _buildTrustCard({
    required String title,
    required IconData headerIcon,
    required List<_TrustPoint> points,
  }) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF059669), Color(0xFF0D9488)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF059669).withValues(alpha: 0.35),
            blurRadius: 18,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header Icon Container
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.18),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: Colors.white.withValues(alpha: 0.35)),
            ),
            alignment: Alignment.center,
            child: Icon(headerIcon, color: Colors.white, size: 24),
          ),
          const SizedBox(height: 14),
          Text(
            title,
            style: const TextStyle(
              fontSize: 17,
              fontWeight: FontWeight.w800,
              color: Colors.white,
              letterSpacing: -0.2,
            ),
          ),
          const SizedBox(height: 12),
          Container(
            height: 2.5,
            width: 40,
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.4),
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(height: 18),
          ...points.map((pt) => Padding(
            padding: const EdgeInsets.only(bottom: 14.0),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(9),
                    border: Border.all(color: Colors.white.withValues(alpha: 0.28)),
                  ),
                  alignment: Alignment.center,
                  child: Icon(pt.icon, color: Colors.white, size: 16),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        pt.label,
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w800,
                          color: Colors.white,
                          letterSpacing: -0.1,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        pt.desc,
                        style: TextStyle(
                          fontSize: 11.5,
                          color: Colors.white.withValues(alpha: 0.85),
                          height: 1.4,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          )),
        ],
      ),
    );
  }
}

class _TrustPoint {
  final IconData icon;
  final String label;
  final String desc;

  const _TrustPoint({
    required this.icon,
    required this.label,
    required this.desc,
  });
}

// ── 9. ANIMATED DAILY HEALTH TIP CAROUSEL WIDGET (MATCHING WEB) ──────────────
class AnimatedDailyHealthTipCard extends StatefulWidget {
  const AnimatedDailyHealthTipCard({super.key});

  @override
  State<AnimatedDailyHealthTipCard> createState() => _AnimatedDailyHealthTipCardState();
}

class _AnimatedDailyHealthTipCardState extends State<AnimatedDailyHealthTipCard> {
  Timer? _timer;
  double _progress = 0.0;
  int _currentIndex = 0;
  bool _isBookmarked = false;
  bool _isPaused = false;

  final List<HealthTipItem> _tips = const [
    HealthTipItem(
      id: 'mind',
      emoji: '🧠',
      iconData: Icons.self_improvement,
      category: 'MENTAL CLARITY',
      title: '5-Minute Breathing & Mind Reset',
      text: 'Deep diaphragmatic breathing lowers cortisol, reduces blood pressure, and sharpens focus in just 5 minutes.',
      fact: 'The 4-7-8 pattern instantly calms your central nervous system.',
      accent: Color(0xFFF472B6),
      gradientStart: Color(0xFF1E1028),
      gradientEnd: Color(0xFF0F172A),
    ),
    HealthTipItem(
      id: 'hydra',
      emoji: '💧',
      iconData: Icons.water_drop_outlined,
      category: 'HYDRATION & VITALITY',
      title: 'Optimal Daily Water Intake',
      text: 'Drinking 8–10 glasses of water daily boosts cell hydration, cognitive focus, and kidney filtration by 25%.',
      fact: 'Drink 1 glass immediately after waking up for best results.',
      accent: Color(0xFF38BDF8),
      gradientStart: Color(0xFF0C1E38),
      gradientEnd: Color(0xFF0F172A),
    ),
    HealthTipItem(
      id: 'exer',
      emoji: '🏃‍♂️',
      iconData: Icons.directions_run,
      category: 'CARDIOVASCULAR HEALTH',
      title: '30-Minute Daily Exercise',
      text: '30 minutes of aerobic activity 5 days a week lowers blood pressure and strengthens the heart muscle.',
      fact: 'Consistent cardio cuts heart disease risk by 35%.',
      accent: Color(0xFF34D399),
      gradientStart: Color(0xFF062F24),
      gradientEnd: Color(0xFF0F172A),
    ),
    HealthTipItem(
      id: 'sleep',
      emoji: '😴',
      iconData: Icons.bedtime_outlined,
      category: 'REST & IMMUNITY',
      title: '7–9 Hours Restorative Sleep',
      text: 'Deep sleep activates immune cells, repairs muscle tissues, and clears neural metabolic waste.',
      fact: 'Avoid screens 45 minutes before bed for optimal melatonin.',
      accent: Color(0xFFA78BFA),
      gradientStart: Color(0xFF1E1B4B),
      gradientEnd: Color(0xFF0F172A),
    ),
    HealthTipItem(
      id: 'nutr',
      emoji: '🥗',
      iconData: Icons.restaurant_outlined,
      category: 'NUTRIENT RICH DIET',
      title: 'Antioxidants & Fiber for Gut Health',
      text: 'Leafy greens, omega-3s and colorful berries reduce inflammation and support digestive flora.',
      fact: 'Make half your daily meals consist of fresh vegetables & fruits.',
      accent: Color(0xFFFBBF24),
      gradientStart: Color(0xFF2D1A04),
      gradientEnd: Color(0xFF0F172A),
    ),
    HealthTipItem(
      id: 'prev',
      emoji: '🛡️',
      iconData: Icons.shield_outlined,
      category: 'PREVENTIVE HEALTH',
      title: 'Regular Diagnostic Screenings',
      text: 'Annual blood tests, cholesterol checks, and sugar monitoring catch problems before symptoms appear.',
      fact: 'Early diagnostic testing saves lives and reduces medical costs.',
      accent: Color(0xFF2DD4BF),
      gradientStart: Color(0xFF062C2A),
      gradientEnd: Color(0xFF0F172A),
    ),
  ];

  @override
  void initState() {
    super.initState();
    _startTimer();
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  void _startTimer() {
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(milliseconds: 100), (timer) {
      if (_isPaused) return;
      if (!mounted) return;
      setState(() {
        _progress += 0.025;
        if (_progress >= 1.0) {
          _progress = 0.0;
          _currentIndex = (_currentIndex + 1) % _tips.length;
        }
      });
    });
  }

  void _goTo(VoidCallback action) {
    setState(() {
      _progress = 0.0;
      action();
    });
    _startTimer();
  }

  @override
  Widget build(BuildContext context) {
    final cur = _tips[_currentIndex];

    return GestureDetector(
      onTapDown: (_) => setState(() => _isPaused = true),
      onTapUp: (_) => setState(() => _isPaused = false),
      onTapCancel: () => setState(() => _isPaused = false),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 400),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [cur.gradientStart, cur.gradientEnd],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: cur.accent.withValues(alpha: 0.35)),
          boxShadow: [
            BoxShadow(
              color: cur.accent.withValues(alpha: 0.15),
              blurRadius: 18,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Top glowing progress bar
              SizedBox(
                height: 3,
                width: double.infinity,
                child: Stack(
                  children: [
                    Container(color: Colors.white.withValues(alpha: 0.08)),
                    FractionallySizedBox(
                      widthFactor: _progress.clamp(0.0, 1.0),
                      child: Container(
                        decoration: BoxDecoration(
                          color: cur.accent,
                          boxShadow: [
                            BoxShadow(
                              color: cur.accent.withValues(alpha: 0.8),
                              blurRadius: 6,
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Header Row: Badge, Category, Refresh, Bookmark
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: cur.accent,
                            borderRadius: BorderRadius.circular(20),
                            boxShadow: [
                              BoxShadow(
                                color: cur.accent.withValues(alpha: 0.4),
                                blurRadius: 8,
                              ),
                            ],
                          ),
                          child: const Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.auto_awesome, size: 12, color: Colors.white),
                              SizedBox(width: 4),
                              Text(
                                'AI Daily Health Tip',
                                style: TextStyle(color: Colors.white, fontSize: 10.5, fontWeight: FontWeight.w800),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            cur.category,
                            style: TextStyle(
                              color: cur.accent,
                              fontSize: 10,
                              fontWeight: FontWeight.w800,
                              letterSpacing: 0.8,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        InkWell(
                          onTap: () => _goTo(() {
                            int next = Random().nextInt(_tips.length);
                            if (next == _currentIndex) next = (next + 1) % _tips.length;
                            _currentIndex = next;
                          }),
                          borderRadius: BorderRadius.circular(8),
                          child: Container(
                            padding: const EdgeInsets.all(6),
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.08),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: Colors.white.withValues(alpha: 0.15)),
                            ),
                            child: const Icon(Icons.refresh, size: 14, color: Color(0xFFE2E8F0)),
                          ),
                        ),
                        const SizedBox(width: 6),
                        InkWell(
                          onTap: () => setState(() => _isBookmarked = !_isBookmarked),
                          borderRadius: BorderRadius.circular(8),
                          child: Container(
                            padding: const EdgeInsets.all(6),
                            decoration: BoxDecoration(
                              color: _isBookmarked ? const Color(0xFFF59E0B).withValues(alpha: 0.25) : Colors.white.withValues(alpha: 0.08),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(
                                color: _isBookmarked ? const Color(0xFFF59E0B) : Colors.white.withValues(alpha: 0.15),
                              ),
                            ),
                            child: Icon(
                              _isBookmarked ? Icons.bookmark : Icons.bookmark_border,
                              size: 14,
                              color: _isBookmarked ? const Color(0xFFF59E0B) : const Color(0xFFE2E8F0),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),

                    // Tip Body with AnimatedSwitcher
                    AnimatedSwitcher(
                      duration: const Duration(milliseconds: 300),
                      child: KeyedSubtree(
                        key: ValueKey<int>(_currentIndex),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Container(
                                  width: 48,
                                  height: 48,
                                  decoration: BoxDecoration(
                                    color: Colors.white.withValues(alpha: 0.08),
                                    borderRadius: BorderRadius.circular(14),
                                    border: Border.all(color: Colors.white.withValues(alpha: 0.15)),
                                    boxShadow: [
                                      BoxShadow(
                                        color: cur.accent.withValues(alpha: 0.3),
                                        blurRadius: 12,
                                      ),
                                    ],
                                  ),
                                  alignment: Alignment.center,
                                  child: Text(
                                    cur.emoji,
                                    style: const TextStyle(fontSize: 24),
                                  ),
                                ),
                                const SizedBox(width: 14),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        cur.title,
                                        style: const TextStyle(
                                          fontSize: 15,
                                          fontWeight: FontWeight.w800,
                                          color: Colors.white,
                                          letterSpacing: -0.2,
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        cur.text,
                                        style: const TextStyle(
                                          color: Color(0xFF94A3B8),
                                          fontSize: 12,
                                          height: 1.4,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 14),
                            Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: Colors.white.withValues(alpha: 0.06),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: cur.accent.withValues(alpha: 0.3)),
                              ),
                              child: Row(
                                children: [
                                  Icon(Icons.check_circle_outline, color: cur.accent, size: 16),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Text(
                                      cur.fact,
                                      style: const TextStyle(color: Colors.white, fontSize: 11.5, fontWeight: FontWeight.w600),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),

                    const SizedBox(height: 16),

                    // Navigation Bar (Dot indicators & Arrow controls)
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        // Dots
                        Row(
                          children: List.generate(_tips.length, (index) {
                            final isSelected = index == _currentIndex;
                            return GestureDetector(
                              onTap: () => _goTo(() => _currentIndex = index),
                              child: AnimatedContainer(
                                duration: const Duration(milliseconds: 300),
                                margin: const EdgeInsets.only(right: 5),
                                height: 6,
                                width: isSelected ? 22 : 6,
                                decoration: BoxDecoration(
                                  color: isSelected ? cur.accent : Colors.white.withValues(alpha: 0.2),
                                  borderRadius: BorderRadius.circular(20),
                                  boxShadow: isSelected
                                      ? [
                                          BoxShadow(
                                            color: cur.accent.withValues(alpha: 0.8),
                                            blurRadius: 6,
                                          ),
                                        ]
                                      : null,
                                ),
                              ),
                            );
                          }),
                        ),
                        // Arrow controls
                        Row(
                          children: [
                            InkWell(
                              onTap: () => _goTo(() {
                                _currentIndex = (_currentIndex - 1 + _tips.length) % _tips.length;
                              }),
                              borderRadius: BorderRadius.circular(8),
                              child: Container(
                                padding: const EdgeInsets.all(6),
                                decoration: BoxDecoration(
                                  color: Colors.white.withValues(alpha: 0.08),
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(color: Colors.white.withValues(alpha: 0.15)),
                                ),
                                child: const Icon(Icons.chevron_left, size: 16, color: Color(0xFFE2E8F0)),
                              ),
                            ),
                            const SizedBox(width: 6),
                            InkWell(
                              onTap: () => _goTo(() {
                                _currentIndex = (_currentIndex + 1) % _tips.length;
                              }),
                              borderRadius: BorderRadius.circular(8),
                              child: Container(
                                padding: const EdgeInsets.all(6),
                                decoration: BoxDecoration(
                                  color: Colors.white.withValues(alpha: 0.08),
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(color: Colors.white.withValues(alpha: 0.15)),
                                ),
                                child: const Icon(Icons.chevron_right, size: 16, color: Color(0xFFE2E8F0)),
                              ),
                            ),
                          ],
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

class HealthTipItem {
  final String id;
  final String emoji;
  final IconData iconData;
  final String category;
  final String title;
  final String text;
  final String fact;
  final Color accent;
  final Color gradientStart;
  final Color gradientEnd;

  const HealthTipItem({
    required this.id,
    required this.emoji,
    required this.iconData,
    required this.category,
    required this.title,
    required this.text,
    required this.fact,
    required this.accent,
    required this.gradientStart,
    required this.gradientEnd,
  });
}
