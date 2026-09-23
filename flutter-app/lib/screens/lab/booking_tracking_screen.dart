import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../services/lab_api_service.dart';
import 'package:lab_patient_app/utils/config.dart';
import '../../utils/theme.dart';

class BookingTrackingScreen extends StatelessWidget {
  final LabBooking booking;
  final List<LabBooking>? relatedBookings;

  const BookingTrackingScreen({
    super.key, 
    required this.booking,
    this.relatedBookings,
  });

  List<LabBooking> get _allBookings => (relatedBookings != null && relatedBookings!.isNotEmpty)
      ? relatedBookings!
      : [booking];

  bool get _isMultiTest => _allBookings.length > 1;

  double get _totalDue => _allBookings.fold(
      0.0, (sum, b) => sum + (b.labTest?.price ?? 0.0));

  double get _totalPaid => _allBookings.fold(
      0.0, (sum, b) => sum + (b.amountPaid > 0 ? b.amountPaid : (b.labTest?.price ?? 0.0)));

  bool get _allPaid => _allBookings.every(
      (b) => b.paymentStatus == 'PaidOnline' || b.paymentStatus == 'PaidAtCounter');

  int _getStatusRank(String status) {
    const ranks = {
      'PendingPrescriptionUpload': 0,
      'PendingAIVerification': 1,
      'PendingLabApproval': 2,
      'Confirmed': 3,
      'SampleCollected': 4,
      'TestingInProgress': 5,
      'ResultVerification': 6,
      'ResultsReady': 7,
      'ReportDelivered': 8,
      'Completed': 9,
      'Rejected': -1,
      'Cancelled': -1,
    };
    return ranks[status] ?? 0;
  }

  @override
  Widget build(BuildContext context) {
    final status = booking.status;
    final isRestricted = _allBookings.any((b) => b.labTest?.isRestricted == true);
    final currentRank = _getStatusRank(status);
    final isFailed = status == 'Rejected' || status == 'Cancelled';

    // Build timeline stages
    List<Map<String, dynamic>> stages = [];

    if (isRestricted) {
      stages = [
        {
          'title': 'Appointment & Rx Submitted',
          'subtitle': 'Doctor prescription uploaded for clinical review',
          'icon': Icons.description_outlined,
          'rank': 0
        },
        {
          'title': 'AI & Lab Verification',
          'subtitle': 'Gemini Vision AI & laboratory staff verification',
          'icon': Icons.verified_outlined,
          'rank': 1
        },
        {
          'title': 'Prescription Approved • Payment Selection',
          'subtitle': 'Prescription verified! Choose online card or counter payment',
          'icon': Icons.payment_outlined,
          'rank': 3
        },
        {
          'title': 'Specimen Collected',
          'subtitle': 'Sample received and barcode tagged',
          'icon': Icons.biotech_outlined,
          'rank': 4
        },
        {
          'title': 'Testing Active',
          'subtitle': 'Clinical diagnostics & analyzer processing',
          'icon': Icons.science_outlined,
          'rank': 5
        },
        {
          'title': 'Results Ready',
          'subtitle': 'Official diagnostic report signed & ready for download',
          'icon': Icons.task_alt,
          'rank': 7
        },
      ];
    } else {
      stages = [
        {
          'title': 'Appointment Requested',
          'subtitle': 'Booking submitted by patient',
          'icon': Icons.edit_calendar,
          'rank': 0
        },
        {
          'title': 'Appointment Confirmed',
          'subtitle': 'Slot confirmed at laboratory clinic',
          'icon': Icons.check_circle_outline,
          'rank': 3
        },
        {
          'title': 'Specimen Collected',
          'subtitle': 'Sample received and barcode tagged',
          'icon': Icons.biotech_outlined,
          'rank': 4
        },
        {
          'title': 'Diagnostic Testing Active',
          'subtitle': 'Clinical analysis and analyzer processing',
          'icon': Icons.science_outlined,
          'rank': 5
        },
        {
          'title': 'Results Ready & Completed',
          'subtitle': 'Official diagnostic report signed & ready for download',
          'icon': Icons.task_alt,
          'rank': 7
        },
      ];
    }

    return Scaffold(
      appBar: AppBar(title: Text(_isMultiTest ? 'Multi-Test Appointment Tracker' : 'Specimen & Order Tracker')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Top Summary Card
            FadeSlideAnimation(
              child: AppCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: kPrimary.withOpacity(0.12),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            _isMultiTest 
                                ? 'Multi-Test Appointment (${_allBookings.length} Tests)'
                                : (booking.labTest?.category ?? 'Diagnostic Test'),
                            style: const TextStyle(color: kPrimary, fontWeight: FontWeight.w800, fontSize: 11),
                          ),
                        ),
                        StatusBadge(
                          status: (booking.resultFileUrl != null && booking.resultFileUrl!.trim().isNotEmpty && currentRank < 7)
                              ? 'ResultsReady'
                              : booking.status,
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    if (_isMultiTest) ...[
                      const Text(
                        'Scheduled Laboratory Diagnostic Tests',
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: kText),
                      ),
                      const SizedBox(height: 8),
                      ..._allBookings.map((b) => Container(
                        margin: const EdgeInsets.only(bottom: 6),
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: kBorder.withOpacity(0.5)),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.science_outlined, size: 16, color: kPrimary),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    b.labTest?.name ?? 'Lab Test',
                                    style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: kText),
                                  ),
                                  if (b.labTest?.category != null)
                                    Text(
                                      b.labTest!.category,
                                      style: const TextStyle(color: kTextMuted, fontSize: 11),
                                    ),
                                ],
                              ),
                            ),
                            Text(
                              'LKR ${(b.labTest?.price ?? 0).toStringAsFixed(2)}',
                              style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 12.5, color: kPrimaryDark),
                            ),
                          ],
                        ),
                      )),
                    ] else ...[
                      Text(
                        booking.labTest?.name ?? 'Lab Test',
                        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: kText),
                      ),
                    ],
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        const Icon(Icons.schedule, size: 14, color: kTextMuted),
                        const SizedBox(width: 4),
                        Text(
                          '${booking.bookingDate} at ${booking.timeSlot}',
                          style: const TextStyle(fontSize: 13, color: kTextMuted, fontWeight: FontWeight.w600),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),

            // Payment Milestone Card
            FadeSlideAnimation(
              child: Container(
                margin: const EdgeInsets.only(top: 14),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: (booking.paymentStatus == 'PaidOnline' || booking.paymentStatus == 'PaidAtCounter')
                      ? const Color(0xFFECFDF5)
                      : const Color(0xFFEFF6FF),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                    color: (booking.paymentStatus == 'PaidOnline' || booking.paymentStatus == 'PaidAtCounter')
                        ? const Color(0xFFA7F3D0)
                        : const Color(0xFFBFDBFE),
                  ),
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: (booking.paymentStatus == 'PaidOnline' || booking.paymentStatus == 'PaidAtCounter')
                            ? const Color(0xFF059669)
                            : const Color(0xFF2563EB),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Icon(
                        (booking.paymentStatus == 'PaidOnline' || booking.paymentStatus == 'PaidAtCounter')
                            ? Icons.check_circle_outline
                            : Icons.payment_outlined,
                        color: Colors.white,
                        size: 20,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            _allPaid
                                ? 'Payment Settled (LKR ${_totalPaid.toStringAsFixed(2)})'
                                : 'Payment: LKR ${_totalDue.toStringAsFixed(2)} Due',
                            style: TextStyle(
                              fontWeight: FontWeight.w800,
                              fontSize: 13,
                              color: _allPaid
                                  ? const Color(0xFF065F46)
                                  : const Color(0xFF1E40AF),
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            _allPaid
                                ? 'Method: ${booking.paymentMethod ?? 'Card'} • Receipt: #${booking.receiptNumber ?? 'MEDIX-RCP'}'
                                : booking.paymentMethod == 'CashOnArrival'
                                    ? 'Selected: Pay at Lab Counter on Arrival (LKR ${_totalDue.toStringAsFixed(2)})'
                                    : 'Payable online via My Bookings or at counter on arrival',
                            style: TextStyle(
                              fontSize: 11,
                              color: _allPaid
                                  ? const Color(0xFF047857)
                                  : const Color(0xFF1E3A8A),
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 20),

            // Failure Banner if cancelled / rejected
            if (isFailed) ...[
              Container(
                padding: const EdgeInsets.all(16),
                margin: const EdgeInsets.only(bottom: 20),
                decoration: BoxDecoration(
                  color: kDanger.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: kDanger.withValues(alpha: 0.3)),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(Icons.cancel, color: kDanger, size: 24),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            (booking.technicianNotes != null && booking.technicianNotes!.isNotEmpty)
                                ? 'Cancelled (Prescription Rejected)'
                                : 'Order $status',
                            style: const TextStyle(color: kDanger, fontWeight: FontWeight.w800, fontSize: 14),
                          ),
                          const SizedBox(height: 4),
                          if (booking.technicianNotes != null && booking.technicianNotes!.isNotEmpty)
                            Text(
                              'Clinical Reason: ${booking.technicianNotes}',
                              style: const TextStyle(color: Color(0xFF7F1D1D), fontSize: 12.5, fontWeight: FontWeight.w600),
                            )
                          else
                            const Text(
                              'Please schedule a new appointment or contact support.',
                              style: TextStyle(color: kTextMuted, fontSize: 12),
                            ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ],

            // Diagnostic PDF Report Download Banner if results uploaded
            if ((booking.resultFileUrl != null && booking.resultFileUrl!.isNotEmpty) ||
                booking.status == 'ResultsReady' ||
                booking.status == 'ReportDelivered' ||
                booking.status == 'Completed') ...[
              GestureDetector(
                onTap: () {
                  if (booking.resultFileUrl != null && booking.resultFileUrl!.isNotEmpty) {
                    _downloadReport(context, booking.resultFileUrl!);
                  } else {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('Report file is being compiled by the lab. Please check back shortly.'),
                        backgroundColor: kWarning,
                      ),
                    );
                  }
                },
                child: Container(
                  margin: const EdgeInsets.only(bottom: 20),
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: const Color(0xFFECFDF5),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFFA7F3D0), width: 1.5),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFF10B981).withOpacity(0.15),
                        blurRadius: 10,
                        offset: const Offset(0, 3),
                      ),
                    ],
                  ),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: const Color(0xFFD1FAE5),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Icon(Icons.picture_as_pdf, color: Color(0xFF059669), size: 26),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Official Test Report PDF',
                              style: TextStyle(color: Color(0xFF065F46), fontWeight: FontWeight.w800, fontSize: 14),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              booking.resultFileUrl != null && booking.resultFileUrl!.isNotEmpty
                                  ? 'Tap to view and download full report'
                                  : 'Document verified & uploaded by pathologist',
                              style: const TextStyle(color: Color(0xFF047857), fontSize: 12, fontWeight: FontWeight.w600),
                            ),
                          ],
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        decoration: BoxDecoration(
                          color: const Color(0xFF059669),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Row(
                          children: [
                            Icon(Icons.download, color: Colors.white, size: 14),
                            SizedBox(width: 4),
                            Text('Download', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 12)),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],

            // Milestone Tracker Timeline
            const Text(
              'Diagnostic Milestones',
              style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16, color: kText),
            ),
            const SizedBox(height: 14),

            AppCard(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
              child: ListView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: stages.length,
                itemBuilder: (context, index) {
                  final stage = stages[index];
                  final stageRank = stage['rank'] as int;
                  final hasReport = (booking.resultFileUrl != null && booking.resultFileUrl!.trim().isNotEmpty);
                  final isReadyOrFinished = currentRank >= 7 || hasReport;
                  final isCompleted = !isFailed && (currentRank > stageRank || (stageRank == 7 && isReadyOrFinished));
                  final isActive = !isFailed && (currentRank == stageRank && !(stageRank == 7 && isReadyOrFinished));
                  final isLast = index == stages.length - 1;

                  return _TimelineNode(
                    title: stage['title'],
                    subtitle: stage['subtitle'],
                    icon: stage['icon'],
                    isCompleted: isCompleted,
                    isActive: isActive,
                    isLast: isLast,
                    isFailed: isFailed,
                  );
                },
              ),
            ),

            const SizedBox(height: 20),

            // Lab Assistance Support Box
            AppCard(
              color: const Color(0xFFF8FAFC),
              child: Row(
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: kPrimary.withOpacity(0.12),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(Icons.support_agent, color: kPrimary),
                  ),
                  const SizedBox(width: 14),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Need Assistance?', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13.5, color: kText)),
                        SizedBox(height: 2),
                        Text('Call Laboratory Helpline: +94 11 234 5678', style: TextStyle(fontSize: 12, color: kTextMuted)),
                      ],
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

  Future<void> _downloadReport(BuildContext context, String fileUrl) async {
    String fullPdfUrl = fileUrl.trim();

    // Handle relative paths e.g. /uploads/report.pdf
    if (!fullPdfUrl.startsWith('http://') && !fullPdfUrl.startsWith('https://')) {
      final baseUrl = ApiConfig.baseUrl;
      final hostUrl = baseUrl.substring(0, baseUrl.indexOf('/api'));
      fullPdfUrl = fullPdfUrl.startsWith('/') ? '$hostUrl$fullPdfUrl' : '$hostUrl/$fullPdfUrl';
    } else if (!kIsWeb && fullPdfUrl.contains('localhost:5126')) {
      // Mobile replacement of localhost with LAN IP
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

class _TimelineNode extends StatelessWidget {
  final String title;
  final String subtitle;
  final IconData icon;
  final bool isCompleted;
  final bool isActive;
  final bool isLast;
  final bool isFailed;

  const _TimelineNode({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.isCompleted,
    required this.isActive,
    required this.isLast,
    required this.isFailed,
  });

  @override
  Widget build(BuildContext context) {
    final nodeColor = isCompleted
        ? kSuccess
        : (isActive ? kPrimary : Colors.grey.shade300);

    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Icon and connecting line
          SizedBox(
            width: 38,
            child: Column(
              children: [
                Container(
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(
                    color: isCompleted
                        ? kSuccess
                        : (isActive ? kPrimary : Colors.grey.shade100),
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: nodeColor,
                      width: isActive ? 2.5 : 1.5,
                    ),
                    boxShadow: isActive
                        ? [
                            BoxShadow(
                              color: kPrimary.withOpacity(0.4),
                              blurRadius: 8,
                              spreadRadius: 2,
                            )
                          ]
                        : null,
                  ),
                  child: Center(
                    child: Icon(
                      isCompleted ? Icons.check : icon,
                      size: 16,
                      color: isCompleted || isActive ? Colors.white : Colors.grey.shade400,
                    ),
                  ),
                ),
                if (!isLast)
                  Expanded(
                    child: Container(
                      width: 2.5,
                      margin: const EdgeInsets.symmetric(vertical: 4),
                      color: isCompleted ? kSuccess : Colors.grey.shade200,
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(width: 14),

          // Content Text
          Expanded(
            child: Padding(
              padding: EdgeInsets.only(bottom: isLast ? 0 : 24.0, top: 4),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: isActive || isCompleted ? FontWeight.w800 : FontWeight.w600,
                      color: isActive ? kPrimaryDark : (isCompleted ? kText : Colors.grey.shade600),
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: TextStyle(
                      fontSize: 12,
                      color: isActive ? kTextMuted : Colors.grey.shade500,
                      height: 1.3,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
