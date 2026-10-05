import 'package:flutter/material.dart';
import '../../services/doctor_api_service.dart';
import '../../utils/theme.dart';
import 'patient_details_screen.dart';

class DoctorProfileScreen extends StatefulWidget {
  final Doctor doctor;

  const DoctorProfileScreen({super.key, required this.doctor});

  @override
  State<DoctorProfileScreen> createState() => _DoctorProfileScreenState();
}

class _DoctorProfileScreenState extends State<DoctorProfileScreen> {
  List<DoctorSession> _sessions = [];
  bool _loadingSessions = true;
  String _selectedDate = '';
  DoctorSession? _selectedSession;

  @override
  void initState() {
    super.initState();
    _fetchSessions();
  }

  Future<void> _fetchSessions() async {
    try {
      final list = await DoctorApiService.getDoctorSessions(widget.doctor.id);
      if (mounted) {
        setState(() {
          _sessions = list;
          _loadingSessions = false;
          if (list.isNotEmpty) {
            final dates = list.map((s) => s.sessionDate).toSet().toList();
            if (dates.isNotEmpty) {
              _selectedDate = dates.first;
            }
          }
        });
      }
    } catch (e) {
      if (mounted) setState(() => _loadingSessions = false);
    }
  }

  List<String> get _uniqueDates => _sessions.map((s) => s.sessionDate).toSet().toList();

  List<DoctorSession> get _sessionsForDate => _sessions.where((s) => s.sessionDate == _selectedDate).toList();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: kBg,
      appBar: AppBar(
        backgroundColor: kPrimaryDark,
        foregroundColor: Colors.white,
        title: const Text('Doctor Profile & Sessions', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
      ),
      bottomNavigationBar: _selectedSession != null
          ? Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
              decoration: BoxDecoration(
                color: Colors.white,
                boxShadow: [
                  BoxShadow(color: Colors.black.withValues(alpha: 0.08), blurRadius: 10, offset: const Offset(0, -2)),
                ],
              ),
              child: SafeArea(
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '$_selectedDate • ${_selectedSession!.sessionType} Session (${_selectedSession!.timeRange})',
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: kPrimaryDark),
                          ),
                          Text(
                            'Fee: LKR ${widget.doctor.consultationFee.toStringAsFixed(0)} (+300 fee)',
                            style: const TextStyle(fontSize: 11, color: kTextMuted),
                          ),
                        ],
                      ),
                    ),
                    ElevatedButton(
                      onPressed: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => PatientDetailsScreen(
                              doctor: widget.doctor,
                              session: _selectedSession!,
                              sessionDate: _selectedDate,
                            ),
                          ),
                        );
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: kPrimary,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      child: const Row(
                        children: [
                          Text('Book Appointment', style: TextStyle(fontWeight: FontWeight.bold)),
                          SizedBox(width: 6),
                          Icon(Icons.arrow_forward, size: 16),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            )
          : null,
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Doctor Profile Card
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: kBorder),
                boxShadow: const [
                  BoxShadow(color: Color(0x06000000), blurRadius: 6, offset: Offset(0, 2)),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      CircleAvatar(
                        radius: 32,
                        backgroundColor: kPrimaryDark,
                        child: Text(
                          widget.doctor.fullName.replaceFirst('Dr. ', '').split(' ').map((n) => n.isNotEmpty ? n[0] : '').take(2).join(),
                          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 20),
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              widget.doctor.fullName,
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: kText),
                            ),
                            Text(
                              '${widget.doctor.qualifications} • ${widget.doctor.experienceYears}+ Yrs',
                              style: const TextStyle(fontSize: 12, color: kTextMuted),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              widget.doctor.hospitalBranch,
                              style: const TextStyle(fontSize: 12, color: kPrimary, fontWeight: FontWeight.w600),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  if (widget.doctor.bio.isNotEmpty) ...[
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        '"${widget.doctor.bio}"',
                        style: const TextStyle(fontSize: 12, fontStyle: FontStyle.italic, color: Color(0xFF475569)),
                      ),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Weekday Session Date Picker (Horizontal)
            const Text(
              'Available Sessions — Choose Date & Slot',
              style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: kPrimaryDark),
            ),
            const SizedBox(height: 12),

            if (_loadingSessions)
              const Center(child: Padding(padding: EdgeInsets.all(24.0), child: CircularProgressIndicator()))
            else if (_uniqueDates.isEmpty)
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(10)),
                child: const Text('No active channeling slots scheduled this week for this consultant.'),
              )
            else ...[
              // Date Chips
              SizedBox(
                height: 72,
                child: ListView.builder(
                  scrollDirection: Axis.horizontal,
                  itemCount: _uniqueDates.length,
                  itemBuilder: (context, index) {
                    final dateStr = _uniqueDates[index];
                    final parsed = DateTime.tryParse(dateStr);
                    final isSelected = _selectedDate == dateStr;

                    final weekday = parsed != null ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][parsed.weekday - 1] : '';
                    final dayNum = parsed?.day ?? 0;

                    return GestureDetector(
                      onTap: () {
                        setState(() {
                          _selectedDate = dateStr;
                          _selectedSession = null;
                        });
                      },
                      child: Container(
                        width: 70,
                        margin: const EdgeInsets.only(right: 10),
                        decoration: BoxDecoration(
                          color: isSelected ? kPrimary : Colors.white,
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: isSelected ? kPrimary : kBorder),
                          boxShadow: isSelected
                              ? [BoxShadow(color: kPrimary.withValues(alpha: 0.3), blurRadius: 6, offset: const Offset(0, 2))]
                              : null,
                        ),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(
                              weekday.toUpperCase(),
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                                color: isSelected ? Colors.white70 : Colors.grey,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              '$dayNum',
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.w900,
                                color: isSelected ? Colors.white : kText,
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
              ),
              const SizedBox(height: 18),

              // OPD Session Blocks
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Select OPD Session Block ($_selectedDate)',
                    style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: kText),
                  ),
                  Text(
                    '${_sessionsForDate.length} Session${_sessionsForDate.length > 1 ? 's' : ''}',
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: kPrimary),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              if (_sessionsForDate.isEmpty)
                Container(
                  padding: const EdgeInsets.all(20),
                  width: double.infinity,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: kBorder),
                  ),
                  child: const Center(
                    child: Text('No sessions available for the selected date.', style: TextStyle(color: kTextMuted, fontSize: 13)),
                  ),
                )
              else
                ListView.separated(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: _sessionsForDate.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 12),
                  itemBuilder: (context, index) {
                    final session = _sessionsForDate[index];
                    final isSelected = _selectedSession?.id == session.id;
                    final isExpired = session.isExpired;
                    final available = session.isAvailable && !isExpired && session.slotsLeft > 0;

                    final isMorning = session.sessionType.toLowerCase() == 'morning';
                    final isEvening = session.sessionType.toLowerCase() == 'evening';
                    final isNight = session.sessionType.toLowerCase() == 'night';

                    final iconEmoji = isMorning ? '🌅' : isEvening ? '🌇' : '🌙';
                    final sessionTitle = '${session.sessionType} Session';
                    final timeDisplay = session.timeRange.isNotEmpty ? session.timeRange : session.timeFormatted;

                    return Container(
                      decoration: BoxDecoration(
                        color: isSelected
                            ? const Color(0xFFF0FDF4)
                            : isExpired || !available
                                ? const Color(0xFFF8FAFC)
                                : Colors.white,
                        border: Border.all(
                          color: isSelected
                              ? kPrimary
                              : isExpired
                                  ? const Color(0xFFFECDD3)
                                  : kBorder,
                          width: isSelected ? 2 : 1,
                        ),
                        borderRadius: BorderRadius.circular(12),
                        boxShadow: isSelected
                            ? [BoxShadow(color: kPrimary.withValues(alpha: 0.15), blurRadius: 8, offset: const Offset(0, 2))]
                            : [const BoxShadow(color: Color(0x06000000), blurRadius: 4, offset: Offset(0, 1))],
                      ),
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Text(iconEmoji, style: const TextStyle(fontSize: 22)),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      sessionTitle,
                                      style: TextStyle(
                                        fontSize: 15,
                                        fontWeight: FontWeight.bold,
                                        color: isExpired || !available ? Colors.grey : kPrimaryDark,
                                      ),
                                    ),
                                    Text(
                                      timeDisplay,
                                      style: const TextStyle(fontSize: 13, color: Color(0xFF475569), fontWeight: FontWeight.w600),
                                    ),
                                  ],
                                ),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                decoration: BoxDecoration(
                                  color: isExpired
                                      ? const Color(0xFFFEE2E2)
                                      : !available
                                          ? const Color(0xFFF1F5F9)
                                          : const Color(0xFFDCFCE7),
                                  borderRadius: BorderRadius.circular(20),
                                ),
                                child: Text(
                                  isExpired
                                      ? 'Expired'
                                      : !available
                                          ? 'Full'
                                          : '${session.slotsLeft} of ${session.maxCapacity} slots left',
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.bold,
                                    color: isExpired
                                        ? const Color(0xFFB91C1C)
                                        : !available
                                            ? Colors.grey
                                            : const Color(0xFF15803D),
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          SizedBox(
                            width: double.infinity,
                            child: ElevatedButton(
                              onPressed: available
                                  ? () {
                                      setState(() => _selectedSession = session);
                                    }
                                  : null,
                              style: ElevatedButton.styleFrom(
                                backgroundColor: isSelected ? kPrimaryDark : kPrimary,
                                foregroundColor: Colors.white,
                                disabledBackgroundColor: const Color(0xFFE2E8F0),
                                disabledForegroundColor: const Color(0xFF94A3B8),
                                padding: const EdgeInsets.symmetric(vertical: 10),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                elevation: isSelected ? 2 : 0,
                              ),
                              child: Text(
                                isSelected
                                    ? '✓ Selected ($sessionTitle)'
                                    : available
                                        ? 'Select $sessionTitle'
                                        : isExpired
                                            ? 'Session Expired'
                                            : 'No Slots Left',
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                              ),
                            ),
                          ),
                        ],
                      ),
                    );
                  },
                ),
            ],
          ],
        ),
      ),
    );
  }
}
