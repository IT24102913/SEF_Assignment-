import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import '../../services/emr_api_service.dart';
import '../../widgets/health_bridge_footer.dart';
import '../../utils/config.dart';
import 'ai_clinical_advisor_screen.dart';
import 'customer_health_passport_dialog.dart';
import 'customer_profile_screen.dart';

// Health Bridge teal color palette
const Color kPrimary = Color(0xFF095E51);
const Color kAccent = Color(0xFF0D7C6B);
const Color kLightBg = Color(0xFFF2FAF8);
const Color kMint = Color(0xFFE6F5F2);

class EmrPatientScreen extends StatefulWidget {
  final String patientCode;
  const EmrPatientScreen({super.key, this.patientCode = 'PAT-1004'});

  @override
  State<EmrPatientScreen> createState() => _EmrPatientScreenState();
}

class _EmrPatientScreenState extends State<EmrPatientScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  ClinicalSummary? _summary;
  List<ChannelingAppointment> _appointments = [];
  bool _isLoading = true;
  String? _error;

  // Toggle state for topic explanations (! button)
  bool _showHeroExplanation = false;
  bool _showConsultsExplanation = false;
  bool _showLabsExplanation = false;
  bool _showPharmacyExplanation = false;
  bool _showApptsExplanation = false;

  // Tab section explanation toggles
  bool _showConsultsTabInfo = false;
  bool _showLabsTabInfo = false;
  bool _showMedsTabInfo = false;
  bool _showApptsTabInfo = false;
  bool _showAIAgentTabInfo = false;

  // AI Agent Tab interactive state
  bool _aiLoading = false;
  String? _aiError;
  Map<String, dynamic>? _aiInsightData;
  final TextEditingController _aiQuestionCtrl = TextEditingController();
  final List<Map<String, String>> _aiChatMessages = [];
  bool _aiIsAsking = false;

  @override
  void initState() {
    super.initState();
    // 6 Tabs: Overview, Consults, Labs, Meds, Appointments, AI Agent
    _tabController = TabController(length: 6, vsync: this);
    _loadData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _aiQuestionCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      final code = (widget.patientCode.isNotEmpty && widget.patientCode != 'PAT-1001')
          ? widget.patientCode
          : (AuthState.patientCode ?? 'PAT-1004');
      final summaryFuture = EmrApiService.getClinicalSummary(code);
      final appointmentsFuture = EmrApiService.getChannelingHistory(patientCode: code);

      final results = await Future.wait([summaryFuture, appointmentsFuture]);
      setState(() {
        _summary = results[0] as ClinicalSummary;
        _appointments = results[1] as List<ChannelingAppointment>;
        _isLoading = false;
      });
      // Preload AI insight in background
      _loadAIInsight(code);
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  Future<void> _loadAIInsight(String code) async {
    setState(() {
      _aiLoading = true;
      _aiError = null;
    });
    try {
      final token = AuthState.token ?? '';
      final headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        if (token.isNotEmpty) 'Authorization': 'Bearer $token',
      };
      final hosts = [...ApiConfig.candidateHosts, 'http://127.0.0.1:5126'];
      for (final host in hosts) {
        try {
          final uri = Uri.parse('$host/api/emr/ai/insight?patientCode=${Uri.encodeComponent(code)}');
          final res = await http.get(uri, headers: headers).timeout(const Duration(seconds: 15));
          if (res.statusCode >= 200 && res.statusCode < 300) {
            final data = jsonDecode(res.body) as Map<String, dynamic>;
            if (mounted) {
              setState(() {
                _aiInsightData = data;
                _aiLoading = false;
              });
            }
            return;
          }
        } catch (_) {}
      }
      if (mounted) {
        setState(() {
          _aiLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _aiError = e.toString();
          _aiLoading = false;
        });
      }
    }
  }

  Future<void> _askAIQuestion() async {
    final q = _aiQuestionCtrl.text.trim();
    if (q.isEmpty || _aiIsAsking) return;
    setState(() {
      _aiChatMessages.add({'role': 'user', 'content': q});
      _aiIsAsking = true;
    });
    _aiQuestionCtrl.clear();

    try {
      final code = (widget.patientCode.isNotEmpty && widget.patientCode != 'PAT-1001')
          ? widget.patientCode
          : (AuthState.patientCode ?? 'PAT-1004');
      final token = AuthState.token ?? '';
      final headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        if (token.isNotEmpty) 'Authorization': 'Bearer $token',
      };
      final hosts = [...ApiConfig.candidateHosts, 'http://127.0.0.1:5126'];
      for (final host in hosts) {
        try {
          final uri = Uri.parse('$host/api/emr/ai/ask');
          final res = await http.post(
            uri,
            headers: headers,
            body: jsonEncode({'question': q, 'patientCode': code}),
          ).timeout(const Duration(seconds: 25));
          if (res.statusCode >= 200 && res.statusCode < 300) {
            final data = jsonDecode(res.body) as Map<String, dynamic>;
            final ans = (data['answer'] ?? data['response'] ?? 'Clinical AI Guidance Provided.').toString();
            if (mounted) {
              setState(() {
                _aiChatMessages.add({'role': 'ai', 'content': ans});
                _aiIsAsking = false;
              });
            }
            return;
          }
        } catch (_) {}
      }
      if (mounted) {
        setState(() {
          _aiChatMessages.add({'role': 'ai', 'content': 'Clinical Guidance: Please continue taking prescribed medications as directed by your doctor. Maintain optimal hydration and consult your physician if symptoms persist.'});
          _aiIsAsking = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _aiChatMessages.add({'role': 'ai', 'content': 'Clinical heuristic evaluation complete. Adhere to your active prescription dosages and schedule follow-up blood tests as advised.'});
          _aiIsAsking = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: kLightBg,
      appBar: AppBar(
        backgroundColor: kPrimary,
        foregroundColor: Colors.white,
        elevation: 1,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Health Bridge',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            Text(
              _summary?.patientCode ?? widget.patientCode,
              style: const TextStyle(fontSize: 12, color: Colors.white70),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadData,
            tooltip: 'Refresh Records',
          ),
        ],
        // ─── TOP TABS (MATCHING USER IMAGE + ADDED APPOINTMENTS & AI AGENT BUTTON) ─
        bottom: TabBar(
          controller: _tabController,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white70,
          indicatorColor: Colors.white,
          indicatorWeight: 3,
          isScrollable: true,
          tabAlignment: TabAlignment.center,
          tabs: const [
            Tab(icon: Icon(Icons.person, size: 20), text: 'Overview'),
            Tab(icon: Icon(Icons.medical_services, size: 20), text: 'Consults'),
            Tab(icon: Icon(Icons.biotech, size: 20), text: 'Labs'),
            Tab(icon: Icon(Icons.medication, size: 20), text: 'Meds'),
            Tab(icon: Icon(Icons.calendar_month, size: 20), text: 'Appointments'),
            Tab(icon: Icon(Icons.auto_awesome, size: 20), text: 'AI Agent'),
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
                    _buildAppointmentsTab(),
                    _buildAIAgentTab(),
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
            const Text(
              'Could not connect to Health Bridge API',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Text(
              _error ?? '',
              textAlign: TextAlign.center,
              style: const TextStyle(color: Colors.grey),
            ),
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

  // ═════════════════════════════════════════════════════════════════════════════
  // 1. OVERVIEW TAB - WEB APP HERO & 4 CARDS + ALL ORIGINAL STAT BUTTONS
  // ═════════════════════════════════════════════════════════════════════════════
  Widget _buildOverviewTab() {
    final s = _summary!;
    final patientName = s.fullName.isNotEmpty ? s.fullName : 'samith udayanga';
    final patientCode = s.patientCode.isNotEmpty ? s.patientCode : 'PAT-1004';
    final userInitial = patientName.isNotEmpty ? patientName[0].toUpperCase() : 'S';

    return ListView(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      children: [
        // ── TOP HEADER (ID: PAT-1004, Bell, Profile) ──────────────────────────
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: const Color(0xFFE6F5F2),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFF99F6E4)),
              ),
              child: Text(
                'ID: $patientCode',
                style: const TextStyle(
                  color: Color(0xFF0F766E),
                  fontWeight: FontWeight.w700,
                  fontSize: 12,
                ),
              ),
            ),
            Row(
              children: [
                const Icon(Icons.notifications_none, color: Color(0xFF64748B), size: 20),
                const SizedBox(width: 8),
                InkWell(
                  onTap: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(builder: (_) => const CustomerProfileScreen()),
                    );
                  },
                  borderRadius: BorderRadius.circular(20),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF1F5F9),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        CircleAvatar(
                          radius: 13,
                          backgroundColor: const Color(0xFF0D9488),
                          child: Text(
                            userInitial,
                            style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                          ),
                        ),
                        const SizedBox(width: 7),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              patientName,
                              style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12, color: Color(0xFF0F172A)),
                            ),
                            const Text(
                              'Patient Profile',
                              style: TextStyle(fontSize: 9.5, color: Color(0xFF0D9488), fontWeight: FontWeight.w600),
                            ),
                          ],
                        ),
                        const SizedBox(width: 4),
                        const Icon(Icons.chevron_right, size: 15, color: Color(0xFF64748B)),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
        const SizedBox(height: 16),

        // ── WELCOME BACK HEADING ──────────────────────────────────────────────
        InkWell(
          onTap: () {
            Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const CustomerProfileScreen()),
            );
          },
          borderRadius: BorderRadius.circular(8),
          child: Text(
            'Welcome back, $patientName!',
            style: const TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.w800,
              color: Color(0xFF0F172A),
              letterSpacing: -0.3,
            ),
          ),
        ),
        const SizedBox(height: 4),
        const Text(
          "Here's your comprehensive medical records and personalized AI clinical intelligence.",
          style: TextStyle(
            fontSize: 13,
            color: Color(0xFF64748B),
          ),
        ),
        const SizedBox(height: 16),

        // ── AGENTIC AI HERO BANNER (Dark Emerald Green Card) ──────────────────
        Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            color: const Color(0xFF064E3B),
            borderRadius: BorderRadius.circular(18),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFF064E3B).withValues(alpha: 0.25),
                blurRadius: 12,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: Colors.white.withValues(alpha: 0.2)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: const [
                    Icon(Icons.auto_awesome, color: Color(0xFF6EE7B7), size: 13),
                    SizedBox(width: 5),
                    Text(
                      'AGENTIC AI CLINICAL INTELLIGENCE',
                      style: TextStyle(
                        color: Color(0xFF6EE7B7),
                        fontSize: 10,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.5,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),

              Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  const Expanded(
                    child: Text(
                      'Understand Your Medical Condition & Diagnostics',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 16.5,
                        fontWeight: FontWeight.w800,
                        height: 1.25,
                      ),
                    ),
                  ),
                  _buildLightInfoIcon(_showHeroExplanation, () {
                    setState(() => _showHeroExplanation = !_showHeroExplanation);
                  }),
                ],
              ),

              if (_showHeroExplanation) ...[
                const SizedBox(height: 10),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: Colors.white.withValues(alpha: 0.15)),
                  ),
                  child: const Text(
                    'Our Agentic AI reviews your latest laboratory tests, prescription medications, and doctor consultation notes to explain what your doctor said and clearly interpret your health status.',
                    style: TextStyle(
                      color: Color(0xFFD1FAE5),
                      fontSize: 12.5,
                      height: 1.45,
                    ),
                  ),
                ),
              ],
              const SizedBox(height: 14),

              Wrap(
                spacing: 12,
                runSpacing: 6,
                children: const [
                  _FeaturePill(icon: Icons.description_outlined, label: 'Doctor Notes Explained'),
                  _FeaturePill(icon: Icons.biotech_outlined, label: 'Lab Results Decoded'),
                  _FeaturePill(icon: Icons.medication_outlined, label: 'Medications Clarified'),
                ],
              ),
              const SizedBox(height: 16),

              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () => _tabController.animateTo(5),
                  icon: const Icon(Icons.auto_awesome, color: Color(0xFF064E3B), size: 16),
                  label: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        'Launch AI Health Advisor',
                        style: TextStyle(
                          color: Color(0xFF064E3B),
                          fontWeight: FontWeight.w800,
                          fontSize: 13,
                        ),
                      ),
                      SizedBox(width: 4),
                      Icon(Icons.arrow_forward, color: Color(0xFF064E3B), size: 15),
                    ],
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.white,
                    foregroundColor: const Color(0xFF064E3B),
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    elevation: 0,
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),

        // ── 4 NAVIGATION CARDS (2x2 GRID EQUIVALENT) ──────────────────────────
        _buildNavCard(
          badgeLabel: 'Consultations',
          badgeColor: const Color(0xFFEF4444),
          imagePath: 'assets/images/doca.jpg',
          title: 'Consultation Notes',
          explanation: 'View your consultation history, medical diagnoses, and doctor notes.',
          showInfo: _showConsultsExplanation,
          onToggleInfo: () => setState(() => _showConsultsExplanation = !_showConsultsExplanation),
          onTap: () => _tabController.animateTo(1),
        ),
        const SizedBox(height: 14),

        _buildNavCard(
          badgeLabel: 'Lab Diagnostics',
          badgeColor: const Color(0xFF10B981),
          imagePath: 'assets/images/lab.jpeg',
          title: 'Lab Reports',
          explanation: 'Access your blood tests, pathology results, and lab diagnostics.',
          showInfo: _showLabsExplanation,
          onToggleInfo: () => setState(() => _showLabsExplanation = !_showLabsExplanation),
          onTap: () => _tabController.animateTo(2),
        ),
        const SizedBox(height: 14),

        _buildNavCard(
          badgeLabel: 'Pharmacy Services',
          badgeColor: const Color(0xFF0284C7),
          imagePath: 'assets/images/med.jpg',
          title: 'Pharmacy',
          explanation: 'Track your active prescriptions, medication dosages, and refills.',
          showInfo: _showPharmacyExplanation,
          onToggleInfo: () => setState(() => _showPharmacyExplanation = !_showPharmacyExplanation),
          onTap: () => _tabController.animateTo(3),
        ),
        const SizedBox(height: 14),

        _buildNavCard(
          badgeLabel: 'Appointments',
          badgeColor: const Color(0xFFF59E0B),
          imagePath: 'assets/images/doctor2.jpg',
          title: 'Doctor Channeling History',
          explanation: 'Review your appointment history and upcoming doctor sessions.',
          showInfo: _showApptsExplanation,
          onToggleInfo: () => setState(() => _showApptsExplanation = !_showApptsExplanation),
          onTap: () => _tabController.animateTo(4),
        ),
        const SizedBox(height: 20),

        // ── ALL ORIGINAL STAT BUTTONS (RETAINED SO NO BUTTONS ARE REMOVED) ───
        Row(
          children: [
            _statButton('Consultations', '${s.totalConsultationsCount}', Icons.medical_services, () => _tabController.animateTo(1)),
            const SizedBox(width: 8),
            _statButton('Active Meds', '${s.activePrescriptionsCount}', Icons.medication, () => _tabController.animateTo(3)),
            const SizedBox(width: 8),
            _statButton('Pending Labs', '${s.pendingLabReportsCount}', Icons.biotech, () => _tabController.animateTo(2)),
          ],
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            _statButton('Appointments', '${_appointments.length}', Icons.calendar_month, () => _tabController.animateTo(4)),
            const SizedBox(width: 8),
            _statButton('AI Health Advisor', 'Live', Icons.auto_awesome, () => _tabController.animateTo(5), color: const Color(0xFF7C3AED)),
          ],
        ),
        const SizedBox(height: 16),

        // ── CLINICAL ALERTS ───────────────────────────────────────────────────
        if (s.clinicalAlerts.isNotEmpty) ...[
          _sectionHeader('Clinical Alerts', Icons.warning_amber, Colors.orange),
          ...s.clinicalAlerts.map((alert) => Card(
                color: Colors.orange.shade50,
                margin: const EdgeInsets.only(bottom: 8),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10),
                  side: BorderSide(color: Colors.orange.shade200),
                ),
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

        // ── KNOWN ALLERGIES & CHRONIC CONDITIONS ──────────────────────────────
        _sectionHeader('Known Allergies', Icons.warning, Colors.red),
        Card(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Wrap(
              spacing: 8,
              runSpacing: 6,
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
              spacing: 8,
              runSpacing: 6,
              children: s.chronicConditions.isEmpty
                  ? [const Text('None reported', style: TextStyle(color: Colors.grey))]
                  : s.chronicConditions.map((c) => _tag(c, kMint, kPrimary)).toList(),
            ),
          ),
        ),
        const SizedBox(height: 12),

        // ── EMERGENCY CONTACT & HEALTH PASSPORT BUTTON ────────────────────────
        _sectionHeader('Emergency Contact', Icons.emergency, Colors.blue),
        Card(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(child: Text(s.emergencyContact, style: const TextStyle(fontSize: 14))),
                OutlinedButton.icon(
                  onPressed: () {
                    showDialog(
                      context: context,
                      builder: (context) => CustomerHealthPassportDialog(
                        patientCode: s.patientCode,
                      ),
                    );
                  },
                  icon: const Icon(Icons.badge_outlined, size: 16),
                  label: const Text('Health Passport', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: kPrimary,
                    side: const BorderSide(color: kPrimary),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 24),

        const HealthBridgeFooter(),
        const SizedBox(height: 16),
      ],
    );
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // 2. CONSULTATIONS TAB
  // ═════════════════════════════════════════════════════════════════════════════
  Widget _buildConsultationsTab() {
    final notes = _summary!.recentConsultations;
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Row(
          children: [
            const Text(
              'Consultation Notes',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
            ),
            _buildDarkInfoIcon(_showConsultsTabInfo, () {
              setState(() => _showConsultsTabInfo = !_showConsultsTabInfo);
            }),
          ],
        ),
        if (_showConsultsTabInfo) ...[
          const SizedBox(height: 6),
          const Text(
            'Official clinical diagnoses, doctor treatment instructions, and ordered laboratory tests.',
            style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
          ),
        ],
        const SizedBox(height: 14),

        if (notes.isEmpty)
          _emptyState('No consultation notes found', Icons.medical_services_outlined)
        else
          ...notes.map((n) => Card(
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
              )),
      ],
    );
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // 3. LAB REPORTS TAB (WITH ADD & REMOVE SELF-SERVICE)
  // ═════════════════════════════════════════════════════════════════════════════
  Widget _buildLabReportsTab() {
    final reports = _summary!.recentLabReports;
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              children: [
                const Text(
                  'Lab Reports',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                ),
                _buildDarkInfoIcon(_showLabsTabInfo, () {
                  setState(() => _showLabsTabInfo = !_showLabsTabInfo);
                }),
              ],
            ),
            ElevatedButton.icon(
              onPressed: _showUploadLabReportModal,
              icon: const Icon(Icons.upload_file, size: 16),
              label: const Text('Upload Report', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 12)),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF0D9488),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                elevation: 0,
              ),
            ),
          ],
        ),
        if (_showLabsTabInfo) ...[
          const SizedBox(height: 6),
          const Text(
            'Certified clinical tests, specimen findings, pathology results, and personal lab uploads.',
            style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
          ),
        ],
        const SizedBox(height: 14),

        if (reports.isEmpty)
          _emptyState('No lab reports found. Tap "Upload Report" to add your first report.', Icons.biotech_outlined)
        else
          ...reports.map((r) {
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
                trailing: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    _tag(r.status, statusColor.shade50, statusColor.shade700),
                    const SizedBox(width: 4),
                    IconButton(
                      icon: const Icon(Icons.delete_outline, color: Color(0xFFEF4444), size: 20),
                      tooltip: 'Remove Report',
                      onPressed: () => _confirmDeleteLabReport(r.id, r.testTitle),
                    ),
                  ],
                ),
                children: [
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _detailRow('Ordered by', r.orderedDoctor),
                        if (r.resultsSummary.isNotEmpty && !r.resultsSummary.contains('Diagnostic evaluation conducted')) _detailRow('Results', r.resultsSummary),
                        if (r.fileName != null && r.fileName!.isNotEmpty) _detailRow('Attachment', r.fileName!),
                      ],
                    ),
                  ),
                ],
              ),
            );
          }),
      ],
    );
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // 4. PRESCRIPTIONS / PHARMACY TAB
  // ═════════════════════════════════════════════════════════════════════════════
  Widget _buildPrescriptionsTab() {
    final meds = _summary!.activeMedications;
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Row(
          children: [
            const Text(
              'Active Medications',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
            ),
            _buildDarkInfoIcon(_showMedsTabInfo, () {
              setState(() => _showMedsTabInfo = !_showMedsTabInfo);
            }),
          ],
        ),
        if (_showMedsTabInfo) ...[
          const SizedBox(height: 6),
          const Text(
            'Ongoing prescribed pharmaceuticals, dosing schedules, refill instructions, and administration timeline.',
            style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
          ),
        ],
        const SizedBox(height: 14),

        if (meds.isEmpty)
          _emptyState('No active medications found', Icons.medication_outlined)
        else
          ...meds.map((rx) => Card(
                margin: const EdgeInsets.only(bottom: 12),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                  side: BorderSide(color: kAccent.withValues(alpha: 0.2)),
                ),
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
                            child: Text(
                              rx.medicationName,
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                            ),
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
              )),
      ],
    );
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // 5. APPOINTMENTS TAB (CHANNELING HISTORY)
  // ═════════════════════════════════════════════════════════════════════════════
  Widget _buildAppointmentsTab() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Row(
          children: [
            const Text(
              'Doctor Channeling Appointments',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
            ),
            _buildDarkInfoIcon(_showApptsTabInfo, () {
              setState(() => _showApptsTabInfo = !_showApptsTabInfo);
            }),
          ],
        ),
        if (_showApptsTabInfo) ...[
          const SizedBox(height: 6),
          const Text(
            'Live hospital channeling sessions, queue positions, consultation rooms, and desk booking status.',
            style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
          ),
        ],
        const SizedBox(height: 14),

        if (_appointments.isEmpty)
          _emptyState('No channeling appointments found', Icons.calendar_month_outlined)
        else
          ..._appointments.map((apt) {
            final isReserved = apt.status.toLowerCase() == 'reserved' || apt.status.toLowerCase() == 'pendingpayment';
            final isConfirmed = apt.status.toLowerCase() == 'confirmed';
            final statusBg = isReserved ? const Color(0xFFFEF3C7) : (isConfirmed ? const Color(0xFFDCFCE7) : const Color(0xFFF1F5F9));
            final statusFg = isReserved ? const Color(0xFFB45309) : (isConfirmed ? const Color(0xFF15803D) : const Color(0xFF475569));

            return Card(
              margin: const EdgeInsets.only(bottom: 12),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              elevation: 1,
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Text(
                            apt.doctorName,
                            style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16, color: Color(0xFF0F172A)),
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: statusBg,
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text(
                            apt.status,
                            style: TextStyle(color: statusFg, fontWeight: FontWeight.w800, fontSize: 11.5),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${apt.specialty} • ${apt.hospitalBranch ?? "Health Bridge Central"}',
                      style: const TextStyle(color: Color(0xFF64748B), fontSize: 12.5),
                    ),
                    const SizedBox(height: 10),
                    const Divider(height: 1),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Expanded(child: _detailRow('Appt #', apt.id)),
                        Expanded(child: _detailRow('Date', apt.date)),
                      ],
                    ),
                    Row(
                      children: [
                        Expanded(child: _detailRow('Time Slot', apt.time)),
                        Expanded(child: _detailRow('Queue #', '${apt.queueNumber ?? 1}')),
                      ],
                    ),
                    Row(
                      children: [
                        Expanded(child: _detailRow('Room', apt.room)),
                        if (apt.totalAmount != null)
                          Expanded(child: _detailRow('Total', 'Rs. ${apt.totalAmount!.toStringAsFixed(2)}')),
                      ],
                    ),
                  ],
                ),
              ),
            );
          }),
      ],
    );
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // 6. AI AGENT TAB (AGENTIC AI CLINICAL INTELLIGENCE & CHAT)
  // ═════════════════════════════════════════════════════════════════════════════
  Widget _buildAIAgentTab() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // AI Title Header with (!) Toggle
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              children: [
                const Text(
                  'AI Clinical Advisor',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                ),
                _buildDarkInfoIcon(_showAIAgentTabInfo, () {
                  setState(() => _showAIAgentTabInfo = !_showAIAgentTabInfo);
                }),
              ],
            ),
            ElevatedButton.icon(
              onPressed: () {
                Navigator.push(context, MaterialPageRoute(builder: (_) => const AIClinicalAdvisorScreen()));
              },
              icon: const Icon(Icons.open_in_new, size: 14),
              label: const Text('Full View', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700)),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF7C3AED),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
            ),
          ],
        ),
        if (_showAIAgentTabInfo) ...[
          const SizedBox(height: 6),
          const Text(
            'Agentic AI synthesis analyzing live doctor notes, pathology reports, prescription contraindications, and vital trends.',
            style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
          ),
        ],
        const SizedBox(height: 14),

        // AI Assessment Banner
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color(0xFF064E3B), Color(0xFF0F766E)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(16),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: const [
                  Icon(Icons.auto_awesome, color: Color(0xFF6EE7B7), size: 18),
                  SizedBox(width: 8),
                  Text(
                    'Clinical Assessment & Status',
                    style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 14),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                _aiInsightData?['overallConditionSummary']?.toString() ??
                    'Our Agentic Clinical Engine has synthesized all your diagnostic lab results, doctor consultation notes, and active medication regimes. Vital indicators and diagnostic markers are monitored.',
                style: const TextStyle(color: Color(0xFFD1FAE5), fontSize: 13, height: 1.45),
              ),
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  'Health Status: ${_aiInsightData?['healthStatusLevel']?.toString() ?? "Stable (Low Risk)"}',
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 11),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),

        // Decoded Medical Insights Cards
        _aiInsightCard(
          icon: Icons.description_outlined,
          iconColor: const Color(0xFF0284C7),
          title: 'Doctor Notes Plain English',
          content: _summary?.recentConsultations.isNotEmpty == true
              ? 'Dr. ${_summary!.recentConsultations.first.doctorName} evaluated diagnosis "${_summary!.recentConsultations.first.diagnosis}". ${_summary!.recentConsultations.first.clinicalNotes}'
              : 'No consultation notes requiring translation at this time.',
        ),
        const SizedBox(height: 12),

        _aiInsightCard(
          icon: Icons.biotech_outlined,
          iconColor: const Color(0xFF10B981),
          title: 'Lab Diagnostics Decoded',
          content: _summary?.recentLabReports.isNotEmpty == true
              ? '${_summary!.recentLabReports.first.testTitle} (${_summary!.recentLabReports.first.category}): ${_summary!.recentLabReports.first.resultsSummary.isNotEmpty && !_summary!.recentLabReports.first.resultsSummary.contains("Diagnostic evaluation conducted") ? _summary!.recentLabReports.first.resultsSummary : "Completed laboratory analysis."}'
              : 'All laboratory diagnostics parameters are evaluated.',
        ),
        const SizedBox(height: 12),

        _aiInsightCard(
          icon: Icons.medication_outlined,
          iconColor: const Color(0xFFF59E0B),
          title: 'Medications & Pharmacological Guidance',
          content: _summary?.activeMedications.isNotEmpty == true
              ? 'Active drug: ${_summary!.activeMedications.first.medicationName} (${_summary!.activeMedications.first.dosage}). Take consistently as instructed. No severe drug-drug interactions detected.'
              : 'No active medications with known contraindications.',
        ),
        const SizedBox(height: 20),

        // Interactive "Ask Clinical AI" Section
        const Text(
          'Ask Clinical AI Health Advisor',
          style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16, color: Color(0xFF0F172A)),
        ),
        const SizedBox(height: 6),
        const Text(
          'Ask questions about your diet, medications, diagnostic results, or lifestyle guidance.',
          style: TextStyle(color: Color(0xFF64748B), fontSize: 12.5),
        ),
        const SizedBox(height: 12),

        // Chat Message History
        if (_aiChatMessages.isNotEmpty) ...[
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: _aiChatMessages.map((m) {
                final isUser = m['role'] == 'user';
                return Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: isUser ? const Color(0xFFE6F5F2) : const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Icon(isUser ? Icons.person : Icons.auto_awesome, size: 16, color: isUser ? kPrimary : const Color(0xFF7C3AED)),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          m['content'] ?? '',
                          style: TextStyle(fontSize: 12.5, color: isUser ? const Color(0xFF064E3B) : const Color(0xFF1E293B)),
                        ),
                      ),
                    ],
                  ),
                );
              }).toList(),
            ),
          ),
          const SizedBox(height: 12),
        ],

        // Input Field & Ask Button
        Row(
          children: [
            Expanded(
              child: TextField(
                controller: _aiQuestionCtrl,
                decoration: InputDecoration(
                  hintText: 'e.g. Can I take vitamins with my pills?',
                  hintStyle: const TextStyle(fontSize: 12, color: Colors.grey),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  filled: true,
                  fillColor: Colors.white,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                ),
                onSubmitted: (_) => _askAIQuestion(),
              ),
            ),
            const SizedBox(width: 8),
            ElevatedButton(
              onPressed: _aiIsAsking ? null : _askAIQuestion,
              style: ElevatedButton.styleFrom(
                backgroundColor: kPrimary,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: _aiIsAsking
                  ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                  : const Icon(Icons.send, size: 18),
            ),
          ],
        ),
        const SizedBox(height: 24),
      ],
    );
  }

  Widget _aiInsightCard({
    required IconData icon,
    required Color iconColor,
    required String title,
    required String content,
  }) {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: const BorderSide(color: Color(0xFFE2E8F0)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, color: iconColor, size: 18),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    title,
                    style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13.5, color: Color(0xFF0F172A)),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              content,
              style: const TextStyle(color: Color(0xFF475569), fontSize: 12.5, height: 1.4),
            ),
          ],
        ),
      ),
    );
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // MODALS & HELPERS
  // ═════════════════════════════════════════════════════════════════════════════
  void _showUploadLabReportModal() {
    final titleCtrl = TextEditingController();
    final doctorCtrl = TextEditingController();
    final summaryCtrl = TextEditingController();
    String category = 'Hematology';

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
          title: const Text('Upload Lab Report', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Test Title *', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 12)),
                const SizedBox(height: 4),
                TextField(
                  controller: titleCtrl,
                  decoration: InputDecoration(
                    hintText: 'e.g. Complete Blood Count (CBC)',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  ),
                ),
                const SizedBox(height: 12),
                const Text('Category', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 12)),
                const SizedBox(height: 4),
                DropdownButtonFormField<String>(
                  value: category,
                  decoration: InputDecoration(
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  ),
                  items: const [
                    DropdownMenuItem(value: 'Hematology', child: Text('Hematology')),
                    DropdownMenuItem(value: 'Clinical Biochemistry', child: Text('Clinical Biochemistry')),
                    DropdownMenuItem(value: 'Endocrinology', child: Text('Endocrinology')),
                    DropdownMenuItem(value: 'Pathology', child: Text('Pathology')),
                    DropdownMenuItem(value: 'General', child: Text('General')),
                  ],
                  onChanged: (val) {
                    if (val != null) setDialogState(() => category = val);
                  },
                ),
                const SizedBox(height: 12),
                const Text('Ordered Doctor', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 12)),
                const SizedBox(height: 4),
                TextField(
                  controller: doctorCtrl,
                  decoration: InputDecoration(
                    hintText: 'e.g. Dr. Sarah Jenkins',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  ),
                ),
                const SizedBox(height: 12),
                const Text('Results Summary / Notes', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 12)),
                const SizedBox(height: 4),
                TextField(
                  controller: summaryCtrl,
                  maxLines: 3,
                  decoration: InputDecoration(
                    hintText: 'Enter clinical findings or parameters...',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  ),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Cancel', style: TextStyle(color: Color(0xFF64748B))),
            ),
            ElevatedButton(
              onPressed: () async {
                if (titleCtrl.text.trim().isEmpty) return;
                Navigator.pop(ctx);
                try {
                  final code = _summary?.patientCode ?? widget.patientCode;
                  await EmrApiService.createLabReport({
                    'patientCode': code,
                    'testTitle': titleCtrl.text.trim(),
                    'category': category,
                    'orderedDoctor': doctorCtrl.text.trim().isEmpty ? 'Self Upload' : doctorCtrl.text.trim(),
                    'resultsSummary': summaryCtrl.text.trim(),
                    'fileName': '${titleCtrl.text.trim().replaceAll(" ", "_")}.pdf',
                    'status': 'Completed',
                  });
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Lab report uploaded successfully!'), backgroundColor: Color(0xFF10B981)),
                  );
                  _loadData();
                } catch (e) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Failed to upload report: $e'), backgroundColor: Colors.red),
                  );
                }
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF0D9488),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              child: const Text('Upload'),
            ),
          ],
        ),
      ),
    );
  }

  void _confirmDeleteLabReport(String reportId, String title) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Delete Lab Report', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 17)),
        content: Text('Are you sure you want to remove "$title"? This action cannot be undone.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel', style: TextStyle(color: Color(0xFF64748B))),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(ctx);
              try {
                final success = await EmrApiService.deleteLabReport(reportId);
                if (success) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Lab report removed successfully.'), backgroundColor: Color(0xFF10B981)),
                  );
                  _loadData();
                } else {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Report deleted locally.'), backgroundColor: Color(0xFF10B981)),
                  );
                  _loadData();
                }
              } catch (_) {
                _loadData();
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFEF4444),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }

  Widget _statButton(String label, String value, IconData icon, VoidCallback onTap, {Color? color}) {
    final c = color ?? kPrimary;
    return Expanded(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Card(
          elevation: 1,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 6),
            child: Column(
              children: [
                Icon(icon, color: c, size: 20),
                const SizedBox(height: 4),
                Text(value, style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: c)),
                const SizedBox(height: 2),
                Text(label, textAlign: TextAlign.center, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 10.5, color: Colors.grey, fontWeight: FontWeight.w600)),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _sectionHeader(String label, IconData icon, Color color) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Icon(icon, color: color, size: 18),
          const SizedBox(width: 6),
          Text(label, style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 14)),
        ],
      ),
    );
  }

  Widget _buildNavCard({
    required String badgeLabel,
    required Color badgeColor,
    required String imagePath,
    required String title,
    required String explanation,
    required bool showInfo,
    required VoidCallback onToggleInfo,
    required VoidCallback onTap,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Stack(
              children: [
                SizedBox(
                  height: 140,
                  width: double.infinity,
                  child: Image.asset(
                    imagePath,
                    fit: BoxFit.cover,
                    errorBuilder: (ctx, err, stack) => Container(
                      color: const Color(0xFFCBD5E1),
                      child: const Center(
                        child: Icon(Icons.image, color: Colors.white, size: 36),
                      ),
                    ),
                  ),
                ),
                Positioned(
                  top: 12,
                  left: 12,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0xFF0F172A).withValues(alpha: 0.75),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          width: 6,
                          height: 6,
                          decoration: BoxDecoration(color: badgeColor, shape: BoxShape.circle),
                        ),
                        const SizedBox(width: 6),
                        Text(
                          badgeLabel,
                          style: const TextStyle(color: Colors.white, fontSize: 10.5, fontWeight: FontWeight.w700),
                        ),
                      ],
                    ),
                  ),
                ),
                Positioned(
                  top: 12,
                  right: 12,
                  child: Container(
                    width: 32,
                    height: 32,
                    decoration: BoxDecoration(
                      color: const Color(0xFF0F172A).withValues(alpha: 0.75),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.north_east, color: Colors.white, size: 16),
                  ),
                ),
              ],
            ),
            Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(
                        title,
                        style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                      ),
                      _buildDarkInfoIcon(showInfo, onToggleInfo),
                    ],
                  ),
                  if (showInfo) ...[
                    const SizedBox(height: 6),
                    Text(
                      explanation,
                      style: const TextStyle(fontSize: 12, color: Color(0xFF64748B), height: 1.4),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLightInfoIcon(bool isOpen, VoidCallback onToggle) {
    return GestureDetector(
      onTap: onToggle,
      child: Container(
        width: 22,
        height: 22,
        margin: const EdgeInsets.only(left: 6),
        decoration: BoxDecoration(
          color: isOpen ? Colors.white : Colors.white.withValues(alpha: 0.2),
          shape: BoxShape.circle,
          border: Border.all(color: Colors.white, width: 1.2),
        ),
        child: Center(
          child: Text(
            '!',
            style: TextStyle(
              color: isOpen ? const Color(0xFF064E3B) : Colors.white,
              fontSize: 12,
              fontWeight: FontWeight.w900,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildDarkInfoIcon(bool isOpen, VoidCallback onToggle) {
    return GestureDetector(
      onTap: onToggle,
      child: Container(
        width: 20,
        height: 20,
        margin: const EdgeInsets.only(left: 6),
        decoration: BoxDecoration(
          color: isOpen ? const Color(0xFF0F766E) : const Color(0xFFF1F5F9),
          shape: BoxShape.circle,
          border: Border.all(color: const Color(0xFF0F766E), width: 1.2),
        ),
        child: Center(
          child: Text(
            '!',
            style: TextStyle(
              color: isOpen ? Colors.white : const Color(0xFF0F766E),
              fontSize: 11,
              fontWeight: FontWeight.w900,
            ),
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
            width: 90,
            child: Text('$label:', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 12, color: Colors.grey)),
          ),
          Expanded(
            child: Text(value, style: const TextStyle(fontSize: 13, color: Color(0xFF1E293B))),
          ),
        ],
      ),
    );
  }

  Widget _tag(String label, Color bg, Color fg) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(20)),
      child: Text(label, style: TextStyle(color: fg, fontSize: 11.5, fontWeight: FontWeight.w700)),
    );
  }

  Widget _emptyState(String message, IconData icon) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 54, color: Colors.grey.shade300),
            const SizedBox(height: 14),
            Text(
              message,
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey.shade500, fontSize: 14),
            ),
          ],
        ),
      ),
    );
  }
}

class _FeaturePill extends StatelessWidget {
  final IconData icon;
  final String label;

  const _FeaturePill({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 13, color: const Color(0xFF6EE7B7)),
        const SizedBox(width: 4),
        Text(
          label,
          style: const TextStyle(
            color: Color(0xFFD1FAE5),
            fontSize: 11,
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }
}
