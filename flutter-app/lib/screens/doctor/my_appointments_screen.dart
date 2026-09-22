import 'package:flutter/material.dart';
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
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Cancel Appointment?'),
        content: const Text('Are you sure you want to cancel this booking? This cannot be undone.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('No')),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red, foregroundColor: Colors.white),
            child: const Text('Cancel Booking'),
          ),
        ],
      ),
    );

    if (confirm == true) {
      final success = await DoctorApiService.cancelAppointment(id);
      if (success) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Appointment cancelled')),
          );
          _fetchAppointments();
        }
      }
    }
  }

  void _showQrDialog(DoctorAppointment apt) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Center(
          child: Text('Check-in QR (Queue #${apt.queueNumber.toString().padLeft(2, '0')})',
              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('Ref: ${apt.appointmentNumber}', style: const TextStyle(fontSize: 11, color: Colors.grey)),
            const SizedBox(height: 12),
            Image.network(
              'https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${Uri.encodeComponent(apt.qrCodeText.isNotEmpty ? apt.qrCodeText : apt.appointmentNumber)}',
              width: 160,
              height: 160,
            ),
            const SizedBox(height: 10),
            Text('${apt.doctorName} • ${apt.timeSlot}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Close')),
        ],
      ),
    );
  }

  List<DoctorAppointment> get _upcomingAppointments =>
      _appointments.where((a) => a.status == 'Confirmed' || a.status == 'InProgress' || a.status == 'PendingPayment').toList();

  List<DoctorAppointment> get _completedAppointments =>
      _appointments.where((a) => a.status == 'Completed').toList();

  List<DoctorAppointment> get _cancelledAppointments =>
      _appointments.where((a) => a.status == 'Cancelled' || a.status == 'NoShow').toList();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: kBg,
      appBar: AppBar(
        backgroundColor: kPrimaryDark,
        foregroundColor: Colors.white,
        title: const Text('My Appointments', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17)),
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: _fetchAppointments),
        ],
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: Colors.white,
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
          Navigator.pushReplacement(
            context,
            MaterialPageRoute(builder: (_) => const DoctorSearchScreen()),
          );
        },
        backgroundColor: kPrimary,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add),
        label: const Text('Book New'),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : TabBarView(
              controller: _tabController,
              children: [
                _buildAppointmentList(_upcomingAppointments, 'No upcoming appointments scheduled'),
                _buildAppointmentList(_completedAppointments, 'No completed appointments yet'),
                _buildAppointmentList(_cancelledAppointments, 'No cancelled appointments'),
              ],
            ),
    );
  }

  Widget _buildAppointmentList(List<DoctorAppointment> list, String emptyMessage) {
    if (list.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.event_busy, size: 48, color: Colors.grey),
            const SizedBox(height: 10),
            Text(emptyMessage, style: const TextStyle(color: Colors.grey, fontSize: 13)),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: list.length,
      itemBuilder: (context, index) {
        final apt = list[index];
        final isConfirmed = apt.status == 'Confirmed';
        final isInProgress = apt.status == 'InProgress';
        final isCompleted = apt.status == 'Completed';

        Color statusColor = isConfirmed
            ? Colors.green
            : isInProgress
                ? Colors.orange
                : isCompleted
                    ? Colors.blue
                    : Colors.red;

        return Container(
          margin: const EdgeInsets.only(bottom: 12),
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: kBorder),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: statusColor.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      apt.status,
                      style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: statusColor),
                    ),
                  ),
                  Text('Queue #${apt.queueNumber.toString().padLeft(2, '0')}',
                      style: const TextStyle(fontWeight: FontWeight.w900, color: kPrimaryDark, fontSize: 13)),
                ],
              ),
              const SizedBox(height: 6),
              Text(
                apt.doctorName,
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: kText),
              ),
              Text(
                '${apt.specialization} • ${apt.appointmentDate} at ${apt.timeSlot}',
                style: const TextStyle(fontSize: 12, color: kTextMuted),
              ),
              Text(
                apt.hospitalBranch,
                style: const TextStyle(fontSize: 11, color: Colors.grey),
              ),
              const SizedBox(height: 8),
              const Divider(height: 1),
              const SizedBox(height: 8),

              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  TextButton.icon(
                    onPressed: () => _showQrDialog(apt),
                    icon: const Icon(Icons.qr_code, size: 16),
                    label: const Text('View QR', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                    style: TextButton.styleFrom(foregroundColor: kPrimary),
                  ),
                  if (isConfirmed) ...[
                    const SizedBox(width: 6),
                    TextButton(
                      onPressed: () => _cancelBooking(apt.id),
                      child: const Text('Cancel', style: TextStyle(fontSize: 11, color: Colors.red, fontWeight: FontWeight.bold)),
                    ),
                  ],
                ],
              ),
            ],
          ),
        );
      },
    );
  }
}
