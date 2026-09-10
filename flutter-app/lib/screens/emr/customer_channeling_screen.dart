import 'package:flutter/material.dart';
import '../../services/emr_api_service.dart';
import '../../utils/theme.dart';

class CustomerChannelingScreen extends StatefulWidget {
  const CustomerChannelingScreen({super.key});

  @override
  State<CustomerChannelingScreen> createState() => _CustomerChannelingScreenState();
}

class _CustomerChannelingScreenState extends State<CustomerChannelingScreen> {
  List<ChannelingAppointment> _appointments = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadAppointments();
  }

  Future<void> _loadAppointments() async {
    setState(() => _isLoading = true);
    final list = await EmrApiService.getChannelingHistory();
    setState(() {
      _appointments = list;
      _isLoading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: HealthBridgeTheme.lightBg,
      body: RefreshIndicator(
        color: HealthBridgeTheme.accentTeal,
        onRefresh: _loadAppointments,
        child: ListView(
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 20),
          children: [
            // ── Screen Header ──────────────────────────────────────────────
            const Text(
              'Doctor Channeling History',
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.w800,
                color: HealthBridgeTheme.textPrimary,
                letterSpacing: -0.5,
              ),
            ),
            const SizedBox(height: 4),
            const Text(
              'Review your appointment history, upcoming channeling sessions, and clinic details.',
              style: TextStyle(
                color: HealthBridgeTheme.textSecondary,
                fontSize: 13,
              ),
            ),
            const SizedBox(height: 20),

            if (_isLoading)
              const Center(
                child: Padding(
                  padding: EdgeInsets.all(48.0),
                  child: CircularProgressIndicator(color: HealthBridgeTheme.accentTeal),
                ),
              )
            else
              ..._appointments.map(_buildAppointmentCard),
          ],
        ),
      ),
    );
  }

  Widget _buildAppointmentCard(ChannelingAppointment apt) {
    final isUpcoming = apt.status.toLowerCase() == 'upcoming';
    final badgeBg = isUpcoming ? const Color(0xFFFFF7ED) : const Color(0xFFF1F5F9);
    final badgeText = isUpcoming ? const Color(0xFFC2410C) : const Color(0xFF64748B);

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      decoration: HealthBridgeTheme.cardDecoration(radius: 14),
      padding: const EdgeInsets.all(18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    apt.doctorName,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: HealthBridgeTheme.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    apt.specialty,
                    style: const TextStyle(
                      fontSize: 12.5,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF2563EB),
                    ),
                  ),
                ],
              ),
              HealthBridgeTheme.statusBadge(
                text: apt.status,
                bg: badgeBg,
                textCol: badgeText,
              ),
            ],
          ),
          const SizedBox(height: 14),
          const Divider(height: 1, color: HealthBridgeTheme.cardBorder),
          const SizedBox(height: 14),
          Row(
            children: [
              _infoChip(Icons.calendar_today_outlined, apt.date),
              const SizedBox(width: 14),
              _infoChip(Icons.access_time, apt.time),
              const SizedBox(width: 14),
              Expanded(child: _infoChip(Icons.location_on_outlined, apt.room)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _infoChip(IconData icon, String label) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 15, color: HealthBridgeTheme.textSecondary),
        const SizedBox(width: 5),
        Text(
          label,
          style: const TextStyle(
            fontSize: 12,
            color: Color(0xFF475569),
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }
}
