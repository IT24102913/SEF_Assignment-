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
  String _selectedCategory = 'ALL'; // 'ALL', 'Ongoing', 'Upcoming', 'Past'

  @override
  void initState() {
    super.initState();
    _loadAppointments();
  }

  Future<void> _loadAppointments() async {
    setState(() => _isLoading = true);
    try {
      final list = await EmrApiService.getChannelingHistory();
      setState(() {
        _appointments = list;
        _isLoading = false;
      });
    } catch (_) {
      setState(() {
        _isLoading = false;
      });
    }
  }

  List<ChannelingAppointment> get _filteredAppointments {
    if (_selectedCategory == 'ALL') return _appointments;
    return _appointments.where((a) => a.category.toLowerCase() == _selectedCategory.toLowerCase()).toList();
  }

  int _countFor(String cat) {
    if (cat == 'ALL') return _appointments.length;
    return _appointments.where((a) => a.category.toLowerCase() == cat.toLowerCase()).length;
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _filteredAppointments;

    return Scaffold(
      backgroundColor: HealthBridgeTheme.lightBg,
      body: RefreshIndicator(
        color: HealthBridgeTheme.accentTeal,
        onRefresh: _loadAppointments,
        child: ListView(
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 20),
          children: [
            // ── Screen Header ──────────────────────────────────────────────
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: const [
                    Text(
                      'Doctor Channeling',
                      style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.w800,
                        color: HealthBridgeTheme.textPrimary,
                        letterSpacing: -0.5,
                      ),
                    ),
                    SizedBox(height: 4),
                    Text(
                      'All your ongoing, upcoming & past doctor sessions in one place.',
                      style: TextStyle(
                        color: HealthBridgeTheme.textSecondary,
                        fontSize: 13,
                      ),
                    ),
                  ],
                ),
                IconButton(
                  icon: const Icon(Icons.refresh, color: HealthBridgeTheme.accentTeal),
                  onPressed: _loadAppointments,
                  tooltip: 'Refresh appointments',
                ),
              ],
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

            // ── Category Filter Tabs ──────────────────────────────────────
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _buildTabChip('ALL', 'All Sessions (${_countFor('ALL')})'),
                  const SizedBox(width: 8),
                  _buildTabChip('Ongoing', 'Ongoing (${_countFor('Ongoing')})', isOngoing: true),
                  const SizedBox(width: 8),
                  _buildTabChip('Upcoming', 'Upcoming (${_countFor('Upcoming')})'),
                  const SizedBox(width: 8),
                  _buildTabChip('Past', 'Past (${_countFor('Past')})'),
                ],
              ),
            ),
            const SizedBox(height: 16),

            if (_isLoading)
              const Center(
                child: Padding(
                  padding: EdgeInsets.all(48.0),
                  child: CircularProgressIndicator(color: HealthBridgeTheme.accentTeal),
                ),
              )
            else if (filtered.isEmpty)
              _buildEmpty()
            else
              ...filtered.map(_buildAppointmentCard),
            const SizedBox(height: 20),
            const HealthBridgeFooter(),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  Widget _buildTabChip(String key, String label, {bool isOngoing = false}) {
    final isSelected = _selectedCategory == key;
    return GestureDetector(
      onTap: () => setState(() => _selectedCategory = key),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF0F766E) : Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? const Color(0xFF0F766E) : const Color(0xFFE2E8F0),
            width: 1.5,
          ),
          boxShadow: isSelected
              ? [BoxShadow(color: const Color(0xFF0F766E).withOpacity(0.2), blurRadius: 4, offset: const Offset(0, 2))]
              : null,
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (isOngoing && _countFor('Ongoing') > 0) ...[
              Container(
                width: 7,
                height: 7,
                decoration: BoxDecoration(
                  color: isSelected ? Colors.white : Colors.green,
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 6),
            ],
            Text(
              label,
              style: TextStyle(
                fontSize: 12.5,
                fontWeight: isSelected ? FontWeight.w700 : FontWeight.w600,
                color: isSelected ? Colors.white : const Color(0xFF475569),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAppointmentCard(ChannelingAppointment apt) {
    final isOngoing = apt.category.toLowerCase() == 'ongoing';
    final isUpcoming = apt.category.toLowerCase() == 'upcoming';
    
    Color badgeBg;
    Color badgeText;
    
    if (isOngoing) {
      badgeBg = const Color(0xFFECFDF5);
      badgeText = const Color(0xFF065F46);
    } else if (isUpcoming) {
      badgeBg = const Color(0xFFEFF6FF);
      badgeText = const Color(0xFF1E40AF);
    } else if (apt.status.toLowerCase() == 'cancelled') {
      badgeBg = const Color(0xFFFEF2F2);
      badgeText = const Color(0xFF991B1B);
    } else {
      badgeBg = const Color(0xFFF1F5F9);
      badgeText = const Color(0xFF475569);
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isOngoing ? const Color(0xFF10B981) : const Color(0xFFE2E8F0),
          width: isOngoing ? 1.5 : 1.0,
        ),
        boxShadow: [
          BoxShadow(
            color: isOngoing ? const Color(0xFF10B981).withOpacity(0.08) : Colors.black.withOpacity(0.02),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      padding: const EdgeInsets.all(18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Flexible(
                          child: Text(
                            apt.doctorName,
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w700,
                              color: HealthBridgeTheme.textPrimary,
                            ),
                          ),
                        ),
                        if (apt.queueNumber != null) ...[
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF1F5F9),
                              borderRadius: BorderRadius.circular(6),
                              border: Border.all(color: const Color(0xFFCBD5E1)),
                            ),
                            child: Text(
                              'Queue #${apt.queueNumber}',
                              style: const TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                                color: Color(0xFF0F766E),
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 3),
                    Row(
                      children: [
                        Text(
                          apt.specialty,
                          style: const TextStyle(
                            fontSize: 12.5,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFF0D7C6B),
                          ),
                        ),
                        const SizedBox(width: 6),
                        Text(
                          '•  ${apt.id}',
                          style: const TextStyle(
                            fontSize: 11,
                            color: Color(0xFF94A3B8),
                            fontFamily: 'monospace',
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
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
          if (apt.totalAmount != null) ...[
            const SizedBox(height: 10),
            Row(
              children: [
                const Icon(Icons.payment, size: 15, color: HealthBridgeTheme.textSecondary),
                const SizedBox(width: 5),
                Text(
                  'LKR ${apt.totalAmount!.toStringAsFixed(2)}',
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF334155),
                  ),
                ),
                if (apt.paymentStatus != null) ...[
                  const SizedBox(width: 6),
                  Text(
                    '(${apt.paymentStatus})',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      color: apt.paymentStatus == 'Paid' ? const Color(0xFF059669) : const Color(0xFFD97706),
                    ),
                  ),
                ],
              ],
            ),
          ],
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
        Flexible(
          child: Text(
            label,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              fontSize: 12,
              color: Color(0xFF475569),
              fontWeight: FontWeight.w500,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildEmpty() {
    return Container(
      padding: const EdgeInsets.all(40),
      decoration: HealthBridgeTheme.cardDecoration(radius: 14),
      child: Column(
        children: [
          const Icon(Icons.event_seat_outlined, size: 48, color: HealthBridgeTheme.textMuted),
          const SizedBox(height: 14),
          Text(
            _selectedCategory == 'ALL'
                ? 'No appointments found.'
                : 'No ${_selectedCategory.toLowerCase()} appointments.',
            style: const TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w700,
              color: HealthBridgeTheme.textPrimary,
            ),
          ),
          const SizedBox(height: 4),
          const Text(
            'Tap "Book Doctor Appointment" above to schedule a consultation with a specialist doctor.',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 12.5, color: HealthBridgeTheme.textSecondary),
          ),
        ],
      ),
    );
  }
}
