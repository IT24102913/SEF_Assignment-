import 'package:flutter/material.dart';
import '../../services/emr_api_service.dart';

// Health Bridge teal color palette
const Color kPrimary = Color(0xFF095E51);
const Color kAccent = Color(0xFF0D7C6B);
const Color kLightBg = Color(0xFFF2FAF8);
const Color kMint = Color(0xFFE6F5F2);

class EmrPatientScreen extends StatefulWidget {
  final String patientCode;
  const EmrPatientScreen({super.key, this.patientCode = 'PAT-1001'});

  @override
  State<EmrPatientScreen> createState() => _EmrPatientScreenState();
}

class _EmrPatientScreenState extends State<EmrPatientScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  ClinicalSummary? _summary;
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    _loadData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    setState(() { _isLoading = true; _error = null; });
    try {
      final summary = await EmrApiService.getClinicalSummary(widget.patientCode);
      setState(() { _summary = summary; _isLoading = false; });
    } catch (e) {
      setState(() { _error = e.toString(); _isLoading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: kLightBg,
      appBar: AppBar(
        backgroundColor: kPrimary,
        foregroundColor: Colors.white,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Health Bridge', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            Text(_summary?.patientCode ?? widget.patientCode,
                style: const TextStyle(fontSize: 12, color: Colors.white70)),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadData,
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white60,
          indicatorColor: Colors.white,
          tabs: const [
            Tab(icon: Icon(Icons.person, size: 18), text: 'Overview'),
            Tab(icon: Icon(Icons.medical_services, size: 18), text: 'Consults'),
            Tab(icon: Icon(Icons.biotech, size: 18), text: 'Labs'),
            Tab(icon: Icon(Icons.medication, size: 18), text: 'Meds'),
          ],
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: kAccent))
          : _error != null
              ? _buildError()
              : TabBarView(
                  controller: _tabController,
                  children: [
                    _buildOverviewTab(),
                    _buildConsultationsTab(),
                    _buildLabReportsTab(),
                    _buildPrescriptionsTab(),
                  ],
                ),
    );
  }

  Widget _buildError() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, color: Colors.red, size: 56),
            const SizedBox(height: 16),
            const Text('Could not connect to Health Bridge API',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Text(_error ?? '', textAlign: TextAlign.center,
                style: const TextStyle(color: Colors.grey)),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              style: ElevatedButton.styleFrom(backgroundColor: kPrimary, foregroundColor: Colors.white),
              onPressed: _loadData,
              icon: const Icon(Icons.refresh),
              label: const Text('Try Again'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildOverviewTab() {
    final s = _summary!;
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Patient Header Card
        Card(
          color: kPrimary,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Row(
              children: [
                CircleAvatar(
                  radius: 32,
                  backgroundColor: Colors.white24,
                  child: Text(s.fullName.isNotEmpty ? s.fullName[0] : '?',
                      style: const TextStyle(fontSize: 28, color: Colors.white, fontWeight: FontWeight.bold)),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(s.fullName,
                          style: const TextStyle(fontSize: 20, color: Colors.white, fontWeight: FontWeight.bold)),
                      Text('${s.patientCode} • ${s.gender} • ${s.age} years',
                          style: const TextStyle(color: Colors.white70)),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          _tag('Blood: ${s.bloodGroup}', Colors.red.shade100, Colors.red.shade700),
                          const SizedBox(width: 8),
                          _tag(s.gender, kMint, kAccent),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),
        // Stats Row
        Row(
          children: [
            _statCard('Consultations', '${s.totalConsultationsCount}', Icons.medical_services),
            const SizedBox(width: 8),
            _statCard('Active Meds', '${s.activePrescriptionsCount}', Icons.medication),
            const SizedBox(width: 8),
            _statCard('Pending Labs', '${s.pendingLabReportsCount}', Icons.biotech),
          ],
        ),
        const SizedBox(height: 16),
        // Alerts
        if (s.clinicalAlerts.isNotEmpty) ...[
          _sectionHeader('Clinical Alerts', Icons.warning_amber, Colors.orange),
          ...s.clinicalAlerts.map((alert) => Card(
                color: Colors.orange.shade50,
                margin: const EdgeInsets.only(bottom: 8),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                    side: BorderSide(color: Colors.orange.shade200)),
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Row(
                    children: [
                      Icon(Icons.warning, color: Colors.orange.shade700, size: 20),
                      const SizedBox(width: 10),
                      Expanded(child: Text(alert, style: TextStyle(color: Colors.orange.shade900, fontSize: 13))),
                    ],
                  ),
                ),
              )),
          const SizedBox(height: 12),
        ],
        // Allergies & Conditions
        _sectionHeader('Known Allergies', Icons.warning, Colors.red),
        Card(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Wrap(
              spacing: 8, runSpacing: 6,
              children: s.knownAllergies.isEmpty
                  ? [const Text('None reported', style: TextStyle(color: Colors.grey))]
                  : s.knownAllergies.map((a) => _tag(a, Colors.red.shade50, Colors.red.shade700)).toList(),
            ),
          ),
        ),
        const SizedBox(height: 12),
        _sectionHeader('Chronic Conditions', Icons.monitor_heart, kPrimary),
        Card(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Wrap(
              spacing: 8, runSpacing: 6,
              children: s.chronicConditions.isEmpty
                  ? [const Text('None reported', style: TextStyle(color: Colors.grey))]
                  : s.chronicConditions.map((c) => _tag(c, kMint, kPrimary)).toList(),
            ),
          ),
        ),
        const SizedBox(height: 12),
        // Emergency Contact
        _sectionHeader('Emergency Contact', Icons.emergency, Colors.blue),
        Card(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Text(s.emergencyContact, style: const TextStyle(fontSize: 14)),
          ),
        ),
      ],
    );
  }

  Widget _buildConsultationsTab() {
    final notes = _summary!.recentConsultations;
    if (notes.isEmpty) return _emptyState('No consultation notes found', Icons.medical_services_outlined);
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: notes.length,
      itemBuilder: (ctx, i) {
        final n = notes[i];
        return Card(
          margin: const EdgeInsets.only(bottom: 12),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          child: ExpansionTile(
            leading: CircleAvatar(
              backgroundColor: kMint,
              child: const Icon(Icons.medical_services, color: kPrimary, size: 20),
            ),
            title: Text(n.diagnosis, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
            subtitle: Text('${n.doctorName} • ${n.consultationDate}',
                style: const TextStyle(fontSize: 12, color: Colors.grey)),
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _detailRow('Doctor', '${n.doctorName}, ${n.doctorDesignation}'),
                    if (n.recommendedTests.isNotEmpty) _detailRow('Tests Ordered', n.recommendedTests),
                    if (n.clinicalNotes.isNotEmpty) _detailRow('Clinical Notes', n.clinicalNotes),
                    _tag(n.status, kMint, kPrimary),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildLabReportsTab() {
    final reports = _summary!.recentLabReports;
    if (reports.isEmpty) return _emptyState('No lab reports found', Icons.biotech_outlined);
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: reports.length,
      itemBuilder: (ctx, i) {
        final r = reports[i];
        final isPending = r.status.toLowerCase() == 'pending';
        final statusColor = isPending ? Colors.orange : Colors.green;
        return Card(
          margin: const EdgeInsets.only(bottom: 12),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          child: ExpansionTile(
            leading: CircleAvatar(
              backgroundColor: kMint,
              child: const Icon(Icons.biotech, color: kPrimary, size: 20),
            ),
            title: Text(r.testTitle, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
            subtitle: Text('${r.category} • ${r.reportDate}',
                style: const TextStyle(fontSize: 12, color: Colors.grey)),
            trailing: _tag(r.status, statusColor.shade50, statusColor.shade700),
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _detailRow('Ordered by', r.orderedDoctor),
                    if (r.resultsSummary.isNotEmpty) _detailRow('Results', r.resultsSummary),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildPrescriptionsTab() {
    final meds = _summary!.activeMedications;
    if (meds.isEmpty) {
      return _emptyState('No active medications', Icons.medication_outlined);
    }
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: meds.length,
      itemBuilder: (ctx, i) {
        final rx = meds[i];
        return Card(
          margin: const EdgeInsets.only(bottom: 12),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12),
              side: BorderSide(color: kAccent.withOpacity(0.2))),
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.medication, color: kPrimary, size: 22),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(rx.medicationName,
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                    ),
                    _tag(rx.status, kMint, kPrimary),
                  ],
                ),
                const SizedBox(height: 8),
                _detailRow('Dosage', rx.dosage),
                _detailRow('Duration', '${rx.duration} (${rx.startDate} → ${rx.endDate})'),
                _detailRow('Prescribed by', rx.prescribedDoctor),
              ],
            ),
          ),
        );
      },
    );
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  Widget _sectionHeader(String label, IconData icon, Color color) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Icon(icon, color: color, size: 18),
          const SizedBox(width: 6),
          Text(label, style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 15)),
        ],
      ),
    );
  }

  Widget _statCard(String label, String value, IconData icon) {
    return Expanded(
      child: Card(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 8),
          child: Column(
            children: [
              Icon(icon, color: kPrimary, size: 22),
              const SizedBox(height: 4),
              Text(value,
                  style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: kPrimary)),
              Text(label, textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 11, color: Colors.grey)),
            ],
          ),
        ),
      ),
    );
  }

  Widget _detailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 100,
            child: Text('$label:', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 12, color: Colors.grey)),
          ),
          Expanded(
            child: Text(value, style: const TextStyle(fontSize: 13)),
          ),
        ],
      ),
    );
  }

  Widget _tag(String label, Color bg, Color fg) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(20)),
      child: Text(label, style: TextStyle(color: fg, fontSize: 12, fontWeight: FontWeight.w600)),
    );
  }

  Widget _emptyState(String message, IconData icon) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, size: 64, color: Colors.grey.shade300),
          const SizedBox(height: 16),
          Text(message, style: TextStyle(color: Colors.grey.shade500, fontSize: 16)),
        ],
      ),
    );
  }
}
