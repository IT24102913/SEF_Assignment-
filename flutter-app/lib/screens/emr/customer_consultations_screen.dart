import 'package:flutter/material.dart';
import '../../services/emr_api_service.dart';
import '../../utils/theme.dart';

class CustomerConsultationsScreen extends StatefulWidget {
  const CustomerConsultationsScreen({super.key});

  @override
  State<CustomerConsultationsScreen> createState() => _CustomerConsultationsScreenState();
}

class _CustomerConsultationsScreenState extends State<CustomerConsultationsScreen> {
  List<ConsultationNote> _allNotes = [];
  List<ConsultationNote> _filteredNotes = [];
  bool _isLoading = true;
  String? _error;
  String _searchQuery = '';
  final Set<String> _expandedIds = {};

  @override
  void initState() {
    super.initState();
    _loadNotes();
  }

  Future<void> _loadNotes() async {
    setState(() { _isLoading = true; _error = null; });
    try {
      final notes = await EmrApiService.getConsultations();
      setState(() {
        _allNotes = notes;
        _applySearch();
        _isLoading = false;
        // Expand first note by default for immediate preview
        if (notes.isNotEmpty) {
          _expandedIds.add(notes.first.id);
        }
      });
    } catch (e) {
      setState(() { _error = e.toString(); _isLoading = false; });
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
            const Text(
              'Consultation Notes',
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.w800,
                color: HealthBridgeTheme.textPrimary,
                letterSpacing: -0.5,
              ),
            ),
            const SizedBox(height: 4),
            const Text(
              'Your clinical consultation history, diagnoses, and doctor recommendations.',
              style: TextStyle(
                color: HealthBridgeTheme.textSecondary,
                fontSize: 13,
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
            else if (_error != null)
              _buildError()
            else if (_filteredNotes.isEmpty)
              _buildEmpty()
            else
              ..._filteredNotes.map(_buildConsultationCard),
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

  Widget _buildError() {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: HealthBridgeTheme.cardDecoration(radius: 14),
      child: Column(
        children: [
          const Icon(Icons.error_outline, size: 40, color: Colors.red),
          const SizedBox(height: 12),
          Text(_error ?? 'Could not load consultations', textAlign: TextAlign.center),
          const SizedBox(height: 12),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: HealthBridgeTheme.primaryTeal),
            onPressed: _loadNotes,
            child: const Text('Try Again', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }
}
