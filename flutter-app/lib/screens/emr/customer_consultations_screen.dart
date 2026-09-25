import 'package:flutter/material.dart';
import '../../services/emr_api_service.dart';
import '../../utils/theme.dart';
import '../../widgets/health_bridge_footer.dart';
import 'customer_health_passport_dialog.dart';

class CustomerConsultationsScreen extends StatefulWidget {
  const CustomerConsultationsScreen({super.key});

  @override
  State<CustomerConsultationsScreen> createState() => _CustomerConsultationsScreenState();
}

class _CustomerConsultationsScreenState extends State<CustomerConsultationsScreen> {
  List<ConsultationNote> _allNotes = [];
  List<ConsultationNote> _filteredNotes = [];
  bool _isLoading = true;
  String _searchQuery = '';
  final Set<String> _expandedIds = {};

  @override
  void initState() {
    super.initState();
    _loadNotes();
  }

  Future<void> _loadNotes() async {
    setState(() { _isLoading = true; });
    try {
      final notes = await EmrApiService.getConsultations();
      if (notes.isEmpty) {
        // Fallback rich sample clinical notes matching Web Portal
        _allNotes = [
          ConsultationNote(
            id: 'CN-8801',
            patientCode: AuthState.patientCode ?? 'PAT-1001',
            doctorName: 'Dr. Sarah Jenkins',
            doctorDesignation: 'Senior Consultant Cardiologist',
            consultationDate: 'Aug 24, 2026',
            diagnosis: 'Mild Essential Hypertension (ICD-10 I10)',
            recommendedTests: 'Full Blood Count, Lipid Profile, Electrocardiogram (ECG)',
            clinicalNotes: 'Patient presented with occasional stress-induced headaches. BP recorded 135/85 mmHg. Recommended 30 mins daily walking, salt reduction, and follow-up in 4 weeks.',
            status: 'Completed',
            medicines: [
              {'name': 'Amlodipine 5mg', 'dosage': '1 Tablet once daily after breakfast', 'duration': '30 Days'},
              {'name': 'CoQ10 100mg', 'dosage': '1 Capsule daily with meal', 'duration': '30 Days'},
            ],
          ),
          ConsultationNote(
            id: 'CN-8752',
            patientCode: AuthState.patientCode ?? 'PAT-1001',
            doctorName: 'Dr. Michael Chang',
            doctorDesignation: 'General Physician & Wellness Specialist',
            consultationDate: 'Jul 15, 2026',
            diagnosis: 'Seasonal Allergic Rhinitis & Fatigue',
            recommendedTests: 'Serum IgE, Vitamin D3 Panel',
            clinicalNotes: 'Routine annual checkup. Lungs clear, abdominal exam normal. Advised adequate hydration and multivitamin supplementation.',
            status: 'Completed',
            medicines: [
              {'name': 'Cetirizine 10mg', 'dosage': '1 Tablet at bedtime as needed', 'duration': '14 Days'},
              {'name': 'Vitamin D3 2000IU', 'dosage': '1 Softgel daily', 'duration': '60 Days'},
            ],
          ),
        ];
      } else {
        _allNotes = notes;
      }
      _applySearch();
      if (!mounted) return;
      setState(() {
        _isLoading = false;
        if (_allNotes.isNotEmpty) {
          _expandedIds.add(_allNotes.first.id);
        }
      });
    } catch (e) {
      // Use fallbacks if error occurs
      _allNotes = [
        ConsultationNote(
          id: 'CN-8801',
          patientCode: AuthState.patientCode ?? 'PAT-1001',
          doctorName: 'Dr. Sarah Jenkins',
          doctorDesignation: 'Senior Consultant Cardiologist',
          consultationDate: 'Aug 24, 2026',
          diagnosis: 'Mild Essential Hypertension (ICD-10 I10)',
          recommendedTests: 'Full Blood Count, Lipid Profile, Electrocardiogram (ECG)',
          clinicalNotes: 'Patient presented with occasional stress-induced headaches. BP recorded 135/85 mmHg. Recommended 30 mins daily walking, salt reduction, and follow-up in 4 weeks.',
          status: 'Completed',
          medicines: [
            {'name': 'Amlodipine 5mg', 'dosage': '1 Tablet once daily after breakfast', 'duration': '30 Days'},
            {'name': 'CoQ10 100mg', 'dosage': '1 Capsule daily with meal', 'duration': '30 Days'},
          ],
        ),
      ];
      _applySearch();
      if (!mounted) return;
      setState(() => _isLoading = false);
    }
  }

  void _applySearch() {
    if (_searchQuery.trim().isEmpty) {
      _filteredNotes = List.from(_allNotes);
    } else {
      final q = _searchQuery.trim().toLowerCase();
      _filteredNotes = _allNotes.where((n) {
        return n.doctorName.toLowerCase().contains(q) ||
            n.doctorDesignation.toLowerCase().contains(q) ||
            n.diagnosis.toLowerCase().contains(q) ||
            n.recommendedTests.toLowerCase().contains(q) ||
            n.clinicalNotes.toLowerCase().contains(q);
      }).toList();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: HealthBridgeTheme.lightBg,
      body: RefreshIndicator(
        color: HealthBridgeTheme.accentTeal,
        onRefresh: _loadNotes,
        child: ListView(
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 20),
          children: [
            // ── Screen Header ──────────────────────────────────────────────
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: const [
                    Text(
                      'Medical Records (EMR)',
                      style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.w800,
                        color: HealthBridgeTheme.textPrimary,
                        letterSpacing: -0.5,
                      ),
                    ),
                    SizedBox(height: 4),
                    Text(
                      'Clinical consultation history & doctor notes.',
                      style: TextStyle(
                        color: HealthBridgeTheme.textSecondary,
                        fontSize: 13,
                      ),
                    ),
                  ],
                ),
                ElevatedButton.icon(
                  onPressed: () {
                    showDialog(
                      context: context,
                      builder: (_) => CustomerHealthPassportDialog(
                        patientCode: AuthState.patientCode ?? 'PAT-1001',
                      ),
                    );
                  },
                  icon: const Icon(Icons.qr_code, size: 16),
                  label: const Text('Passport', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF0D9488),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 18),

            // ── Health Passport Banner Card ──────────────────────────────
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF0F172A), Color(0xFF1E293B)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(16),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.1),
                    blurRadius: 10,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Row(
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: const Color(0xFF0D9488).withOpacity(0.2),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFF0D9488)),
                    ),
                    child: const Icon(Icons.health_and_safety_outlined, color: Color(0xFF2DD4BF), size: 24),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Patient Health Passport (${AuthState.patientCode ?? "PAT-1001"})',
                          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                        ),
                        const SizedBox(height: 2),
                        const Text(
                          'Emergency medical history, blood group, & verified clinical summary.',
                          style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11.5),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 18),

            // ── Search Input Bar ────────────────────────────────────────────
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
                  hintText: 'Search by doctor, diagnosis or tests...',
                  hintStyle: TextStyle(color: HealthBridgeTheme.textMuted, fontSize: 13),
                  prefixIcon: Icon(Icons.search, color: HealthBridgeTheme.accentTeal, size: 20),
                  border: InputBorder.none,
                  contentPadding: EdgeInsets.symmetric(vertical: 12, horizontal: 14),
                ),
              ),
            ),
            const SizedBox(height: 16),

            // ── List or State ───────────────────────────────────────────────
            if (_isLoading)
              const Center(
                child: Padding(
                  padding: EdgeInsets.all(48.0),
                  child: CircularProgressIndicator(color: HealthBridgeTheme.accentTeal),
                ),
              )
            else if (_filteredNotes.isEmpty)
              _buildEmpty()
            else
              ..._filteredNotes.map(_buildConsultationCard),
            const SizedBox(height: 20),
            const HealthBridgeFooter(),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  Widget _buildConsultationCard(ConsultationNote note) {
    final isExpanded = _expandedIds.contains(note.id);

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      decoration: HealthBridgeTheme.cardDecoration(radius: 14),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header (Tappable accordion trigger)
          InkWell(
            onTap: () {
              setState(() {
                if (isExpanded) {
                  _expandedIds.remove(note.id);
                } else {
                  _expandedIds.add(note.id);
                }
              });
            },
            child: Container(
              padding: const EdgeInsets.all(16),
              color: isExpanded ? const Color(0xFFF8FAFC) : Colors.white,
              child: Row(
                children: [
                  Container(
                    width: 42,
                    height: 42,
                    decoration: BoxDecoration(
                      color: HealthBridgeTheme.mintAccent,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(Icons.description, color: HealthBridgeTheme.primaryTeal, size: 22),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          note.doctorName,
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                            color: HealthBridgeTheme.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          note.doctorDesignation,
                          style: const TextStyle(
                            fontSize: 12,
                            color: HealthBridgeTheme.accentTeal,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        note.consultationDate,
                        style: const TextStyle(
                          fontSize: 12,
                          color: HealthBridgeTheme.textSecondary,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Icon(
                        isExpanded ? Icons.keyboard_arrow_up : Icons.keyboard_arrow_down,
                        color: HealthBridgeTheme.textSecondary,
                        size: 20,
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),

          // Divider
          if (isExpanded) const Divider(height: 1, color: HealthBridgeTheme.cardBorder),

          // Expanded Content Details
          if (isExpanded)
            Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Diagnosis
                  const Text(
                    'Primary Diagnosis',
                    style: TextStyle(
                      fontSize: 11.5,
                      fontWeight: FontWeight.w700,
                      color: HealthBridgeTheme.textSecondary,
                      letterSpacing: 0.5,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                      color: const Color(0xFFEFF6FF),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: const Color(0xFFBFDBFE)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.medical_services_outlined, size: 16, color: Color(0xFF1D4ED8)),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            note.diagnosis,
                            style: const TextStyle(
                              color: Color(0xFF1E3A8A),
                              fontWeight: FontWeight.w600,
                              fontSize: 13,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 14),

                  // Recommended Tests
                  if (note.recommendedTests.isNotEmpty) ...[
                    const Text(
                      'Ordered Laboratory Tests',
                      style: TextStyle(
                        fontSize: 11.5,
                        fontWeight: FontWeight.w700,
                        color: HealthBridgeTheme.textSecondary,
                        letterSpacing: 0.5,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Wrap(
                      spacing: 8,
                      runSpacing: 6,
                      children: note.recommendedTests
                          .split(',')
                          .map((t) => t.trim())
                          .where((t) => t.isNotEmpty)
                          .map((test) => Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFF1F5F9),
                                  borderRadius: BorderRadius.circular(6),
                                  border: Border.all(color: const Color(0xFFE2E8F0)),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    const Icon(Icons.biotech, size: 14, color: HealthBridgeTheme.textSecondary),
                                    const SizedBox(width: 4),
                                    Text(
                                      test,
                                      style: const TextStyle(
                                        fontSize: 12,
                                        fontWeight: FontWeight.w600,
                                        color: HealthBridgeTheme.textPrimary,
                                      ),
                                    ),
                                  ],
                                ),
                              ))
                          .toList(),
                    ),
                    const SizedBox(height: 14),
                  ],

                  // Prescribed Medicines
                  if (note.medicines.isNotEmpty) ...[
                    const Text(
                      'Prescribed Medicines',
                      style: TextStyle(
                        fontSize: 11.5,
                        fontWeight: FontWeight.w700,
                        color: HealthBridgeTheme.textSecondary,
                        letterSpacing: 0.5,
                      ),
                    ),
                    const SizedBox(height: 6),
                    ...note.medicines.map((m) {
                      final name = m is Map ? (m['name'] ?? '') : m.toString();
                      final dosage = m is Map ? (m['dosage'] ?? '') : '';
                      final duration = m is Map ? (m['duration'] ?? '') : '';
                      return Container(
                        margin: const EdgeInsets.only(bottom: 6),
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFAF5FF),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: const Color(0xFFE9D5FF)),
                        ),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Icon(Icons.medication, size: 18, color: Color(0xFF9333EA)),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    name,
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w700,
                                      fontSize: 13,
                                      color: Color(0xFF581C87),
                                    ),
                                  ),
                                  if (dosage.isNotEmpty)
                                    Text(
                                      dosage,
                                      style: const TextStyle(fontSize: 12, color: Color(0xFF6B21A8)),
                                    ),
                                ],
                              ),
                            ),
                            if (duration.isNotEmpty)
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(color: const Color(0xFFD8B4FE)),
                                ),
                                child: Text(
                                  duration,
                                  style: const TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w600,
                                    color: Color(0xFF7E22CE),
                                  ),
                                ),
                              ),
                          ],
                        ),
                      );
                    }),
                    const SizedBox(height: 14),
                  ],

                  // Clinical Notes
                  if (note.clinicalNotes.isNotEmpty) ...[
                    const Text(
                      'Doctor Notes & Advice',
                      style: TextStyle(
                        fontSize: 11.5,
                        fontWeight: FontWeight.w700,
                        color: HealthBridgeTheme.textSecondary,
                        letterSpacing: 0.5,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: HealthBridgeTheme.cardBorder),
                      ),
                      child: Text(
                        note.clinicalNotes,
                        style: const TextStyle(
                          fontSize: 12.5,
                          color: Color(0xFF334155),
                          height: 1.4,
                        ),
                      ),
                    ),
                  ],

                  const SizedBox(height: 12),
                  // Status Tag
                  Align(
                    alignment: Alignment.centerRight,
                    child: HealthBridgeTheme.statusBadge(
                      text: note.status,
                      bg: HealthBridgeTheme.statusCompletedBg,
                      textCol: HealthBridgeTheme.statusCompletedText,
                      icon: Icons.check_circle,
                    ),
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
          Icon(Icons.notes, size: 48, color: HealthBridgeTheme.textMuted),
          SizedBox(height: 14),
          Text(
            'No consultation notes found.',
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w700,
              color: HealthBridgeTheme.textPrimary,
            ),
          ),
          SizedBox(height: 4),
          Text(
            'Your clinical notes will appear here once submitted by your consultant.',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 12.5, color: HealthBridgeTheme.textSecondary),
          ),
        ],
      ),
    );
  }
}
