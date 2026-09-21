import 'package:flutter/material.dart';

class HealthBridgeFooter extends StatelessWidget {
  const HealthBridgeFooter({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      color: const Color(0xFF044E38), // Dark Green Background matching Web Footer
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 28),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ── BRANDING & DESCRIPTION ─────────────────────────────────────────
          Row(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Center(
                  child: Image.asset(
                    'assets/images/logo.png',
                    width: 24,
                    height: 24,
                    errorBuilder: (context, error, stackTrace) => const Icon(Icons.favorite, color: Color(0xFF044E38), size: 20),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: const [
                  Text(
                    'HEALTH BRIDGE',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 15,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 0.5,
                    ),
                  ),
                  Text(
                    'PRIVATE MEDICAL PORTAL',
                    style: TextStyle(
                      color: Color(0xFFA7F3D0),
                      fontSize: 10,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.5,
                    ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 12),

          const Text(
            'Empowering patients with trusted digital healthcare, smart pharmacy fulfillment, and certified laboratory services.',
            style: TextStyle(
              color: Color(0xFFD1FAE5),
              fontSize: 12,
              height: 1.45,
            ),
          ),
          const SizedBox(height: 14),

          // Security Badges (ISO 27001 & SLMC Approved)
          Row(
            children: [
              _buildBadge(Icons.shield_outlined, 'ISO 27001'),
              const SizedBox(width: 8),
              _buildBadge(Icons.check_circle_outline, 'SLMC Approved'),
            ],
          ),
          const SizedBox(height: 24),

          const Divider(color: Color(0xFF065F46), height: 1),
          const SizedBox(height: 20),

          // ── PATIENT SERVICES & CARE (2 COLUMNS) ───────────────────────────
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Column 1: Patient Services
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'PATIENT SERVICES',
                      style: TextStyle(
                        color: Color(0xFFA7F3D0),
                        fontSize: 11.5,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.5,
                      ),
                    ),
                    const SizedBox(height: 10),
                    _buildFooterLink('Doctor Appointments'),
                    _buildFooterLink('Prescription Fulfillment'),
                    _buildFooterLink('Diagnostic Pathology'),
                    _buildFooterLink('Medical Vault Access'),
                  ],
                ),
              ),
              const SizedBox(width: 16),

              // Column 2: Patient Care
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'PATIENT CARE',
                      style: TextStyle(
                        color: Color(0xFFA7F3D0),
                        fontSize: 11.5,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.5,
                      ),
                    ),
                    const SizedBox(height: 10),
                    _buildFooterLink('Help & Support Center'),
                    _buildFooterLink('Frequently Asked Questions'),
                    _buildFooterLink('Privacy & HIPAA Notice'),
                    _buildFooterLink('Terms of Service'),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),

          // ── EMERGENCY & LOCATION SECTION ─────────────────────────────────
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: const Color(0xFF065F46),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFF047857)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'EMERGENCY & LOCATION',
                  style: TextStyle(
                    color: Color(0xFFA7F3D0),
                    fontSize: 11.5,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.5,
                  ),
                ),
                const SizedBox(height: 10),
                _buildContactInfo(Icons.phone, '24/7 Hotline: +94 76 447 7999'),
                const SizedBox(height: 6),
                _buildContactInfo(Icons.email_outlined, 'care@healthbridge.lk'),
                const SizedBox(height: 6),
                _buildContactInfo(Icons.location_on_outlined, 'No 45, Hospital Road, Colombo 03'),
              ],
            ),
          ),
          const SizedBox(height: 20),

          const Divider(color: Color(0xFF065F46), height: 1),
          const SizedBox(height: 16),

          // ── BOTTOM COPYRIGHT & LINKS ───────────────────────────────────────
          const Text(
            '© 2026 Health Bridge Private Medical Portal. All rights reserved.',
            style: TextStyle(
              color: Color(0xFF6EE7B7),
              fontSize: 11,
            ),
          ),
          const SizedBox(height: 4),
          Row(
            children: const [
              Text(
                'Privacy Policy',
                style: TextStyle(color: Color(0xFFA7F3D0), fontSize: 11, fontWeight: FontWeight.w600),
              ),
              Text(' • ', style: TextStyle(color: Color(0xFF6EE7B7), fontSize: 11)),
              Text(
                'Terms of Service',
                style: TextStyle(color: Color(0xFFA7F3D0), fontSize: 11, fontWeight: FontWeight.w600),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildBadge(IconData icon, String text) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: const Color(0xFF065F46),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFF047857)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: const Color(0xFFA7F3D0)),
          const SizedBox(width: 4),
          Text(
            text,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 10.5,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFooterLink(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Text(
        text,
        style: const TextStyle(
          color: Color(0xFFECFDF5),
          fontSize: 11.5,
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }

  Widget _buildContactInfo(IconData icon, String text) {
    return Row(
      children: [
        Icon(icon, size: 14, color: const Color(0xFFA7F3D0)),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            text,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 11.5,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ],
    );
  }
}
