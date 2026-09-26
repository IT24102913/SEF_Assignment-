import 'package:flutter/material.dart';
import '../../services/lab_api_service.dart';
import '../../services/auth_service.dart';
import '../../utils/theme.dart';
import 'test_detail_screen.dart';
import 'booking_screen.dart';

class TestCatalogueScreen extends StatefulWidget {
  const TestCatalogueScreen({super.key});
  @override
  State<TestCatalogueScreen> createState() => _TestCatalogueScreenState();
}

class _TestCatalogueScreenState extends State<TestCatalogueScreen> {
  List<LabTest> _tests = [];
  List<String> _categories = [];
  bool _loading = true;
  String _search = '';
  String _selectedCategory = '';
  String _filterRestriction = 'ALL'; // 'ALL' | 'OPEN' | 'RESTRICTED'
  String _sortBy = 'DEFAULT'; // 'DEFAULT' | 'PRICE_LOW' | 'PRICE_HIGH' | 'FASTEST'
  final Set<String> _selectedTestIds = {};
  final TextEditingController _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    setState(() => _loading = true);
    try {
      final results = await Future.wait([
        LabApiService.getTests(search: _search, category: _selectedCategory),
        LabApiService.getCategories(),
      ]);
      if (!mounted) return;
      setState(() {
        _tests = results[0] as List<LabTest>;
        _categories = results[1] as List<String>;
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  List<LabTest> get _selectedTests {
    return _tests.where((t) => _selectedTestIds.contains(t.id)).toList();
  }

  double get _totalPrice {
    return _selectedTests.fold<double>(0, (sum, t) => sum + t.price);
  }

  List<LabTest> get _displayedTests {
    var list = List<LabTest>.from(_tests);
    if (_filterRestriction == 'OPEN') {
      list = list.where((t) => !t.isRestricted).toList();
    } else if (_filterRestriction == 'RESTRICTED') {
      list = list.where((t) => t.isRestricted).toList();
    }

    if (_sortBy == 'PRICE_LOW') {
      list.sort((a, b) => a.price.compareTo(b.price));
    } else if (_sortBy == 'PRICE_HIGH') {
      list.sort((a, b) => b.price.compareTo(a.price));
    } else if (_sortBy == 'FASTEST') {
      list.sort((a, b) => a.turnaroundDays.compareTo(b.turnaroundDays));
    }
    return list;
  }

  void _toggleSelect(String testId) {
    setState(() {
      if (_selectedTestIds.contains(testId)) {
        _selectedTestIds.remove(testId);
      } else {
        _selectedTestIds.add(testId);
      }
    });
  }

  void _showSortSheet() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Sort Diagnostic Tests',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: kText),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close, color: kTextMuted, size: 20),
                      onPressed: () => Navigator.pop(ctx),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                _buildSortOption(ctx, 'Default Order', 'DEFAULT', Icons.sort),
                _buildSortOption(ctx, 'Price: Low to High', 'PRICE_LOW', Icons.arrow_upward_rounded),
                _buildSortOption(ctx, 'Price: High to Low', 'PRICE_HIGH', Icons.arrow_downward_rounded),
                _buildSortOption(ctx, 'Fastest Turnaround', 'FASTEST', Icons.bolt_rounded),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildSortOption(BuildContext ctx, String label, String value, IconData icon) {
    final isSelected = _sortBy == value;
    return InkWell(
      onTap: () {
        setState(() => _sortBy = value);
        Navigator.pop(ctx);
      },
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        margin: const EdgeInsets.only(bottom: 6),
        decoration: BoxDecoration(
          color: isSelected ? kPrimary.withValues(alpha: 0.08) : Colors.transparent,
          borderRadius: BorderRadius.circular(14),
          border: isSelected ? Border.all(color: kPrimary.withValues(alpha: 0.3)) : null,
        ),
        child: Row(
          children: [
            Icon(icon, size: 20, color: isSelected ? kPrimary : kTextMuted),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                label,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                  color: isSelected ? kPrimaryDark : kText,
                ),
              ),
            ),
            if (isSelected)
              const Icon(Icons.check_circle_rounded, color: kPrimary, size: 18),
          ],
        ),
      ),
    );
  }

  IconData _getCategoryIcon(String category) {
    switch (category.toLowerCase()) {
      case 'haematology':
        return Icons.bloodtype_outlined;
      case 'biochemistry':
        return Icons.science_outlined;
      case 'microbiology':
        return Icons.biotech_outlined;
      case 'radiology':
        return Icons.wb_iridescent_outlined;
      case 'endocrinology':
        return Icons.spa_outlined;
      case 'immunology':
        return Icons.shield_outlined;
      case 'pathology':
        return Icons.medical_services_outlined;
      default:
        return Icons.biotech_outlined;
    }
  }

  @override
  Widget build(BuildContext context) {
    final selectedCount = _selectedTestIds.length;
    final displayed = _displayedTests;

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        elevation: 0,
        backgroundColor: kPrimaryDark,
        flexibleSpace: Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              colors: [Color(0xFF004D40), Color(0xFF00695C)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
          ),
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 18, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
        title: Column(
          children: [
            const Text(
              'Diagnostic Tests',
              style: TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w800,
                fontSize: 17,
                letterSpacing: -0.2,
              ),
            ),
            Text(
              _tests.isNotEmpty ? '${_tests.length} Accredited Assays' : 'Clinical Pathology Catalogue',
              style: TextStyle(
                color: Colors.white.withValues(alpha: 0.8),
                fontSize: 11,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
        centerTitle: true,
        actions: [
          if (selectedCount > 0)
            Container(
              margin: const EdgeInsets.only(right: 12),
              child: TextButton.icon(
                onPressed: () => setState(() => _selectedTestIds.clear()),
                icon: const Icon(Icons.close_rounded, size: 14, color: Colors.white),
                label: Text(
                  'Clear ($selectedCount)',
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12),
                ),
                style: TextButton.styleFrom(
                  backgroundColor: Colors.white.withValues(alpha: 0.18),
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                ),
              ),
            ),
        ],
      ),
      body: Stack(
        children: [
          Column(
            children: [
              // ─── Search & Sort Bar ───────────────────────────────────────────
              Container(
                color: Colors.white,
                padding: const EdgeInsets.fromLTRB(16, 14, 16, 12),
                child: Column(
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Container(
                            decoration: BoxDecoration(
                              color: const Color(0xFFF1F5F9),
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(color: const Color(0xFFE2E8F0)),
                            ),
                            child: TextField(
                              controller: _searchController,
                              style: const TextStyle(color: kText, fontWeight: FontWeight.w600, fontSize: 13.5),
                              decoration: InputDecoration(
                                hintText: 'Search tests, e.g. CBC, Lipid, FBS...',
                                hintStyle: const TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
                                prefixIcon: const Icon(Icons.search_rounded, color: kPrimary, size: 20),
                                suffixIcon: _search.isNotEmpty
                                    ? IconButton(
                                        icon: const Icon(Icons.cancel_rounded, size: 18, color: Color(0xFF94A3B8)),
                                        onPressed: () {
                                          _searchController.clear();
                                          setState(() => _search = '');
                                          _loadData();
                                        },
                                      )
                                    : null,
                                border: InputBorder.none,
                                enabledBorder: InputBorder.none,
                                focusedBorder: InputBorder.none,
                                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                              ),
                              onChanged: (v) {
                                setState(() => _search = v);
                                _loadData();
                              },
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        InkWell(
                          onTap: _showSortSheet,
                          borderRadius: BorderRadius.circular(14),
                          child: Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: _sortBy != 'DEFAULT' ? kPrimary.withValues(alpha: 0.1) : const Color(0xFFF1F5F9),
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(
                                color: _sortBy != 'DEFAULT' ? kPrimary : const Color(0xFFE2E8F0),
                              ),
                            ),
                            child: Icon(
                              Icons.tune_rounded,
                              size: 20,
                              color: _sortBy != 'DEFAULT' ? kPrimary : const Color(0xFF475569),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),

                    // Quick Filter Badges: All / Open / Restricted
                    Row(
                      children: [
                        _buildFilterPill(
                          label: 'All Tests',
                          count: _tests.length,
                          selected: _filterRestriction == 'ALL',
                          onTap: () => setState(() => _filterRestriction = 'ALL'),
                        ),
                        const SizedBox(width: 8),
                        _buildFilterPill(
                          label: 'No Rx Required',
                          icon: Icons.check_circle_outline_rounded,
                          selected: _filterRestriction == 'OPEN',
                          activeColor: const Color(0xFF059669),
                          onTap: () => setState(() => _filterRestriction = 'OPEN'),
                        ),
                        const SizedBox(width: 8),
                        _buildFilterPill(
                          label: 'Rx Required',
                          icon: Icons.lock_outline_rounded,
                          selected: _filterRestriction == 'RESTRICTED',
                          activeColor: const Color(0xFFDC2626),
                          onTap: () => setState(() => _filterRestriction = 'RESTRICTED'),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              // ─── Specialty Category Carousel ────────────────────────────────
              if (_categories.isNotEmpty) ...[
                Container(
                  color: Colors.white,
                  padding: const EdgeInsets.only(bottom: 12),
                  child: SizedBox(
                    height: 40,
                    child: ListView(
                      scrollDirection: Axis.horizontal,
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      children: [
                        _CategoryChip(
                          label: 'All Specialties',
                          selected: _selectedCategory.isEmpty,
                          icon: Icons.grid_view_rounded,
                          onTap: () {
                            setState(() => _selectedCategory = '');
                            _loadData();
                          },
                        ),
                        ..._categories.map((c) {
                          final count = _tests.where((t) => t.category == c).length;
                          return _CategoryChip(
                            label: c,
                            count: count > 0 ? count : null,
                            selected: _selectedCategory == c,
                            icon: _getCategoryIcon(c),
                            categoryColor: kCategoryColors[c],
                            onTap: () {
                              setState(() => _selectedCategory = c);
                              _loadData();
                            },
                          );
                        }),
                      ],
                    ),
                  ),
                ),
              ],

              // ─── AI Trust Banner ─────────────────────────────────────────────
              Container(
                margin: const EdgeInsets.fromLTRB(16, 10, 16, 8),
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                decoration: BoxDecoration(
                  color: const Color(0xFFF0FDF4),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFBBF7D0)),
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(4),
                      decoration: const BoxDecoration(
                        color: Color(0xFFDCFCE7),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.verified_rounded, size: 14, color: Color(0xFF16A34A)),
                    ),
                    const SizedBox(width: 8),
                    const Expanded(
                      child: Text(
                        'Accredited Pathology • Fasting Guidelines • Gemini AI Slip Verification',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: Color(0xFF166534),
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ),

              // ─── Test List View ──────────────────────────────────────────────
              Expanded(
                child: _loading
                    ? const Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            CircularProgressIndicator(color: kPrimary),
                            SizedBox(height: 14),
                            Text(
                              'Loading accredited laboratory assays...',
                              style: TextStyle(color: kTextMuted, fontSize: 13, fontWeight: FontWeight.w600),
                            ),
                          ],
                        ),
                      )
                    : displayed.isEmpty
                        ? Center(
                            child: Padding(
                              padding: const EdgeInsets.all(32),
                              child: Column(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Container(
                                    width: 72,
                                    height: 72,
                                    decoration: BoxDecoration(
                                      color: kPrimary.withValues(alpha: 0.1),
                                      shape: BoxShape.circle,
                                    ),
                                    child: const Icon(Icons.science_outlined, size: 36, color: kPrimary),
                                  ),
                                  const SizedBox(height: 18),
                                  const Text(
                                    'No Matching Diagnostic Tests',
                                    style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: kText),
                                  ),
                                  const SizedBox(height: 6),
                                  const Text(
                                    'Try adjusting your search query, clearing filters, or switching medical categories.',
                                    textAlign: TextAlign.center,
                                    style: TextStyle(fontSize: 13, color: kTextMuted, height: 1.4),
                                  ),
                                  const SizedBox(height: 16),
                                  ElevatedButton(
                                    onPressed: () {
                                      _searchController.clear();
                                      setState(() {
                                        _search = '';
                                        _selectedCategory = '';
                                        _filterRestriction = 'ALL';
                                        _sortBy = 'DEFAULT';
                                      });
                                      _loadData();
                                    },
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: kPrimary,
                                      foregroundColor: Colors.white,
                                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                    ),
                                    child: const Text('Reset All Filters', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                                  ),
                                ],
                              ),
                            ),
                          )
                        : RefreshIndicator(
                            onRefresh: _loadData,
                            color: kPrimary,
                            child: ListView.separated(
                              padding: EdgeInsets.fromLTRB(16, 6, 16, selectedCount > 0 ? 110 : 24),
                              itemCount: displayed.length,
                              separatorBuilder: (context, index) => const SizedBox(height: 10),
                              itemBuilder: (_, i) {
                                final test = displayed[i];
                                final isSelected = _selectedTestIds.contains(test.id);
                                return _TestCard(
                                  test: test,
                                  isSelected: isSelected,
                                  onTap: () => _toggleSelect(test.id),
                                  onViewDetails: () => Navigator.push(
                                    context,
                                    MaterialPageRoute(builder: (_) => TestDetailScreen(test: test)),
                                  ),
                                );
                              },
                            ),
                          ),
              ),
            ],
          ),

          // ─── Floating Multi-Select Checkout Bar ──────────────────────────────
          if (selectedCount > 0)
            Positioned(
              left: 16,
              right: 16,
              bottom: 20,
              child: FadeSlideAnimation(
                child: Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: const Color(0xFF0F172A),
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.25),
                        blurRadius: 24,
                        offset: const Offset(0, 10),
                      ),
                    ],
                  ),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: const Color(0xFF1E293B),
                          borderRadius: BorderRadius.circular(14),
                        ),
                        child: const Icon(Icons.shopping_bag_outlined, color: Color(0xFF34D399), size: 20),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              '$selectedCount Test${selectedCount > 1 ? "s" : ""} Selected',
                              style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12, color: Color(0xFF94A3B8)),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              'LKR ${_formatCurrency(_totalPrice)}',
                              style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 17, color: Colors.white),
                            ),
                          ],
                        ),
                      ),
                      ElevatedButton.icon(
                        onPressed: () async {
                          final user = await AuthService.getUser();
                          if (user != null) {
                            if (!context.mounted) return;
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (context) => BookingScreen(tests: _selectedTests),
                              ),
                            );
                          } else {
                            if (!context.mounted) return;
                            _showLoginDialog();
                          }
                        },
                        icon: const Icon(Icons.arrow_forward_rounded, size: 16),
                        label: const Text('Schedule & Book'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF059669),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                          elevation: 0,
                          textStyle: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w800),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildFilterPill({
    required String label,
    int? count,
    IconData? icon,
    required bool selected,
    Color? activeColor,
    required VoidCallback onTap,
  }) {
    final color = activeColor ?? kPrimary;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
        decoration: BoxDecoration(
          color: selected ? color.withValues(alpha: 0.12) : const Color(0xFFF1F5F9),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: selected ? color : const Color(0xFFE2E8F0),
            width: selected ? 1.4 : 1.0,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (icon != null) ...[
              Icon(icon, size: 13, color: selected ? color : const Color(0xFF64748B)),
              const SizedBox(width: 4),
            ],
            Text(
              label,
              style: TextStyle(
                fontSize: 11.5,
                fontWeight: selected ? FontWeight.w800 : FontWeight.w600,
                color: selected ? color : const Color(0xFF475569),
              ),
            ),
            if (count != null) ...[
              const SizedBox(width: 4),
              Text(
                '($count)',
                style: TextStyle(
                  fontSize: 10.5,
                  fontWeight: FontWeight.w700,
                  color: selected ? color : const Color(0xFF94A3B8),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  void _showLoginDialog() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: kPrimary.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.lock_outline_rounded, color: kPrimary, size: 22),
            ),
            const SizedBox(width: 12),
            const Text('Sign In Required', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800)),
          ],
        ),
        content: const Text(
          'Please sign in to your patient account to schedule slots, upload prescription slips with AI verification, and download certified reports.',
          style: TextStyle(fontSize: 13.5, color: kTextMuted, height: 1.45),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel', style: TextStyle(color: kTextMuted, fontWeight: FontWeight.bold)),
          ),
          ElevatedButton.icon(
            onPressed: () {
              Navigator.pop(ctx);
              Navigator.pushNamed(context, '/login');
            },
            icon: const Icon(Icons.login_rounded, size: 16),
            label: const Text('Sign In / Register'),
            style: ElevatedButton.styleFrom(
              backgroundColor: kPrimary,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
          ),
        ],
      ),
    );
  }
}

String _formatCurrency(double value) {
  final parts = value.toStringAsFixed(0);
  return parts.replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (Match m) => '${m[1]},');
}

class _CategoryChip extends StatelessWidget {
  final String label;
  final int? count;
  final bool selected;
  final IconData? icon;
  final Color? categoryColor;
  final VoidCallback onTap;

  const _CategoryChip({
    required this.label,
    this.count,
    required this.selected,
    this.icon,
    this.categoryColor,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final activeColor = categoryColor ?? kPrimary;

    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        margin: const EdgeInsets.only(right: 8),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: selected ? activeColor : const Color(0xFFF8FAFC),
          borderRadius: BorderRadius.circular(999),
          border: Border.all(
            color: selected ? activeColor : const Color(0xFFE2E8F0),
            width: selected ? 1.5 : 1.0,
          ),
          boxShadow: selected
              ? [
                  BoxShadow(
                    color: activeColor.withValues(alpha: 0.28),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  )
                ]
              : null,
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (icon != null) ...[
              Icon(icon, size: 14, color: selected ? Colors.white : const Color(0xFF64748B)),
              const SizedBox(width: 5),
            ],
            Text(
              label,
              style: TextStyle(
                color: selected ? Colors.white : const Color(0xFF334155),
                fontSize: 12,
                fontWeight: selected ? FontWeight.w800 : FontWeight.w600,
              ),
            ),
            if (count != null) ...[
              const SizedBox(width: 5),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                decoration: BoxDecoration(
                  color: selected ? Colors.white.withValues(alpha: 0.25) : const Color(0xFFE2E8F0),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  '$count',
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w800,
                    color: selected ? Colors.white : const Color(0xFF475569),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _TestCard extends StatelessWidget {
  final LabTest test;
  final bool isSelected;
  final VoidCallback onTap;
  final VoidCallback onViewDetails;

  const _TestCard({
    required this.test,
    required this.isSelected,
    required this.onTap,
    required this.onViewDetails,
  });

  @override
  Widget build(BuildContext context) {
    final categoryColor = kCategoryColors[test.category] ?? kPrimary;

    return FadeSlideAnimation(
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFFF0FDF4) : Colors.white,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(
            color: isSelected ? kPrimary : const Color(0xFFE2E8F0),
            width: isSelected ? 1.8 : 1.0,
          ),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: kPrimary.withValues(alpha: 0.12),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
                  )
                ]
              : [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.03),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  )
                ],
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(18),
          child: InkWell(
            onTap: onTap,
            splashColor: kPrimary.withValues(alpha: 0.08),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Category Specialty Icon
                      Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          color: categoryColor.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: categoryColor.withValues(alpha: 0.22)),
                        ),
                        child: Icon(Icons.science_rounded, color: categoryColor, size: 22),
                      ),
                      const SizedBox(width: 12),

                      // Test Name and Category
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Expanded(
                                  child: Text(
                                    test.name,
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w800,
                                      fontSize: 14.5,
                                      color: Color(0xFF0F172A),
                                      letterSpacing: -0.2,
                                    ),
                                  ),
                                ),
                                // Selection Checkbox
                                AnimatedContainer(
                                  duration: const Duration(milliseconds: 180),
                                  width: 22,
                                  height: 22,
                                  decoration: BoxDecoration(
                                    color: isSelected ? kPrimary : Colors.white,
                                    shape: BoxShape.circle,
                                    border: Border.all(
                                      color: isSelected ? kPrimary : const Color(0xFFCBD5E1),
                                      width: 1.5,
                                    ),
                                  ),
                                  child: isSelected
                                      ? const Icon(Icons.check_rounded, color: Colors.white, size: 14)
                                      : null,
                                ),
                              ],
                            ),
                            const SizedBox(height: 4),
                            Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: categoryColor.withValues(alpha: 0.1),
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: Text(
                                    test.category,
                                    style: TextStyle(
                                      color: categoryColor,
                                      fontSize: 10.5,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFF1F5F9),
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: Row(
                                    children: [
                                      const Icon(Icons.schedule_rounded, size: 11, color: Color(0xFF64748B)),
                                      const SizedBox(width: 3),
                                      Text(
                                        '${test.turnaroundDays}d turnaround',
                                        style: const TextStyle(
                                          color: Color(0xFF64748B),
                                          fontSize: 10.5,
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),

                  // Optional description summary
                  if (test.description.isNotEmpty) ...[
                    const SizedBox(height: 10),
                    Text(
                      test.description,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 12,
                        color: Color(0xFF64748B),
                        height: 1.4,
                      ),
                    ),
                  ],

                  const SizedBox(height: 12),
                  const Divider(height: 1, color: Color(0xFFF1F5F9)),
                  const SizedBox(height: 12),

                  // Bottom row: Prescription badge + Price + Details button
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      // Prescription Status Badge
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: test.isRestricted
                              ? const Color(0xFFFEF2F2)
                              : const Color(0xFFF0FDF4),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(
                            color: test.isRestricted
                                ? const Color(0xFFFECACA)
                                : const Color(0xFFBBF7D0),
                          ),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              test.isRestricted ? Icons.lock_outline_rounded : Icons.check_circle_outline_rounded,
                              size: 11,
                              color: test.isRestricted ? const Color(0xFFDC2626) : const Color(0xFF16A34A),
                            ),
                            const SizedBox(width: 4),
                            Text(
                              test.isRestricted ? 'Rx Required' : 'Open Test',
                              style: TextStyle(
                                color: test.isRestricted ? const Color(0xFFDC2626) : const Color(0xFF16A34A),
                                fontSize: 10.5,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ],
                        ),
                      ),

                      // Price and Details action
                      Row(
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              const Text(
                                'PRICE',
                                style: TextStyle(
                                  fontSize: 9.5,
                                  fontWeight: FontWeight.w700,
                                  color: Color(0xFF94A3B8),
                                  letterSpacing: 0.4,
                                ),
                              ),
                              Text(
                                'LKR ${_formatCurrency(test.price)}',
                                style: const TextStyle(
                                  fontWeight: FontWeight.w900,
                                  fontSize: 15,
                                  color: Color(0xFF0F766E),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(width: 10),
                          InkWell(
                            onTap: onViewDetails,
                            borderRadius: BorderRadius.circular(10),
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                              decoration: BoxDecoration(
                                color: const Color(0xFFF1F5F9),
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(color: const Color(0xFFCBD5E1)),
                              ),
                              child: const Row(
                                children: [
                                  Icon(Icons.info_outline_rounded, size: 13, color: Color(0xFF475569)),
                                  SizedBox(width: 4),
                                  Text(
                                    'Details',
                                    style: TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w700,
                                      color: Color(0xFF334155),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
