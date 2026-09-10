import 'package:flutter/material.dart';
import '../../services/emr_api_service.dart';
import '../../utils/theme.dart';

class CustomerHealthPassportDialog extends StatefulWidget {
  final String patientCode;

  const CustomerHealthPassportDialog({
    super.key,
    required this.patientCode,
  });

  @override
  State<CustomerHealthPassportDialog> createState() => _CustomerHealthPassportDialogState();
}

class _CustomerHealthPassportDialogState extends State<CustomerHealthPassportDialog> {
  ClinicalSummary? _summary;
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadSummary();
  }

  Future<void> _loadSummary() async {
    setState(() { _isLoading = true; _error = null; });
    try {
      final data = await EmrApiService.getClinicalSummary(widget.patientCode);
      setState(() {
        _summary = data;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: Colors.white,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      insetPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 24),
      child: Container(
        constraints: const BoxConstraints(maxHeight: 650, maxWidth: 450),
        child: Column(
          children: [
            // ── Dialog Header ──────────────────────────────────────────────
            Container(
              padding: const EdgeInsets.all(18),
              decoration: const BoxDecoration(
                color: HealthBridgeTheme.primaryTeal,
                borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
              ),
              child: Row(
                children: [
                  Container(
                    width: 38,
                    height: 38,
                    decoration: BoxDecoration(
                      color: HealthBridgeTheme.accentTeal,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(Icons.health_and_safety, color: Colors.white, size: 22),
                  ),
                  const SizedBox(width: 12),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Clinical Health Passport',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        Text(
                          'Automated Safety & EMR Profile',
                          style: TextStyle(color: Colors.white70, fontSize: 11),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close, color: Colors.white70, size: 22),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
            ),

            // ── Dialog Body ────────────────────────────────────────────────
            Expanded(
              child: _isLoading
                  ? const Center(child: CircularProgressIndicator(color: HealthBridgeTheme.accentTeal))
                  : _error != null
                      ? Center(child: Text(_error!))
                      : _buildPassportContent(_summary!),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPassportContent(ClinicalSummary s) {
    return ListView(
      padding: const EdgeInsets.all(18),
      children: [
        // Patient Demographics Card
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: HealthBridgeTheme.lightBg,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFFCCE8E3)),
          ),
          child: Row(
            children: [
              CircleAvatar(
                radius: 26,
                backgroundColor: HealthBridgeTheme.accentTeal,
                child: Text(
                  s.fullName.isNotEmpty ? s.fullName[0] : 'P',
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 20),
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      s.fullName,
                      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: HealthBridgeTheme.textPrimary),
                    ),
                    Text(
                      '${s.patientCode} • ${s.gender} • ${s.age} yrs',
                      style: const TextStyle(fontSize: 12, color: HealthBridgeTheme.textSecondary),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Blood Group: ${s.bloodGroup}',
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFFB91C1C)),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 16),

        // Key Numbers Row
        Row(
          children: [
            _metricBox('Consults', '${s.totalConsultationsCount}', Icons.medical_services_outlined),
            const SizedBox(width: 8),
            _metricBox('Active Meds', '${s.activePrescriptionsCount}', Icons.medication_outlined),
            const SizedBox(width: 8),
            _metricBox('Completed Labs', '${s.completedLabReportsCount}', Icons.biotech_outlined),
          ],
        ),

        const SizedBox(height: 16),

        // Automated Clinical Alerts (Business-Specific Feature)
        if (s.clinicalAlerts.isNotEmpty) ...[
          const Row(
            children: [
              Icon(Icons.warning_amber_rounded, color: Color(0xFFC2410C), size: 18),
              SizedBox(width: 6),
              Text(
                'Clinical Safety Alerts',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFFC2410C)),
              ),
            ],
          ),
          const SizedBox(height: 8),
          ...s.clinicalAlerts.map((alert) => Container(
                margin: const EdgeInsets.only(bottom: 6),
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: const Color(0xFFFFF7ED),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: const Color(0xFFFED7AA)),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(Icons.info, size: 16, color: Color(0xFFC2410C)),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        alert,
                        style: const TextStyle(fontSize: 12, color: Color(0xFF9A3412), height: 1.35),
                      ),
                    ),
                  ],
                ),
              )),
          const SizedBox(height: 14),
        ],

        // Known Allergies
        const Text(
          'Documented Allergies',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12.5, color: HealthBridgeTheme.textPrimary),
        ),
        const SizedBox(height: 6),
        Wrap(
          spacing: 6,
          runSpacing: 6,
          children: s.knownAllergies.isEmpty
              ? [const Text('No known drug allergies', style: TextStyle(fontSize: 12, color: Colors.grey))]
              : s.knownAllergies
                  .map((a) => Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFEF2F2),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: const Color(0xFFFECACA)),
                        ),
                        child: Text(
                          a,
                          style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.bold, color: Color(0xFFDC2626)),
                        ),
                      ))
                  .toList(),
        ),

        const SizedBox(height: 14),

        // Chronic Conditions
        const Text(
          'Chronic Medical Conditions',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12.5, color: HealthBridgeTheme.textPrimary),
        ),
        const SizedBox(height: 6),
        Wrap(
          spacing: 6,
          runSpacing: 6,
          children: s.chronicConditions.isEmpty
              ? [const Text('No chronic conditions', style: TextStyle(fontSize: 12, color: Colors.grey))]
              : s.chronicConditions
                  .map((c) => Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: HealthBridgeTheme.mintAccent,
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: const Color(0xFFCCE8E3)),
                        ),
                        child: Text(
                          c,
                          style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.bold, color: HealthBridgeTheme.primaryTeal),
                        ),
                      ))
                  .toList(),
        ),

        const SizedBox(height: 14),

        // Emergency Contact
        const Text(
          'Emergency Contact',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12.5, color: HealthBridgeTheme.textPrimary),
        ),
        const SizedBox(height: 4),
        Text(
          s.emergencyContact,
          style: const TextStyle(fontSize: 13, color: Color(0xFF334155)),
        ),

        const SizedBox(height: 16),

        // Overall Assessment
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: const Color(0xFFF8FAFC),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: HealthBridgeTheme.cardBorder),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Overall Assessment', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11.5, color: HealthBridgeTheme.textSecondary)),
              const SizedBox(height: 4),
              Text(
                s.overallAssessment,
                style: const TextStyle(fontSize: 12.5, color: HealthBridgeTheme.textPrimary, height: 1.3),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _metricBox(String label, String value, IconData icon) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: HealthBridgeTheme.cardBorder),
        ),
        child: Column(
          children: [
            Icon(icon, size: 18, color: HealthBridgeTheme.primaryTeal),
            const SizedBox(height: 4),
            Text(value, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: HealthBridgeTheme.primaryTeal)),
            Text(label, textAlign: TextAlign.center, style: const TextStyle(fontSize: 10, color: HealthBridgeTheme.textSecondary)),
          ],
        ),
      ),
    );
  }
}
