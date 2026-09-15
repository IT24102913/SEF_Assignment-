import 'package:flutter/material.dart';
import '../../services/lab_api_service.dart';
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
    } catch (e) {
      if (mounted) setState(() => _loading = false);
    }
  }

  List<LabTest> get _selectedTests {
    return _tests.where((t) => _selectedTestIds.contains(t.id)).toList();
  }

  double get _totalPrice {
    return _selectedTests.fold<double>(0, (sum, t) => sum + t.price);
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

  @override
  Widget build(BuildContext context) {
    final selectedCount = _selectedTestIds.length;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Diagnostic Tests'),
        actions: [
          if (selectedCount > 0)
            TextButton.icon(
              onPressed: () => setState(() => _selectedTestIds.clear()),
              icon: const Icon(Icons.clear_all, color: Colors.white),
              label: const Text('Clear', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            ),
        ],
      ),
      body: Stack(
        children: [
          Column(
            children: [
              // Search & Filter Header
              Container(
                padding: const EdgeInsets.fromLTRB(16, 14, 16, 8),
                color: Colors.transparent,
                child: TextField(
                  controller: _searchController,
                  style: const TextStyle(color: kText, fontWeight: FontWeight.w600, fontSize: 14),
                  decoration: InputDecoration(
                    hintText: 'Search CBC, Lipid Profile, Blood sugar...',
                    prefixIcon: const Icon(Icons.search, color: kPrimary),
                    suffixIcon: _search.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear, size: 18, color: kTextMuted),
                            onPressed: () {
                              _searchController.clear();
                              setState(() => _search = '');
                              _loadData();
                            },
                          )
                        : null,
                  ),
                  onChanged: (v) {
                    setState(() => _search = v);
                    _loadData();
                  },
                ),
              ),

              // Animated Category Chips Carousel
              if (_categories.isNotEmpty) ...[
                SizedBox(
                  height: 44,
                  child: ListView(
                    scrollDirection: Axis.horizontal,
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    children: [
                      _CategoryChip(
                        label: 'All Tests',
                        selected: _selectedCategory.isEmpty,
                        icon: Icons.grid_view_rounded,
                        onTap: () {
                          setState(() => _selectedCategory = '');
                          _loadData();
                        },
                      ),
                      ..._categories.map((c) => _CategoryChip(
                        label: c,
                        selected: _selectedCategory == c,
                        categoryColor: kCategoryColors[c],
                        onTap: () {
                          setState(() => _selectedCategory = c);
                          _loadData();
                        },
                      )),
                    ],
                  ),
                ),
                const SizedBox(height: 8),
              ],

              // Test list
              Expanded(
                child: _loading
                    ? const LoadingWidget()
                    : _tests.isEmpty
                        ? const EmptyStateWidget(
                            message: 'No matching tests found',
                            subtitle: 'Try searching with another keyword or change the category filter.',
                            icon: Icons.science_outlined,
                          )
                        : RefreshIndicator(
                            onRefresh: _loadData,
                            color: kPrimary,
                            child: ListView.separated(
                              padding: EdgeInsets.fromLTRB(16, 6, 16, selectedCount > 0 ? 100 : 20),
                              itemCount: _tests.length,
                              separatorBuilder: (_, __) => const SizedBox(height: 10),
                              itemBuilder: (_, i) {
                                final test = _tests[i];
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

          // Bottom sticky checkout bar
          if (selectedCount > 0)
            Positioned(
              left: 16,
              right: 16,
              bottom: 20,
              child: FadeSlideAnimation(
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: kPrimary.withOpacity(0.3), width: 1.5),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.12),
                        blurRadius: 20,
                        offset: const Offset(0, 8),
                      )
                    ],
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              '$selectedCount Test${selectedCount > 1 ? "s" : ""} Selected',
                              style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13, color: kTextMuted),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              'LKR ${_totalPrice.toStringAsFixed(0)}',
                              style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 18, color: kPrimaryDark),
                            ),
                          ],
                        ),
                      ),
                      ElevatedButton.icon(
                        onPressed: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (context) => BookingScreen(tests: _selectedTests),
                            ),
                          );
                        },
                        icon: const Icon(Icons.arrow_forward, size: 16),
                        label: const Text('Proceed to Book'),
                        style: ElevatedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
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
}

class _CategoryChip extends StatelessWidget {
  final String label;
  final bool selected;
  final IconData? icon;
  final Color? categoryColor;
  final VoidCallback onTap;

  const _CategoryChip({
    required this.label,
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
        duration: const Duration(milliseconds: 200),
        margin: const EdgeInsets.only(right: 8, top: 4, bottom: 4),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
        decoration: BoxDecoration(
          color: selected ? activeColor : Colors.white,
          borderRadius: BorderRadius.circular(999),
          border: Border.all(
            color: selected ? activeColor : kBorder,
            width: selected ? 1.5 : 1.0,
          ),
          boxShadow: selected
              ? [
                  BoxShadow(
                    color: activeColor.withOpacity(0.3),
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
              Icon(icon, size: 14, color: selected ? Colors.white : kTextMuted),
              const SizedBox(width: 5),
            ],
            Text(
              label,
              style: TextStyle(
                color: selected ? Colors.white : kText,
                fontSize: 12.5,
                fontWeight: selected ? FontWeight.w800 : FontWeight.w600,
              ),
            ),
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
          color: isSelected ? kPrimary.withOpacity(0.02) : Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isSelected ? kPrimary : kBorder,
            width: isSelected ? 1.8 : 1.0,
          ),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: kPrimary.withOpacity(0.08),
                    blurRadius: 10,
                    offset: const Offset(0, 4),
                  )
                ]
              : [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.03),
                    blurRadius: 6,
                    offset: const Offset(0, 2),
                  )
                ],
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(16),
          child: InkWell(
            onTap: onTap,
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Row(
                children: [
                  // Select Checkbox / Indicator
                  Container(
                    width: 22,
                    height: 22,
                    decoration: BoxDecoration(
                      color: isSelected ? kPrimary : Colors.white,
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: isSelected ? kPrimary : kBorder,
                        width: 1.5,
                      ),
                    ),
                    child: isSelected
                        ? const Icon(Icons.check, color: Colors.white, size: 14)
                        : null,
                  ),
                  const SizedBox(width: 12),

                  // Science category icon
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: categoryColor.withOpacity(0.12),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: categoryColor.withOpacity(0.2)),
                    ),
                    child: Icon(Icons.science, color: categoryColor, size: 20),
                  ),
                  const SizedBox(width: 12),

                  // Test description / details
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          test.name,
                          style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: kText),
                        ),
                        const SizedBox(height: 3),
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                              decoration: BoxDecoration(
                                color: categoryColor.withOpacity(0.1),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                test.category,
                                style: TextStyle(color: categoryColor, fontSize: 10, fontWeight: FontWeight.w700),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Text(
                              '⏱ ${test.turnaroundDays}d result',
                              style: const TextStyle(color: kTextMuted, fontSize: 11, fontWeight: FontWeight.w600),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                          decoration: BoxDecoration(
                            color: test.isRestricted ? kDanger.withOpacity(0.08) : kSuccess.withOpacity(0.08),
                            borderRadius: BorderRadius.circular(999),
                          ),
                          child: Text(
                            test.isRestricted ? '🔒 Rx Required' : '✓ Open Test',
                            style: TextStyle(
                              color: test.isRestricted ? kDanger : kSuccess,
                              fontSize: 10,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  
                  // Price and View Info icon
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        'LKR ${test.price.toStringAsFixed(0)}',
                        style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 14, color: kPrimaryDark),
                      ),
                      const SizedBox(height: 12),
                      GestureDetector(
                        onTap: () {
                          // Prevent card selection tap event
                          onViewDetails();
                        },
                        child: Container(
                          padding: const EdgeInsets.all(6),
                          decoration: BoxDecoration(
                            color: Colors.grey.shade100,
                            shape: BoxShape.circle,
                            border: Border.all(color: kBorder),
                          ),
                          child: const Icon(Icons.info_outline, color: kTextMuted, size: 14),
                        ),
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
