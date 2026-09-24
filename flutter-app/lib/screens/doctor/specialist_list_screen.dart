import 'package:flutter/material.dart';
import '../../services/doctor_api_service.dart';
import '../../utils/theme.dart';
import 'doctor_profile_screen.dart';

class SpecialistListScreen extends StatefulWidget {
  final String? initialSearch;
  final String? initialSpecialty;
  final String? initialHospital;
  final String? initialDate;

  const SpecialistListScreen({
    super.key,
    this.initialSearch,
    this.initialSpecialty,
    this.initialHospital,
    this.initialDate,
  });

  @override
  State<SpecialistListScreen> createState() => _SpecialistListScreenState();
}

class _SpecialistListScreenState extends State<SpecialistListScreen> {
  List<Doctor> _doctors = [];
  bool _loading = true;
  String _sortBy = 'rating';
  String _availability = 'all'; // all, today, tomorrow

  @override
  void initState() {
    super.initState();
    _fetchDoctors();
  }

  Future<void> _fetchDoctors() async {
    setState(() => _loading = true);
    try {
      final list = await DoctorApiService.getDoctors(
        search: widget.initialSearch,
        specialization: widget.initialSpecialty,
        hospital: widget.initialHospital,
        date: widget.initialDate,
        sortBy: _sortBy,
      );
      if (mounted) {
        setState(() {
          _doctors = list;
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _loading = false);
    }
  }

  List<Doctor> get _filteredDoctors {
    if (_availability == 'today') {
      return _doctors.where((d) => d.availableToday).toList();
    }
    if (_availability == 'tomorrow') {
      return _doctors.where((d) => d.availableTomorrow).toList();
    }
    return _doctors;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: kBg,
      appBar: AppBar(
        backgroundColor: kPrimaryDark,
        foregroundColor: Colors.white,
        title: const Text('Available Specialists', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17)),
      ),
      body: Column(
        children: [
          // Filter & Sort Header Bar
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            color: Colors.white,
            child: Row(
              children: [
                Expanded(
                  child: Row(
                    children: [
                      _buildFilterChip('All', 'all'),
                      const SizedBox(width: 6),
                      _buildFilterChip('Today', 'today'),
                      const SizedBox(width: 6),
                      _buildFilterChip('Tomorrow', 'tomorrow'),
                    ],
                  ),
                ),
                DropdownButton<String>(
                  value: _sortBy,
                  underline: const SizedBox(),
                  style: const TextStyle(fontSize: 12, color: kPrimaryDark, fontWeight: FontWeight.bold),
                  items: const [
                    DropdownMenuItem(value: 'rating', child: Text('Rating')),
                    DropdownMenuItem(value: 'fee', child: Text('Fee: Low')),
                    DropdownMenuItem(value: 'experience', child: Text('Experience')),
                  ],
                  onChanged: (val) {
                    if (val != null) {
                      setState(() => _sortBy = val);
                      _fetchDoctors();
                    }
                  },
                ),
              ],
            ),
          ),
          const Divider(height: 1, color: kBorder),

          // Specialists List
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _filteredDoctors.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(Icons.person_search, size: 54, color: Colors.grey),
                            const SizedBox(height: 12),
                            const Text('No specialists found matching criteria', style: TextStyle(fontWeight: FontWeight.bold)),
                            const SizedBox(height: 8),
                            ElevatedButton(
                              onPressed: () {
                                setState(() {
                                  _availability = 'all';
                                  _sortBy = 'rating';
                                });
                                _fetchDoctors();
                              },
                              style: ElevatedButton.styleFrom(backgroundColor: kPrimary, foregroundColor: Colors.white),
                              child: const Text('Reset Filters'),
                            ),
                          ],
                        ),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: _filteredDoctors.length,
                        itemBuilder: (context, index) {
                          final doc = _filteredDoctors[index];
                          return _buildDoctorCard(doc);
                        },
                      ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChip(String label, String value) {
    final selected = _availability == value;
    return GestureDetector(
      onTap: () => setState(() => _availability = value),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
        decoration: BoxDecoration(
          color: selected ? kPrimary : const Color(0xFFF1F5F9),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.bold,
            color: selected ? Colors.white : const Color(0xFF64748B),
          ),
        ),
      ),
    );
  }

  Widget _buildDoctorCard(Doctor doc) {
    return Container(
      margin: const EdgeInsets.only(bottom: 14),
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
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Initials Avatar
              CircleAvatar(
                radius: 28,
                backgroundColor: kPrimaryDark,
                child: Text(
                  doc.fullName.replaceFirst('Dr. ', '').split(' ').map((n) => n.isNotEmpty ? n[0] : '').take(2).join(),
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: const Color(0xFFE0F2F1),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: const Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.verified, size: 11, color: kPrimary),
                              SizedBox(width: 3),
                              Text('RSGDGNT CONSULTANT', style: TextStyle(color: kPrimaryDark, fontSize: 9, fontWeight: FontWeight.w800)),
                            ],
                          ),
                        ),
                        const Spacer(),
                        Text(
                          'LKR ${doc.consultationFee.toStringAsFixed(0)}',
                          style: const TextStyle(fontWeight: FontWeight.w900, color: kPrimaryDark, fontSize: 16),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      doc.fullName,
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: kText),
                    ),
                    Text(
                      '${doc.specialization} • ${doc.qualifications}',
                      style: const TextStyle(fontSize: 11, color: kTextMuted),
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        const Icon(Icons.star, size: 13, color: Colors.amber),
                        const SizedBox(width: 3),
                        Text(
                          '${doc.rating.toStringAsFixed(1)} (${doc.reviewCount})',
                          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.amber),
                        ),
                        const SizedBox(width: 8),
                        Text('•  ${doc.experienceYears}+ Yrs Exp', style: const TextStyle(fontSize: 11, color: Colors.grey)),
                      ],
                    ),
                    const SizedBox(height: 3),
                    Row(
                      children: [
                        const Icon(Icons.location_on_outlined, size: 12, color: Colors.grey),
                        const SizedBox(width: 3),
                        Expanded(
                          child: Text(
                            doc.hospitalBranch,
                            style: const TextStyle(fontSize: 11, color: Colors.grey),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          const Divider(height: 1, color: Color(0xFFF1F5F9)),
          const SizedBox(height: 10),

          // Live Availability & Action Buttons
          Row(
            children: [
              if (doc.availableToday)
                Row(
                  children: [
                    Container(width: 8, height: 8, decoration: const BoxDecoration(color: Colors.green, shape: BoxShape.circle)),
                    const SizedBox(width: 6),
                    Text('Available Today (${doc.slotsLeft} slots)', style: const TextStyle(fontSize: 11, color: Colors.green, fontWeight: FontWeight.bold)),
                  ],
                )
              else if (doc.availableTomorrow)
                Row(
                  children: [
                    Container(width: 8, height: 8, decoration: const BoxDecoration(color: Colors.orange, shape: BoxShape.circle)),
                    const SizedBox(width: 6),
                    const Text('Available Tomorrow', style: TextStyle(fontSize: 11, color: Colors.orange, fontWeight: FontWeight.bold)),
                  ],
                )
              else
                const Text('Weekday slots', style: TextStyle(fontSize: 11, color: Colors.grey)),

              const Spacer(),
              OutlinedButton(
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => DoctorProfileScreen(doctor: doc)),
                  );
                },
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  side: const BorderSide(color: kBorder),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                ),
                child: const Text('View Profile', style: TextStyle(fontSize: 11, color: kText)),
              ),
              const SizedBox(width: 8),
              ElevatedButton(
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => DoctorProfileScreen(doctor: doc)),
                  );
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: kPrimary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                ),
                child: const Text('Book Now', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
