import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../services/doctor_api_service.dart';
import '../../utils/theme.dart';
import '../../widgets/health_bridge_footer.dart';
import 'specialist_list_screen.dart';
import 'my_appointments_screen.dart';

class DoctorSearchScreen extends StatefulWidget {
  const DoctorSearchScreen({super.key});

  @override
  State<DoctorSearchScreen> createState() => _DoctorSearchScreenState();
}

class _DoctorSearchScreenState extends State<DoctorSearchScreen> with SingleTickerProviderStateMixin {
  final TextEditingController _searchCtrl = TextEditingController();
  final TextEditingController _symptomCtrl = TextEditingController();
  final FocusNode _symptomFocusNode = FocusNode();

  late AnimationController _mascotAnimCtrl;
  late Animation<double> _mascotFloatAnim;

  String _selectedSpecialty = 'ALL';
  String _selectedHospital = 'ALL';
  DateTime? _selectedDate;

  List<SpecialtyCount> _specialties = [];
  bool _loading = true;
  bool _aiLoading = false;
  DoctorRecommendationResult? _aiResult;

  final List<String> _fixedSpecialties = [
    'ALL',
    'Cardiology',
    'Neurology',
    'Orthopaedics',
    'Paediatrics',
    'Gynaecology',
    'Dermatology',
    'ENT',
    'General Medicine'
  ];

  @override
  void initState() {
    super.initState();
    _mascotAnimCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2400),
    )..repeat(reverse: true);

    _mascotFloatAnim = Tween<double>(begin: 0.0, end: -8.0).animate(
      CurvedAnimation(parent: _mascotAnimCtrl, curve: Curves.easeInOut),
    );

    _fetchSpecialties();
  }

  @override
  void dispose() {
    _mascotAnimCtrl.dispose();
    _searchCtrl.dispose();
    _symptomCtrl.dispose();
    _symptomFocusNode.dispose();
    super.dispose();
  }

  Future<void> _fetchSpecialties() async {
    try {
      final list = await DoctorApiService.getSpecialties();
      if (mounted) {
        setState(() {
          _specialties = list;
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _handleAiTriage() async {
    final text = _symptomCtrl.text.trim();
    if (text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please describe your symptoms')),
      );
      return;
    }

    final words = text.split(RegExp(r'\s+')).where((w) => w.isNotEmpty).toList();
    if (words.length < 2) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please describe symptoms in 2 or more words (e.g. "chest tightness")')),
      );
      return;
    }

    FocusScope.of(context).unfocus();
    setState(() {
      _aiLoading = true;
      _aiResult = null;
    });

    try {
      final res = await DoctorApiService.recommendDoctor(text);
      if (mounted) {
        setState(() {
          _aiResult = res;
          _aiLoading = false;
        });
        HapticFeedback.lightImpact();
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _aiResult = DoctorRecommendationResult(
            status: 'SAFE_FAILURE',
            reason: 'Could not connect to Clinical AI Assistant. Please select manually.',
          );
          _aiLoading = false;
        });
      }
    }
  }

  void _navigateToSpecialists({String? specialty, String? search}) {
    HapticFeedback.lightImpact();
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => SpecialistListScreen(
          initialSearch: search ?? _searchCtrl.text.trim(),
          initialSpecialty: specialty ?? _selectedSpecialty,
          initialHospital: _selectedHospital,
          initialDate: _selectedDate != null
              ? '${_selectedDate!.year}-${_selectedDate!.month.toString().padLeft(2, '0')}-${_selectedDate!.day.toString().padLeft(2, '0')}'
              : null,
        ),
      ),
    );
  }

  Future<void> _pickDate() async {
    HapticFeedback.lightImpact();
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate ?? now,
      firstDate: now,
      lastDate: now.add(const Duration(days: 30)),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.light(
              primary: kPrimary,
              onPrimary: Colors.white,
              onSurface: kText,
            ),
          ),
          child: child!,
        );
      },
    );
    if (picked != null && mounted) {
      setState(() => _selectedDate = picked);
    }
  }

  IconData _getSpecialtyIcon(String name) {
    switch (name) {
      case 'Cardiology': return Icons.favorite_outline;
      case 'Neurology': return Icons.psychology_outlined;
      case 'Orthopaedics': return Icons.accessibility_new_outlined;
      case 'Paediatrics': return Icons.child_care_outlined;
      case 'Gynaecology': return Icons.pregnant_woman_outlined;
      case 'Dermatology': return Icons.clean_hands_outlined;
      case 'ENT': return Icons.hearing_outlined;
      case 'General Medicine': return Icons.medical_services_outlined;
      default: return Icons.local_hospital_outlined;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: kBg,
      appBar: AppBar(
        backgroundColor: kPrimaryDark,
        foregroundColor: Colors.white,
        elevation: 0,
        title: const Text('Doctor Channeling', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
        actions: [
          IconButton(
            icon: const Icon(Icons.calendar_month_outlined),
            tooltip: 'My Appointments',
            onPressed: () {
              HapticFeedback.lightImpact();
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const MyAppointmentsScreen()),
              );
            },
          ),
        ],
      ),
      bottomNavigationBar: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: Colors.white,
          border: const Border(top: BorderSide(color: kBorder)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.05),
              blurRadius: 10,
              offset: const Offset(0, -2),
            ),
          ],
        ),
        child: SafeArea(
          child: SizedBox(
            height: 48,
            child: ElevatedButton.icon(
              onPressed: () => _navigateToSpecialists(),
              icon: const Icon(Icons.search, size: 20),
              label: const Text('Search Specialists', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
              style: ElevatedButton.styleFrom(
                backgroundColor: kPrimary,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                elevation: 0,
              ),
            ),
          ),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Channeling Desk Banner
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                gradient: const LinearGradient(colors: [Color(0xFF004D40), Color(0xFF00796B)]),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  const CircleAvatar(
                    backgroundColor: Color(0xFF80CBC4),
                    child: Icon(Icons.phone_in_talk, color: Color(0xFF004D40), size: 20),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: const [
                        Text(
                          '24/7 Channeling Desk Assistance',
                          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                        ),
                        Text(
                          '+94 76 447 7999 • Colombo & Kandy',
                          style: TextStyle(color: Color(0xFFB2DFDB), fontSize: 11),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Search Filter Card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: kBorder),
                boxShadow: const [
                  BoxShadow(color: Color(0x06000000), blurRadius: 6, offset: Offset(0, 2)),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: const Color(0xFFE0F2F1),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: const Text('SEARCH', style: TextStyle(color: kPrimaryDark, fontWeight: FontWeight.w800, fontSize: 10)),
                      ),
                      const SizedBox(width: 8),
                      const Text(
                        'Find Your Consultant',
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: kPrimaryDark),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),

                  // Doctor Name Field
                  TextField(
                    controller: _searchCtrl,
                    decoration: InputDecoration(
                      hintText: 'Doctor name or keyword...',
                      prefixIcon: const Icon(Icons.search, color: kPrimary),
                      filled: true,
                      fillColor: const Color(0xFFF9FAFB),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: kBorder)),
                      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: kBorder)),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                    ),
                  ),
                  const SizedBox(height: 12),

                  // Specialization Dropdown
                  DropdownButtonFormField<String>(
                    initialValue: _selectedSpecialty,
                    decoration: InputDecoration(
                      labelText: 'Specialization',
                      filled: true,
                      fillColor: const Color(0xFFF9FAFB),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: kBorder)),
                      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: kBorder)),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                    ),
                    items: _fixedSpecialties.map((s) {
                      return DropdownMenuItem(value: s, child: Text(s == 'ALL' ? 'All Specialties' : s, style: const TextStyle(fontSize: 13)));
                    }).toList(),
                    onChanged: (val) {
                      if (val != null) setState(() => _selectedSpecialty = val);
                    },
                  ),
                  const SizedBox(height: 12),

                  // Hospital Branch Dropdown
                  DropdownButtonFormField<String>(
                    initialValue: _selectedHospital,
                    decoration: InputDecoration(
                      labelText: 'Hospital Branch',
                      filled: true,
                      fillColor: const Color(0xFFF9FAFB),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: kBorder)),
                      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: kBorder)),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                    ),
                    items: const [
                      DropdownMenuItem(value: 'ALL', child: Text('All Hospitals', style: TextStyle(fontSize: 13))),
                      DropdownMenuItem(value: 'Colombo', child: Text('Health Bridge Hospital - Colombo', style: TextStyle(fontSize: 13))),
                      DropdownMenuItem(value: 'Kandy', child: Text('Health Bridge Hospital - Kandy', style: TextStyle(fontSize: 13))),
                    ],
                    onChanged: (val) {
                      if (val != null) setState(() => _selectedHospital = val);
                    },
                  ),
                  const SizedBox(height: 12),

                  // Date Picker Field
                  InkWell(
                    onTap: _pickDate,
                    borderRadius: BorderRadius.circular(10),
                    child: Container(
                      constraints: const BoxConstraints(minHeight: 48),
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF9FAFB),
                        border: Border.all(color: kBorder),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.calendar_today, size: 18, color: kPrimary),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              _selectedDate == null
                                  ? 'Pick appointment date (optional)'
                                  : '${_selectedDate!.year}-${_selectedDate!.month.toString().padLeft(2, '0')}-${_selectedDate!.day.toString().padLeft(2, '0')}',
                              style: TextStyle(
                                color: _selectedDate == null ? Colors.grey.shade600 : kText,
                                fontSize: 13,
                                fontWeight: _selectedDate == null ? FontWeight.normal : FontWeight.w600,
                              ),
                            ),
                          ),
                          if (_selectedDate != null)
                            GestureDetector(
                              onTap: () {
                                HapticFeedback.lightImpact();
                                setState(() => _selectedDate = null);
                              },
                              child: const Icon(Icons.clear, size: 18, color: Colors.grey),
                            ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 18),

            // Smart Specialist Matcher Card with Mascot
            _buildSmartSpecialistMatcherCard(),
            const SizedBox(height: 24),

            // Browse by Specialty Grid Header
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Browse by Specialty',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: kPrimaryDark),
                ),
                Text(
                  '${_specialties.length} Categories',
                  style: const TextStyle(fontSize: 12, color: kPrimary, fontWeight: FontWeight.w700),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Specialty Cards Grid
            _loading
                ? const Center(child: Padding(padding: EdgeInsets.all(32.0), child: CircularProgressIndicator()))
                : GridView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      crossAxisSpacing: 10,
                      mainAxisSpacing: 10,
                      childAspectRatio: 1.45,
                    ),
                    itemCount: _specialties.length,
                    itemBuilder: (context, index) {
                      final item = _specialties[index];
                      return InkWell(
                        onTap: () => _navigateToSpecialists(specialty: item.name),
                        borderRadius: BorderRadius.circular(12),
                        child: Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: kBorder),
                            boxShadow: const [
                              BoxShadow(color: Color(0x06000000), blurRadius: 4, offset: Offset(0, 1)),
                            ],
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              CircleAvatar(
                                radius: 16,
                                backgroundColor: const Color(0xFFE0F2F1),
                                child: Icon(_getSpecialtyIcon(item.name), size: 18, color: kPrimary),
                              ),
                              const Spacer(),
                              Text(
                                item.name,
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: kText),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                              const SizedBox(height: 2),
                              Text(
                                '${item.consultantCount} Available',
                                style: const TextStyle(fontSize: 11, color: kPrimary, fontWeight: FontWeight.w700),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
            const SizedBox(height: 24),
            const HealthBridgeFooter(),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  Widget _buildSmartSpecialistMatcherCard() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFA7F3D0), width: 1.5),
        boxShadow: const [
          BoxShadow(
            color: Color(0x0A059669),
            blurRadius: 12,
            offset: Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header Row: Circular Mascot Avatar on Left + [AI] Meet Clinical AI + CLINICAL AI AGENT Pill
          Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              // Circular Avatar with Soft Mint Green Background
              Container(
                width: 60,
                height: 60,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: const Color(0xFFE8F5E9),
                  border: Border.all(color: const Color(0xFFA7F3D0), width: 1.5),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF10B981).withValues(alpha: 0.12),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: Center(
                  child: AnimatedBuilder(
                    animation: _mascotAnimCtrl,
                    builder: (context, child) {
                      return Transform.translate(
                        offset: Offset(0, _mascotFloatAnim.value * 0.4),
                        child: child,
                      );
                    },
                    child: Image.asset(
                      'assets/images/doctor-agent.png',
                      width: 44,
                      height: 44,
                      fit: BoxFit.contain,
                      errorBuilder: (_, _, _) => const Icon(
                        Icons.smart_toy_rounded,
                        size: 34,
                        color: Color(0xFF059669),
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 14),

              // Title and Badges Column
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Line 1: [AI] Tag + Meet Smart
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                          decoration: BoxDecoration(
                            color: const Color(0xFF10B981),
                            borderRadius: BorderRadius.circular(5),
                          ),
                          child: const Text(
                            'AI',
                            style: TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w900,
                              fontSize: 11,
                              letterSpacing: 0.2,
                            ),
                          ),
                        ),
                        const SizedBox(width: 6),
                        const Flexible(
                          child: Text(
                            'Meet Smart',
                            style: TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF0F172A),
                              letterSpacing: -0.2,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 2),

                    // Line 2: Specialist Matcher
                    const Text(
                      'Specialist Matcher',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF064E3B),
                        letterSpacing: -0.3,
                      ),
                    ),
                    const SizedBox(height: 4),

                    // Line 3: CLINICAL AI AGENT Pill Badge
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2.5),
                      decoration: BoxDecoration(
                        color: const Color(0xFFE2E8F0),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: const Text(
                        'CLINICAL AI AGENT',
                        style: TextStyle(
                          fontSize: 9.5,
                          fontWeight: FontWeight.w800,
                          color: Color(0xFF475569),
                          letterSpacing: 0.5,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),

          const SizedBox(height: 12),

          // Clean, full-width guidance description
          const Text(
            'Unsure which department to consult? Describe your symptoms in 2 or more words (e.g. "severe chest tightness" or "knee joint pain") and our AI clinical agent will recommend the right specialty.',
            style: TextStyle(
              fontSize: 12.5,
              color: Color(0xFF065F46),
              height: 1.45,
            ),
          ),

          const SizedBox(height: 14),

          // Symptom Input & Match Button
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _symptomCtrl,
                  focusNode: _symptomFocusNode,
                  onChanged: (_) => setState(() {}),
                  decoration: InputDecoration(
                    hintText: 'e.g. sharp abdominal pain, eye redness...',
                    hintStyle: TextStyle(fontSize: 12.5, color: Colors.grey.shade500),
                    prefixIcon: const Icon(Icons.edit_note_rounded, size: 20, color: Color(0xFF059669)),
                    suffixIcon: _symptomCtrl.text.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.cancel_rounded, size: 18, color: Colors.grey),
                            onPressed: () {
                              HapticFeedback.lightImpact();
                              setState(() {
                                _symptomCtrl.clear();
                                _aiResult = null;
                              });
                            },
                          )
                        : null,
                    filled: true,
                    fillColor: const Color(0xFFF9FAFB),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                      borderSide: const BorderSide(color: Color(0xFF6EE7B7), width: 1.5),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                      borderSide: const BorderSide(color: Color(0xFF6EE7B7), width: 1.5),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                      borderSide: const BorderSide(color: Color(0xFF10B981), width: 2),
                    ),
                  ),
                  style: const TextStyle(fontSize: 13, color: Color(0xFF064E3B), fontWeight: FontWeight.w500),
                  onSubmitted: (_) => _handleAiTriage(),
                ),
              ),
              const SizedBox(width: 8),
              SizedBox(
                height: 48,
                child: ElevatedButton.icon(
                  onPressed: _aiLoading ? null : _handleAiTriage,
                  icon: _aiLoading
                      ? const SizedBox(
                          width: 14,
                          height: 14,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                        )
                      : const Icon(Icons.auto_awesome, size: 16),
                  label: Text(
                    _aiLoading ? 'Matching' : 'Match',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF059669),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(horizontal: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    elevation: 0,
                  ),
                ),
              ),
            ],
          ),

          // AI Response Display
          if (_aiResult != null) ...[
            const SizedBox(height: 14),
            _buildAiResultWidget(_aiResult!),
          ],
        ],
      ),
    );
  }

  Widget _buildAiResultWidget(DoctorRecommendationResult res) {
    if (res.status == 'SAFETY_ESCALATION') {
      return Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: const Color(0xFFFEF2F2),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFFF87171), width: 1.5),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: const [
                Icon(Icons.warning_amber_rounded, color: Color(0xFFDC2626), size: 20),
                SizedBox(width: 8),
                Text('⚠️ Emergency Alert', style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF991B1B), fontSize: 13)),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              res.safetyMessage ?? 'These symptoms may require immediate medical attention.',
              style: const TextStyle(fontSize: 12.5, color: Color(0xFF7F1D1D), height: 1.45),
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              height: 42,
              child: ElevatedButton.icon(
                onPressed: () async {
                  final uri = Uri.parse('tel:+94764477999');
                  if (await canLaunchUrl(uri)) await launchUrl(uri);
                },
                icon: const Icon(Icons.phone, size: 16),
                label: const Text('Call Emergency Hotline (+94 76 447 7999)'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFDC2626),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  elevation: 0,
                  textStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                ),
              ),
            ),
          ],
        ),
      );
    }

    if (res.status == 'NEED_MORE_CONTEXT') {
      return Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: const Color(0xFFF0F7FF),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFFBFDBFE), width: 1.2),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFF1D4ED8).withValues(alpha: 0.04),
              blurRadius: 6,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: const [
                Icon(Icons.help_outline_rounded, color: Color(0xFF1D4ED8), size: 20),
                SizedBox(width: 8),
                Text(
                  'Need a bit more detail',
                  style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF1E40AF), fontSize: 13),
                ),
              ],
            ),
            if (res.reason != null && res.reason!.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(
                res.reason!,
                style: const TextStyle(fontSize: 12.5, color: Color(0xFF1E3A8A), height: 1.45),
              ),
            ],
            if (res.followUpQuestions.isNotEmpty) ...[
              const SizedBox(height: 12),
              const Text(
                'Tap a clarifying question below to add details to your symptoms:',
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF2563EB)),
              ),
              const SizedBox(height: 8),
              Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: res.followUpQuestions.asMap().entries.map((entry) {
                  final idx = entry.key + 1;
                  final q = entry.value;
                  return Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: const Color(0xFFBFDBFE)),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFF1D4ED8).withValues(alpha: 0.03),
                          blurRadius: 4,
                          offset: const Offset(0, 1),
                        ),
                      ],
                    ),
                    child: Material(
                      color: Colors.transparent,
                      borderRadius: BorderRadius.circular(10),
                      child: InkWell(
                        borderRadius: BorderRadius.circular(10),
                        onTap: () {
                          HapticFeedback.lightImpact();
                          setState(() {
                            if (_symptomCtrl.text.trim().isEmpty) {
                              _symptomCtrl.text = q;
                            } else if (!_symptomCtrl.text.contains(q)) {
                              _symptomCtrl.text = '${_symptomCtrl.text.trim()}, $q';
                            }
                          });
                          _symptomFocusNode.requestFocus();
                          ScaffoldMessenger.of(context).hideCurrentSnackBar();
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('Detail added to symptoms. Tap Match to re-evaluate.'),
                              duration: Duration(seconds: 2),
                              behavior: SnackBarBehavior.floating,
                            ),
                          );
                        },
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Container(
                                width: 22,
                                height: 22,
                                alignment: Alignment.center,
                                margin: const EdgeInsets.only(top: 1),
                                decoration: const BoxDecoration(
                                  color: Color(0xFFDBEAFE),
                                  shape: BoxShape.circle,
                                ),
                                child: Text(
                                  '$idx',
                                  style: const TextStyle(
                                    fontSize: 10.5,
                                    fontWeight: FontWeight.bold,
                                    color: Color(0xFF1D4ED8),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Text(
                                  q,
                                  style: const TextStyle(
                                    fontSize: 12.5,
                                    fontWeight: FontWeight.w500,
                                    color: Color(0xFF1E3A8A),
                                    height: 1.45,
                                  ),
                                  softWrap: true,
                                ),
                              ),
                              const SizedBox(width: 8),
                              const Icon(
                                Icons.add_circle_outline_rounded,
                                size: 18,
                                color: Color(0xFF3B82F6),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
            ],
          ],
        ),
      );
    }

    if (res.status == 'RECOMMENDATION_READY' && res.specialty != null) {
      final confidencePercent = res.confidence != null ? (res.confidence! * 100).round() : 90;
      return Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFF16A34A), width: 1.5),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFF16A34A).withValues(alpha: 0.08),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Row(
                    children: [
                      const Icon(Icons.check_circle_rounded, color: Color(0xFF16A34A), size: 20),
                      const SizedBox(width: 8),
                      Flexible(
                        child: Text(
                          'Suggested: ${res.specialty}',
                          style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF14532D), fontSize: 14),
                        ),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: const Color(0xFFDCFCE7),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    '$confidencePercent% match',
                    style: const TextStyle(color: Color(0xFF166534), fontWeight: FontWeight.bold, fontSize: 10.5),
                  ),
                ),
              ],
            ),
            if (res.reason != null && res.reason!.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(res.reason!, style: const TextStyle(fontSize: 12.5, color: Color(0xFF334155), height: 1.45)),
            ],
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              height: 42,
              child: ElevatedButton.icon(
                onPressed: () => _navigateToSpecialists(specialty: res.specialty),
                icon: const Icon(Icons.arrow_forward_rounded, size: 16),
                label: Text('Browse ${res.specialty} Specialists', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF16A34A),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  elevation: 0,
                ),
              ),
            ),
          ],
        ),
      );
    }

    // Default / Safe Failure / Invalid Input
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFFFFBEB),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: const Color(0xFFFCD34D)),
      ),
      child: Text(
        res.reason ?? 'Please select a specialization manually from the options above.',
        style: const TextStyle(fontSize: 12.5, color: Color(0xFF92400E), height: 1.4),
      ),
    );
  }
}
