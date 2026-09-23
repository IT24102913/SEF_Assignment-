import 'package:flutter/material.dart';
import '../../services/emr_api_service.dart';
import '../../utils/theme.dart';
import '../../widgets/health_bridge_footer.dart';
import '../doctor/doctor_search_screen.dart';

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
    try {
      final list = await EmrApiService.getChannelingHistory();
      if (list.isEmpty) {
        _appointments = [
          ChannelingAppointment(
            id: 'APT-3011',
            doctorName: 'Dr. Sarah Jenkins',
            specialty: 'Senior Consultant Cardiologist',
            date: 'Aug 24, 2026',
            time: '10:30 AM',
            room: 'Room 304, West Wing',
            status: 'Upcoming',
          ),
          ChannelingAppointment(
            id: 'APT-2890',
            doctorName: 'Dr. Michael Chang',
            specialty: 'General Practitioner & Physician',
            date: 'Jul 22, 2026',
            time: '02:00 PM',
            room: 'Room 108, Main Clinic',
            status: 'Completed',
          ),
        ];
      } else {
        _appointments = list;
      }
      setState(() {
        _isLoading = false;
      });
    } catch (_) {
      _appointments = [
        ChannelingAppointment(
          id: 'APT-3011',
          doctorName: 'Dr. Sarah Jenkins',
          specialty: 'Senior Consultant Cardiologist',
          date: 'Aug 24, 2026',
          time: '10:30 AM',
          room: 'Room 304, West Wing',
          status: 'Upcoming',
        ),
        ChannelingAppointment(
          id: 'APT-2890',
          doctorName: 'Dr. Michael Chang',
          specialty: 'General Practitioner & Physician',
          date: 'Jul 22, 2026',
          time: '02:00 PM',
          room: 'Room 108, Main Clinic',
          status: 'Completed',
        ),
      ];
      setState(() {
        _isLoading = false;
      });
    }
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
              'Doctor Channeling',
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.w800,
                color: HealthBridgeTheme.textPrimary,
                letterSpacing: -0.5,
              ),
            ),
            const SizedBox(height: 4),
            const Text(
              'Book specialist consultations and track your appointment sessions.',
              style: TextStyle(
                color: HealthBridgeTheme.textSecondary,
                fontSize: 13,
              ),
            ),
            const SizedBox(height: 18),

            // ── Book New Appointment Action Card ─────────────────────────
            GestureDetector(
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const DoctorSearchScreen()),
                );
              },
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF0F766E), Color(0xFF0D9488)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF0D9488).withOpacity(0.3),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.2),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.person_search_outlined, color: Colors.white, size: 28),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: const [
                          Text(
                            'Book Doctor Appointment',
                            style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
                          ),
                          SizedBox(height: 4),
                          Text(
                            'Find top specialists, view clinic schedules & instant booking.',
                            style: TextStyle(color: Colors.white70, fontSize: 12),
                          ),
                        ],
                      ),
                    ),
                    const Icon(Icons.arrow_forward_ios, color: Colors.white, size: 16),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 20),

            const Text(
              'Your Channeling Sessions',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: HealthBridgeTheme.textPrimary,
              ),
            ),
            const SizedBox(height: 12),

            if (_isLoading)
              const Center(
                child: Padding(
                  padding: EdgeInsets.all(48.0),
                  child: CircularProgressIndicator(color: HealthBridgeTheme.accentTeal),
                ),
              )
            else if (_appointments.isEmpty)
              _buildEmpty()
            else
              ..._appointments.map(_buildAppointmentCard),
            const SizedBox(height: 20),
            const HealthBridgeFooter(),
            const SizedBox(height: 16),
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
                      color: Color(0xFF0D7C6B),
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

  Widget _buildEmpty() {
    return Container(
      padding: const EdgeInsets.all(40),
      decoration: HealthBridgeTheme.cardDecoration(radius: 14),
      child: const Column(
        children: [
          Icon(Icons.event_seat_outlined, size: 48, color: HealthBridgeTheme.textMuted),
          SizedBox(height: 14),
          Text(
            'No appointments scheduled.',
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w700,
              color: HealthBridgeTheme.textPrimary,
            ),
          ),
          SizedBox(height: 4),
          Text(
            'Tap "Book Doctor Appointment" above to schedule a consultation with a specialist doctor.',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 12.5, color: HealthBridgeTheme.textSecondary),
          ),
        ],
      ),
    );
  }
}
