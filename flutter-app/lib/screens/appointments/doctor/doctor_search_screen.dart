import 'package:flutter/material.dart';
import '../../services/doctor_api_service.dart';
import '../../utils/theme.dart';
import 'specialist_list_screen.dart';
import 'my_appointments_screen.dart';

class DoctorSearchScreen extends StatefulWidget {
  const DoctorSearchScreen({super.key});

  @override
  State<DoctorSearchScreen> createState() => _DoctorSearchScreenState();
}

class _DoctorSearchScreenState extends State<DoctorSearchScreen> {
  final TextEditingController _searchCtrl = TextEditingController();
  final TextEditingController _symptomCtrl = TextEditingController();

  String _selectedSpecialty = 'ALL';
  String _selectedHospital = 'ALL';
  DateTime? _selectedDate;

  List<SpecialtyCount> _specialties = [];
  bool _loading = true;
  bool _aiLoading = false;
  List<SpecialtyRecommendation> _aiRecommendations = [];

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
    _fetchSpecialties();
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    _symptomCtrl.dispose();
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
        const SnackBar(content: Text('Please enter your symptoms')),
      );
      return;
    }

    setState(() => _aiLoading = true);
    try {
      final recs = await DoctorApiService.recommendSpecialty(text);
      if (mounted) {
        setState(() {
          _aiRecommendations = recs;
          _aiLoading = false;
        });
        if (recs.isEmpty) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('No specialty match found. Please choose from the list.')),
          );
        }
      }
    } catch (e) {
      if (mounted) setState(() => _aiLoading = false);
    }
  }

  void _navigateToSpecialists({String? specialty, String? search}) {
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
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate ?? now,
      firstDate: now,
      lastDate: now.add(const Duration(days: 30)),
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
        title: const Text('Doctor Channeling', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
        actions: [
          IconButton(
            icon: const Icon(Icons.calendar_month_outlined),
            tooltip: 'My Appointments',
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const MyAppointmentsScreen()),
              );
            },
          ),
        ],
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
              child: const Row(
                children: [
                  CircleAvatar(
                    backgroundColor: Color(0xFF80CBC4),
                    child: Icon(Icons.phone_in_talk, color: Color(0xFF004D40), size: 20),
                  ),
                  SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '24/7 Channeling Desk Assistance',
                          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                        ),
                        Text(
                          '+94 76 447 7999 • Health Bridge Hospital',
                          style: TextStyle(color: Color(0xFFB2DFDB), fontSize: 11),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Find Your Doctor Card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: kBorder),
                boxShadow: const [
                  BoxShadow(color: Color(0x0A000000), blurRadius: 8, offset: Offset(0, 2)),
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
                        child: const Text('STEP 1', style: TextStyle(color: kPrimaryDark, fontWeight: FontWeight.w800, fontSize: 10)),
                      ),
                      const SizedBox(width: 8),
                      const Text(
                        'Find Your Doctor',
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: kPrimaryDark),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),

                  // Doctor Name
                  TextField(
                    controller: _searchCtrl,
                    decoration: InputDecoration(
                      hintText: 'Type doctor name...',
                      prefixIcon: const Icon(Icons.search, color: kPrimary),
                      filled: true,
                      fillColor: const Color(0xFFF9FAFB),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: kBorder)),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
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
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: kBorder)),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
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
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: kBorder)),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
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

                  // Date Picker Button (Required Device Feature)
                  InkWell(
                    onTap: _pickDate,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF9FAFB),
                        border: Border.all(color: kBorder),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.calendar_today, size: 18, color: kPrimary),
                          const SizedBox(width: 10),
                          Text(
                            _selectedDate == null
                                ? 'Pick preferred appointment date'
                                : '${_selectedDate!.year}-${_selectedDate!.month.toString().padLeft(2, '0')}-${_selectedDate!.day.toString().padLeft(2, '0')}',
                            style: TextStyle(
                              color: _selectedDate == null ? Colors.grey : kText,
                              fontSize: 13,
                              fontWeight: _selectedDate == null ? FontWeight.normal : FontWeight.w600,
                            ),
                          ),
                          const Spacer(),
                          if (_selectedDate != null)
                            GestureDetector(
                              onTap: () => setState(() => _selectedDate = null),
                              child: const Icon(Icons.clear, size: 16, color: Colors.grey),
                            ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Submit Search Button
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: () => _navigateToSpecialists(),
                      icon: const Icon(Icons.search),
                      label: const Text('Search Doctors', style: TextStyle(fontWeight: FontWeight.bold)),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: kPrimary,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Agentic AI Symptom Assistant Card
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0xFFF0FDF4),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFF86EFAC)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    children: [
                      Icon(Icons.auto_awesome, color: Color(0xFF15803D), size: 18),
                      SizedBox(width: 8),
                      Text(
                        'AI Specialist Recommender (Agentic Triage)',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF14532D)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  const Text(
                    'Describe your symptoms below to let our clinical AI suggest the appropriate specialty filter:',
                    style: TextStyle(fontSize: 11, color: Color(0xFF166534)),
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _symptomCtrl,
                          decoration: InputDecoration(
                            hintText: 'e.g. chest pressure, palpitations...',
                            filled: true,
                            fillColor: Colors.white,
                            contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(6), borderSide: const BorderSide(color: Color(0xFF86EFAC))),
                          ),
                          style: const TextStyle(fontSize: 12),
                        ),
                      ),
                      const SizedBox(width: 8),
                      ElevatedButton(
                        onPressed: _aiLoading ? null : _handleAiTriage,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF16A34A),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                        ),
                        child: _aiLoading
                            ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                            : const Text('Ask AI', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                      ),
                    ],
                  ),
                  if (_aiRecommendations.isNotEmpty) ...[
                    const SizedBox(height: 10),
                    const Text('Suggestions (Tap to Filter):', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF14532D))),
                    const SizedBox(height: 6),
                    Wrap(
                      spacing: 8,
                      runSpacing: 6,
                      children: _aiRecommendations.map((rec) {
                        return InkWell(
                          onTap: () {
                            _navigateToSpecialists(specialty: rec.specialty);
                          },
                          child: Chip(
                            backgroundColor: Colors.white,
                            side: const BorderSide(color: Color(0xFF16A34A)),
                            avatar: const Icon(Icons.check_circle_outline, size: 16, color: Color(0xFF16A34A)),
                            label: Text(
                              '${rec.specialty} (${(rec.matchScore * 100).round()}%)',
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 11, color: Color(0xFF14532D)),
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                  ],
                ],
              ),
            ),
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
                      childAspectRatio: 1.5,
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
                                style: const TextStyle(fontSize: 10, color: kPrimary, fontWeight: FontWeight.w700),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
          ],
        ),
      ),
    );
  }
}
