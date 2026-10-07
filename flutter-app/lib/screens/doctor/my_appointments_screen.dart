import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../services/doctor_api_service.dart';
import '../../services/auth_service.dart';
import '../../utils/theme.dart';
import 'doctor_search_screen.dart';

class MyAppointmentsScreen extends StatefulWidget {
  const MyAppointmentsScreen({super.key});

  @override
  State<MyAppointmentsScreen> createState() => _MyAppointmentsScreenState();
}

class _MyAppointmentsScreenState extends State<MyAppointmentsScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  List<DoctorAppointment> _appointments = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _fetchAppointments();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _fetchAppointments() async {
    setState(() => _loading = true);
    try {
      final user = await AuthService.getUser();
      final patientId = user != null ? int.tryParse(user.userId) : null;
      final list = await DoctorApiService.getMyAppointments(
        patientId: patientId,
        email: user?.email,
      );
      if (mounted) {
        setState(() {
          _appointments = list;
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _cancelBooking(int id) async {
    HapticFeedback.lightImpact();
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Cancel Appointment?'),
        content: const Text('Are you sure you want to cancel this booking? This slot will be released to other patients.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Keep Booking'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red.shade700, foregroundColor: Colors.white),
            child: const Text('Cancel Appointment'),
          ),
        ],
      ),
    );

    if (confirm == true) {
      final success = await DoctorApiService.cancelAppointment(id);
      if (success && mounted) {
        HapticFeedback.mediumImpact();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Appointment successfully cancelled'), backgroundColor: Colors.red),
        );
        _fetchAppointments();
      }
    }
  }

  void _showQrBottomSheet(DoctorAppointment apt) {
    HapticFeedback.lightImpact();
    final token = apt.queueLabel ?? 'Token #${apt.queueNumber.toString().padLeft(2, '0')}';
    // Strictly encode opaque qrToken — zero PHI
    final safePayload = apt.qrToken.isNotEmpty ? apt.qrToken : apt.appointmentNumber;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(width: 40, height: 4, decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(2))),
                const SizedBox(height: 16),
                Text(
                  'Hospital Check-in Pass ($token)',
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: kPrimaryDark),
                ),
                Text('Ref: ${apt.appointmentNumber}', style: const TextStyle(fontSize: 12, color: Colors.grey)),
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: kBorder),
                  ),
                  child: Image.network(
                    'https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${Uri.encodeComponent(safePayload)}',
                    width: 160,
                    height: 160,
                    errorBuilder: (context, error, stackTrace) => const Icon(Icons.qr_code, size: 80, color: kPrimary),
                  ),
                ),
                const SizedBox(height: 14),
                Text(
                  '${apt.doctorName} • ${apt.timeSlot}',
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: kText),
                ),
                const SizedBox(height: 4),
                Text(
                  apt.bookingType == 'Reservation' ? 'Reserved • Settle Fee at Channeling Desk' : 'Paid Online • Direct Check-in',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: apt.bookingType == 'Reservation' ? const Color(0xFFD97706) : const Color(0xFF047857),
                  ),
                ),
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton(
                    onPressed: () => Navigator.pop(ctx),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: kPrimary,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    child: const Text('Done', style: TextStyle(fontWeight: FontWeight.bold)),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  void _showRescheduleBottomSheet(DoctorAppointment apt) async {
    HapticFeedback.lightImpact();
    List<DoctorSession> availableSessions = [];
    bool loadingSessions = true;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (modalCtx, setModalState) {
            if (loadingSessions) {
              DoctorApiService.getDoctorSessions(apt.doctorId).then((sessions) {
                if (ctx.mounted) {
                  setModalState(() {
                    final valid = sessions.where((s) => s.id != apt.doctorSessionId && s.isAvailable && !s.isExpired && s.slotsLeft > 0).toList();
                    final Map<String, DoctorSession> dedup = {};
                    for (final s in valid) {
                      final key = '${s.sessionDate}_${s.sessionType.toLowerCase()}';
                      if (!dedup.containsKey(key) || s.maxCapacity > dedup[key]!.maxCapacity) {
                        dedup[key] = s;
                      }
                    }
                    availableSessions = dedup.values.toList();
                    loadingSessions = false;
                  });
                }
              }).catchError((_) {
                if (ctx.mounted) {
                  setModalState(() => loadingSessions = false);
                }
              });
            }

            return SafeArea(
              child: Container(
                constraints: BoxConstraints(maxHeight: MediaQuery.of(modalCtx).size.height * 0.75),
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Center(
                      child: Container(width: 40, height: 4, decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(2))),
                    ),
                    const SizedBox(height: 14),
                    const Text('Reschedule Appointment', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: kPrimaryDark)),
                    Text('Select a new session with ${apt.doctorName}', style: const TextStyle(fontSize: 12, color: Colors.grey)),
                    const SizedBox(height: 14),
                    if (loadingSessions)
                      const Padding(
                        padding: EdgeInsets.symmetric(vertical: 40),
                        child: Center(child: CircularProgressIndicator()),
                      )
                    else if (availableSessions.isEmpty)
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: 30),
                        child: Center(
                          child: Column(
                            children: const [
                              Icon(Icons.event_busy, size: 40, color: Colors.grey),
                              SizedBox(height: 8),
                              Text('No other open sessions available for this doctor.', style: TextStyle(color: Colors.grey, fontSize: 13)),
                            ],
                          ),
                        ),
                      )
                    else
                      Expanded(
                        child: ListView.separated(
                          itemCount: availableSessions.length,
                          separatorBuilder: (_, _) => const SizedBox(height: 10),
                          itemBuilder: (_, index) {
                            final session = availableSessions[index];
                            final isMorning = session.sessionType.toLowerCase() == 'morning';
                            final isEvening = session.sessionType.toLowerCase() == 'evening';

                            return InkWell(
                              onTap: () async {
                                Navigator.pop(ctx);
                                HapticFeedback.lightImpact();
                                try {
                                  await DoctorApiService.rescheduleAppointment(apt.id, session.id);
                                  HapticFeedback.mediumImpact();
                                  if (mounted) {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      const SnackBar(content: Text('Appointment successfully rescheduled!'), backgroundColor: Colors.green),
                                    );
                                    _fetchAppointments();
                                  }
                                } catch (e) {
                                  if (mounted) {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      SnackBar(content: Text('Reschedule failed: $e'), backgroundColor: Colors.red),
                                    );
                                  }
                                }
                              },
                              borderRadius: BorderRadius.circular(12),
                              child: Container(
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(color: kBorder),
                                ),
                                child: Row(
                                  children: [
                                    Icon(
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
                                      size: 20,
                                    ),
                                    const SizedBox(width: 10),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            '${session.sessionType} Session • ${session.sessionDate}',
                                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: kPrimaryDark),
                                          ),
                                          Text(
                                            session.timeRange.isNotEmpty ? session.timeRange : session.timeFormatted,
                                            style: const TextStyle(fontSize: 12, color: Color(0xFF475569)),
                                          ),
                                        ],
                                      ),
                                    ),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                      decoration: BoxDecoration(color: const Color(0xFFDCFCE7), borderRadius: BorderRadius.circular(12)),
                                      child: Text('${session.slotsLeft} left', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF15803D))),
                                    ),
                                    const SizedBox(width: 6),
                                    const Icon(Icons.arrow_forward_ios, size: 12, color: kPrimary),
                                  ],
                                ),
                              ),
                            );
                          },
                        ),
                      ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  List<DoctorAppointment> get _upcomingAppointments =>
      _appointments.where((a) => a.status == 'Confirmed' || a.status == 'InProgress' || a.status == 'PendingPayment' || a.status == 'Reserved').toList();

  List<DoctorAppointment> get _completedAppointments =>
      _appointments.where((a) => a.status == 'Completed').toList();

  List<DoctorAppointment> get _cancelledAppointments =>
      _appointments.where((a) => a.status == 'Cancelled' || a.status == 'NoShow').toList();

  String _formatExpectedTime(String? timeStr) {
    if (timeStr == null || timeStr.isEmpty) return 'shortly';
    try {
      final dt = DateTime.parse(timeStr).toLocal();
      final hour = dt.hour > 12 ? dt.hour - 12 : (dt.hour == 0 ? 12 : dt.hour);
      final period = dt.hour >= 12 ? 'PM' : 'AM';
      final minute = dt.minute.toString().padLeft(2, '0');
      return '$hour:$minute $period';
    } catch (_) {
      return timeStr;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: kBg,
      appBar: AppBar(
        backgroundColor: kPrimaryDark,
        foregroundColor: Colors.white,
        elevation: 0,
        title: const Text('My Appointments', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17)),
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: Colors.white,
          indicatorWeight: 3,
          labelColor: Colors.white,
          unselectedLabelColor: const Color(0xFFB2DFDB),
          tabs: const [
            Tab(text: 'Upcoming'),
            Tab(text: 'Completed'),
            Tab(text: 'Cancelled'),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {
          HapticFeedback.lightImpact();
          Navigator.pushReplacement(
            context,
            MaterialPageRoute(builder: (_) => const DoctorSearchScreen()),
          );
        },
        backgroundColor: kPrimary,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add),
        label: const Text('Book New', style: TextStyle(fontWeight: FontWeight.bold)),
      ),
      body: RefreshIndicator(
        color: kPrimary,
        onRefresh: () async {
          HapticFeedback.lightImpact();
          await _fetchAppointments();
        },
        child: _loading
            ? _buildSkeletonList()
            : TabBarView(
                controller: _tabController,
                children: [
                  _buildUpcomingTab(_upcomingAppointments),
                  _buildSimpleList(_completedAppointments, 'No completed appointments yet'),
                  _buildSimpleList(_cancelledAppointments, 'No cancelled appointments'),
                ],
              ),
      ),
    );
  }

  Widget _buildSkeletonList() {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: 3,
      itemBuilder: (context, index) {
        return Container(
          margin: const EdgeInsets.only(bottom: 12),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: kBorder)),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Container(width: 80, height: 16, decoration: BoxDecoration(color: Colors.grey.shade200, borderRadius: BorderRadius.circular(4))),
                  Container(width: 60, height: 16, decoration: BoxDecoration(color: Colors.grey.shade200, borderRadius: BorderRadius.circular(4))),
                ],
              ),
              const SizedBox(height: 12),
              Container(width: 160, height: 18, color: Colors.grey.shade200),
              const SizedBox(height: 6),
              Container(width: 220, height: 14, color: Colors.grey.shade100),
            ],
          ),
        );
      },
    );
  }

  Widget _buildUpcomingTab(List<DoctorAppointment> list) {
    if (list.isEmpty) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          SizedBox(height: MediaQuery.of(context).size.height * 0.25),
          Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: const [
                Icon(Icons.event_busy, size: 54, color: Colors.grey),
                SizedBox(height: 12),
                Text('No upcoming appointments scheduled', style: TextStyle(color: Colors.grey, fontSize: 14, fontWeight: FontWeight.w600)),
              ],
            ),
          ),
        ],
      );
    }

    // Identify if any appointment is for today (to display prominent live queue hero card)
    final todayAppointment = list.cast<DoctorAppointment?>().firstWhere(
          (a) => a != null && a.isToday,
          orElse: () => null,
        );

    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(16),
      children: [
        // Live Status Hero Card for Today's Appointment (Glanceable Boarding Pass)
        if (todayAppointment != null) ...[
          _buildLiveStatusHeroCard(todayAppointment),
          const SizedBox(height: 18),
          const Text(
            'All Upcoming Bookings',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: kPrimaryDark),
          ),
          const SizedBox(height: 10),
        ],

        // List of all upcoming appointments
        ...list.map((apt) => _buildAppointmentCard(apt)),
        const SizedBox(height: 40),
      ],
    );
  }

  Widget _buildSimpleList(List<DoctorAppointment> list, String emptyMessage) {
    if (list.isEmpty) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          SizedBox(height: MediaQuery.of(context).size.height * 0.25),
          Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.event_busy, size: 54, color: Colors.grey),
                const SizedBox(height: 12),
                Text(emptyMessage, style: const TextStyle(color: Colors.grey, fontSize: 14, fontWeight: FontWeight.w600)),
              ],
            ),
          ),
        ],
      );
    }

    return ListView.builder(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(16),
      itemCount: list.length,
      itemBuilder: (context, index) => _buildAppointmentCard(list[index]),
    );
  }

  Widget _buildLiveStatusHeroCard(DoctorAppointment apt) {
    final token = apt.queueLabel ?? 'Token #${apt.queueNumber.toString().padLeft(2, '0')}';
    final serving = apt.currentlyServingLabel ?? 'Not started yet';
    final isDelayed = apt.sessionStatus == 'Delayed';
    final isActive = apt.sessionStatus == 'Active';

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: isActive ? const Color(0xFF059669) : isDelayed ? const Color(0xFFD97706) : kBorder, width: 2),
        boxShadow: const [
          BoxShadow(color: Color(0x0C000000), blurRadius: 10, offset: Offset(0, 3)),
        ],
      ),
      child: Column(
        children: [
          // Banner Top
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            decoration: BoxDecoration(
              color: isDelayed ? const Color(0xFFFEF3C7) : const Color(0xFFECFDF5),
              borderRadius: const BorderRadius.vertical(top: Radius.circular(14)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Container(width: 8, height: 8, decoration: BoxDecoration(color: isActive ? Colors.green : isDelayed ? Colors.orange : Colors.blue, shape: BoxShape.circle)),
                    const SizedBox(width: 6),
                    Text(
                      'TODAY\'S LIVE QUEUE',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w900,
                        color: isDelayed ? const Color(0xFF92400E) : const Color(0xFF065F46),
                        letterSpacing: 0.5,
                      ),
                    ),
                  ],
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: isActive ? Colors.green.shade100 : isDelayed ? Colors.amber.shade100 : Colors.blue.shade100,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    apt.sessionStatus ?? 'Scheduled',
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      color: isActive ? Colors.green.shade900 : isDelayed ? Colors.amber.shade900 : Colors.blue.shade900,
                    ),
                  ),
                ),
              ],
            ),
          ),

          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            apt.doctorName,
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: kText),
                          ),
                          Text(
                            'Room: ${apt.roomNumber ?? "Consultation Suite"} • ${apt.hospitalBranch}',
                            style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),

                // Large Boarding Pass Numbers
                Row(
                  children: [
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 10),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF0FDF4),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: const Color(0xFFBBF7D0)),
                        ),
                        child: Column(
                          children: [
                            const Text('YOUR TOKEN', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Color(0xFF15803D))),
                            const SizedBox(height: 2),
                            Text(
                              token,
                              style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: Color(0xFF14532D)),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 10),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                        ),
                        child: Column(
                          children: [
                            const Text('CURRENTLY SERVING', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Color(0xFF475569))),
                            const SizedBox(height: 2),
                            Text(
                              serving,
                              style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: kPrimaryDark),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                // Delay Banner if delayed
                if (isDelayed) ...[
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFEF3C7),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: const Color(0xFFFDE68A)),
                    ),
                    child: Text(
                      'Session delayed — new expected start ${_formatExpectedTime(apt.expectedStartTime)}${apt.delayReason != null ? " (${apt.delayReason})" : ""}',
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF92400E)),
                    ),
                  ),
                  const SizedBox(height: 8),
                ],

                // Estimated consultation time row
                if (apt.estimatedConsultationTime != null && apt.estimatedConsultationTime!.isNotEmpty) ...[
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF1F5F9),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      'Estimated Consultation: ${apt.estimatedConsultationTime} (approximate)',
                      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF334155)),
                    ),
                  ),
                  const SizedBox(height: 12),
                ],

                // Action Row
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    OutlinedButton.icon(
                      onPressed: () => _showQrBottomSheet(apt),
                      icon: const Icon(Icons.qr_code, size: 16),
                      label: const Text('Show QR Pass', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: kPrimary,
                        side: const BorderSide(color: kPrimary),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAppointmentCard(DoctorAppointment apt) {
    final isReserved = apt.status == 'Reserved' || apt.bookingType == 'Reservation';
    final isConfirmed = apt.status == 'Confirmed';
    final token = apt.queueLabel ?? 'Token #${apt.queueNumber.toString().padLeft(2, '0')}';

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: kBorder),
        boxShadow: const [
          BoxShadow(color: Color(0x06000000), blurRadius: 4, offset: Offset(0, 1)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Badges Row
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Wrap(
                spacing: 6,
                runSpacing: 4,
                children: [
                  _buildStatusBadge(apt.status),
                  _buildBadge(
                    apt.bookingType == 'Reservation' ? 'Reserved' : 'Paid Online',
                    apt.bookingType == 'Reservation' ? const Color(0xFFD97706) : const Color(0xFF047857),
                    apt.bookingType == 'Reservation' ? const Color(0xFFFEF3C7) : const Color(0xFFDCFCE7),
                  ),
                  if (apt.queueStatus.isNotEmpty && apt.queueStatus != 'NotCheckedIn')
                    _buildBadge('Queue: ${apt.queueStatus}', const Color(0xFF1D4ED8), const Color(0xFFEFF6FF)),
                  if (apt.arrivalStatus.isNotEmpty && apt.arrivalStatus != 'Pending' && apt.arrivalStatus != 'NotArrived')
                    _buildBadge('Arrival: ${apt.arrivalStatus}', const Color(0xFF059669), const Color(0xFFECFDF5)),
                ],
              ),
              Text(
                token,
                style: const TextStyle(fontWeight: FontWeight.w900, color: kPrimaryDark, fontSize: 14),
              ),
            ],
          ),
          const SizedBox(height: 8),

          Text(
            apt.doctorName,
            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: kText),
          ),
          Text(
            '${apt.specialization} • ${apt.appointmentDate} at ${apt.timeSlot}',
            style: const TextStyle(fontSize: 12, color: Color(0xFF475569)),
          ),
          Text(
            apt.hospitalBranch,
            style: const TextStyle(fontSize: 11, color: Colors.grey),
          ),

          if (apt.estimatedConsultationTime != null && apt.estimatedConsultationTime!.isNotEmpty) ...[
            const SizedBox(height: 6),
            Text(
              'Est. Consultation: ${apt.estimatedConsultationTime} (approximate)',
              style: const TextStyle(fontSize: 11, color: Color(0xFF047857), fontWeight: FontWeight.w600),
            ),
          ],
          const SizedBox(height: 10),
          const Divider(height: 1, color: Color(0xFFF1F5F9)),
          const SizedBox(height: 8),

          // Actions Row (Min 48dp Touch Targets)
          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              TextButton.icon(
                onPressed: () => _showQrBottomSheet(apt),
                icon: const Icon(Icons.qr_code, size: 16),
                label: const Text('Pass QR', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                style: TextButton.styleFrom(
                  foregroundColor: kPrimary,
                  minimumSize: const Size(60, 48),
                ),
              ),
              if (isConfirmed || isReserved) ...[
                const SizedBox(width: 4),
                TextButton.icon(
                  onPressed: () => _showRescheduleBottomSheet(apt),
                  icon: const Icon(Icons.edit_calendar, size: 16),
                  label: const Text('Reschedule', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                  style: TextButton.styleFrom(
                    foregroundColor: const Color(0xFFD97706),
                    minimumSize: const Size(80, 48),
                  ),
                ),
                const SizedBox(width: 4),
                TextButton(
                  onPressed: () => _cancelBooking(apt.id),
                  style: TextButton.styleFrom(
                    minimumSize: const Size(60, 48),
                  ),
                  child: const Text('Cancel', style: TextStyle(fontSize: 12, color: Colors.red, fontWeight: FontWeight.bold)),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildBadge(String text, Color textColor, Color bgColor) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(color: bgColor, borderRadius: BorderRadius.circular(4)),
      child: Text(text, style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: textColor)),
    );
  }

  Widget _buildStatusBadge(String status) {
    Color bg = const Color(0xFFF1F5F9);
    Color text = const Color(0xFF475569);

    switch (status) {
      case 'Confirmed':
        bg = const Color(0xFFDCFCE7);
        text = const Color(0xFF15803D);
        break;
      case 'Reserved':
        bg = const Color(0xFFFEF3C7);
        text = const Color(0xFFB45309);
        break;
      case 'InProgress':
        bg = const Color(0xFFDBEAFE);
        text = const Color(0xFF1D4ED8);
        break;
      case 'Completed':
        bg = const Color(0xFFF3E8FF);
        text = const Color(0xFF7E22CE);
        break;
      case 'Cancelled':
      case 'NoShow':
        bg = const Color(0xFFFEE2E2);
        text = const Color(0xFFB91C1C);
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(4)),
      child: Text(status, style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: text)),
    );
  }
}
