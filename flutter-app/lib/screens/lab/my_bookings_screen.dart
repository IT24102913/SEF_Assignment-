import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../services/auth_service.dart';
import '../../services/lab_api_service.dart';
import '../../services/emr_api_service.dart';
import 'package:lab_patient_app/utils/config.dart';
import '../../utils/theme.dart';
import 'booking_screen.dart';
import 'booking_tracking_screen.dart';
import 'test_detail_screen.dart';

class MyBookingsScreen extends StatefulWidget {
  final String? statusFilter;
  const MyBookingsScreen({super.key, this.statusFilter});

  @override
  State<MyBookingsScreen> createState() => _MyBookingsScreenState();
}

class _MyBookingsScreenState extends State<MyBookingsScreen> {
  List<LabBooking> _bookings = [];
  bool _loading = true;
  String? _userId;
  // 'ACTIVE' | 'RESULTS' | 'HISTORY' | 'ALL'
  String _activeTab = 'ACTIVE';

  @override
  void initState() {
    super.initState();
    if (widget.statusFilter != null) {
      final sf = widget.statusFilter!.toUpperCase();
      if (['ACTIVE', 'RESULTS', 'HISTORY', 'ALL'].contains(sf)) {
        _activeTab = sf;
      } else if (sf == 'RESULTSREADY') {
        _activeTab = 'RESULTS';
      }
    }
    _loadUser();
  }

  Future<void> _loadUser() async {
    final user = await AuthService.getUser();
    final effectiveId = user?.userId ?? (AuthState.userId?.isNotEmpty == true ? AuthState.userId : null);
    if (effectiveId == null || effectiveId.isEmpty) {
      if (mounted) Navigator.pushReplacementNamed(context, '/login');
      return;
    }
    _userId = effectiveId;
    _load();
  }

  Future<void> _load() async {
    if (_userId == null) return;
    setState(() => _loading = true);
    try {
      final b = await LabApiService.getMyBookings(_userId!);
      if (mounted) {
        setState(() {
          _bookings = b;
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _cancel(LabBooking b) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Cancel Booking?', style: TextStyle(fontWeight: FontWeight.w800, color: kText)),
        content: Text(
          'Are you sure you want to cancel your appointment for ${b.labTest?.name ?? "this test"}?',
          style: const TextStyle(color: kTextMuted),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Keep Booking', style: TextStyle(color: kTextMuted, fontWeight: FontWeight.w600)),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(backgroundColor: kDanger),
            child: const Text('Yes, Cancel'),
          ),
        ],
      ),
    );

    if (confirm == true) {
      try {
        await LabApiService.cancelBooking(b.id, _userId!);
        _load();
      } catch (_) {}
    }
  }

  List<LabBooking> get _activeBookings => _bookings.where((b) =>
    b.status == 'Confirmed' ||
    b.status == 'SampleCollected' ||
    b.status == 'TestingInProgress' ||
    b.status == 'ResultVerification' ||
    b.status == 'PendingLabApproval' ||
    b.status == 'PendingPrescriptionUpload' ||
    b.status == 'PendingAIVerification'
  ).toList();

  List<LabBooking> get _resultsBookings => _bookings.where((b) =>
    b.status == 'ResultsReady' ||
    b.status == 'ReportDelivered' ||
    b.status == 'Completed' ||
    (b.resultFileUrl != null && b.resultFileUrl!.trim().isNotEmpty)
  ).toList();

  List<LabBooking> get _historyBookings => _bookings.where((b) =>
    b.status == 'Completed' ||
    b.status == 'Cancelled' ||
    b.status == 'Rejected'
  ).toList();

  List<LabBooking> get _filteredBookings {
    switch (_activeTab) {
      case 'ACTIVE':
        return _activeBookings;
      case 'RESULTS':
        return _resultsBookings;
      case 'HISTORY':
        return _historyBookings;
      case 'ALL':
      default:
        return _bookings;
    }
  }

  List<dynamic> get _displayItems {
    final raw = _filteredBookings;
    if (_activeTab == 'RESULTS') {
      // Test reports are individual documents to download
      return raw;
    }
    // Group active bookings during intake/payment stage ONLY BEFORE payment is confirmed.
    // Once payment is confirmed, separate into individual cards so each test has its own separate track!
    final Map<String, List<LabBooking>> grouped = {};
    final List<dynamic> items = [];

    for (var b in raw) {
      final isPaid = b.paymentStatus == 'PaidOnline' || b.paymentStatus == 'PaidAtCounter';

      // Tests are only grouped together when payment is NOT YET confirmed (awaiting payment).
      // Once payment is confirmed, separate into individual cards so each test has its own separate track!
      final isAwaitingPayment = !isPaid && (
          b.status == 'Confirmed' ||
          b.status == 'PendingLabApproval' ||
          b.status == 'PendingPrescriptionUpload' ||
          b.status == 'PendingAIVerification' ||
          b.status == 'PendingPayment'
      );

      if (isAwaitingPayment) {
        final key = '${b.bookingDate}_${b.timeSlot}';
        grouped.putIfAbsent(key, () => []).add(b);
      } else {
        items.add(b);
      }
    }

    for (var group in grouped.values) {
      if (group.length == 1) {
        items.add(group.first);
      } else {
        items.add(group); // List<LabBooking>
      }
    }
    return items;
  }

  Future<void> _cancelMultiple(List<LabBooking> bookings) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Cancel Appointment?', style: TextStyle(fontWeight: FontWeight.w800, color: kText)),
        content: Text(
          'Are you sure you want to cancel this appointment containing ${bookings.length} diagnostic tests?',
          style: const TextStyle(color: kTextMuted, height: 1.4),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Keep Appointment', style: TextStyle(color: kTextMuted, fontWeight: FontWeight.w600)),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(backgroundColor: kDanger),
            child: const Text('Cancel All Tests', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    );

    if (confirmed == true && _userId != null) {
      for (var b in bookings) {
        try {
          await LabApiService.cancelBooking(b.id, _userId!);
        } catch (_) {}
      }
      _load();
    }
  }

  @override
  Widget build(BuildContext context) {
    final list = _displayItems;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Laboratory Diagnostics'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _load,
            tooltip: 'Refresh',
          ),
        ],
      ),
      body: Column(
        children: [
          // Distinct Tabs Pill Bar
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            color: Colors.transparent,
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _TabPill(
                    icon: Icons.timelapse_outlined,
                    label: 'Active',
                    count: _activeBookings.length,
                    selected: _activeTab == 'ACTIVE',
                    onTap: () => setState(() => _activeTab = 'ACTIVE'),
                  ),
                  const SizedBox(width: 8),
                  _TabPill(
                    icon: Icons.picture_as_pdf_outlined,
                    label: 'Test Reports',
                    count: _resultsBookings.length,
                    selected: _activeTab == 'RESULTS',
                    accentColor: const Color(0xFF059669),
                    onTap: () => setState(() => _activeTab = 'RESULTS'),
                  ),
                  const SizedBox(width: 8),
                  _TabPill(
                    icon: Icons.history_outlined,
                    label: 'History',
                    count: _historyBookings.length,
                    selected: _activeTab == 'HISTORY',
                    accentColor: const Color(0xFFD97706),
                    onTap: () => setState(() => _activeTab = 'HISTORY'),
                  ),
                  const SizedBox(width: 8),
                  _TabPill(
                    icon: Icons.folder_open_outlined,
                    label: 'All',
                    count: _bookings.length,
                    selected: _activeTab == 'ALL',
                    onTap: () => setState(() => _activeTab = 'ALL'),
                  ),
                ],
              ),
            ),
          ),

          // Content List with Custom Card UI per Tab
          Expanded(
            child: _loading
                ? const LoadingWidget()
                : list.isEmpty
                    ? _buildEmptyState()
                    : RefreshIndicator(
                        onRefresh: _load,
                        color: kPrimary,
                        child: ListView.separated(
                          padding: const EdgeInsets.fromLTRB(16, 4, 16, 32),
                          itemCount: list.length,
                          separatorBuilder: (_, _) => const SizedBox(height: 14),
                          itemBuilder: (_, i) {
                            final item = list[i];
                            return _buildBookingItem(item);
                          },
                        ),
                      ),
          ),
        ],
      ),
    );
  }

  Widget _buildBookingItem(dynamic item) {
    if (item is List<LabBooking>) {
      final primary = item.first;
      final related = item.sublist(1);
      return _ActiveBookingCard(
        booking: primary,
        relatedBookings: related,
        onCancel: () => _cancelMultiple(item),
        onRefresh: _load,
      );
    }

    final booking = item as LabBooking;
    if (_activeTab == 'ACTIVE') {
      return _ActiveBookingCard(
        booking: booking,
        relatedBookings: const [],
        onCancel: () => _cancel(booking),
        onRefresh: _load,
      );
    } else if (_activeTab == 'RESULTS') {
      return _ReportDocumentCard(
        booking: booking,
        onDownload: (url) => _downloadReport(context, url),
      );
    } else if (_activeTab == 'HISTORY') {
      return _HistoryRecordCard(
        booking: booking,
        onDownload: (url) => _downloadReport(context, url),
      );
    } else {
      // For 'ALL' tab: intelligently render card based on booking state
      final isReportReady = booking.status == 'ResultsReady' ||
          booking.status == 'ReportDelivered' ||
          (booking.resultFileUrl != null && booking.resultFileUrl!.trim().isNotEmpty);
      final isFinished = booking.status == 'Completed' || booking.status == 'Cancelled' || booking.status == 'Rejected';

      if (isReportReady && !isFinished) {
        return _ReportDocumentCard(
          booking: booking,
          onDownload: (url) => _downloadReport(context, url),
        );
      } else if (isFinished) {
        return _HistoryRecordCard(
          booking: booking,
          onDownload: (url) => _downloadReport(context, url),
        );
      } else {
        return _ActiveBookingCard(
          booking: booking,
          relatedBookings: const [],
          onCancel: () => _cancel(booking),
          onRefresh: _load,
        );
      }
    }
  }

  Widget _buildEmptyState() {
    switch (_activeTab) {
      case 'ACTIVE':
        return const EmptyStateWidget(
          icon: Icons.biotech_outlined,
          message: 'No Active Diagnostic Tests',
          subtitle: 'You have no scheduled appointments or specimens currently in the laboratory queue.',
        );
      case 'RESULTS':
        return const EmptyStateWidget(
          icon: Icons.picture_as_pdf_outlined,
          message: 'No Test Reports Ready',
          subtitle: 'Once your specimen analysis is verified by the pathologist, your official digital PDF reports will appear here.',
        );
      case 'HISTORY':
        return const EmptyStateWidget(
          icon: Icons.history_edu_outlined,
          message: 'No Past Diagnostics History',
          subtitle: 'Completed, archived, and cancelled laboratory records will be safely logged here.',
        );
      default:
        return const EmptyStateWidget(
          icon: Icons.calendar_month_outlined,
          message: 'No Bookings Found',
          subtitle: 'Schedule a laboratory diagnostic test to get started.',
        );
    }
  }

  static Future<void> _downloadReport(BuildContext context, String fileUrl) async {
    String fullPdfUrl = fileUrl.trim();

    if (!fullPdfUrl.startsWith('http://') && !fullPdfUrl.startsWith('https://')) {
      final baseUrl = ApiConfig.baseUrl;
      final hostUrl = baseUrl.substring(0, baseUrl.indexOf('/api'));
      fullPdfUrl = fullPdfUrl.startsWith('/') ? '$hostUrl$fullPdfUrl' : '$hostUrl/$fullPdfUrl';
    } else if (!kIsWeb && fullPdfUrl.contains('localhost:5126')) {
      final baseUrl = ApiConfig.baseUrl;
      final hostUrl = baseUrl.substring(0, baseUrl.indexOf('/api'));
      fullPdfUrl = fullPdfUrl.replaceAll('http://localhost:5126', hostUrl);
    }

    final uri = Uri.parse(fullPdfUrl);
    try {
      final success = await launchUrl(uri, mode: LaunchMode.externalApplication);
      if (!success) {
        await launchUrl(uri, mode: LaunchMode.inAppBrowserView);
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.error_outline, color: Colors.white, size: 18),
                const SizedBox(width: 8),
                Expanded(child: Text('Could not open report PDF: $e')),
              ],
            ),
            backgroundColor: kDanger,
          ),
        );
      }
    }
  }
}

// ─── Filter Tab Pill ──────────────────────────────────────────────────────────

class _TabPill extends StatelessWidget {
  final IconData icon;
  final String label;
  final int count;
  final bool selected;
  final Color? accentColor;
  final VoidCallback onTap;

  const _TabPill({
    required this.icon,
    required this.label,
    required this.count,
    required this.selected,
    this.accentColor,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final activeColor = accentColor ?? kPrimary;

    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: selected ? activeColor : Colors.white,
          borderRadius: BorderRadius.circular(999),
          border: Border.all(
            color: selected ? activeColor : kBorder,
            width: selected ? 1.4 : 1.0,
          ),
          boxShadow: selected
              ? [
                  BoxShadow(
                    color: activeColor.withOpacity(0.28),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  )
                ]
              : null,
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 14,
              color: selected ? Colors.white : kTextMuted,
            ),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                color: selected ? Colors.white : kText,
                fontSize: 12.5,
                fontWeight: selected ? FontWeight.w800 : FontWeight.w600,
              ),
            ),
            if (count > 0) ...[
              const SizedBox(width: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: selected ? Colors.white.withOpacity(0.25) : activeColor.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  '$count',
                  style: TextStyle(
                    color: selected ? Colors.white : activeColor,
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

// ─── 1. Active Booking Card (Specimen, Queue & Payment Focus) ─────────────────

class _ActiveBookingCard extends StatelessWidget {
  final LabBooking booking;
  final List<LabBooking> relatedBookings;
  final VoidCallback onCancel;
  final VoidCallback onRefresh;

  const _ActiveBookingCard({
    required this.booking,
    this.relatedBookings = const [],
    required this.onCancel,
    required this.onRefresh,
  });

  List<LabBooking> get _allBookings => [booking, ...relatedBookings];
  bool get _isMultiTest => relatedBookings.isNotEmpty;

  bool get _cancellable => [
    'PendingPrescriptionUpload',
    'PendingAIVerification',
    'PendingLabApproval',
    'Confirmed',
  ].contains(booking.status);

  String get _stageProgressText {
    switch (booking.status) {
      case 'PendingPrescriptionUpload':
        return 'Awaiting Doctor Prescription';
      case 'PendingAIVerification':
        return 'AI Gemini Vision Scanning Rx';
      case 'PendingLabApproval':
        return 'Lab Pathologist Reviewing Slot';
      case 'Confirmed':
        return 'Slot Confirmed • Ready for Payment & Sample';
      case 'SampleCollected':
        return 'Specimen Collected • Sent to Analyzers';
      case 'TestingInProgress':
        return 'Active Clinical Diagnostics & Assay';
      case 'ResultVerification':
        return 'Diagnostic Assays Completed • Verifying Results';
      case 'ResultsReady':
      case 'ReportDelivered':
      case 'Completed':
        return 'Results Ready & Completed • Report Available';
      default:
        return 'In Progress';
    }
  }

  @override
  Widget build(BuildContext context) {
    final allBookings = _allBookings;
    final isMulti = _isMultiTest;
    final totalPrice = allBookings.fold(
        0.0, (sum, b) => sum + (b.labTest?.price ?? (b.amountPaid > 0 ? b.amountPaid : 0.0)));
    final totalPaid = allBookings.fold(
        0.0, (sum, b) => sum + (b.amountPaid > 0 ? b.amountPaid : (b.labTest?.price ?? 0.0)));
    final isPaid = allBookings.every((b) => b.paymentStatus == 'PaidOnline' || b.paymentStatus == 'PaidAtCounter');
    final isCounterSelected = allBookings.any((b) => b.paymentMethod == 'CashOnArrival') && !isPaid;
    final isConfirmed = allBookings.any((b) => b.status == 'Confirmed') || booking.status == 'Confirmed';
    final showPaymentSection = isPaid || isConfirmed || allBookings.any((b) => b.status == 'SampleCollected' || b.status == 'TestingInProgress');
    final hasRestricted = allBookings.any((b) =>
        b.labTest?.isRestricted == true ||
        (b.prescriptionImageUrl != null && b.prescriptionImageUrl!.isNotEmpty));
    final isRestrictedPending = allBookings.any((b) =>
        b.status == 'PendingPrescriptionUpload' ||
        b.status == 'PendingAIVerification' ||
        b.status == 'PendingLabApproval');

    return FadeSlideAnimation(
      child: AppCard(
        border: Border.all(color: kPrimary.withOpacity(0.4), width: 1.2),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header: Live Indicator & Category
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: const Color(0xFFEFF6FF),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: const Color(0xFFBFDBFE)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const PulsingLiveDot(color: Color(0xFF2563EB)),
                      const SizedBox(width: 6),
                      Text(
                        isMulti
                            ? 'Multi-Test Appointment (${allBookings.length} Tests)'
                            : (booking.labTest?.category ?? 'Laboratory'),
                        style: const TextStyle(
                          color: Color(0xFF1E40AF),
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ],
                  ),
                ),
                const Spacer(),
                StatusBadge(status: booking.status),
              ],
            ),

            const SizedBox(height: 10),

            // Test Name & Price / Multi-Test Breakdown
            if (isMulti) ...[
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: kBorder.withOpacity(0.6)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Row(
                          children: [
                            Icon(Icons.biotech, size: 15, color: kPrimary),
                            SizedBox(width: 6),
                            Text(
                              'Diagnostic Tests in Appointment',
                              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: kPrimaryDark),
                            ),
                          ],
                        ),
                        Text(
                          'Total: LKR ${totalPrice.toStringAsFixed(2)}',
                          style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w900, color: kPrimaryDark),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    ...allBookings.map((b) => Padding(
                      padding: const EdgeInsets.symmetric(vertical: 3.5),
                      child: Row(
                        children: [
                          Container(
                            width: 6,
                            height: 6,
                            decoration: const BoxDecoration(color: kPrimary, shape: BoxShape.circle),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  b.labTest?.name ?? 'Clinical Diagnostic Test',
                                  style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: kText),
                                ),
                                if (b.labTest?.category != null)
                                  Text(
                                    b.labTest!.category,
                                    style: const TextStyle(color: kTextMuted, fontSize: 10.5),
                                  ),
                              ],
                            ),
                          ),
                          Text(
                            'LKR ${(b.labTest?.price ?? 0).toStringAsFixed(2)}',
                            style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12, color: Color(0xFF0F172A)),
                          ),
                        ],
                      ),
                    )),
                  ],
                ),
              ),
            ] else ...[
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Text(
                      booking.labTest?.name ?? 'Clinical Diagnostic Test',
                      style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16, color: kText),
                    ),
                  ),
                  if (totalPrice > 0)
                    Text(
                      'LKR ${totalPrice.toStringAsFixed(2)}',
                      style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 15, color: kPrimaryDark),
                    ),
                ],
              ),
            ],

            const SizedBox(height: 10),

            // Live Stage Banner
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: const Color(0xFFF0FDF4),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: const Color(0xFFBBF7D0)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.linear_scale, color: kPrimary, size: 16),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      _stageProgressText,
                      style: const TextStyle(
                        color: kPrimaryDark,
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 10),

            // Schedule metadata
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: kBorder.withOpacity(0.5)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.calendar_month_outlined, color: kPrimary, size: 16),
                  const SizedBox(width: 6),
                  Flexible(
                    child: Text(
                      booking.bookingDate,
                      style: const TextStyle(color: kText, fontWeight: FontWeight.w700, fontSize: 12.5),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  const SizedBox(width: 14),
                  const Icon(Icons.access_time_rounded, color: kPrimary, size: 16),
                  const SizedBox(width: 6),
                  Flexible(
                    child: Text(
                      booking.timeSlot,
                      style: const TextStyle(color: kText, fontWeight: FontWeight.w700, fontSize: 12.5),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
            ),

            // AI Queue Token Banner
            if (booking.queueToken != null && booking.queueToken!.isNotEmpty) ...[
              const SizedBox(height: 10),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [kPrimary.withValues(alpha: 0.12), const Color(0xFFE0F2FE)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: kPrimary.withValues(alpha: 0.3)),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(6),
                            decoration: BoxDecoration(color: kPrimary, borderRadius: BorderRadius.circular(8)),
                            child: const Icon(Icons.confirmation_number_outlined, color: Colors.white, size: 16),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'AI Token: ${booking.queueToken}',
                                  style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13, color: kPrimaryDark),
                                  overflow: TextOverflow.ellipsis,
                                ),
                                Text(
                                  'Station / Chair #${booking.assignedChairNo} • Est. Wait: ${booking.estimatedWaitMinutes}m',
                                  style: const TextStyle(color: kTextMuted, fontSize: 11, fontWeight: FontWeight.w600),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(color: kPrimaryDark, borderRadius: BorderRadius.circular(6)),
                      child: Text(
                        booking.priorityTier ?? 'ROUTINE',
                        style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w800),
                      ),
                    ),
                  ],
                ),
              ),
            ],

            // Payment Locked Banner if restricted and pending verification
            if (!showPaymentSection && isRestrictedPending) ...[
              const SizedBox(height: 12),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFFFFBEB),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: const Color(0xFFFDE68A)),
                ),
                child: const Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(Icons.lock_clock, color: Color(0xFFD97706), size: 18),
                    SizedBox(width: 8),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Payment Locked • Clinical Verification In Progress',
                            style: TextStyle(
                              color: Color(0xFF92400E),
                              fontSize: 12,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                          SizedBox(height: 2),
                          Text(
                            'Payment options will unlock once certified laboratory staff clinically verify and approve your prescription.',
                            style: TextStyle(
                              color: Color(0xFFB45309),
                              fontSize: 11.5,
                              height: 1.35,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ],

            // Centralized Payment Banner (Paid vs Unpaid / Intent)
            if (showPaymentSection) ...[
              const SizedBox(height: 12),
              if (isPaid)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  decoration: BoxDecoration(
                    color: const Color(0xFFECFDF5),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: const Color(0xFFA7F3D0)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.verified, color: Color(0xFF059669), size: 20),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Payment Settled: LKR ${totalPaid.toStringAsFixed(2)}',
                              style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 12.5, color: Color(0xFF065F46)),
                            ),
                            Text(
                              '${booking.paymentMethod ?? 'Card'} • Receipt #${booking.receiptNumber ?? 'MEDIX-RCP'}',
                              style: const TextStyle(fontSize: 11, color: Color(0xFF047857), fontWeight: FontWeight.w600),
                            ),
                          ],
                        ),
                      ),
                      TextButton.icon(
                        onPressed: () => _showReceiptModal(context, allBookings),
                        icon: const Icon(Icons.receipt_long, size: 14, color: Color(0xFF059669)),
                        label: const Text('Receipt', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Color(0xFF059669))),
                        style: TextButton.styleFrom(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          minimumSize: Size.zero,
                          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        ),
                      ),
                    ],
                  ),
                )
              else
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: isCounterSelected ? const Color(0xFFFFFBEB) : const Color(0xFFEFF6FF),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: isCounterSelected ? const Color(0xFFFDE68A) : const Color(0xFFBFDBFE)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Row(
                            children: [
                              Icon(
                                isCounterSelected ? Icons.storefront_rounded : Icons.payment_rounded,
                                size: 16,
                                color: isCounterSelected ? const Color(0xFFB45309) : const Color(0xFF1D4ED8),
                              ),
                              const SizedBox(width: 6),
                              Text(
                                isCounterSelected
                                    ? 'Pay at Counter Selected'
                                    : (hasRestricted
                                        ? 'Prescription Approved • Action Required: Select Payment'
                                        : 'Payment Required (Approved)'),
                                style: TextStyle(
                                  color: isCounterSelected ? const Color(0xFF92400E) : const Color(0xFF1E40AF),
                                  fontSize: 12,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                            ],
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: isCounterSelected ? const Color(0xFFFEF3C7) : const Color(0xFFDBEAFE),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              'Due: LKR ${totalPrice.toStringAsFixed(2)}',
                              style: TextStyle(
                                color: isCounterSelected ? const Color(0xFF92400E) : const Color(0xFF1E40AF),
                                fontSize: 11,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Text(
                        isCounterSelected
                            ? 'You can pay LKR ${totalPrice.toStringAsFixed(2)} in Cash or Card POS at the laboratory counter during sample collection.'
                            : (hasRestricted
                                ? 'Prescription verified! Settle online now with a card or select pay at counter to confirm sample collection.'
                                : 'Staff has confirmed your appointment. Settle online now with a card or select pay at counter.'),
                        style: TextStyle(
                          color: isCounterSelected ? const Color(0xFF78350F) : const Color(0xFF1E3A8A),
                          fontSize: 11.5,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      const SizedBox(height: 10),
                      Row(
                        children: [
                          Expanded(
                            child: ElevatedButton.icon(
                              onPressed: () => _openOnlinePaymentSheet(context, booking, onRefresh),
                              icon: const Icon(Icons.credit_card, size: 14),
                              label: const Text('Pay Online Now'),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF2563EB),
                                foregroundColor: Colors.white,
                                padding: const EdgeInsets.symmetric(vertical: 9),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                textStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800),
                              ),
                            ),
                          ),
                          if (!isCounterSelected) ...[
                            const SizedBox(width: 8),
                            Expanded(
                              child: OutlinedButton.icon(
                                onPressed: () => _handlePayAtCounter(context, allBookings, onRefresh),
                                icon: const Icon(Icons.storefront, size: 14),
                                label: const Text('Pay at Counter'),
                                style: OutlinedButton.styleFrom(
                                  foregroundColor: const Color(0xFF1E40AF),
                                  side: const BorderSide(color: Color(0xFF93C5FD)),
                                  padding: const EdgeInsets.symmetric(vertical: 9),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                  textStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
                                ),
                              ),
                            ),
                          ],
                        ],
                      ),
                    ],
                  ),
                ),
            ],

            const SizedBox(height: 14),

            // Actions: Primary Live Specimen Tracker + Cancel
            Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => BookingTrackingScreen(
                            booking: booking,
                            relatedBookings: allBookings,
                          ),
                        ),
                      );
                    },
                    icon: const Icon(Icons.track_changes, size: 16),
                    label: Text(isMulti ? 'Track Appointment (${allBookings.length} Tests)' : 'Live Specimen Tracker'),
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      textStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800),
                    ),
                  ),
                ),
                if (_cancellable) ...[
                  const SizedBox(width: 10),
                  OutlinedButton(
                    onPressed: onCancel,
                    style: OutlinedButton.styleFrom(
                      foregroundColor: kDanger,
                      side: BorderSide(color: kDanger.withOpacity(0.5)),
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                    child: const Text('Cancel', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                  ),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }

  void _handlePayAtCounter(BuildContext context, List<LabBooking> bookingsToUpdate, VoidCallback onRefresh) async {
    try {
      for (var b in bookingsToUpdate) {
        await LabApiService.selectPayAtCounter(b.id);
      }
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Row(
              children: [
                Icon(Icons.storefront, color: Colors.white, size: 18),
                SizedBox(width: 8),
                Expanded(
                  child: Text('Payment mode updated to Pay at Counter. Settle in cash/POS when giving your specimen.'),
                ),
              ],
            ),
            backgroundColor: Color(0xFFB45309),
          ),
        );
        onRefresh();
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to update payment choice: $e'),
            backgroundColor: kDanger,
          ),
        );
      }
    }
  }

  void _openOnlinePaymentSheet(BuildContext context, LabBooking booking, VoidCallback onRefresh) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _OnlinePaymentBottomSheet(booking: booking, onSuccess: onRefresh),
    );
  }

  void _showReceiptModal(BuildContext context, dynamic bookingOrList) {
    final List<LabBooking> list = (bookingOrList is List<LabBooking>)
        ? bookingOrList
        : [bookingOrList as LabBooking];
    showDialog(
      context: context,
      builder: (ctx) => _PaymentReceiptDialog(bookings: list),
    );
  }
}

// ─── 2. Report Document Card (Official PDF & Pathologist Sign-Off) ────────────

class _ReportDocumentCard extends StatelessWidget {
  final LabBooking booking;
  final void Function(String url) onDownload;

  const _ReportDocumentCard({required this.booking, required this.onDownload});

  @override
  Widget build(BuildContext context) {
    final hasFile = booking.resultFileUrl != null && booking.resultFileUrl!.trim().isNotEmpty;

    return FadeSlideAnimation(
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: const Color(0xFFA7F3D0), width: 1.5),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFF10B981).withOpacity(0.12),
              blurRadius: 14,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Top Badge Header
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: const Color(0xFFD1FAE5),
                    borderRadius: BorderRadius.circular(999),
                    border: Border.all(color: const Color(0xFF6EE7B7)),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.verified, color: Color(0xFF047857), size: 14),
                      SizedBox(width: 5),
                      Text(
                        'Verified Clinical Report',
                        style: TextStyle(
                          color: Color(0xFF065F46),
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ],
                  ),
                ),
                Text(
                  booking.bookingDate,
                  style: const TextStyle(fontSize: 12, color: kTextMuted, fontWeight: FontWeight.w600),
                ),
              ],
            ),

            const SizedBox(height: 12),

            // Document Title & Category
            Row(
              children: [
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFF059669), Color(0xFF10B981)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(14),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFF10B981).withOpacity(0.3),
                        blurRadius: 8,
                        offset: const Offset(0, 3),
                      ),
                    ],
                  ),
                  child: const Icon(Icons.picture_as_pdf, color: Colors.white, size: 26),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        booking.labTest?.name ?? 'Laboratory Diagnostic Report',
                        style: const TextStyle(
                          fontWeight: FontWeight.w800,
                          fontSize: 15.5,
                          color: kText,
                          letterSpacing: -0.2,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Category: ${booking.labTest?.category ?? "Clinical Pathology"}',
                        style: const TextStyle(color: kTextMuted, fontSize: 11.5, fontWeight: FontWeight.w600),
                      ),
                    ],
                  ),
                ),
              ],
            ),

            const SizedBox(height: 12),

            // Pathologist Signature & Validation Notice
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: const Color(0xFFF0FDF4),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: const Color(0xFFD1FAE5)),
              ),
              child: const Row(
                children: [
                  Icon(Icons.shield_outlined, color: Color(0xFF059669), size: 16),
                  SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Signed & approved by Medical Pathologist • Hospital ID: #MED-LAB-2026',
                      style: TextStyle(
                        color: Color(0xFF065F46),
                        fontSize: 11.5,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 14),

            // Primary Download CTA & Share
            Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () {
                      if (hasFile) {
                        onDownload(booking.resultFileUrl!);
                      } else {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('Report file is currently being processed. Please refresh in a moment.'),
                            backgroundColor: kWarning,
                          ),
                        );
                      }
                    },
                    icon: const Icon(Icons.file_download_outlined, size: 18),
                    label: Text(hasFile ? 'Download Official PDF' : 'Processing PDF...'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF059669),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      textStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                IconButton.filledTonal(
                  onPressed: () {
                    if (hasFile) {
                      Clipboard.setData(ClipboardData(text: booking.resultFileUrl!));
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Report download link copied to clipboard!'),
                          backgroundColor: kPrimary,
                          duration: Duration(seconds: 2),
                        ),
                      );
                    } else {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Report link not ready yet.'), backgroundColor: kWarning),
                      );
                    }
                  },
                  style: IconButton.styleFrom(
                    backgroundColor: const Color(0xFFE6F4EA),
                    foregroundColor: const Color(0xFF059669),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  icon: const Icon(Icons.share_outlined, size: 18),
                  tooltip: 'Share Report',
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

// ─── 3. History Record Card (Archived & Rebooking Focus) ──────────────────────

class _HistoryRecordCard extends StatelessWidget {
  final LabBooking booking;
  final void Function(String url)? onDownload;

  const _HistoryRecordCard({required this.booking, this.onDownload});

  @override
  Widget build(BuildContext context) {
    final isCompleted = booking.status == 'Completed';
    final isCancelled = booking.status == 'Cancelled';
    final isRejected = booking.status == 'Rejected';
    final hasRejectionNotes = booking.technicianNotes != null && booking.technicianNotes!.trim().isNotEmpty;
    final isPaid = booking.paymentStatus == 'PaidOnline' || booking.paymentStatus == 'PaidAtCounter' || booking.amountPaid > 0;

    Color badgeColor = kTextMuted;
    String badgeLabel = booking.status;
    IconData badgeIcon = Icons.info_outline;

    if (isCompleted) {
      badgeColor = const Color(0xFF059669);
      badgeLabel = 'Completed';
      badgeIcon = Icons.check_circle_outline;
    } else if (isCancelled) {
      badgeColor = kDanger;
      badgeLabel = hasRejectionNotes ? 'Cancelled (Prescription Rejected)' : 'Cancelled by Patient';
      badgeIcon = Icons.cancel_outlined;
    } else if (isRejected) {
      badgeColor = const Color(0xFFD97706);
      badgeLabel = 'Rejected by Lab';
      badgeIcon = Icons.warning_amber_outlined;
    }

    return FadeSlideAnimation(
      child: AppCard(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Status & Date Row
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                  decoration: BoxDecoration(
                    color: badgeColor.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: badgeColor.withValues(alpha: 0.3)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(badgeIcon, size: 13, color: badgeColor),
                      const SizedBox(width: 5),
                      Text(
                        badgeLabel,
                        style: TextStyle(color: badgeColor, fontSize: 11, fontWeight: FontWeight.w800),
                      ),
                    ],
                  ),
                ),
                Text(
                  booking.bookingDate,
                  style: const TextStyle(fontSize: 12, color: kTextMuted, fontWeight: FontWeight.w600),
                ),
              ],
            ),

            const SizedBox(height: 12),

            // Test Title & Category
            Text(
              booking.labTest?.name ?? 'Past Diagnostic Test',
              style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15.5, color: kText),
            ),
            const SizedBox(height: 2),
            Text(
              '${booking.labTest?.category ?? "General"} • Slot: ${booking.timeSlot}',
              style: const TextStyle(color: kTextMuted, fontSize: 12, fontWeight: FontWeight.w600),
            ),

            // Clinical Rejection Reason Banner
            if (hasRejectionNotes) ...[
              const SizedBox(height: 10),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: const Color(0xFFFEF2F2),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: const Color(0xFFFECACA)),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(Icons.cancel, color: kDanger, size: 16),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Clinical Rejection Reason:',
                            style: TextStyle(fontWeight: FontWeight.w700, fontSize: 11.5, color: Color(0xFF991B1B)),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            booking.technicianNotes!,
                            style: const TextStyle(fontSize: 11.5, color: Color(0xFFB91C1C), height: 1.3),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ],

            const SizedBox(height: 12),

            // Price & Reference ID Info Strip / View Receipt
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: kBorder.withValues(alpha: 0.6)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.receipt_outlined, size: 15, color: kTextMuted),
                      const SizedBox(width: 6),
                      Text(
                        'Ref #${booking.id.substring(0, booking.id.length > 8 ? 8 : booking.id.length)}',
                        style: const TextStyle(fontSize: 11.5, color: kTextMuted, fontWeight: FontWeight.w700),
                      ),
                    ],
                  ),
                  if (isPaid)
                    InkWell(
                      onTap: () {
                        showDialog(
                          context: context,
                          builder: (ctx) => _PaymentReceiptDialog(booking: booking),
                        );
                      },
                      borderRadius: BorderRadius.circular(8),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFFECFDF5),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: const Color(0xFFA7F3D0)),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              'LKR ${booking.labTest?.price.toStringAsFixed(0) ?? "0"}',
                              style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800, color: Color(0xFF065F46)),
                            ),
                            const SizedBox(width: 6),
                            const Icon(Icons.receipt_long, size: 13, color: Color(0xFF059669)),
                            const SizedBox(width: 3),
                            const Text(
                              'View Receipt',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w800,
                                color: Color(0xFF059669),
                              ),
                            ),
                          ],
                        ),
                      ),
                    )
                  else
                    Text(
                      'LKR ${booking.labTest?.price.toStringAsFixed(0) ?? "0"}',
                      style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: kTextMuted),
                    ),
                ],
              ),
            ),

            const SizedBox(height: 14),

            // Actions: Book Test Again + Test Info
            Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () {
                      if (booking.labTest != null) {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (context) => BookingScreen(tests: [booking.labTest!]),
                          ),
                        );
                      } else {
                        Navigator.pushNamed(context, '/catalogue');
                      }
                    },
                    icon: const Icon(Icons.replay, size: 15),
                    label: const Text('Book Test Again'),
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 11),
                      textStyle: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                OutlinedButton(
                  onPressed: () {
                    if (booking.labTest != null) {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => TestDetailScreen(test: booking.labTest!),
                        ),
                      );
                    } else {
                      Navigator.pushNamed(context, '/catalogue');
                    }
                  },
                  style: OutlinedButton.styleFrom(
                    side: BorderSide(color: kBorder),
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                  child: const Text('Test Info', style: TextStyle(color: kText, fontSize: 12.5, fontWeight: FontWeight.w700)),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

// ─── 4. Centralized Online Payment Sheet ─────────────────────────────────────

class _OnlinePaymentBottomSheet extends StatefulWidget {
  final LabBooking booking;
  final VoidCallback onSuccess;

  const _OnlinePaymentBottomSheet({
    required this.booking,
    required this.onSuccess,
  });

  @override
  State<_OnlinePaymentBottomSheet> createState() => _OnlinePaymentBottomSheetState();
}

class _OnlinePaymentBottomSheetState extends State<_OnlinePaymentBottomSheet> {
  final _formKey = GlobalKey<FormState>();
  final _nameCtrl = TextEditingController();
  final _numberCtrl = TextEditingController();
  final _expiryCtrl = TextEditingController();
  final _cvvCtrl = TextEditingController();
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    _nameCtrl.text = widget.booking.patientName;
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _numberCtrl.dispose();
    _expiryCtrl.dispose();
    _cvvCtrl.dispose();
    super.dispose();
  }

  void _fillDemoCard() {
    setState(() {
      _nameCtrl.text = widget.booking.patientName.isNotEmpty ? widget.booking.patientName : 'Dinith Gamage';
      _numberCtrl.text = '4532 8812 9043 7721';
      _expiryCtrl.text = '12/28';
      _cvvCtrl.text = '888';
    });
  }

  Future<void> _processPayment() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _submitting = true);

    try {
      final price = widget.booking.labTest?.price ?? (widget.booking.amountPaid > 0 ? widget.booking.amountPaid : 0.0);
      final res = await LabApiService.payBookingOnline(
        bookingId: widget.booking.id,
        amount: price,
        cardHolderName: _nameCtrl.text.trim(),
        cardNumber: _numberCtrl.text.trim(),
        expiryDate: _expiryCtrl.text.trim(),
        cvv: _cvvCtrl.text.trim(),
        patientEmail: widget.booking.patientEmail,
      );

      if (mounted) {
        Navigator.pop(context); // Close bottom sheet
        widget.onSuccess();     // Refresh list
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.check_circle, color: Colors.white, size: 20),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'Payment Successful! Receipt #${res['receiptNumber'] ?? 'RCP'}. Payment marked as settled.',
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                ),
              ],
            ),
            backgroundColor: const Color(0xFF059669),
            duration: const Duration(seconds: 4),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _submitting = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.error_outline, color: Colors.white, size: 20),
                const SizedBox(width: 8),
                Expanded(child: Text('Payment Failed: $e')),
              ],
            ),
            backgroundColor: kDanger,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final price = widget.booking.labTest?.price ?? (widget.booking.amountPaid > 0 ? widget.booking.amountPaid : 0.0);

    return Padding(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      child: Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
        child: SingleChildScrollView(
          child: Form(
            key: _formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Top Handle
                Center(
                  child: Container(
                    width: 44,
                    height: 5,
                    decoration: BoxDecoration(
                      color: Colors.grey[300],
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                ),
                const SizedBox(height: 14),

                // Header
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: const Color(0xFFEFF6FF),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(Icons.lock_rounded, color: Color(0xFF2563EB), size: 20),
                    ),
                    const SizedBox(width: 10),
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Centralized Checkout',
                            style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16, color: kText),
                          ),
                          Text(
                            'Medix Payment Gateway • 256-bit Encrypted',
                            style: TextStyle(fontSize: 11, color: kTextMuted, fontWeight: FontWeight.w600),
                          ),
                        ],
                      ),
                    ),
                    TextButton(
                      onPressed: _fillDemoCard,
                      style: TextButton.styleFrom(
                        foregroundColor: const Color(0xFF2563EB),
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        minimumSize: Size.zero,
                        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      ),
                      child: const Text('Fill Demo Card', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w800)),
                    ),
                  ],
                ),

                const SizedBox(height: 14),

                // Due Amount Card
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFF1E3A8A), Color(0xFF2563EB)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            widget.booking.labTest?.name ?? 'Diagnostic Test',
                            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 13),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'Slot: ${widget.booking.bookingDate} at ${widget.booking.timeSlot}',
                            style: TextStyle(color: Colors.white.withOpacity(0.85), fontSize: 11),
                          ),
                        ],
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          const Text('Total Due', style: TextStyle(color: Colors.white70, fontSize: 10, fontWeight: FontWeight.w700)),
                          Text(
                            'LKR ${price.toStringAsFixed(2)}',
                            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 16),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 16),

                // Cardholder Name
                const Text('Cardholder Name', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: kText)),
                const SizedBox(height: 6),
                TextFormField(
                  controller: _nameCtrl,
                  decoration: InputDecoration(
                    hintText: 'John Doe',
                    prefixIcon: const Icon(Icons.person_outline, size: 18),
                    filled: true,
                    fillColor: const Color(0xFFF8FAFC),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: kBorder)),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                  ),
                  validator: (v) => (v == null || v.trim().isEmpty) ? 'Please enter cardholder name' : null,
                ),

                const SizedBox(height: 12),

                // Card Number
                const Text('Card Number', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: kText)),
                const SizedBox(height: 6),
                TextFormField(
                  controller: _numberCtrl,
                  keyboardType: TextInputType.number,
                  decoration: InputDecoration(
                    hintText: '4532 •••• •••• 8899',
                    prefixIcon: const Icon(Icons.credit_card, size: 18),
                    filled: true,
                    fillColor: const Color(0xFFF8FAFC),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: kBorder)),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                  ),
                  validator: (v) => (v == null || v.trim().length < 12) ? 'Please enter a valid card number' : null,
                ),

                const SizedBox(height: 12),

                // Row: Expiry + CVV
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Expiry (MM/YY)', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: kText)),
                          const SizedBox(height: 6),
                          TextFormField(
                            controller: _expiryCtrl,
                            keyboardType: TextInputType.datetime,
                            decoration: InputDecoration(
                              hintText: '12/28',
                              prefixIcon: const Icon(Icons.date_range, size: 18),
                              filled: true,
                              fillColor: const Color(0xFFF8FAFC),
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: kBorder)),
                              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                            ),
                            validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('CVV', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: kText)),
                          const SizedBox(height: 6),
                          TextFormField(
                            controller: _cvvCtrl,
                            obscureText: true,
                            keyboardType: TextInputType.number,
                            decoration: InputDecoration(
                              hintText: '•••',
                              prefixIcon: const Icon(Icons.security, size: 18),
                              filled: true,
                              fillColor: const Color(0xFFF8FAFC),
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: kBorder)),
                              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                            ),
                            validator: (v) => (v == null || v.trim().length < 3) ? '3 digits' : null,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 18),

                // Submit Button
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: _submitting ? null : _processPayment,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF2563EB),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: _submitting
                        ? const Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              SizedBox(width: 18, height: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2)),
                              SizedBox(width: 10),
                              Text('Processing Payment...', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800)),
                            ],
                          )
                        : Text(
                            'Pay LKR ${price.toStringAsFixed(2)} Now',
                            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 14),
                          ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// ─── 5. Payment Receipt Dialog ────────────────────────────────────────────────

class _PaymentReceiptDialog extends StatelessWidget {
  final List<LabBooking> bookings;

  _PaymentReceiptDialog({List<LabBooking>? bookings, LabBooking? booking})
      : bookings = bookings ?? (booking != null ? [booking] : []);

  @override
  Widget build(BuildContext context) {
    final primary = bookings.isNotEmpty ? bookings.first : null;
    if (primary == null) return const SizedBox();

    final totalPrice = bookings.fold(
        0.0, (sum, b) => sum + (b.labTest?.price ?? (b.amountPaid > 0 ? b.amountPaid : 0.0)));
    final totalPaid = bookings.fold(
        0.0, (sum, b) => sum + (b.amountPaid > 0 ? b.amountPaid : (b.labTest?.price ?? 0.0)));
    final allPaid = bookings.every((b) => b.paymentStatus == 'PaidOnline' || b.paymentStatus == 'PaidAtCounter');
    final isMulti = bookings.length > 1;

    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      child: Container(
        padding: const EdgeInsets.all(22),
        constraints: const BoxConstraints(maxWidth: 440),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Green Stamp Header
            Container(
              padding: const EdgeInsets.all(12),
              decoration: const BoxDecoration(
                color: Color(0xFFECFDF5),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.verified_user_rounded, color: Color(0xFF059669), size: 36),
            ),
            const SizedBox(height: 12),
            const Text(
              'PAYMENT RECEIPT',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900, letterSpacing: 1.2, color: kText),
            ),
            const Text(
              'Health Bridge Diagnostic Services',
              style: TextStyle(fontSize: 12, color: kTextMuted, fontWeight: FontWeight.w600),
            ),

            const SizedBox(height: 16),
            const Divider(height: 1),
            const SizedBox(height: 14),

            // Receipt Metadata Rows
            _receiptRow('Receipt #', (primary.receiptNumber != null && primary.receiptNumber!.isNotEmpty) 
                ? primary.receiptNumber! 
                : 'MEDIX-RCP-${primary.id.length > 6 ? primary.id.substring(0, 6).toUpperCase() : "ONLINE"}'),
            _receiptRow('Payment Status', allPaid ? 'Settled & Verified' : 'Pay on Arrival at Counter', isHighlight: allPaid),
            _receiptRow('Payment Method', primary.paymentMethod ?? (allPaid ? 'Online Card Gateway' : 'Pay at Counter (Cash/POS)')),
            _receiptRow('Patient Name', primary.patientName.isNotEmpty ? primary.patientName : (AuthState.name ?? 'Patient')),
            
            if (isMulti) ...[
              _receiptRow('Appointment Package', 'Multi-Test Bundle (${bookings.length} Tests)'),
              const SizedBox(height: 6),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: kBorder.withOpacity(0.5)),
                ),
                child: Column(
                  children: bookings.map((b) => Padding(
                    padding: const EdgeInsets.symmetric(vertical: 3),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Text(
                            b.labTest?.name ?? 'Test',
                            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: kText),
                          ),
                        ),
                        Text(
                          'LKR ${(b.labTest?.price ?? 0).toStringAsFixed(2)}',
                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: kPrimaryDark),
                        ),
                      ],
                    ),
                  )).toList(),
                ),
              ),
              const SizedBox(height: 6),
            ] else ...[
              _receiptRow('Diagnostic Test', primary.labTest?.name ?? 'Clinical Test'),
            ],

            _receiptRow('Appointment', '${primary.bookingDate} at ${primary.timeSlot}'),
            if (primary.paidAt != null && primary.paidAt!.isNotEmpty)
              _receiptRow('Paid On', primary.paidAt!.length > 10 ? primary.paidAt!.substring(0, 10) : primary.paidAt!),

            const SizedBox(height: 10),
            const Divider(height: 1),
            const SizedBox(height: 12),

            // Total Settled / Due
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(allPaid ? 'Amount Settled' : 'Total Due at Counter', 
                     style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13, color: kText)),
                Text(
                  'LKR ${(allPaid ? totalPaid : totalPrice).toStringAsFixed(2)}',
                  style: TextStyle(
                    fontWeight: FontWeight.w900, 
                    fontSize: 16, 
                    color: allPaid ? const Color(0xFF059669) : const Color(0xFFD97706),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 20),

            // Close Button
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () => Navigator.pop(context),
                style: ElevatedButton.styleFrom(
                  backgroundColor: kPrimary,
                  padding: const EdgeInsets.symmetric(vertical: 11),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                child: const Text('Close Receipt', style: TextStyle(fontWeight: FontWeight.w800, color: Colors.white)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _receiptRow(String label, String value, {bool isHighlight = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4.5),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(fontSize: 12, color: kTextMuted, fontWeight: FontWeight.w600)),
          const SizedBox(width: 8),
          Flexible(
            child: Text(
              value,
              textAlign: TextAlign.end,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: isHighlight ? const Color(0xFF059669) : kText,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

