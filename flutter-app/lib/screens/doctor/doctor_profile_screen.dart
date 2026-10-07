import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
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

  bool _isSessionExpired(DoctorSession s) {
    if (s.isExpired) return true;
    if (s.sessionStatus.toLowerCase() == 'expired') return true;
    try {
      final dateParts = s.sessionDate.split('-');
      if (dateParts.length == 3) {
        final year = int.parse(dateParts[0]);
        final month = int.parse(dateParts[1]);
        final day = int.parse(dateParts[2]);
        int hour = 23;
        int minute = 59;
        if (s.sessionTime.contains(':')) {
          final timeParts = s.sessionTime.split(':');
          hour = int.tryParse(timeParts[0]) ?? 23;
          minute = int.tryParse(timeParts[1]) ?? 59;
        }
        final sessionTime = DateTime(year, month, day, hour, minute);
        if (sessionTime.isBefore(DateTime.now())) {
          return true;
        }
      }
    } catch (_) {}
    return false;
  }

  Future<void> _fetchSessions() async {
    try {
      final list = await DoctorApiService.getDoctorSessions(widget.doctor.id);
      if (mounted) {
        // Exclude all previously expired or past sessions from the booking interface
        final upcomingSessions = list.where((s) => !_isSessionExpired(s)).toList();
        setState(() {
          _sessions = upcomingSessions;
          _loadingSessions = false;
          if (upcomingSessions.isNotEmpty) {
            final dates = _uniqueDates;
            if (dates.isNotEmpty) {
              _selectedDate = dates.first;
              final firstDateSessions = _getFilteredSessionsForDate(_selectedDate);
              if (firstDateSessions.isNotEmpty) {
                _selectedSession = firstDateSessions.firstWhere(
                  (s) => s.isAvailable && !_isSessionExpired(s) && s.slotsLeft > 0,
                  orElse: () => firstDateSessions.first,
                );
              }
            }
          }
        });
      }
    } catch (e) {
      if (mounted) setState(() => _loadingSessions = false);
    }
  }

  List<String> get _uniqueDates {
    final spec = widget.doctor.specialization.trim().toLowerCase();
    final isGeneralMedicine = spec == 'general medicine' || spec.contains('physician');
    return _sessions
        .where((s) => !_isSessionExpired(s) && (isGeneralMedicine || s.sessionType.toLowerCase() != 'night'))
        .map((s) => s.sessionDate)
        .toSet()
        .toList();
  }

  /// Specialty-correct visibility: Night option is restricted to General Medicine
  /// Deduplicated: Exactly ONE session per sessionType (Morning, Evening, Night) on each date
  List<DoctorSession> _getFilteredSessionsForDate(String date) {
    final spec = widget.doctor.specialization.trim().toLowerCase();
    final isGeneralMedicine = spec == 'general medicine' || spec.contains('physician');
    final matching = _sessions.where((s) {
      if (s.sessionDate != date) return false;
      if (_isSessionExpired(s)) return false;
      if (s.sessionType.toLowerCase() == 'night' && !isGeneralMedicine) {
        return false;
      }
      return true;
    }).toList();

    // Deduplicate by sessionType, keeping the session with the highest maxCapacity
    final Map<String, DoctorSession> deduplicated = {};
    for (final session in matching) {
      final key = session.sessionType.toLowerCase();
      if (!deduplicated.containsKey(key) || session.maxCapacity > deduplicated[key]!.maxCapacity) {
        deduplicated[key] = session;
      }
    }

    final order = {'morning': 1, 'evening': 2, 'night': 3};
    final list = deduplicated.values.toList();
    list.sort((a, b) => (order[a.sessionType.toLowerCase()] ?? 99).compareTo(order[b.sessionType.toLowerCase()] ?? 99));
    return list;
  }

  void _onSelectSession(DoctorSession session) {
    HapticFeedback.lightImpact();
    setState(() => _selectedSession = session);
  }

  void _onSelectDate(String date) {
    HapticFeedback.lightImpact();
    setState(() {
      _selectedDate = date;
      final dateSessions = _getFilteredSessionsForDate(date);
      if (dateSessions.isNotEmpty) {
        _selectedSession = dateSessions.firstWhere(
          (s) => s.isAvailable && !_isSessionExpired(s) && s.slotsLeft > 0,
          orElse: () => dateSessions.first,
        );
      } else {
        _selectedSession = null;
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final filteredSessions = _getFilteredSessionsForDate(_selectedDate);
    final canProceed = _selectedSession != null &&
        _selectedSession!.isAvailable &&
        !_isSessionExpired(_selectedSession!) &&
        _selectedSession!.slotsLeft > 0;

    return Scaffold(
      backgroundColor: kBg,
      appBar: AppBar(
        backgroundColor: kPrimaryDark,
        foregroundColor: Colors.white,
        elevation: 0,
        centerTitle: true,
        title: const Text(
          'Select Consultation Slot',
          style: TextStyle(fontWeight: FontWeight.w800, fontSize: 17),
        ),
      ),
      bottomNavigationBar: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: Colors.white,
          border: const Border(top: BorderSide(color: kBorder)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.06),
              blurRadius: 10,
              offset: const Offset(0, -3),
            ),
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
                    if (_selectedSession != null) ...[
                      Text(
                        '${_selectedSession!.sessionType} Session • $_selectedDate',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: kPrimaryDark),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Fee: LKR ${(widget.doctor.consultationFee + 300).toStringAsFixed(0)} (incl. 300 fee)',
                        style: const TextStyle(fontSize: 11, color: kTextMuted, fontWeight: FontWeight.w600),
                      ),
                    ] else ...[
                      const Text(
                        'No Slot Selected',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.grey),
                      ),
                      const SizedBox(height: 2),
                      const Text(
                        'Select a date & session below',
                        style: TextStyle(fontSize: 11, color: Colors.grey),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(width: 12),
              SizedBox(
                height: 48,
                child: ElevatedButton.icon(
                  onPressed: canProceed
                      ? () {
                          HapticFeedback.lightImpact();
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
                        }
                      : null,
                  icon: const Icon(Icons.arrow_forward_rounded, size: 18),
                  label: const Text('Continue', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: kPrimary,
                    foregroundColor: Colors.white,
                    disabledBackgroundColor: Colors.grey.shade300,
                    disabledForegroundColor: Colors.grey.shade600,
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    elevation: 0,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ─── Doctor Profile Hero Card ────────────────────────────────────
            Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: kBorder),
                boxShadow: const [
                  BoxShadow(color: Color(0x06004D40), blurRadius: 10, offset: Offset(0, 3)),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Padding(
                    padding: const EdgeInsets.all(16),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Doctor Initials Avatar
                        CircleAvatar(
                          radius: 28,
                          backgroundColor: kPrimaryDark,
                          child: Text(
                            widget.doctor.fullName.replaceFirst('Dr. ', '').split(' ').map((n) => n.isNotEmpty ? n[0] : '').take(2).join(),
                            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18),
                          ),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              // Specialty Pill
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFE0F2F1),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Text(
                                  widget.doctor.specialization.toUpperCase(),
                                  style: const TextStyle(
                                    color: kPrimaryDark,
                                    fontSize: 10,
                                    fontWeight: FontWeight.w800,
                                    letterSpacing: 0.5,
                                  ),
                                ),
                              ),
                              const SizedBox(height: 5),
                              Text(
                                widget.doctor.fullName,
                                style: const TextStyle(
                                  fontWeight: FontWeight.w800,
                                  fontSize: 16,
                                  color: kPrimaryDark,
                                ),
                              ),
                              const SizedBox(height: 3),
                              Text(
                                widget.doctor.qualifications,
                                style: const TextStyle(fontSize: 12, color: kTextMuted),
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                              ),
                              const SizedBox(height: 3),
                              Row(
                                children: [
                                  const Icon(Icons.location_on_outlined, size: 13, color: kPrimary),
                                  const SizedBox(width: 4),
                                  Expanded(
                                    child: Text(
                                      widget.doctor.hospitalBranch,
                                      style: const TextStyle(fontSize: 11, color: kPrimary, fontWeight: FontWeight.w600),
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),

                  // Highlights Bar (Rating, Experience, Room)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                    decoration: const BoxDecoration(
                      color: Color(0xFFF8FAFC),
                      border: Border(
                        top: BorderSide(color: Color(0xFFF1F5F9)),
                        bottom: BorderSide(color: Color(0xFFF1F5F9)),
                      ),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceAround,
                      children: [
                        _buildHighlightItem(
                          icon: Icons.star_rounded,
                          iconColor: Colors.amber,
                          title: '${widget.doctor.rating.toStringAsFixed(1)} Rating',
                          subtitle: '${widget.doctor.reviewCount} reviews',
                        ),
                        Container(width: 1, height: 26, color: Colors.grey.shade300),
                        _buildHighlightItem(
                          icon: Icons.workspace_premium_rounded,
                          iconColor: kPrimary,
                          title: '${widget.doctor.experienceYears}+ Yrs',
                          subtitle: 'Experience',
                        ),
                        Container(width: 1, height: 26, color: Colors.grey.shade300),
                        _buildHighlightItem(
                          icon: Icons.meeting_room_outlined,
                          iconColor: const Color(0xFF0284C7),
                          title: widget.doctor.roomNumber.isNotEmpty ? widget.doctor.roomNumber.split(',').first : 'OPD Room',
                          subtitle: 'Consulting',
                        ),
                      ],
                    ),
                  ),

                  // Fee Banner
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: const [
                            Text(
                              'Specialist Fee',
                              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: kTextMuted),
                            ),
                            Text(
                              'Standard OPD consultation',
                              style: TextStyle(fontSize: 10, color: Colors.grey),
                            ),
                          ],
                        ),
                        Text(
                          'LKR ${widget.doctor.consultationFee.toStringAsFixed(0)}',
                          style: const TextStyle(fontWeight: FontWeight.w900, color: kPrimaryDark, fontSize: 18),
                        ),
                      ],
                    ),
                  ),

                  // Bio (if available)
                  if (widget.doctor.bio.isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.only(left: 16, right: 16, bottom: 14),
                      child: Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                        ),
                        child: Text(
                          widget.doctor.bio,
                          style: const TextStyle(fontSize: 11, color: Color(0xFF475569), height: 1.4),
                        ),
                      ),
                    ),
                ],
              ),
            ),

            const SizedBox(height: 22),

            // ─── Date Selection Header ──────────────────────────────────────
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    color: const Color(0xFFE0F2F1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(Icons.calendar_month_rounded, size: 18, color: kPrimaryDark),
                ),
                const SizedBox(width: 10),
                const Expanded(
                  child: Text(
                    'Select Consultation Date',
                    style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: kPrimaryDark),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // ─── Horizontal Date Carousel (Sized to prevent ANY overflow) ────
            if (_loadingSessions)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 24),
                child: Center(child: CircularProgressIndicator(color: kPrimary)),
              )
            else if (_uniqueDates.isEmpty)
              Container(
                padding: const EdgeInsets.all(16),
                width: double.infinity,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: kBorder),
                ),
                child: const Center(
                  child: Text('No upcoming scheduled sessions for this specialist.', style: TextStyle(color: kTextMuted, fontSize: 13)),
                ),
              )
            else
              SizedBox(
                height: 88,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemCount: _uniqueDates.length,
                  separatorBuilder: (_, _) => const SizedBox(width: 10),
                  itemBuilder: (context, index) {
                    final d = _uniqueDates[index];
                    final isSelected = d == _selectedDate;
                    final parsed = DateTime.tryParse(d) ?? DateTime.now();
                    final weekday = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][parsed.weekday - 1];
                    final dayNum = parsed.day;
                    final month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][parsed.month - 1];

                    return InkWell(
                      onTap: () => _onSelectDate(d),
                      borderRadius: BorderRadius.circular(14),
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 180),
                        width: 68,
                        padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
                        decoration: BoxDecoration(
                          color: isSelected ? kPrimaryDark : Colors.white,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(
                            color: isSelected ? kPrimaryDark : kBorder,
                            width: isSelected ? 2 : 1,
                          ),
                          boxShadow: isSelected
                              ? [
                                  BoxShadow(
                                    color: kPrimary.withValues(alpha: 0.28),
                                    blurRadius: 8,
                                    offset: const Offset(0, 3),
                                  ),
                                ]
                              : const [
                                  BoxShadow(color: Color(0x06000000), blurRadius: 4, offset: Offset(0, 1)),
                                ],
                        ),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                          children: [
                            FittedBox(
                              fit: BoxFit.scaleDown,
                              child: Text(
                                weekday.toUpperCase(),
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.bold,
                                  color: isSelected ? Colors.white70 : Colors.grey.shade600,
                                ),
                              ),
                            ),
                            FittedBox(
                              fit: BoxFit.scaleDown,
                              child: Text(
                                '$dayNum',
                                style: TextStyle(
                                  fontSize: 19,
                                  fontWeight: FontWeight.w900,
                                  color: isSelected ? Colors.white : kText,
                                ),
                              ),
                            ),
                            FittedBox(
                              fit: BoxFit.scaleDown,
                              child: Text(
                                month.toUpperCase(),
                                style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w700,
                                  color: isSelected ? Colors.white70 : Colors.grey.shade500,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
              ),

            const SizedBox(height: 24),

            // ─── Available Sessions Header ──────────────────────────────────
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(6),
                      decoration: BoxDecoration(
                        color: const Color(0xFFE0F2F1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Icon(Icons.access_time_filled_rounded, size: 18, color: kPrimaryDark),
                    ),
                    const SizedBox(width: 10),
                    const Text(
                      'Available OPD Sessions',
                      style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: kPrimaryDark),
                    ),
                  ],
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: const Color(0xFFDCFCE7),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    '${filteredSessions.length} Available',
                    style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF15803D)),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // ─── Sessions List ──────────────────────────────────────────────
            if (filteredSessions.isEmpty)
              Container(
                padding: const EdgeInsets.all(20),
                width: double.infinity,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: kBorder),
                ),
                child: Center(
                  child: Column(
                    children: const [
                      Icon(Icons.event_busy, size: 36, color: Colors.grey),
                      SizedBox(height: 8),
                      Text('No sessions scheduled for this date.', style: TextStyle(color: kTextMuted, fontSize: 13)),
                      Text('Please select an alternative date above.', style: TextStyle(color: Colors.grey, fontSize: 11)),
                    ],
                  ),
                ),
              )
            else
              ListView.separated(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: filteredSessions.length,
                separatorBuilder: (_, _) => const SizedBox(height: 10),
                itemBuilder: (context, index) {
                  final session = filteredSessions[index];
                  final isSelected = _selectedSession?.id == session.id;
                  final available = session.isAvailable && !_isSessionExpired(session) && session.slotsLeft > 0;

                  final isMorning = session.sessionType.toLowerCase() == 'morning';
                  final isEvening = session.sessionType.toLowerCase() == 'evening';
                  final sessionTitle = '${session.sessionType} OPD Session';
                  final timeDisplay = session.timeRange.isNotEmpty ? session.timeRange : session.timeFormatted;

                  return InkWell(
                    onTap: available ? () => _onSelectSession(session) : null,
                    borderRadius: BorderRadius.circular(14),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 150),
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      decoration: BoxDecoration(
                        color: isSelected
                            ? const Color(0xFFF0FDF4)
                            : !available
                                ? const Color(0xFFF8FAFC)
                                : Colors.white,
                        border: Border.all(
                          color: isSelected
                              ? kPrimary
                              : kBorder,
                          width: isSelected ? 2 : 1,
                        ),
                        borderRadius: BorderRadius.circular(14),
                        boxShadow: isSelected
                            ? [BoxShadow(color: kPrimary.withValues(alpha: 0.16), blurRadius: 8, offset: const Offset(0, 2))]
                            : const [BoxShadow(color: Color(0x06000000), blurRadius: 4, offset: Offset(0, 1))],
                      ),
                      child: Row(
                        children: [
                          // Time of Day Indicator
                          Container(
                            width: 44,
                            height: 44,
                            decoration: BoxDecoration(
                              color: isMorning
                                  ? const Color(0xFFFEF3C7)
                                  : isEvening
                                      ? const Color(0xFFF3E8FF)
                                      : const Color(0xFFE0E7FF),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            alignment: Alignment.center,
                            child: Icon(
                              isMorning
                                  ? Icons.wb_sunny_rounded
                                  : isEvening
                                      ? Icons.wb_twilight_rounded
                                      : Icons.nightlight_round,
                              color: isMorning
                                  ? const Color(0xFFD97706)
                                  : isEvening
                                      ? const Color(0xFF7C3AED)
                                      : const Color(0xFF4F46E5),
                              size: 22,
                            ),
                          ),
                          const SizedBox(width: 12),

                          // Session Details
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  sessionTitle,
                                  style: TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.bold,
                                    color: !available ? Colors.grey : kPrimaryDark,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  timeDisplay,
                                  style: const TextStyle(fontSize: 12, color: Color(0xFF475569), fontWeight: FontWeight.w600),
                                ),
                                if (widget.doctor.roomNumber.isNotEmpty) ...[
                                  const SizedBox(height: 2),
                                  Text(
                                    widget.doctor.roomNumber,
                                    style: const TextStyle(fontSize: 11, color: Colors.grey),
                                  ),
                                ],
                              ],
                            ),
                          ),

                          // Capacity & Status Pill
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                                decoration: BoxDecoration(
                                  color: !available
                                      ? const Color(0xFFF1F5F9)
                                      : const Color(0xFFDCFCE7),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Text(
                                  !available
                                      ? 'Full'
                                      : '${session.slotsLeft} slots left',
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.bold,
                                    color: !available
                                        ? Colors.grey.shade600
                                        : const Color(0xFF15803D),
                                  ),
                                ),
                              ),
                              const SizedBox(height: 6),
                              // Radio selection mark
                              Icon(
                                isSelected ? Icons.check_circle_rounded : Icons.radio_button_unchecked,
                                size: 20,
                                color: isSelected ? kPrimary : Colors.grey.shade400,
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),

            const SizedBox(height: 30),
          ],
        ),
      ),
    );
  }

  Widget _buildHighlightItem({
    required IconData icon,
    required Color iconColor,
    required String title,
    required String subtitle,
  }) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 18, color: iconColor),
        const SizedBox(width: 6),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: kPrimaryDark),
            ),
            Text(
              subtitle,
              style: const TextStyle(fontSize: 10, color: Colors.grey),
            ),
          ],
        ),
      ],
    );
  }
}
