import 'package:flutter/material.dart';
import '../../utils/theme.dart';

import '../../services/auth_service.dart';
import '../doctor/doctor_search_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  bool _isLoggedIn = false;

  @override
  void initState() {
    super.initState();
    _checkAuth();
  }

  Future<void> _checkAuth() async {
    final loggedIn = await AuthService.isLoggedIn();
    if (mounted) setState(() => _isLoggedIn = loggedIn);
  }

  Future<void> _handleAuthAction() async {
    if (_isLoggedIn) {
      await AuthService.logout();
    }
    if (mounted) Navigator.pushReplacementNamed(context, '/login');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: kBg,
      body: CustomScrollView(
        slivers: [
          _buildSliverAppBar(),
          SliverToBoxAdapter(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 16),
                const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 20),
                  child: Text(
                    'Our Services',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w800,
                      color: kPrimaryDark,
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                _buildServiceCards(context),
                const SizedBox(height: 24),
                _buildPromoBanner(
                  title: 'YOUR TRUSTED HEALTHCARE\nPARTNER',
                  subtitle: 'Quality medical solutions at Health Bridge Pvt.',
                  buttonText: 'Explore Services',
                  gradientColors: [const Color(0xFF00332B), const Color(0xFF004D40)],
                ),
                _buildPromoBanner(
                  title: 'Online Pharmacy & Medications',
                  subtitle: 'Order genuine prescription medications, over-the-counter drugs, and healthcare essentials delivered safely to your doorstep.',
                  buttonText: 'Browse Pharmacy',
                  gradientColors: [const Color(0xFF101B20), const Color(0xFF192A32)],
                ),
                const SizedBox(height: 40),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSliverAppBar() {
    return SliverAppBar(
      backgroundColor: kPrimary,
      expandedHeight: 140,
      floating: true,
      pinned: true,
      centerTitle: true,
      title: const Text('Health Bridge Pvt', style: TextStyle(fontWeight: FontWeight.bold)),
      leading: IconButton(icon: const Icon(Icons.menu), onPressed: () {}),
      actions: [
        Stack(
          alignment: Alignment.center,
          children: [
            IconButton(icon: const Icon(Icons.notifications_outlined), onPressed: () {}),
            Positioned(
              right: 8,
              top: 8,
              child: Container(
                padding: const EdgeInsets.all(4),
                decoration: const BoxDecoration(
                  color: Colors.white,
                  shape: BoxShape.circle,
                ),
                child: const Text('0', style: TextStyle(color: kPrimary, fontSize: 10, fontWeight: FontWeight.bold)),
              ),
            )
          ],
        ),
        IconButton(
          icon: Icon(_isLoggedIn ? Icons.logout : Icons.login),
          tooltip: _isLoggedIn ? 'Log Out' : 'Log In',
          onPressed: _handleAuthAction,
        ),
      ],
      bottom: PreferredSize(
        preferredSize: const Size.fromHeight(60),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
          child: Container(
            height: 48,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(30),
            ),
            child: const TextField(
              decoration: InputDecoration(
                hintText: 'Search entire store here...',
                hintStyle: TextStyle(color: kTextMuted, fontSize: 14),
                suffixIcon: Icon(Icons.search, color: kPrimary),
                border: InputBorder.none,
                enabledBorder: InputBorder.none,
                focusedBorder: InputBorder.none,
                contentPadding: EdgeInsets.symmetric(horizontal: 20, vertical: 14),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildServiceCards(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Column(
        children: [
          _buildServiceCard(
            icon: Icons.medical_services_outlined,
            title: 'Doctor Appointments',
            description: 'Book and manage your appointments.',
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const DoctorSearchScreen()),
              );
            },
          ),
          const SizedBox(height: 12),
          _buildServiceCard(
            icon: Icons.medication_outlined,
            title: 'Prescriptions & Pharmacy',
            description: 'Access prescriptions and medication services.',
            onTap: () {
              Navigator.pushNamed(context, '/pharmacy');
            },
          ),
          const SizedBox(height: 12),
          _buildServiceCard(
            icon: Icons.assignment_outlined,
            title: 'Medical Records',
            description: 'View your health records securely.',
            onTap: () {
              Navigator.pushNamed(context, '/emr');
            },
          ),
          const SizedBox(height: 12),
          _buildServiceCard(
            icon: Icons.biotech_outlined,
            title: 'Lab Tests & Reports',
            description: 'Book tests and view results online.',
            onTap: () {
              Navigator.pushNamed(context, '/lab-hub');
            },
          ),
        ],
      ),
    );
  }

  Widget _buildServiceCard({required IconData icon, required String title, required String description, required VoidCallback onTap}) {
    return AppCard(
      onTap: onTap,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
      child: Row(
        children: [
          Icon(icon, size: 40, color: kPrimary),
          const SizedBox(width: 20),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15, color: kText)),
                const SizedBox(height: 4),
                Text(description, style: const TextStyle(color: kTextMuted, fontSize: 13)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPromoBanner({required String title, required String subtitle, required String buttonText, required List<Color> gradientColors}) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(30),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: gradientColors,
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: Column(
        children: [
          Text(
            title,
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.w900,
              fontSize: 18,
              height: 1.3,
            ),
          ),
          const SizedBox(height: 12),
          Text(
            subtitle,
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: Colors.white70,
              fontSize: 13,
            ),
          ),
          const SizedBox(height: 24),
          ElevatedButton(
            onPressed: () {},
            style: ElevatedButton.styleFrom(
              backgroundColor: kSecondary,
              foregroundColor: Colors.black,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
              padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 12),
            ),
            child: Text(buttonText, style: const TextStyle(fontWeight: FontWeight.w800)),
          ),
        ],
      ),
    );
  }
}
