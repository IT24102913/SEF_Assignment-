import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../services/lab_api_service.dart';
import 'package:lab_patient_app/utils/config.dart';
import '../../utils/theme.dart';

class BookingTrackingScreen extends StatefulWidget {
  final LabBooking booking;
  final List<LabBooking>? relatedBookings;

  const BookingTrackingScreen({
    super.key, 
    required this.booking,
    this.relatedBookings,
  });

  @override
  State<BookingTrackingScreen> createState() => _BookingTrackingScreenState();
}

class _BookingTrackingScreenState extends State<BookingTrackingScreen> {
  late bool _isSavedToEmr;
  bool _isSavingEmr = false;

  @override
  void initState() {
    super.initState();
    _isSavedToEmr = widget.booking.isSavedToEmr;
  }

  List<LabBooking> get _allBookings => (widget.relatedBookings != null && widget.relatedBookings!.isNotEmpty)
      ? widget.relatedBookings!
      : [widget.booking];

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
    final booking = widget.booking;
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
          'title': 'Results in Review',
          'subtitle': 'Specimen analyzed • Undergoing final pathologist authorization',
          'icon': Icons.flaky_outlined,
          'rank': 7
        },
        {
          'title': 'Report Delivered',
          'subtitle': 'Official diagnostic report signed & delivered to patient',
          'icon': Icons.mark_email_read_outlined,
          'rank': 8
        },
        {
          'title': 'Order Completed',
          'subtitle': 'Diagnostic order completed and archived in medical record',
          'icon': Icons.task_alt,
          'rank': 9
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
          'title': 'Results in Review',
          'subtitle': 'Specimen analyzed • Undergoing clinical authorization',
          'icon': Icons.flaky_outlined,
          'rank': 7
        },
        {
          'title': 'Report Delivered',
          'subtitle': 'Official diagnostic report signed & delivered to patient',
          'icon': Icons.mark_email_read_outlined,
          'rank': 8
        },
        {
          'title': 'Order Completed',
          'subtitle': 'Diagnostic order completed and archived in medical record',
          'icon': Icons.task_alt,
          'rank': 9
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
                          status: booking.status,
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

            // Diagnostic PDF Report Download & 30-Day Retention Notice Banner
            if ((booking.status == 'ReportDelivered' || booking.status == 'Completed') &&
                booking.resultFileUrl != null && booking.resultFileUrl!.isNotEmpty) ...[
              // 30-Day Retention Policy Card
              Container(
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: _isSavedToEmr ? const Color(0xFFECFDF5) : const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: _isSavedToEmr ? const Color(0xFFA7F3D0) : const Color(0xFFE2E8F0),
                  ),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(
                      _isSavedToEmr ? Icons.bookmark_added : Icons.info_outline,
                      color: _isSavedToEmr ? const Color(0xFF059669) : const Color(0xFF0284C7),
                      size: 18,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            _isSavedToEmr ? 'Archived in EMR Profile' : '30-Day Lab Report Retention Policy',
                            style: TextStyle(
                              fontWeight: FontWeight.w800,
                              fontSize: 12,
                              color: _isSavedToEmr ? const Color(0xFF065F46) : const Color(0xFF0F172A)),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            _isSavedToEmr
                                ? 'This report is permanently preserved in your EMR medical records and will not be purged.'
                                : 'Direct report download is available for 30 days after issue (${booking.retentionDaysRemaining ?? 30} days left). Temporary files are removed after 30 days. Save to EMR to keep permanently.',
                            style: TextStyle(
                              fontSize: 11.5,
                              color: _isSavedToEmr ? const Color(0xFF047857) : const Color(0xFF475569)),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              // Download Report Action
              GestureDetector(
                onTap: () => _downloadReport(context, booking.resultFileUrl!),
                child: Container(
                  margin: const EdgeInsets.only(bottom: 10),
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
                      const Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Official Test Report PDF',
                              style: TextStyle(color: Color(0xFF065F46), fontWeight: FontWeight.w800, fontSize: 14),
                            ),
                            SizedBox(height: 2),
                            Text(
                              'Tap to view and download full verified report',
                              style: TextStyle(color: Color(0xFF047857), fontSize: 12, fontWeight: FontWeight.w600),
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
                            Icon(Icons.download, color: Colors.white, size: 16),
                            SizedBox(width: 4),
                            Text(
                              'Download',
                              style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 12.5),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              // Save to EMR button
              Container(
                margin: const EdgeInsets.only(bottom: 20),
                width: double.infinity,
                child: _isSavedToEmr
                    ? Container(
                        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 14),
                        decoration: BoxDecoration(
                          color: const Color(0xFFECFDF5),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFFA7F3D0)),
                        ),
                        child: const Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.bookmark_added, color: Color(0xFF047857), size: 16),
                            SizedBox(width: 6),
                            Text(
                              'Saved to EMR Health Profile (Permanent Record)',
                              style: TextStyle(color: Color(0xFF047857), fontWeight: FontWeight.w700, fontSize: 12.5),
                            ),
                          ],
                        ),
                      )
                    : OutlinedButton.icon(
                        onPressed: _isSavingEmr ? null : () async {
                          setState(() => _isSavingEmr = true);
                          try {
                            await LabApiService.saveBookingToEmr(widget.booking.id);
                            if (context.mounted) {
                              setState(() {
                                _isSavedToEmr = true;
                                _isSavingEmr = false;
                              });
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text('Lab report archived permanently to your EMR medical profile!'),
                                  backgroundColor: kSuccess,
                                ),
                              );
                            }
                          } catch (e) {
                            if (context.mounted) {
                              setState(() => _isSavingEmr = false);
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(content: Text('Failed to save to EMR: $e'), backgroundColor: kDanger),
                              );
                            }
                          }
                        },
                        icon: _isSavingEmr
                            ? const SizedBox(
                                width: 14,
                                height: 14,
                                child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF0284C7)),
                              )
                            : const Icon(Icons.bookmark_add_outlined, size: 16, color: Color(0xFF0284C7)),
                        label: Text(_isSavingEmr ? 'Archiving to EMR...' : 'Save Report to EMR Profile'),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: const Color(0xFF0284C7),
                          side: const BorderSide(color: Color(0xFF7DD3FC), width: 1.5),
                          backgroundColor: const Color(0xFFF0F9FF),
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          textStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
                        ),
                      ),
              ),
            ] else if (booking.status == 'ResultsReady') ...[
              // Informational card when results uploaded by staff but not yet delivered
              Container(
                margin: const EdgeInsets.only(bottom: 20),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFFF0FDF4),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFFBBF7D0), width: 1.5),
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: const Color(0xFFDCFCE7),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(Icons.flaky_outlined, color: Color(0xFF16A34A), size: 24),
                    ),
                    const SizedBox(width: 14),
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Analysis Complete • In Clinical Review',
                            style: TextStyle(color: Color(0xFF166534), fontWeight: FontWeight.w800, fontSize: 13.5),
                          ),
                          SizedBox(height: 3),
                          Text(
                            'Diagnostic findings have been recorded. Report will be released to your app once authorized by lab staff.',
                            style: TextStyle(color: Color(0xFF15803D), fontSize: 12, height: 1.3),
                          ),
                        ],
                      ),
                    ),
                  ],
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
                  final isCompleted = !isFailed && (currentRank >= 9 ? currentRank >= stageRank : currentRank > stageRank);
                  final isActive = !isFailed && (currentRank < 9 && currentRank == stageRank);
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
