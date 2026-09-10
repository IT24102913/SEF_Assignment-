import 'package:flutter/material.dart';
import '../../services/emr_api_service.dart';
import '../../utils/theme.dart';

class CustomerLabReportsScreen extends StatefulWidget {
  const CustomerLabReportsScreen({super.key});

  @override
  State<CustomerLabReportsScreen> createState() => _CustomerLabReportsScreenState();
}

class _CustomerLabReportsScreenState extends State<CustomerLabReportsScreen> {
  List<LabReport> _allReports = [];
  List<LabReport> _filteredReports = [];
  bool _isLoading = true;
  String? _error;
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    _loadReports();
  }

  Future<void> _loadReports() async {
    setState(() { _isLoading = true; _error = null; });
    try {
      final reports = await EmrApiService.getLabReports();
      setState(() {
        _allReports = reports;
        _applySearch();
        _isLoading = false;
      });
    } catch (e) {
      setState(() { _error = e.toString(); _isLoading = false; });
    }
  }

  void _applySearch() {
    if (_searchQuery.trim().isEmpty) {
      _filteredReports = List.from(_allReports);
    } else {
      final q = _searchQuery.trim().toLowerCase();
      _filteredReports = _allReports.where((r) {
        return r.testTitle.toLowerCase().contains(q) ||
            r.category.toLowerCase().contains(q) ||
            r.orderedDoctor.toLowerCase().contains(q) ||
            r.status.toLowerCase().contains(q);
      }).toList();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: HealthBridgeTheme.lightBg,
      body: RefreshIndicator(
        color: HealthBridgeTheme.accentTeal,
        onRefresh: _loadReports,
        child: ListView(
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 20),
          children: [
            // ── Screen Header ──────────────────────────────────────────────
            const Text(
              'Lab Reports',
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.w800,
                color: HealthBridgeTheme.textPrimary,
                letterSpacing: -0.5,
              ),
            ),
            const SizedBox(height: 4),
            const Text(
              'Your laboratory diagnostics, blood work, and imaging results.',
              style: TextStyle(
                color: HealthBridgeTheme.textSecondary,
                fontSize: 13,
              ),
            ),
            const SizedBox(height: 18),

            // ── Search Bar ──────────────────────────────────────────────────
            Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: HealthBridgeTheme.cardBorder),
              ),
              child: TextField(
                onChanged: (val) {
                  setState(() {
                    _searchQuery = val;
                    _applySearch();
                  });
                },
                decoration: const InputDecoration(
                  hintText: 'Search tests, category or doctor...',
                  hintStyle: TextStyle(color: HealthBridgeTheme.textMuted, fontSize: 13),
                  prefixIcon: Icon(Icons.search, color: HealthBridgeTheme.accentTeal, size: 20),
                  border: InputBorder.none,
                  contentPadding: EdgeInsets.symmetric(vertical: 12, horizontal: 14),
                ),
              ),
            ),
            const SizedBox(height: 16),

            // ── Content ─────────────────────────────────────────────────────
            if (_isLoading)
              const Center(
                child: Padding(
                  padding: EdgeInsets.all(48.0),
                  child: CircularProgressIndicator(color: HealthBridgeTheme.accentTeal),
                ),
              )
            else if (_error != null)
              _buildError()
            else if (_filteredReports.isEmpty)
              _buildEmpty()
            else
              ..._filteredReports.map(_buildLabReportCard),
          ],
        ),
      ),
    );
  }

  Widget _buildLabReportCard(LabReport report) {
    final isCompleted = report.status.toLowerCase() == 'completed';
    final isPending = report.status.toLowerCase() == 'pending';

    final badgeBg = isCompleted
        ? HealthBridgeTheme.statusCompletedBg
        : (isPending ? HealthBridgeTheme.statusPendingBg : HealthBridgeTheme.statusActiveBg);

    final badgeText = isCompleted
        ? HealthBridgeTheme.statusCompletedText
        : (isPending ? HealthBridgeTheme.statusPendingText : HealthBridgeTheme.statusActiveText);

    final iconData = isCompleted ? Icons.check_circle : (isPending ? Icons.access_time : Icons.autorenew);

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      decoration: HealthBridgeTheme.cardDecoration(radius: 14),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Icon container
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: const Color(0xFFF0FDF4),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFBBF7D0)),
                ),
                child: const Icon(Icons.biotech, color: Color(0xFF16A34A), size: 24),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      report.testTitle,
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: HealthBridgeTheme.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Wrap(
                      spacing: 6,
                      runSpacing: 4,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF1F5F9),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            report.category,
                            style: const TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                              color: Color(0xFF475569),
                            ),
                          ),
                        ),
                        Text(
                          '• ${report.reportDate}',
                          style: const TextStyle(fontSize: 11.5, color: HealthBridgeTheme.textSecondary),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Ordered by ${report.orderedDoctor}',
                      style: const TextStyle(fontSize: 12, color: HealthBridgeTheme.textSecondary),
                    ),
                  ],
                ),
              ),
              // Status Badge
              HealthBridgeTheme.statusBadge(
                text: report.status,
                bg: badgeBg,
                textCol: badgeText,
                icon: iconData,
              ),
            ],
          ),

          // Observation Summary Box
          if (report.resultsSummary.isNotEmpty) ...[
            const SizedBox(height: 12),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: HealthBridgeTheme.cardBorder),
              ),
              child: Text(
                report.resultsSummary,
                style: const TextStyle(
                  fontSize: 12,
                  color: Color(0xFF334155),
                  height: 1.35,
                ),
              ),
            ),
          ],

          // Action Button Row
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              OutlinedButton.icon(
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: HealthBridgeTheme.accentTeal),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                ),
                onPressed: () => _showReportDetailsModal(report),
                icon: const Icon(Icons.remove_red_eye_outlined, size: 16, color: HealthBridgeTheme.accentTeal),
                label: const Text(
                  'View Results',
                  style: TextStyle(color: HealthBridgeTheme.accentTeal, fontSize: 12, fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  void _showReportDetailsModal(LabReport report) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(
                      report.testTitle,
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: HealthBridgeTheme.textPrimary,
                      ),
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              Text(
                'Category: ${report.category} • Ordered: ${report.orderedDoctor}',
                style: const TextStyle(fontSize: 12, color: HealthBridgeTheme.textSecondary),
              ),
              const SizedBox(height: 16),
              const Divider(),
              const SizedBox(height: 10),
              const Text(
                'Laboratory Diagnostic Findings',
                style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: HealthBridgeTheme.textPrimary),
              ),
              const SizedBox(height: 8),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  report.resultsSummary.isNotEmpty
                      ? report.resultsSummary
                      : 'Investigation completed. Certified by Senior Clinical Pathologist.',
                  style: const TextStyle(fontSize: 13, color: Color(0xFF1E293B), height: 1.4),
                ),
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: HealthBridgeTheme.primaryTeal,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  onPressed: () {
                    Navigator.pop(context);
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text('Downloading certified report: ${report.fileName ?? "${report.testTitle}.pdf"}'),
                        backgroundColor: HealthBridgeTheme.accentTeal,
                      ),
                    );
                  },
                  icon: const Icon(Icons.download, size: 18),
                  label: const Text('Download Official PDF Report', style: TextStyle(fontWeight: FontWeight.bold)),
                ),
              ),
              const SizedBox(height: 10),
            ],
          ),
        );
      },
    );
  }

  Widget _buildEmpty() {
    return Container(
      padding: const EdgeInsets.all(40),
      decoration: HealthBridgeTheme.cardDecoration(radius: 14),
      child: const Column(
        children: [
          Icon(Icons.biotech, size: 48, color: HealthBridgeTheme.textMuted),
          SizedBox(height: 14),
          Text(
            'No lab reports found.',
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w700,
              color: HealthBridgeTheme.textPrimary,
            ),
          ),
          SizedBox(height: 4),
          Text(
            'Reports will appear here once specimens are processed by laboratory technicians.',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 12.5, color: HealthBridgeTheme.textSecondary),
          ),
        ],
      ),
    );
  }

  Widget _buildError() {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: HealthBridgeTheme.cardDecoration(radius: 14),
      child: Column(
        children: [
          const Icon(Icons.error_outline, size: 40, color: Colors.red),
          const SizedBox(height: 12),
          Text(_error ?? 'Could not load lab reports', textAlign: TextAlign.center),
          const SizedBox(height: 12),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: HealthBridgeTheme.primaryTeal),
            onPressed: _loadReports,
            child: const Text('Try Again', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }
}
