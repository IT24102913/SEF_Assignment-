import 'package:flutter/material.dart';
import '../../services/emr_api_service.dart';
import '../../utils/theme.dart';
import '../auth/login_screen.dart';
import 'customer_health_passport_dialog.dart';

class CustomerOverviewScreen extends StatelessWidget {
  final Function(int targetIndex) onNavigateTab;

  const CustomerOverviewScreen({
    super.key,
    required this.onNavigateTab,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: HealthBridgeTheme.lightBg,
      body: RefreshIndicator(
        color: HealthBridgeTheme.accentTeal,
        onRefresh: () async {
          // Trigger refresh
          await Future.delayed(const Duration(milliseconds: 600));
        },
        child: ListView(
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 20),
          children: [
            // ── Welcome Banner ──────────────────────────────────────────────
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Welcome back, ${((AuthState.name?.isNotEmpty ?? false) ? AuthState.name! : EmrApiService.activePatientName).trim().split(" ").first}!',
                        style: const TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.w800,
                          color: HealthBridgeTheme.textPrimary,
                          letterSpacing: -0.5,
                        ),
                      ),
                      const SizedBox(height: 4),
                      const Text(
                        "Here's your health overview at a glance.",
                        style: TextStyle(
                          color: HealthBridgeTheme.textSecondary,
                          fontSize: 13,
                        ),
                      ),
                    ],
                  ),
                ),
                // Health Passport Quick Action
                InkWell(
                  onTap: () {
                    showDialog(
                      context: context,
                      builder: (context) => CustomerHealthPassportDialog(
                        patientCode: EmrApiService.activePatientCode,
                      ),
                    );
                  },
                  borderRadius: BorderRadius.circular(12),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                    decoration: BoxDecoration(
                      color: HealthBridgeTheme.mintAccent,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: HealthBridgeTheme.accentTeal.withValues(alpha: 0.3)),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.health_and_safety, color: HealthBridgeTheme.primaryTeal, size: 18),
                        SizedBox(width: 6),
                        Text(
                          'Passport',
                          style: TextStyle(
                            color: HealthBridgeTheme.primaryTeal,
                            fontWeight: FontWeight.bold,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 24),

            // ── 2x2 Grid of Image Banner Cards (Matching React Overview) ─────
            _buildCard(
              context: context,
              title: 'Consultation Notes',
              description: 'View your consultation history, medical diagnoses, and doctor notes.',
              badgeText: 'Consultations',
              dotColor: const Color(0xFFEF4444), // Red dot
              imageUrl: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&q=80&w=800',
              onTap: () => onNavigateTab(1),
            ),

            const SizedBox(height: 18),

            _buildCard(
              context: context,
              title: 'Lab Reports',
              description: 'Access your blood tests, pathology results, and lab diagnostics.',
              badgeText: 'Lab Diagnostics',
              dotColor: const Color(0xFF22C55E), // Green dot
              imageUrl: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&q=80&w=800',
              onTap: () => onNavigateTab(2),
            ),

            const SizedBox(height: 18),

            _buildCard(
              context: context,
              title: 'Pharmacy',
              description: 'Track your active prescriptions, medication dosages, and refills.',
              badgeText: 'Pharmacy Services',
              dotColor: const Color(0xFF3B82F6), // Blue dot
              imageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80&w=800',
              onTap: () => onNavigateTab(3),
            ),

            const SizedBox(height: 18),

            _buildCard(
              context: context,
              title: 'Doctor Channeling History',
              description: 'Review your appointment history and upcoming doctor sessions.',
              badgeText: 'Appointments',
              dotColor: const Color(0xFFF97316), // Orange dot
              imageUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=800',
              onTap: () => onNavigateTab(4),
            ),

            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  Widget _buildCard({
    required BuildContext context,
    required String title,
    required String description,
    required String badgeText,
    required Color dotColor,
    required String imageUrl,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        decoration: HealthBridgeTheme.cardDecoration(radius: 16),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Image with Overlaid Badges
            Stack(
              children: [
                SizedBox(
                  height: 160,
                  width: double.infinity,
                  child: Image.network(
                    imageUrl,
                    fit: BoxFit.cover,
                    loadingBuilder: (context, child, progress) {
                      if (progress == null) return child;
                      return Container(
                        color: Colors.grey.shade200,
                        child: const Center(
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: HealthBridgeTheme.accentTeal,
                          ),
                        ),
                      );
                    },
                    errorBuilder: (context, error, stackTrace) => Container(
                      color: HealthBridgeTheme.mintAccent,
                      child: const Center(
                        child: Icon(Icons.image, size: 48, color: HealthBridgeTheme.primaryTeal),
                      ),
                    ),
                  ),
                ),
                // Top-Left Pill Badge with Colored Dot
                Positioned(
                  top: 12,
                  left: 12,
                  child: HealthBridgeTheme.dotBadge(
                    text: badgeText,
                    dotColor: dotColor,
                  ),
                ),
                // Top-Right Circular Arrow Button
                Positioned(
                  top: 12,
                  right: 12,
                  child: Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.92),
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.1),
                          blurRadius: 4,
                          offset: const Offset(0, 1),
                        ),
                      ],
                    ),
                    child: const Icon(
                      Icons.arrow_outward,
                      size: 18,
                      color: HealthBridgeTheme.textPrimary,
                    ),
                  ),
                ),
              ],
            ),

            // Content Metadata below image
            Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: HealthBridgeTheme.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    description,
                    style: const TextStyle(
                      fontSize: 12.5,
                      color: HealthBridgeTheme.textSecondary,
                      height: 1.4,
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
}
