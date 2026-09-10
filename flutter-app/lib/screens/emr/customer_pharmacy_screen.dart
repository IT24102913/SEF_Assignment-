import 'package:flutter/material.dart';
import '../../services/emr_api_service.dart';
import '../../utils/theme.dart';

class CustomerPharmacyScreen extends StatefulWidget {
  const CustomerPharmacyScreen({super.key});

  @override
  State<CustomerPharmacyScreen> createState() => _CustomerPharmacyScreenState();
}

class _CustomerPharmacyScreenState extends State<CustomerPharmacyScreen> {
  List<Prescription> _allRxs = [];
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadPrescriptions();
  }

  Future<void> _loadPrescriptions() async {
    setState(() { _isLoading = true; _error = null; });
    try {
      final rxs = await EmrApiService.getPrescriptions();
      setState(() {
        _allRxs = rxs;
        _isLoading = false;
      });
    } catch (e) {
      setState(() { _error = e.toString(); _isLoading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    final active = _allRxs.where((rx) => rx.status.toLowerCase() == 'active').toList();
    final completed = _allRxs.where((rx) => rx.status.toLowerCase() != 'active').toList();

    return Scaffold(
      backgroundColor: HealthBridgeTheme.lightBg,
      body: RefreshIndicator(
        color: HealthBridgeTheme.accentTeal,
        onRefresh: _loadPrescriptions,
        child: ListView(
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 20),
          children: [
            // ── Screen Header ──────────────────────────────────────────────
            const Text(
              'Pharmacy',
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.w800,
                color: HealthBridgeTheme.textPrimary,
                letterSpacing: -0.5,
              ),
            ),
            const SizedBox(height: 4),
            const Text(
              'Your active prescriptions, medication schedules, and refill history.',
              style: TextStyle(
                color: HealthBridgeTheme.textSecondary,
                fontSize: 13,
              ),
            ),
            const SizedBox(height: 20),

            if (_isLoading)
              const Center(
                child: Padding(
                  padding: EdgeInsets.all(48.0),
                  child: CircularProgressIndicator(color: HealthBridgeTheme.accentTeal),
                ),
              )
            else if (_error != null)
              _buildError()
            else if (_allRxs.isEmpty)
              _buildEmpty()
            else ...[
              // ── Active Prescriptions ──────────────────────────────────────
              if (active.isNotEmpty) ...[
                Row(
                  children: [
                    const Icon(Icons.access_time_filled, color: Color(0xFF1D4ED8), size: 18),
                    const SizedBox(width: 8),
                    Text(
                      'Active Prescriptions (${active.length})',
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF1D4ED8),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                ...active.map(_buildPrescriptionCard),
                const SizedBox(height: 20),
              ],

              // ── Past / Completed Prescriptions ─────────────────────────────
              if (completed.isNotEmpty) ...[
                Row(
                  children: [
                    const Icon(Icons.check_circle, color: Color(0xFF15803D), size: 18),
                    const SizedBox(width: 8),
                    Text(
                      'Past Medications (${completed.length})',
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF15803D),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                ...completed.map(_buildPrescriptionCard),
              ],
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildPrescriptionCard(Prescription rx) {
    final isActive = rx.status.toLowerCase() == 'active';
    final badgeBg = isActive ? HealthBridgeTheme.statusActiveBg : HealthBridgeTheme.statusCompletedBg;
    final badgeText = isActive ? HealthBridgeTheme.statusActiveText : HealthBridgeTheme.statusCompletedText;
    final iconData = isActive ? Icons.schedule : Icons.check_circle_outline;

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
              // Purple Pill Container
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  color: const Color(0xFFFAF5FF),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: const Color(0xFFE9D5FF)),
                ),
                child: const Icon(Icons.medication, color: Color(0xFF9333EA), size: 22),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      rx.medicationName,
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: HealthBridgeTheme.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'Prescribed by ${rx.prescribedDoctor}',
                      style: const TextStyle(fontSize: 12, color: HealthBridgeTheme.textSecondary),
                    ),
                  ],
                ),
              ),
              // Status Badge
              HealthBridgeTheme.statusBadge(
                text: rx.status,
                bg: badgeBg,
                textCol: badgeText,
                icon: iconData,
              ),
            ],
          ),

          const SizedBox(height: 12),
          // Details Shaded Box
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: HealthBridgeTheme.cardBorder),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Instructions: ', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 12, color: Color(0xFF334155))),
                    Expanded(
                      child: Text(
                        rx.dosage,
                        style: const TextStyle(fontSize: 12, color: Color(0xFF1E293B)),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    const Icon(Icons.calendar_today_outlined, size: 14, color: HealthBridgeTheme.textSecondary),
                    const SizedBox(width: 6),
                    Text(
                      '${rx.startDate} → ${rx.endDate}',
                      style: const TextStyle(fontSize: 11.5, color: HealthBridgeTheme.textSecondary, fontWeight: FontWeight.w500),
                    ),
                    const Spacer(),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(color: HealthBridgeTheme.cardBorder),
                      ),
                      child: Text(
                        'Duration: ${rx.duration}',
                        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF475569)),
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

  Widget _buildEmpty() {
    return Container(
      padding: const EdgeInsets.all(40),
      decoration: HealthBridgeTheme.cardDecoration(radius: 14),
      child: const Column(
        children: [
          Icon(Icons.medication_outlined, size: 48, color: HealthBridgeTheme.textMuted),
          SizedBox(height: 14),
          Text(
            'No prescriptions found.',
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w700,
              color: HealthBridgeTheme.textPrimary,
            ),
          ),
          SizedBox(height: 4),
          Text(
            'Prescriptions will appear here after consultation and pharmacy dispensing.',
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
          Text(_error ?? 'Could not load prescriptions', textAlign: TextAlign.center),
          const SizedBox(height: 12),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: HealthBridgeTheme.primaryTeal),
            onPressed: _loadPrescriptions,
            child: const Text('Try Again', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }
}
