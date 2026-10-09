import 'dart:io';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:url_launcher/url_launcher.dart';
import 'services/pharmacy_service.dart';
import 'services/emr_api_service.dart'; // For AuthState
import 'main.dart'; // For AppSession
import 'my_pharmacy_orders_page.dart';
import 'widgets/health_bridge_footer.dart';

class PharmacyStorePage extends StatefulWidget {
  const PharmacyStorePage({super.key});

  @override
  State<PharmacyStorePage> createState() => _PharmacyStorePageState();
}

class _PharmacyStorePageState extends State<PharmacyStorePage> {
  List<DropdownMenuItem<String>> _buildCartUnitDropdownItems(CartItemModel item) {
    final med = item.medicine;
    final unit = med.sellingUnit.toUpperCase();
    final items = <DropdownMenuItem<String>>[];

    if (unit == 'PILLS' || unit == 'PILL') {
      items.add(DropdownMenuItem(
        value: 'Pill',
        child: Text('1 Pill (Rs. ${med.price.toStringAsFixed(2)})', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF065F46))),
      ));
      items.add(DropdownMenuItem(
        value: 'Card',
        child: Text('1 Card (${med.pillsPerCard} Pills - Rs. ${med.cardPrice.toStringAsFixed(2)})', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF065F46))),
      ));
    } else if (unit == 'BOTTLE') {
      final pPrice = med.pricePerBottle ?? med.price;
      items.add(DropdownMenuItem(
        value: 'Bottle',
        child: Text('1 Bottle (${med.bottleSize ?? 100} ml - Rs. ${pPrice.toStringAsFixed(2)})', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF065F46))),
      ));
    } else if (unit == 'TUBE') {
      final tPrice = med.pricePerTube ?? med.price;
      items.add(DropdownMenuItem(
        value: 'Tube',
        child: Text('1 Tube (${med.tubeWeight ?? 20} g - Rs. ${tPrice.toStringAsFixed(2)})', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF065F46))),
      ));
    } else if (unit == 'SACHET') {
      final sPrice = med.pricePerSachet ?? med.price;
      final bPrice = med.boxPrice ?? (sPrice * (med.sachetsPerBox ?? 10));
      items.add(DropdownMenuItem(
        value: 'Sachet',
        child: Text('1 Sachet (Rs. ${sPrice.toStringAsFixed(2)})', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF065F46))),
      ));
      items.add(DropdownMenuItem(
        value: 'Box',
        child: Text('1 Box (${med.sachetsPerBox ?? 10} Sachets - Rs. ${bPrice.toStringAsFixed(2)})', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF065F46))),
      ));
    } else if (unit == 'VIAL') {
      final vPrice = med.pricePerVial ?? med.price;
      final bPrice = med.boxPrice ?? (vPrice * (med.vialsPerBox ?? 5));
      items.add(DropdownMenuItem(
        value: 'Vial',
        child: Text('1 Vial (Rs. ${vPrice.toStringAsFixed(2)})', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF065F46))),
      ));
      items.add(DropdownMenuItem(
        value: 'Box',
        child: Text('1 Box (${med.vialsPerBox ?? 5} Vials - Rs. ${bPrice.toStringAsFixed(2)})', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF065F46))),
      ));
    } else if (unit == 'DROPS') {
      final dPrice = med.pricePerBottle ?? med.price;
      items.add(DropdownMenuItem(
        value: 'Bottle',
        child: Text('1 Bottle (${med.volumeMl ?? 10} ml - Rs. ${dPrice.toStringAsFixed(2)})', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF065F46))),
      ));
    } else if (unit == 'INHALER') {
      final iPrice = med.pricePerInhaler ?? med.price;
      items.add(DropdownMenuItem(
        value: 'Inhaler',
        child: Text('1 Inhaler (${med.puffsPerInhaler ?? 200} Puffs - Rs. ${iPrice.toStringAsFixed(2)})', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF065F46))),
      ));
    } else {
      final uName = med.unitName ?? item.unitType;
      final uPrice = med.pricePerUnit ?? med.price;
      items.add(DropdownMenuItem(
        value: item.unitType,
        child: Text('1 $uName (Rs. ${uPrice.toStringAsFixed(2)})', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF065F46))),
      ));
    }

    // Safety fallback to guarantee item.unitType is ALWAYS present in items:
    if (!items.any((i) => i.value == item.unitType)) {
      items.add(DropdownMenuItem(
        value: item.unitType,
        child: Text('1 ${item.unitType} (Rs. ${med.price.toStringAsFixed(2)})', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF065F46))),
      ));
    }

    return items;
  }


  List<MedicineModel> _allMedicines = [];
  List<MedicineModel> _filteredMedicines = [];
  List<CategoryModel> _categories = [];
  bool _isLoading = true;

  int? _pendingHighlightMedicineId;
  int? _highlightedMedicineId;
  final ScrollController _gridScrollController = ScrollController();

  static List<MedicineModel>? _cachedMedicines;
  static List<CategoryModel>? _cachedCategories;
  static DateTime? _cacheTime;

  String _searchQuery = '';
  String _selectedCategoryName = 'ALL';

  // Cart state
  final List<CartItemModel> _cart = [];
  String _deliveryMethod = 'HomeDelivery'; // 'HomeDelivery' | 'Pickup'

  // Cart Toast notification state
  String? _notificationName;
  double? _notificationPrice;
  bool _showCartToast = false;
  bool _isBlocked = false;

  @override
  void initState() {
    super.initState();
    _loadPharmacyData();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final args = ModalRoute.of(context)?.settings.arguments;
      if (args is Map && args['medicineId'] != null) {
        _pendingHighlightMedicineId = args['medicineId'] as int;
        _highlightMedicine(_pendingHighlightMedicineId!);
      }
    });
  }

  void _highlightMedicine(int medicineId) {
    if (_allMedicines.isEmpty) return;
    final index = _allMedicines
        .indexWhere((m) => m.id == medicineId);
    if (index == -1) return;

    _pendingHighlightMedicineId = null;

    setState(() {
      _highlightedMedicineId = medicineId;
    });

    // Scroll to the target product
    Future.delayed(const Duration(milliseconds: 350), () {
      if (!mounted || !_gridScrollController.hasClients) return;
      final filteredIndex = _filteredMedicines
          .indexWhere((m) => m.id == medicineId);
      if (filteredIndex < 0) return;
      // Approximate: each grid row ~ 340px height
      const rowHeight = 340.0;
      final rowIndex = filteredIndex ~/ 2; // 2 columns
      final targetOffset = 500.0 + (rowIndex * rowHeight);
      _gridScrollController.animateTo(
        targetOffset.clamp(
          0.0,
          _gridScrollController.position.maxScrollExtent,
        ),
        duration: const Duration(milliseconds: 500),
        curve: Curves.easeInOut,
      );
    });

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(Icons.check_circle,
                color: Colors.white, size: 18),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                'Found: ${_allMedicines[index].name}',
                style: const TextStyle(
                    fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ),
        duration: const Duration(seconds: 3),
        backgroundColor: const Color(0xFF00897B),
      ),
    );

    // Auto-clear after 4 seconds
    Future.delayed(const Duration(seconds: 4), () {
      if (mounted && _highlightedMedicineId == medicineId) {
        setState(() {
          _highlightedMedicineId = null;
        });
      }
    });
  }

  Future<void> _loadPharmacyData() async {
    // ─── Try cache first ───
    if (_cachedMedicines != null &&
        _cachedCategories != null &&
        _cacheTime != null &&
        DateTime.now().difference(_cacheTime!).inMinutes < 5) {
      setState(() {
        _allMedicines = _cachedMedicines!;
        _categories = _cachedCategories!;
        _isLoading = false;
        _applyFilters();
      });

      if (_pendingHighlightMedicineId != null) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (mounted && _pendingHighlightMedicineId != null) {
            _highlightMedicine(_pendingHighlightMedicineId!);
          }
        });
      }
      return;
    }

    // ─── Cache miss → fetch from API ───
    setState(() => _isLoading = true);
    final medicines = await PharmacyService.getMedicines();
    final categories = await PharmacyService.getCategories();
    final userEmail =
        AuthState.email ?? AppSession.loggedInUserEmail ?? '';
    final blocked =
        await PharmacyService.isUserBlocked(userEmail);

    if (mounted) {
      setState(() {
        _allMedicines = medicines;
        _categories = categories;
        _isBlocked = blocked;
        _applyFilters();
        _isLoading = false;
      });

      // Save to cache
      _cachedMedicines = medicines;
      _cachedCategories = categories;
      _cacheTime = DateTime.now();

      // Trigger pending highlight if any
      if (_pendingHighlightMedicineId != null) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (mounted && _pendingHighlightMedicineId != null) {
            _highlightMedicine(_pendingHighlightMedicineId!);
          }
        });
      }
    }
  }

  void _applyFilters() {
    setState(() {
      _filteredMedicines = _allMedicines.where((med) {
        final matchesCat = _selectedCategoryName == 'ALL' ||
            med.categoryName.toLowerCase() == _selectedCategoryName.toLowerCase();
        final matchesSearch = med.name.toLowerCase().contains(_searchQuery.toLowerCase()) ||
            med.description.toLowerCase().contains(_searchQuery.toLowerCase()) ||
            med.categoryName.toLowerCase().contains(_searchQuery.toLowerCase());
        return matchesCat && matchesSearch;
      }).toList();
    });
  }

  void _addToCart(MedicineModel med, {String defaultUnitType = 'Pill'}) {
    if (_isBlocked) {
      _showToastSnackBar('🚫 Your account is BLOCKED from pharmacy ordering by administration.');
      return;
    }
    final isRx = med.requiresPrescription;
    final unitType = isRx ? 'RxQuote' : defaultUnitType;

    final existingIndex = _cart.indexWhere((item) => item.medicine.id == med.id);
    if (existingIndex > -1) {
      if (isRx) {
        _showToastSnackBar('${med.name} is already added for prescription quote!');
        return;
      }
      final existing = _cart[existingIndex];
      if (existing.unitType == unitType) {
        setState(() {
          existing.quantity += 1;
        });
      } else {
        setState(() {
          _cart.add(CartItemModel(medicine: med, unitType: unitType, quantity: 1));
        });
      }
    } else {
      setState(() {
        _cart.add(CartItemModel(medicine: med, unitType: unitType, quantity: 1));
      });
    }

    // Trigger cart toast banner
    final addedPrice = isRx
        ? med.price
        : (unitType == 'Card' ? med.cardPrice : med.price);
    final itemLabel = isRx
        ? '${med.name} (Prescription Quote)'
        : '${med.name} (${unitType == 'Card' ? '1 Card of ${med.pillsPerCard} Pills' : '1 Pill Unit'})';

    setState(() {
      _notificationName = itemLabel;
      _notificationPrice = addedPrice;
      _showCartToast = true;
    });

    Future.delayed(const Duration(seconds: 4), () {
      if (mounted) {
        setState(() => _showCartToast = false);
      }
    });
  }

  void _showToastSnackBar(String msg) {
    ScaffoldMessenger.of(context).hideCurrentSnackBar();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg),
        backgroundColor: const Color(0xFF047857),
        duration: const Duration(seconds: 3),
      ),
    );
  }

  int get _cartTotalItems => _cart.fold(0, (sum, item) => sum + item.quantity);

  bool get _cartHasRx => _cart.any((item) =>
      item.medicine.requiresPrescription || item.unitType == 'RxQuote');

  double get _cartSubtotal => _cart.fold(0.0, (sum, item) {
        if (item.unitType == 'RxQuote') return sum;
        return sum + item.lineTotal;
      });

  double get _deliveryFee => 0.0;

  double get _cartTotal => _cartSubtotal + _deliveryFee;

  void _openCheckoutModal({bool isDirectRxMode = false}) {
    if (_isBlocked) {
      _showToastSnackBar('🚫 Your account is BLOCKED from pharmacy ordering by administration.');
      return;
    }
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => CheckoutModalSheet(
        cart: _cart,
        isDirectRxMode: isDirectRxMode,
        deliveryMethod: _deliveryMethod,
        onOrderCompleted: (orderData) {
          setState(() {
            _cart.clear();
          });
          _showOrderSuccessDialog(orderData);
        },
      ),
    );
  }

  void _openMedicineDetailModal(MedicineModel med) {
    if (_isBlocked) {
      _showToastSnackBar('🚫 Your account is BLOCKED from pharmacy ordering by administration.');
      return;
    }
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => MedicineDetailBottomSheet(
        medicine: med,
        onAddToCart: (unit, qty) {
          for (int i = 0; i < qty; i++) {
            _addToCart(med, defaultUnitType: unit);
          }
        },
      ),
    );
  }

  void _openCartDrawer() {
    if (_isBlocked) {
      _showToastSnackBar('🚫 Your account is BLOCKED from pharmacy ordering by administration.');
      return;
    }
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setCartState) {
          return Container(
            height: MediaQuery.of(context).size.height * 0.85,
            decoration: const BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
            ),
            child: Column(
              children: [
                // Header
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                  decoration: const BoxDecoration(
                    border: Border(bottom: BorderSide(color: Color(0xFFE2E8F0))),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.shopping_bag_outlined, color: Color(0xFF059669)),
                          const SizedBox(width: 8),
                          Text(
                            'Shopping Cart (${_cart.length})',
                            style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF0F172A),
                            ),
                          ),
                        ],
                      ),
                      IconButton(
                        icon: const Icon(Icons.close),
                        onPressed: () => Navigator.pop(context),
                      ),
                    ],
                  ),
                ),

                // Body
                Expanded(
                  child: _cart.isEmpty
                      ? Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: const [
                              Icon(Icons.shopping_bag_outlined, size: 64, color: Color(0xFFCBD5E1)),
                              SizedBox(height: 12),
                              Text(
                                'Your cart is empty',
                                style: TextStyle(
                                  fontWeight: FontWeight.w600,
                                  color: Color(0xFF64748B),
                                  fontSize: 15,
                                ),
                              ),
                            ],
                          ),
                        )
                      : ListView(
                          padding: const EdgeInsets.all(20),
                          children: [
                            if (_cartHasRx)
                              Container(
                                margin: const EdgeInsets.only(bottom: 16),
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFFEF2F2),
                                  borderRadius: BorderRadius.circular(10),
                                  border: Border.all(color: const Color(0xFFFCA5A5)),
                                ),
                                child: Row(
                                  children: const [
                                    Icon(Icons.shield_outlined, color: Color(0xFFDC2626)),
                                    SizedBox(width: 10),
                                    Expanded(
                                      child: Text(
                                        '[Rx Required Items Included]\nDoctor prescription receipt upload is required at checkout. Direct payment is locked until Pharmacist approval.',
                                        style: TextStyle(fontSize: 12, color: Color(0xFF7F1D1D), height: 1.3),
                                      ),
                                    ),
                                  ],
                                ),
                              ),

                            ..._cart.asMap().entries.map((entry) {
                              final idx = entry.key;
                              final item = entry.value;
                              final isRx = item.medicine.requiresPrescription || item.unitType == 'RxQuote';

                              return Container(
                                margin: const EdgeInsets.only(bottom: 12),
                                padding: const EdgeInsets.all(14),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFF8FAFC),
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(color: const Color(0xFFE2E8F0)),
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Row(
                                                children: [
                                                  Expanded(
                                                    child: Text(
                                                      item.medicine.name,
                                                      style: const TextStyle(
                                                        fontWeight: FontWeight.bold,
                                                        fontSize: 14,
                                                        color: Color(0xFF0F172A),
                                                      ),
                                                    ),
                                                  ),
                                                  Container(
                                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                                    decoration: BoxDecoration(
                                                      color: isRx ? const Color(0xFFFEE2E2) : const Color(0xFFF1F5F9),
                                                      borderRadius: BorderRadius.circular(4),
                                                      border: Border.all(
                                                        color: isRx ? const Color(0xFFFCA5A5) : const Color(0xFFCBD5E1),
                                                      ),
                                                    ),
                                                    child: Text(
                                                      isRx ? 'Rx Verification' : 'OTC',
                                                      style: TextStyle(
                                                        fontSize: 10,
                                                        fontWeight: FontWeight.bold,
                                                        color: isRx ? const Color(0xFFDC2626) : const Color(0xFF475569),
                                                      ),
                                                    ),
                                                  ),
                                                ],
                                              ),
                                              const SizedBox(height: 6),
                                              if (isRx)
                                                Container(
                                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                                  decoration: BoxDecoration(
                                                    color: const Color(0xFFFFFBEB),
                                                    borderRadius: BorderRadius.circular(6),
                                                    border: Border.all(color: const Color(0xFFFDE68A)),
                                                  ),
                                                  child: Row(
                                                    mainAxisSize: MainAxisSize.min,
                                                    children: const [
                                                      Icon(Icons.lock_clock, size: 12, color: Color(0xFFD97706)),
                                                      SizedBox(width: 4),
                                                      Text(
                                                        'Pharmacist will calculate price & dosage',
                                                        style: TextStyle(
                                                          fontSize: 11,
                                                          fontWeight: FontWeight.w600,
                                                          color: Color(0xFFD97706),
                                                        ),
                                                      ),
                                                    ],
                                                  ),
                                                )
                                              else
                                                Row(
                                                  children: [
                                                    const Text(
                                                      'Order Unit: ',
                                                      style: TextStyle(
                                                        fontSize: 11,
                                                        fontWeight: FontWeight.bold,
                                                        color: Color(0xFF475569),
                                                      ),
                                                    ),
                                                    DropdownButton<String>(
                                                      value: item.unitType,
                                                      isDense: true,
                                                      underline: const SizedBox(),
                                                      items: _buildCartUnitDropdownItems(item),
                                                      onChanged: (newUnit) {
                                                        if (newUnit != null) {
                                                          setCartState(() {
                                                            setState(() {
                                                              item.unitType = newUnit;
                                                            });
                                                          });
                                                        }
                                                      },
                                                    ),
                                                  ],
                                                ),
                                            ],
                                          ),
                                        ),
                                        IconButton(
                                          icon: const Icon(Icons.delete_outline, color: Colors.red, size: 20),
                                          onPressed: () {
                                            setCartState(() {
                                              setState(() {
                                                _cart.removeAt(idx);
                                              });
                                            });
                                          },
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 8),
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        if (!isRx)
                                          Container(
                                            decoration: BoxDecoration(
                                              color: Colors.white,
                                              borderRadius: BorderRadius.circular(6),
                                              border: Border.all(color: const Color(0xFFCBD5E1)),
                                            ),
                                            child: Row(
                                              children: [
                                                InkWell(
                                                  onTap: () {
                                                    setCartState(() {
                                                      setState(() {
                                                        if (item.quantity > 1) {
                                                          item.quantity--;
                                                        } else {
                                                          _cart.removeAt(idx);
                                                        }
                                                      });
                                                    });
                                                  },
                                                  child: const Padding(
                                                    padding: EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                                    child: Icon(Icons.remove, size: 14, color: Color(0xFF475569)),
                                                  ),
                                                ),
                                                Text(
                                                  '${item.quantity}',
                                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                                                ),
                                                InkWell(
                                                  onTap: () {
                                                    setCartState(() {
                                                      setState(() {
                                                        item.quantity++;
                                                      });
                                                    });
                                                  },
                                                  child: const Padding(
                                                    padding: EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                                    child: Icon(Icons.add, size: 14, color: Color(0xFF475569)),
                                                  ),
                                                ),
                                              ],
                                            ),
                                          ),
                                        Text(
                                          isRx ? 'Quote Pending' : 'Rs. ${item.lineTotal.toStringAsFixed(2)}',
                                          style: TextStyle(
                                            fontSize: 14,
                                            fontWeight: FontWeight.w800,
                                            color: isRx ? const Color(0xFFD97706) : const Color(0xFF059669),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                              );
                            }),
                          ],
                        ),
                ),

                // Footer
                if (_cart.isNotEmpty)
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: const BoxDecoration(
                      color: Colors.white,
                      border: Border(top: BorderSide(color: Color(0xFFE2E8F0))),
                    ),
                    child: SafeArea(
                      top: false,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          // Fulfillment Options
                          const Text(
                            'Select Delivery Option:',
                            style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF334155)),
                          ),
                          const SizedBox(height: 8),
                          Row(
                            children: [
                              Expanded(
                                child: InkWell(
                                  onTap: () {
                                    setCartState(() {
                                      setState(() {
                                        _deliveryMethod = 'HomeDelivery';
                                      });
                                    });
                                  },
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
                                    decoration: BoxDecoration(
                                      color: _deliveryMethod == 'HomeDelivery' ? const Color(0xFFECFDF5) : Colors.white,
                                      borderRadius: BorderRadius.circular(8),
                                      border: Border.all(
                                        color: _deliveryMethod == 'HomeDelivery' ? const Color(0xFF059669) : const Color(0xFFCBD5E1),
                                        width: _deliveryMethod == 'HomeDelivery' ? 2 : 1,
                                      ),
                                    ),
                                    child: Text(
                                      'Home Delivery\n(+ Delivery Charges < 500)',
                                      textAlign: TextAlign.center,
                                      style: TextStyle(
                                        fontSize: 11,
                                        fontWeight: FontWeight.bold,
                                        color: _deliveryMethod == 'HomeDelivery' ? const Color(0xFF065F46) : const Color(0xFF475569),
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: InkWell(
                                  onTap: () {
                                    setCartState(() {
                                      setState(() {
                                        _deliveryMethod = 'Pickup';
                                      });
                                    });
                                  },
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
                                    decoration: BoxDecoration(
                                      color: _deliveryMethod == 'Pickup' ? const Color(0xFFECFDF5) : Colors.white,
                                      borderRadius: BorderRadius.circular(8),
                                      border: Border.all(
                                        color: _deliveryMethod == 'Pickup' ? const Color(0xFF059669) : const Color(0xFFCBD5E1),
                                        width: _deliveryMethod == 'Pickup' ? 2 : 1,
                                      ),
                                    ),
                                    child: Text(
                                      'Counter Pickup\n(FREE)',
                                      textAlign: TextAlign.center,
                                      style: TextStyle(
                                        fontSize: 11,
                                        fontWeight: FontWeight.bold,
                                        color: _deliveryMethod == 'Pickup' ? const Color(0xFF065F46) : const Color(0xFF475569),
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 14),

                          if (!_cartHasRx) ...[
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                const Text('Items Subtotal:', style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                                Text('Rs. ${_cartSubtotal.toStringAsFixed(2)}', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
                              ],
                            ),
                            const SizedBox(height: 4),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                const Text('Delivery Charge:', style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                                Text(
                                  _deliveryMethod == 'HomeDelivery' ? 'Payable on Delivery (< Rs. 500)' : 'FREE',
                                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF059669)),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                const Text('Total Amount', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF475569))),
                                Text(
                                  'Rs. ${_cartTotal.toStringAsFixed(2)}',
                                  style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: Color(0xFF059669)),
                                ),
                              ],
                            ),
                            const SizedBox(height: 12),
                          ],

                          ElevatedButton.icon(
                            onPressed: () {
                              Navigator.pop(context);
                              _openCheckoutModal(isDirectRxMode: false);
                            },
                            icon: const Icon(Icons.arrow_forward),
                            label: const Text(
                              'PROCEED TO CHECKOUT',
                              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                            ),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF059669),
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(vertical: 16),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
              ],
            ),
          );
        },
      ),
    );
  }

  void _showOrderSuccessDialog(Map<String, dynamic> orderData) {
    final isPickupOrCounter = (orderData['deliveryMethod'] == 'Pickup' ||
        orderData['paymentMethod'] == 'PayAtCounter' ||
        orderData['deliveryAddress'] == 'Pickup' ||
        orderData['paymentMethod'] == 'Pay at Counter');

    final qrDataStr = 'PHARMACY_ORDER|${orderData['orderNumber'] ?? orderData['id'] ?? 'SUBMITTED'}|${orderData['customerName'] ?? 'Patient'}|${orderData['totalAmount'] ?? 0}';
    final qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${Uri.encodeComponent(qrDataStr)}';

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 60,
                height: 60,
                decoration: const BoxDecoration(
                  color: Color(0xFFECFDF5),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.check_circle, color: Color(0xFF059669), size: 36),
              ),
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFFD1FAE5),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  'ORDER #${orderData['orderNumber'] ?? 'SUBMITTED'}',
                  style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF059669)),
                ),
              ),
              const SizedBox(height: 12),
              Text(
                isPickupOrCounter
                    ? 'Counter Pickup QR Pass Generated!'
                    : 'Prescription Order Submitted!',
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
              ),
              const SizedBox(height: 8),
              Text(
                isPickupOrCounter
                    ? 'Your order has been placed for Counter Pickup. Present the QR ticket pass below at the hospital pharmacy counter.'
                    : 'Your doctor prescription photo & details have been sent to our registered pharmacists for verification.',
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 12, color: Color(0xFF475569), height: 1.4),
              ),
              const SizedBox(height: 16),

              if (isPickupOrCounter) ...[
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFF059669), width: 1.5),
                  ),
                  child: Column(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFFECFDF5),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: const Color(0xFFA7F3D0)),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: const [
                            Icon(Icons.qr_code_2, size: 14, color: Color(0xFF047857)),
                            SizedBox(width: 4),
                            Flexible(
                              child: Text(
                                'HOSPITAL COUNTER QR PASS',
                                style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Color(0xFF047857)),
                                overflow: TextOverflow.ellipsis,
                                maxLines: 1,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 12),
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFFCBD5E1)),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withOpacity(0.04),
                              blurRadius: 8,
                              offset: const Offset(0, 2),
                            ),
                          ],
                        ),
                        child: Image.network(
                          qrUrl,
                          width: 150,
                          height: 150,
                          fit: BoxFit.contain,
                          loadingBuilder: (context, child, loadingProgress) {
                            if (loadingProgress == null) return child;
                            return const SizedBox(
                              width: 150,
                              height: 150,
                              child: Center(child: CircularProgressIndicator(color: Color(0xFF059669))),
                            );
                          },
                          errorBuilder: (context, error, stackTrace) => const SizedBox(
                            width: 150,
                            height: 150,
                            child: Icon(Icons.qr_code, size: 80, color: Color(0xFF059669)),
                          ),
                        ),
                      ),
                      const SizedBox(height: 10),
                      Text(
                        'Ticket #${orderData['orderNumber'] ?? 'ORD-PICKUP'}',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF0F172A)),
                      ),
                      const SizedBox(height: 4),
                      const Text(
                        'Show this QR Pass at the hospital counter for fast collection.',
                        textAlign: TextAlign.center,
                        style: TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                      ),
                      const SizedBox(height: 12),
                      ElevatedButton.icon(
                        onPressed: () async {
                          final uri = Uri.parse(qrUrl);
                          if (await canLaunchUrl(uri)) {
                            await launchUrl(uri, mode: LaunchMode.externalApplication);
                          }
                          if (mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text('📥 Opening QR Code image pass to save to device!'),
                                backgroundColor: Color(0xFF059669),
                              ),
                            );
                          }
                        },
                        icon: const Icon(Icons.download, size: 16),
                        label: const Text('Save / Download QR Code', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF059669),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
              ],

              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: isPickupOrCounter
                      ? const [
                          Text('📋 Pickup Instructions:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Color(0xFF0F172A))),
                          SizedBox(height: 6),
                          Text('1. Visit HealthBridge Main Hospital Pharmacy Counter.', style: TextStyle(fontSize: 11, color: Color(0xFF334155))),
                          SizedBox(height: 4),
                          Text('2. Show this QR Ticket Pass or Order Number to staff.', style: TextStyle(fontSize: 11, color: Color(0xFF334155))),
                          SizedBox(height: 4),
                          Text('3. Pay at counter & receive your medicine package.', style: TextStyle(fontSize: 11, color: Color(0xFF334155))),
                        ]
                      : const [
                          Text('📋 Next Steps for your Order:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Color(0xFF0F172A))),
                          SizedBox(height: 6),
                          Text('1. Licensed pharmacist reviews your prescription receipt.', style: TextStyle(fontSize: 11, color: Color(0xFF334155))),
                          SizedBox(height: 4),
                          Text('2. Pharmacist calculates total cost for medicines & delivery.', style: TextStyle(fontSize: 11, color: Color(0xFF334155))),
                          SizedBox(height: 4),
                          Text('3. Quote will be posted under My Orders tab.', style: TextStyle(fontSize: 11, color: Color(0xFF334155))),
                          SizedBox(height: 4),
                          Text('4. You can review the price and click Confirm & Pay.', style: TextStyle(fontSize: 11, color: Color(0xFF334155))),
                        ],
                ),
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () => Navigator.pop(ctx),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF059669),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: const Text('BACK TO STORE', style: TextStyle(fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: Stack(
        children: [
          SafeArea(
            child: RefreshIndicator(
              onRefresh: _loadPharmacyData,
              color: const Color(0xFF059669),
              child: CustomScrollView(
                controller: _gridScrollController,
                slivers: [
                  // App Bar / Top Navigation
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Row(
                              children: [
                                const Icon(Icons.local_pharmacy, color: Color(0xFF059669), size: 28),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: const [
                                      Text(
                                        'Pharmacy Store',
                                        style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                                      ),
                                      Text(
                                        'Manage health records & pharmacy orders',
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: TextStyle(fontSize: 10.5, color: Color(0xFF64748B)),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 8),
                          InkWell(
                            onTap: _openCartDrawer,
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                              decoration: BoxDecoration(
                                color: const Color(0xFFECFDF5),
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(color: const Color(0xFFA7F3D0)),
                              ),
                              child: Row(
                                children: [
                                  const Icon(Icons.shopping_bag_outlined, color: Color(0xFF059669), size: 20),
                                  const SizedBox(width: 6),
                                  Text(
                                    'Rs. ${_cartTotal.toStringAsFixed(2)}',
                                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF065F46)),
                                  ),
                                  if (_cartTotalItems > 0) ...[
                                    const SizedBox(width: 6),
                                    CircleAvatar(
                                      radius: 9,
                                      backgroundColor: const Color(0xFF059669),
                                      child: Text(
                                        '$_cartTotalItems',
                                        style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),

                  // Top Hero Banner
                  SliverToBoxAdapter(
                    child: Container(
                      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [Color(0xFF064E3B), Color(0xFF047857)],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        borderRadius: BorderRadius.circular(20),
                        boxShadow: [
                          BoxShadow(
                            color: const Color(0xFF059669).withOpacity(0.25),
                            blurRadius: 16,
                            offset: const Offset(0, 6),
                          ),
                        ],
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: Colors.white.withOpacity(0.18),
                              borderRadius: BorderRadius.circular(16),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: const [
                                Icon(Icons.medical_services_outlined, color: Color(0xFFA7F3D0), size: 14),
                                SizedBox(width: 6),
                                Text(
                                  'HEALTH BRIDGE CUSTOMER PHARMACY STORE',
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontSize: 10,
                                    fontWeight: FontWeight.w800,
                                    letterSpacing: 0.5,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 10),
                          const Text(
                            'Genuine Medicines &\nExpress Health Delivery',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 20,
                              fontWeight: FontWeight.w800,
                              height: 1.25,
                            ),
                          ),
                          const SizedBox(height: 6),
                          const Text(
                            'Upload your doctor prescription for restricted items or order daily healthcare essentials online.',
                            style: TextStyle(color: Color(0xFFA7F3D0), fontSize: 12, height: 1.4),
                          ),
                          const SizedBox(height: 16),
                          Row(
                            children: [
                              Expanded(
                                child: ElevatedButton.icon(
                                  onPressed: () => _openCheckoutModal(isDirectRxMode: true),
                                  icon: const Icon(Icons.upload_file, size: 16),
                                  label: const Text('Upload Prescription', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: Colors.white.withOpacity(0.2),
                                    foregroundColor: Colors.white,
                                    side: const BorderSide(color: Colors.white38),
                                    padding: const EdgeInsets.symmetric(vertical: 12),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 10),
                              ElevatedButton.icon(
                                onPressed: _openCartDrawer,
                                icon: const Icon(Icons.shopping_bag, size: 16),
                                label: Text('Cart (${_cart.length})', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: Colors.white,
                                  foregroundColor: const Color(0xFF064E3B),
                                  padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),

                  // My Orders Navigation Button Bar (Placed BEFORE Search Bar)
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        decoration: BoxDecoration(
                          color: const Color(0xFF0F172A),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: const Color(0xFF1E293B)),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withOpacity(0.06),
                              blurRadius: 10,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: const Color(0xFF1E293B),
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(color: const Color(0xFF334155)),
                              ),
                              child: const Icon(Icons.assignment_outlined, color: Color(0xFF2DD4BF), size: 20),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: const [
                                  Text(
                                    'My Orders & Verification Quotes',
                                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.white),
                                  ),
                                  SizedBox(height: 2),
                                  Text(
                                    'Track past orders, pharmacist quotes & pay',
                                    style: TextStyle(fontSize: 11, color: Color(0xFF94A3B8)),
                                  ),
                                ],
                              ),
                            ),
                            ElevatedButton.icon(
                              onPressed: () {
                                Navigator.push(
                                  context,
                                  PageRouteBuilder(
                                    transitionDuration: Duration.zero,
                                    reverseTransitionDuration: const Duration(milliseconds: 200),
                                    pageBuilder: (_, __, ___) => const MyPharmacyOrdersPage(),
                                    transitionsBuilder: (_, animation, __, child) => child,
                                  ),
                                );
                              },
                              icon: const Icon(Icons.arrow_forward, size: 14),
                              label: const Text('My Orders', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF059669),
                                foregroundColor: Colors.white,
                                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),

                  // Account Blocked Alert Banner
                  if (_isBlocked)
                    SliverToBoxAdapter(
                      child: Container(
                        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            colors: [Color(0xFF7F1D1D), Color(0xFF991B1B)],
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          ),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: const Color(0xFFEF4444), width: 1.5),
                          boxShadow: [
                            BoxShadow(
                              color: const Color(0xFFEF4444).withOpacity(0.3),
                              blurRadius: 12,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: Row(
                          children: [
                            Container(
                              width: 44,
                              height: 44,
                              decoration: const BoxDecoration(
                                color: Color(0x33FFFFFF),
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(Icons.shield_outlined, color: Color(0xFFFCA5A5), size: 26),
                            ),
                            const SizedBox(width: 12),
                            const Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    '🚫 PHARMACY & PRESCRIPTION SUSPENDED',
                                    style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 13),
                                  ),
                                  SizedBox(height: 4),
                                  Text(
                                    'Your account has been suspended by administration from ordering or prescription uploads. Other services remain available.',
                                    style: TextStyle(color: Color(0xFFFECACA), fontSize: 11, height: 1.3),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  // ─────────────────────────────────────────────
                  // Wellness AI Assistant Banner
                  // ─────────────────────────────────────────────
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      child: GestureDetector(
                        onTap: () {
                          Navigator.pushNamed(context, '/pharmacy-wellness');
                        },
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 14, vertical: 12),
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                              colors: [Color(0xFFEFF6FF), Color(0xFFDBEAFE)],
                            ),
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: const Color(0xFFBFDBFE)),
                          ),
                          child: Row(
                            children: [
                              Container(
                                width: 42,
                                height: 42,
                                decoration: BoxDecoration(
                                  gradient: const LinearGradient(
                                    colors: [Color(0xFF2563EB), Color(0xFF1D4ED8)],
                                  ),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: const Icon(
                                  Icons.auto_awesome,
                                  color: Colors.white,
                                  size: 20,
                                ),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Row(
                                      children: [
                                        const Flexible(
                                          child: Text(
                                            'Wellness Assistant',
                                            style: TextStyle(
                                              fontSize: 13.5,
                                              fontWeight: FontWeight.bold,
                                              color: Color(0xFF1E40AF),
                                            ),
                                            overflow: TextOverflow.ellipsis,
                                            maxLines: 1,
                                          ),
                                        ),
                                        const SizedBox(width: 6),
                                        Container(
                                          padding: const EdgeInsets.symmetric(
                                              horizontal: 6, vertical: 2),
                                          decoration: BoxDecoration(
                                            color: const Color(0xFF2563EB),
                                            borderRadius: BorderRadius.circular(6),
                                          ),
                                          child: const Text(
                                            'AI',
                                            style: TextStyle(
                                              fontSize: 9,
                                              fontWeight: FontWeight.bold,
                                              color: Colors.white,
                                              letterSpacing: 0.3,
                                            ),
                                            maxLines: 1,
                                            softWrap: false,
                                          ),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 3),
                                    const Text(
                                      'Describe your symptoms — get home remedies, medicines & warnings.',
                                      style: TextStyle(
                                        fontSize: 11,
                                        color: Color(0xFF1E40AF),
                                        height: 1.35,
                                      ),
                                      maxLines: 2,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(width: 8),
                              Container(
                                width: 36,
                                height: 36,
                                decoration: BoxDecoration(
                                  color: const Color(0xFF2563EB),
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: const Icon(
                                  Icons.arrow_forward_ios,
                                  color: Colors.white,
                                  size: 14,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                  // ─────────────────────────────────────────────
                  // End Wellness AI Assistant Banner
                  // ─────────────────────────────────────────────

                  // Search Bar
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: const Color(0xFFCBD5E1)),
                        ),
                        child: TextField(
                          onChanged: (val) {
                            _searchQuery = val;
                            _applyFilters();
                          },
                          decoration: const InputDecoration(
                            icon: Icon(Icons.search, color: Color(0xFF64748B)),
                            hintText: 'Search medicines, supplements, active ingredients...',
                            hintStyle: TextStyle(fontSize: 13, color: Color(0xFF94A3B8)),
                            border: InputBorder.none,
                          ),
                        ),
                      ),
                    ),
                  ),

                  // Categories Horizontal Filter Chips
                  SliverToBoxAdapter(
                    child: SizedBox(
                      height: 42,
                      child: ListView(
                        scrollDirection: Axis.horizontal,
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        children: [
                          Padding(
                            padding: const EdgeInsets.only(right: 8),
                            child: FilterChip(
                              label: Text('All Products (${_allMedicines.length})'),
                              selected: _selectedCategoryName == 'ALL',
                              selectedColor: const Color(0xFF059669),
                              labelStyle: TextStyle(
                                color: _selectedCategoryName == 'ALL' ? Colors.white : const Color(0xFF475569),
                                fontWeight: FontWeight.bold,
                                fontSize: 12,
                              ),
                              backgroundColor: Colors.white,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                              onSelected: (_) {
                                setState(() {
                                  _selectedCategoryName = 'ALL';
                                  _applyFilters();
                                });
                              },
                            ),
                          ),
                          ..._categories.map((cat) {
                            final isSel = _selectedCategoryName.toLowerCase() == cat.name.toLowerCase();
                            return Padding(
                              padding: const EdgeInsets.only(right: 8),
                              child: FilterChip(
                                label: Text(cat.name),
                                selected: isSel,
                                selectedColor: const Color(0xFF059669),
                                labelStyle: TextStyle(
                                  color: isSel ? Colors.white : const Color(0xFF475569),
                                  fontWeight: FontWeight.bold,
                                  fontSize: 12,
                                ),
                                backgroundColor: Colors.white,
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                                onSelected: (_) {
                                  setState(() {
                                    _selectedCategoryName = cat.name;
                                    _applyFilters();
                                  });
                                },
                              ),
                            );
                          }),
                        ],
                      ),
                    ),
                  ),

                  const SliverToBoxAdapter(child: SizedBox(height: 12)),

                  // Products Grid
                  _isLoading
                      ? const SliverFillRemaining(
                          child: Center(
                            child: CircularProgressIndicator(color: Color(0xFF059669)),
                          ),
                        )
                      : _filteredMedicines.isEmpty
                          ? SliverFillRemaining(
                              child: Center(
                                child: Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: const [
                                    Icon(Icons.medication_outlined, size: 64, color: Color(0xFF94A3B8)),
                                    SizedBox(height: 12),
                                    Text('No Medicines Found', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF475569))),
                                    SizedBox(height: 4),
                                    Text('Try searching for a different drug name or filter.', style: TextStyle(fontSize: 12, color: Color(0xFF94A3B8))),
                                  ],
                                ),
                              ),
                            )
                          : SliverPadding(
                              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                              sliver: SliverGrid(
                                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                                  crossAxisCount: 2,
                                  childAspectRatio: 0.52,
                                  crossAxisSpacing: 14,
                                  mainAxisSpacing: 14,
                                ),
                                delegate: SliverChildBuilderDelegate(
                                  (context, index) {
                                    final med = _filteredMedicines[index];
                                    final isHighlighted = _highlightedMedicineId == med.id;
                                    return AnimatedContainer(
                                      duration: const Duration(milliseconds: 350),
                                      curve: Curves.easeInOut,
                                      decoration: BoxDecoration(
                                        borderRadius: BorderRadius.circular(14),
                                        border: isHighlighted
                                            ? Border.all(
                                                color: const Color(0xFFFFC107),
                                                width: 3.0,
                                              )
                                            : Border.all(
                                                color: Colors.transparent,
                                                width: 3.0,
                                              ),
                                        boxShadow: isHighlighted
                                            ? [
                                                BoxShadow(
                                                  color: const Color(0xFFFFC107).withOpacity(0.45),
                                                  blurRadius: 16,
                                                  spreadRadius: 3,
                                                ),
                                              ]
                                            : null,
                                      ),
                                      child: Opacity(
                                        opacity: _isBlocked ? 0.45 : 1.0,
                                        child: AbsorbPointer(
                                          absorbing: _isBlocked,
                                          child: ProductCard(
                                            medicine: med,
                                            onAddToCart: (unit) =>
                                                _addToCart(med, defaultUnitType: unit),
                                            onOpenDetail: () => _openMedicineDetailModal(med),
                                          ),
                                        ),
                                      ),
                                    );
                                  },
                                  childCount: _filteredMedicines.length,
                                ),
                              ),
                            ),
                  const SliverToBoxAdapter(child: HealthBridgeFooter()),
                  const SliverToBoxAdapter(child: SizedBox(height: 80)),
                ],
              ),
            ),
          ),

          // Mini Toast Notification Popup when item is added
          if (_showCartToast && _notificationName != null)
            Positioned(
              bottom: 20,
              left: 16,
              right: 16,
              child: Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFF10B981), width: 2),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF10B981).withOpacity(0.3),
                      blurRadius: 20,
                      offset: const Offset(0, 6),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: const Color(0xFF059669),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(Icons.shopping_bag_outlined, color: Colors.white, size: 20),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            '✓ SUCCESSFULLY ADDED TO CART',
                            style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Color(0xFF059669)),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            _notificationName!,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                          ),
                          Text(
                            'Rs. ${_notificationPrice?.toStringAsFixed(2)} • Item in your cart',
                            style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                          ),
                        ],
                      ),
                    ),
                    ElevatedButton(
                      onPressed: () {
                        setState(() => _showCartToast = false);
                        _openCartDrawer();
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF0F172A),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      child: const Text('View Cart', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class ProductCard extends StatelessWidget {
  final MedicineModel medicine;
  final Function(String defaultUnitType) onAddToCart;
  final VoidCallback onOpenDetail;

  const ProductCard({
    super.key,
    required this.medicine,
    required this.onAddToCart,
    required this.onOpenDetail,
  });

  void _showRxInfoModal(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => Dialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        child: Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Top Header Bar with Close Button
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFEE2E2),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(Icons.assignment_turned_in, color: Color(0xFFDC2626), size: 24),
                  ),
                  const SizedBox(width: 12),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Doctor Prescription Needed',
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                        ),
                        SizedBox(height: 2),
                        Text(
                          'Rx / Restricted Medicine',
                          style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFFDC2626)),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    onPressed: () => Navigator.pop(ctx),
                    icon: const Icon(Icons.close, color: Color(0xFF64748B)),
                    tooltip: 'Close',
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // Medicine Summary Box
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.medication_liquid_sharp, color: Color(0xFF059669), size: 28),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            medicine.name,
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13.5, color: Color(0xFF0F172A)),
                          ),
                          Text(
                            'Category: ${medicine.categoryName}',
                            style: const TextStyle(fontSize: 11.5, color: Color(0xFF64748B)),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 14),

              // Explanation box for patients
              const Text(
                'What does "Rx Required" mean?',
                style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
              ),
              const SizedBox(height: 6),
              const Text(
                'In medical terminology, "Rx" stands for a Doctor\'s Prescription. This medicine is regulated for patient safety and cannot be dispensed without a valid prescription written by a doctor.',
                style: TextStyle(fontSize: 12, color: Color(0xFF475569), height: 1.45),
              ),
              const SizedBox(height: 12),

              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFECFDF5),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFA7F3D0)),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: const [
                    Icon(Icons.lightbulb_outline, color: Color(0xFF059669), size: 18),
                    SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'How to order: Tap "Request Quote", upload a photo of your doctor\'s prescription, and our licensed pharmacist will calculate your price & dosage!',
                        style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600, color: Color(0xFF065F46), height: 1.4),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // Action Buttons (Close & Proceed)
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => Navigator.pop(ctx),
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: Color(0xFFCBD5E1)),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                      child: const Text('Close', style: TextStyle(color: Color(0xFF475569), fontWeight: FontWeight.bold, fontSize: 13)),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    flex: 2,
                    child: ElevatedButton.icon(
                      onPressed: () {
                        Navigator.pop(ctx);
                        onAddToCart('RxQuote');
                      },
                      icon: const Icon(Icons.upload_file, size: 16),
                      label: const Text('Request Quote', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFFD97706),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isRx = medicine.requiresPrescription;
    final isOutOfStock = medicine.stockQuantity <= 0;

    return InkWell(
      onTap: () {
        if (isOutOfStock) {
          // Show out-of-stock popup
          showDialog(
            context: context,
            builder: (ctx) => Dialog(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
              child: Container(
                padding: const EdgeInsets.all(28),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 64, height: 64,
                      decoration: const BoxDecoration(
                        color: Color(0xFFFEF2F2),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.remove_shopping_cart, color: Color(0xFFDC2626), size: 32),
                    ),
                    const SizedBox(height: 16),
                    const Text(
                      'CURRENTLY OUT OF STOCK',
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFFDC2626), letterSpacing: 1.0),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      medicine.name,
                      textAlign: TextAlign.center,
                      style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                    ),
                    const SizedBox(height: 10),
                    const Text(
                      "We're sorry! This medicine is currently out of stock. Our pharmacist has been notified and will replenish it soon. Please check back shortly.",
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 12, color: Color(0xFF64748B), height: 1.5),
                    ),
                    const SizedBox(height: 16),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFFFBEB),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: const Color(0xFFFCD34D)),
                      ),
                      child: Row(
                        children: const [
                          Icon(Icons.notifications_active_outlined, color: Color(0xFFD97706), size: 18),
                          SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              'Pharmacist Notified — A stock replenishment alert has been sent to our pharmacy team.',
                              style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF78350F), height: 1.4),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: () => Navigator.pop(ctx),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF059669),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 13),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        child: const Text('Back to Store', style: TextStyle(fontWeight: FontWeight.bold)),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
          return;
        }
        onOpenDetail();
      },
      borderRadius: BorderRadius.circular(16),
      child: Container(
        decoration: BoxDecoration(
          color: isOutOfStock ? const Color(0xFFF8FAFC) : Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: isOutOfStock ? const Color(0xFFCBD5E1) : isRx ? const Color(0xFFFCA5A5) : const Color(0xFFE2E8F0)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(isOutOfStock ? 0.01 : 0.02),
              blurRadius: 8,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Image / Badge Container
            Stack(
              children: [
                Opacity(
                  opacity: isOutOfStock ? 0.6 : 1.0,
                  child: ClipRRect(
                    borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
                    child: _buildSmartImage(
                      medicine.galleryImages.isNotEmpty
                          ? medicine.galleryImages.first
                          : '',
                      fit: BoxFit.cover,
                    ),
                  ),
                ),
                // Out-of-stock overlay badge
                if (isOutOfStock)
                  Positioned(
                    bottom: 8, left: 8,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: const Color(0xFFDC2626).withOpacity(0.9),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.remove_shopping_cart, color: Colors.white, size: 10),
                          SizedBox(width: 4),
                          Text('Out of Stock', style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)),
                        ],
                      ),
                    ),
                  ),
                if (isRx)
                  Positioned(
                    top: 8,
                    right: 8,
                    child: GestureDetector(
                      onTap: () => _showRxInfoModal(context),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFFDC2626),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: const [
                            Icon(Icons.assignment_turned_in, color: Colors.white, size: 10),
                            SizedBox(width: 4),
                            Text(
                              'Rx Required',
                              style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
              ],
            ),

            // Content
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(10),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Brand / Category Tag
                    Text(
                      medicine.categoryName.toUpperCase(),
                      style: const TextStyle(fontSize: 9.5, fontWeight: FontWeight.bold, color: Color(0xFF64748B), letterSpacing: 0.5),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),

                    // Title
                    Text(
                      medicine.name,
                      style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.bold, color: Color(0xFF0F172A), height: 1.2),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const Spacer(),

                    // Prices & Buttons (Adaptive)
                    Builder(
                      builder: (context) {
                        final config = getFlutterDisplayConfig(medicine);
                        return Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              config.priceLine,
                              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Color(0xFF059669)),
                            ),
                            if (config.packLine.isNotEmpty)
                              Text(
                                config.packLine,
                                style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: Color(0xFF475569)),
                              ),
                            const SizedBox(height: 8),
                            if (isRx)
                              SizedBox(
                                width: double.infinity,
                                child: ElevatedButton.icon(
                                  onPressed: isOutOfStock ? null : () => _showRxInfoModal(context),
                                  icon: const Icon(Icons.assignment, size: 12),
                                  label: const Text('Request Quote', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: isOutOfStock ? const Color(0xFFCBD5E1) : const Color(0xFFD97706),
                                    foregroundColor: isOutOfStock ? const Color(0xFF94A3B8) : Colors.white,
                                    disabledBackgroundColor: const Color(0xFFE2E8F0),
                                    disabledForegroundColor: const Color(0xFF94A3B8),
                                    padding: const EdgeInsets.symmetric(vertical: 8),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                  ),
                                ),
                              )
                            else if (config.buttons.length == 1)
                              SizedBox(
                                width: double.infinity,
                                child: ElevatedButton(
                                  onPressed: isOutOfStock ? null : () => onAddToCart(config.buttons[0].unitType),
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: isOutOfStock ? const Color(0xFFCBD5E1) : const Color(0xFF059669),
                                    foregroundColor: isOutOfStock ? const Color(0xFF94A3B8) : Colors.white,
                                    disabledBackgroundColor: const Color(0xFFE2E8F0),
                                    disabledForegroundColor: const Color(0xFF94A3B8),
                                    padding: const EdgeInsets.symmetric(vertical: 8),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                  ),
                                  child: Text(config.buttons[0].label, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                                ),
                              )
                            else
                              Row(
                                children: [
                                  Expanded(
                                    child: ElevatedButton(
                                      onPressed: isOutOfStock ? null : () => onAddToCart(config.buttons[0].unitType),
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: isOutOfStock ? const Color(0xFFCBD5E1) : const Color(0xFF059669),
                                        foregroundColor: isOutOfStock ? const Color(0xFF94A3B8) : Colors.white,
                                        disabledBackgroundColor: const Color(0xFFE2E8F0),
                                        disabledForegroundColor: const Color(0xFF94A3B8),
                                        padding: const EdgeInsets.symmetric(vertical: 8),
                                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                      ),
                                      child: Text(config.buttons[0].label, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                                    ),
                                  ),
                                  const SizedBox(width: 6),
                                  Expanded(
                                    child: ElevatedButton(
                                      onPressed: isOutOfStock ? null : () => onAddToCart(config.buttons[1].unitType),
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: isOutOfStock ? const Color(0xFFCBD5E1) : const Color(0xFF047857),
                                        foregroundColor: isOutOfStock ? const Color(0xFF94A3B8) : Colors.white,
                                        disabledBackgroundColor: const Color(0xFFE2E8F0),
                                        disabledForegroundColor: const Color(0xFF94A3B8),
                                        padding: const EdgeInsets.symmetric(vertical: 8),
                                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                      ),
                                      child: Text(config.buttons[1].label, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                                    ),
                                  ),
                                ],
                              ),
                          ],
                        );
                      },
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSmartImage(String rawUrl, {BoxFit fit = BoxFit.cover, double height = 120, double width = double.infinity}) {
    final cleanUrl = MedicineModel.resolveImageUrl(rawUrl).trim();
    if (cleanUrl.isEmpty) {
      return _buildImagePlaceholder();
    }
    if (cleanUrl.startsWith('data:image/') && cleanUrl.contains(';base64,')) {
      try {
        final base64Str = cleanUrl.split(';base64,').last;
        final bytes = base64Decode(base64Str);
        return Image.memory(
          bytes,
          height: height,
          width: width,
          fit: fit,
          errorBuilder: (c, e, s) => _buildImagePlaceholder(),
        );
      } catch (_) {
        return _buildImagePlaceholder();
      }
    }
    return Image.network(
      cleanUrl,
      height: height,
      width: width,
      fit: fit,
      errorBuilder: (c, e, s) => Image.network(
        'https://images.unsplash.com/photo-1585435557343-3b092031a831?w=500&auto=format&fit=crop',
        height: height,
        width: width,
        fit: fit,
        errorBuilder: (c2, e2, s2) => _buildImagePlaceholder(),
      ),
    );
  }

  Widget _buildImagePlaceholder() {
    return Container(
      height: 120,
      width: double.infinity,
      color: const Color(0xFFF1F5F9),
      child: const Center(
        child: Icon(Icons.medication_liquid_sharp, size: 48, color: Color(0xFF94A3B8)),
      ),
    );
  }
}

class CheckoutModalSheet extends StatefulWidget {
  final List<CartItemModel> cart;
  final bool isDirectRxMode;
  final String deliveryMethod;
  final Function(Map<String, dynamic> orderData) onOrderCompleted;

  const CheckoutModalSheet({
    super.key,
    required this.cart,
    required this.isDirectRxMode,
    required this.deliveryMethod,
    required this.onOrderCompleted,
  });

  @override
  State<CheckoutModalSheet> createState() => _CheckoutModalSheetState();
}

class _CheckoutModalSheetState extends State<CheckoutModalSheet> {
  final _formKey = GlobalKey<FormState>();

  late TextEditingController _nameCtrl;
  late TextEditingController _emailCtrl;
  late TextEditingController _phoneCtrl;
  late TextEditingController _addressCtrl;
  late TextEditingController _notesCtrl;

  late TextEditingController _cardHolderCtrl;
  late TextEditingController _cardNumberCtrl;
  late TextEditingController _cardExpiryCtrl;
  late TextEditingController _cardCvvCtrl;

  File? _prescriptionImageFile;
  String _paymentMethod = 'CashOnDelivery'; // 'CashOnDelivery' | 'Card' | 'PayAtCounter'
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    _nameCtrl = TextEditingController(text: AppSession.userName ?? 'Patient Customer');
    _emailCtrl = TextEditingController(text: AppSession.loggedInUserEmail ?? AuthState.email ?? '');
    _phoneCtrl = TextEditingController(text: '0771234567');
    _addressCtrl = TextEditingController(text: 'No 12, Hospital Road, Colombo 03');
    _notesCtrl = TextEditingController();

    _cardHolderCtrl = TextEditingController();
    _cardNumberCtrl = TextEditingController();
    _cardExpiryCtrl = TextEditingController();
    _cardCvvCtrl = TextEditingController();
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _emailCtrl.dispose();
    _phoneCtrl.dispose();
    _addressCtrl.dispose();
    _notesCtrl.dispose();

    _cardHolderCtrl.dispose();
    _cardNumberCtrl.dispose();
    _cardExpiryCtrl.dispose();
    _cardCvvCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickPrescriptionImage() async {
    final picker = ImagePicker();
    final picked = await picker.pickImage(source: ImageSource.gallery, imageQuality: 85);
    if (picked != null) {
      setState(() {
        _prescriptionImageFile = File(picked.path);
      });
    }
  }

  bool get _hasRxItems => widget.cart.any((item) =>
      item.medicine.requiresPrescription || item.unitType == 'RxQuote');

  bool get _isDirectRxOnly => widget.isDirectRxMode || widget.cart.isEmpty;

  bool get _requiresVerification =>
      _hasRxItems || _prescriptionImageFile != null || _isDirectRxOnly;

  List<String> _collectValidationErrors() {
    final List<String> errors = [];

    // Full Name
    final name = _nameCtrl.text.trim();
    if (name.isEmpty) {
      errors.add('Full name field is empty');
    } else if (RegExp(r'[0-9]').hasMatch(name)) {
      errors.add('Full name cannot contain numbers');
    } else if (!RegExp(r'^[a-zA-Z\s\.\-]+$').hasMatch(name)) {
      errors.add('Full name cannot contain symbols');
    }

    // Email
    final email = _emailCtrl.text.trim();
    if (email.isEmpty) {
      errors.add('Email address field is empty');
    } else if (!email.contains('@') || !RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$').hasMatch(email)) {
      errors.add('Email address field must contain @ and a valid domain (e.g. name@gmail.com)');
    }

    // Phone Number
    final phone = _phoneCtrl.text.trim();
    if (phone.isEmpty) {
      errors.add('Telephone field is empty');
    } else if (phone.length != 10 || !RegExp(r'^\d{10}$').hasMatch(phone)) {
      errors.add('Phone number must be exactly 10 digits (numbers only)');
    }

    // Delivery Address
    final address = _addressCtrl.text.trim();
    if (address.isEmpty) {
      errors.add('Delivery address field is empty');
    } else if (RegExp(r'^\d+$').hasMatch(address)) {
      errors.add('Delivery address cannot be only numbers');
    }

    // Prescription Upload (Mandatory checks)
    if (_isDirectRxOnly && _prescriptionImageFile == null) {
      errors.add('Doctor prescription photo is mandatory for direct prescription orders');
    } else if (_hasRxItems && _prescriptionImageFile == null) {
      errors.add('Doctor prescription photo is mandatory for prescription-restricted items');
    }

    return errors;
  }

  void _showValidationErrorDialog(List<String> errors) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        backgroundColor: const Color(0xFFFEF2F2),
        title: Row(
          children: const [
            Icon(Icons.error_outline, color: Color(0xFFDC2626), size: 24),
            SizedBox(width: 8),
            Text(
              'Missing / Invalid Field',
              style: TextStyle(color: Color(0xFF991B1B), fontWeight: FontWeight.bold, fontSize: 16),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Please correct the following field mistakes before submitting:',
              style: TextStyle(fontSize: 12, color: Color(0xFF7F1D1D), fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 12),
            ...errors.map((err) => Padding(
                  padding: const EdgeInsets.only(bottom: 6),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('• ', style: TextStyle(color: Color(0xFFDC2626), fontWeight: FontWeight.bold, fontSize: 14)),
                      Expanded(
                        child: Text(
                          err,
                          style: const TextStyle(color: Color(0xFFB91C1C), fontSize: 12.5, fontWeight: FontWeight.w600),
                        ),
                      ),
                    ],
                  ),
                )),
          ],
        ),
        actions: [
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFDC2626),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            child: const Text('Fix Mistakes', style: TextStyle(fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  Future<void> _submitOrder() async {
    final formValid = _formKey.currentState?.validate() ?? false;
    final errors = _collectValidationErrors();

    if (!formValid || errors.isNotEmpty) {
      _showValidationErrorDialog(errors);
      return;
    }

    setState(() => _submitting = true);

    String? uploadedUrl;
    if (_prescriptionImageFile != null) {
      uploadedUrl = await PharmacyService.uploadPrescriptionImage(_prescriptionImageFile);
    }

    final isRx = _requiresVerification;
    final orderItems = _isDirectRxOnly
        ? <Map<String, dynamic>>[]
        : widget.cart.map((item) {
              final isCard = item.unitType == 'Card';
              final medName = (isCard && !item.medicine.name.toLowerCase().contains('(card)'))
                  ? '${item.medicine.name} (Card)'
                  : item.medicine.name;
              return {
                'medicineId': item.medicine.id,
                'medicineName': medName,
                'requiresPrescription': item.medicine.requiresPrescription,
                'unitType': item.unitType,
                'quantity': item.quantity,
                'price': isRx ? 0.0 : item.unitPrice,
                'unitPrice': isRx ? 0.0 : item.unitPrice,
              };
            }).toList();

    final subtotal = widget.cart.fold(0.0, (s, i) => s + i.lineTotal);
    final deliveryFee = 0.0;
    final totalAmount = isRx ? 0.0 : subtotal;

    final resData = await PharmacyService.placeOrder(
      customerName: _nameCtrl.text.trim(),
      customerEmail: _emailCtrl.text.trim().isNotEmpty
          ? _emailCtrl.text.trim()
          : (AppSession.loggedInUserEmail ?? AuthState.email ?? ''),
      customerPhone: _phoneCtrl.text.trim(),
      deliveryAddress: _addressCtrl.text.trim(),
      deliveryMethod: widget.deliveryMethod,
      paymentMethod: isRx ? 'PendingPharmacistQuote' : _paymentMethod,
      prescriptionImageUrl: uploadedUrl,
      status: isRx ? 'PendingVerification' : 'Confirmed',
      totalAmount: totalAmount,
      adminNote: _notesCtrl.text.trim().isNotEmpty
          ? '[Patient Note]: ${_notesCtrl.text.trim()}'
          : (_isDirectRxOnly ? '[Direct Prescription Upload Order]' : null),
      items: orderItems,
    );

    if (mounted) {
      setState(() => _submitting = false);
      Navigator.pop(context); // Close checkout modal sheet
      if (resData != null) {
        widget.onOrderCompleted(resData);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      height: MediaQuery.of(context).size.height * 0.9,
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(
          backgroundColor: Colors.white,
          elevation: 0,
          leading: IconButton(
            icon: const Icon(Icons.close, color: Color(0xFF0F172A)),
            onPressed: () => Navigator.pop(context),
          ),
          title: Text(
            _isDirectRxOnly ? '🏥 Direct Doctor Prescription Order' : 'Order Checkout & Verification',
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
          ),
        ),
        body: SingleChildScrollView(
          padding: EdgeInsets.fromLTRB(20, 20, 20, MediaQuery.of(context).padding.bottom + 30),
          child: Form(
            key: _formKey,
            autovalidateMode: AutovalidateMode.onUserInteraction,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (_isDirectRxOnly)
                  Container(
                    margin: const EdgeInsets.only(bottom: 20),
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: const Color(0xFFECFDF5),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFA7F3D0)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: const [
                        Text(
                          '✨ Senior & Direct Prescription Ordering Service',
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF047857)),
                        ),
                        SizedBox(height: 4),
                        Text(
                          'No need to search for individual medicines! Simply upload a photo of your doctor prescription below. Our registered pharmacist will calculate the price, set dosage, and send your quote.',
                          style: TextStyle(fontSize: 11.5, color: Color(0xFF065F46), height: 1.4),
                        ),
                      ],
                    ),
                  ),

                // 1. Delivery Details
                const Text('1. Delivery & Contact Details', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF0F172A))),
                const SizedBox(height: 10),
                TextFormField(
                  controller: _nameCtrl,
                  decoration: const InputDecoration(labelText: 'Full Name *', border: OutlineInputBorder()),
                  validator: (v) {
                    if (v == null || v.trim().isEmpty) return 'Enter full name';
                    if (RegExp(r'[0-9]').hasMatch(v.trim())) return 'Full name cannot contain numbers';
                    if (!RegExp(r'^[a-zA-Z\s\.\-]+$').hasMatch(v.trim())) return 'Full name cannot contain symbols';
                    return null;
                  },
                ),
                const SizedBox(height: 10),
                TextFormField(
                  controller: _emailCtrl,
                  keyboardType: TextInputType.emailAddress,
                  decoration: const InputDecoration(
                    labelText: 'Email Address (Order Confirmation Sent Here) *',
                    hintText: 'e.g. yourname@gmail.com',
                    border: OutlineInputBorder(),
                  ),
                  validator: (v) {
                    if (v == null || v.trim().isEmpty) return 'Enter email address';
                    if (!v.contains('@') || !RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$').hasMatch(v.trim())) {
                      return 'Please enter a valid email address with @';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 10),
                TextFormField(
                  controller: _phoneCtrl,
                  keyboardType: TextInputType.phone,
                  decoration: const InputDecoration(labelText: 'Phone Number *', border: OutlineInputBorder()),
                  validator: (v) {
                    if (v == null || v.trim().isEmpty) return 'Telephone field is empty';
                    if (v.trim().length != 10 || !RegExp(r'^\d{10}$').hasMatch(v.trim())) {
                      return 'Phone number must be exactly 10 digits';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 10),
                TextFormField(
                  controller: _addressCtrl,
                  maxLines: 2,
                  decoration: const InputDecoration(labelText: 'Delivery Address *', border: OutlineInputBorder()),
                  validator: (v) {
                    if (v == null || v.trim().isEmpty) return 'Enter delivery address';
                    if (RegExp(r'^\d+$').hasMatch(v.trim())) return 'Delivery address cannot be only numbers';
                    return null;
                  },
                ),
                const SizedBox(height: 20),

                // 2. Doctor Prescription Upload
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: (_hasRxItems || _isDirectRxOnly) ? const Color(0xFFFFFBEB) : const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: (_hasRxItems || _isDirectRxOnly) ? const Color(0xFFFDE68A) : const Color(0xFFE2E8F0),
                    ),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '2. Doctor Prescription Upload ${(_hasRxItems || _isDirectRxOnly) ? '(MANDATORY)' : '(Optional)'}',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 13,
                          color: (_hasRxItems || _isDirectRxOnly) ? const Color(0xFF991B1B) : const Color(0xFF065F46),
                        ),
                      ),
                      const SizedBox(height: 10),
                      InkWell(
                        onTap: _pickPrescriptionImage,
                        child: Container(
                          width: double.infinity,
                          padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(
                              color: (_hasRxItems || _isDirectRxOnly) && _prescriptionImageFile == null
                                  ? Colors.red
                                  : const Color(0xFF059669),
                              width: 2,
                            ),
                          ),
                          child: Column(
                            children: [
                              Icon(
                                Icons.cloud_upload_outlined,
                                size: 36,
                                color: (_hasRxItems || _isDirectRxOnly) ? const Color(0xFFDC2626) : const Color(0xFF059669),
                              ),
                              const SizedBox(height: 6),
                              Text(
                                _prescriptionImageFile != null ? 'Image Selected!' : 'Tap to Upload Doctor Prescription Photo',
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 13,
                                  color: (_hasRxItems || _isDirectRxOnly) ? const Color(0xFF991B1B) : const Color(0xFF065F46),
                                ),
                              ),
                              const SizedBox(height: 2),
                              const Text('Select image from Gallery / Storage', style: TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                            ],
                          ),
                        ),
                      ),
                      if (_prescriptionImageFile != null) ...[
                        const SizedBox(height: 12),
                        ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: Image.file(_prescriptionImageFile!, height: 140, width: double.infinity, fit: BoxFit.cover),
                        ),
                      ],
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: _notesCtrl,
                        maxLines: 2,
                        decoration: const InputDecoration(
                          labelText: 'Customer Notes, Medical Details & Allergies (Optional)',
                          hintText: 'e.g. Allergic to penicillin, need 5 days supply...',
                          border: OutlineInputBorder(),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),

                // 3. Payment Method
                const Text('3. Select Payment Method', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF0F172A))),
                const SizedBox(height: 10),
                if (_requiresVerification)
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: const Color(0xFFECFDF5),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFA7F3D0)),
                    ),
                    child: Row(
                      children: const [
                        Icon(Icons.check_circle_outline, color: Color(0xFF059669)),
                        SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            'Prescription Verification & Pharmacist Quote Flow\nDirect online payment is disabled until pharmacist approval. You can pay on your My Orders page after quote approval.',
                            style: TextStyle(fontSize: 12, color: Color(0xFF047857), height: 1.35),
                          ),
                        ),
                      ],
                    ),
                  )
                else ...[
                  RadioListTile<String>(
                    value: 'CashOnDelivery',
                    groupValue: _paymentMethod,
                    title: const Text('💵 Cash on Home Delivery (COD)', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                    subtitle: const Text('Pay cash when medicines arrive at your doorstep', style: TextStyle(fontSize: 11)),
                    onChanged: (val) => setState(() => _paymentMethod = val!),
                  ),
                  RadioListTile<String>(
                    value: 'Card',
                    groupValue: _paymentMethod,
                    title: const Text('💳 Credit / Debit Card', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                    subtitle: const Text('Visa, MasterCard, AMEX (Instant Online)', style: TextStyle(fontSize: 11)),
                    onChanged: (val) => setState(() => _paymentMethod = val!),
                  ),
                  if (_paymentMethod == 'Card')
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: Column(
                        children: [
                          TextField(controller: _cardHolderCtrl, decoration: const InputDecoration(labelText: 'Cardholder Name')),
                          const SizedBox(height: 6),
                          TextField(controller: _cardNumberCtrl, decoration: const InputDecoration(labelText: 'Card Number')),
                          const SizedBox(height: 6),
                          Row(
                            children: [
                              Expanded(child: TextField(controller: _cardExpiryCtrl, decoration: const InputDecoration(labelText: 'MM / YY'))),
                              const SizedBox(width: 10),
                              Expanded(child: TextField(controller: _cardCvvCtrl, obscureText: true, decoration: const InputDecoration(labelText: 'CVV'))),
                            ],
                          ),
                          const SizedBox(height: 10),
                        ],
                      ),
                    ),
                  RadioListTile<String>(
                    value: 'PayAtCounter',
                    groupValue: _paymentMethod,
                    title: const Text('📱 Pay at Counter / Generate QR Code', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                    subtitle: const Text('Instant QR pickup ticket for fast counter scan', style: TextStyle(fontSize: 11)),
                    onChanged: (val) => setState(() => _paymentMethod = val!),
                  ),
                ],

                const SizedBox(height: 24),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: _submitting ? null : _submitOrder,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF059669),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: _submitting
                        ? const CircularProgressIndicator(color: Colors.white)
                        : Text(
                            _requiresVerification ? 'Submit Order for Pharmacist Verification' : 'Confirm & Place Order',
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                          ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class MedicineDetailBottomSheet extends StatefulWidget {
  final MedicineModel medicine;
  final Function(String unitType, int quantity) onAddToCart;

  const MedicineDetailBottomSheet({
    super.key,
    required this.medicine,
    required this.onAddToCart,
  });

  @override
  State<MedicineDetailBottomSheet> createState() => _MedicineDetailBottomSheetState();
}

class _MedicineDetailBottomSheetState extends State<MedicineDetailBottomSheet> {
  int _selectedImageIndex = 0;
  int _quantity = 1;

  // Storage chip data: maps raw keyword => display data
  static final Map<String, Map<String, String>> _storageMap = {
    'room_temp':               {'emoji': '🌡️', 'label': 'Normal Room Temp. (<25°C)', 'bg': 'ecfdf5', 'color': '047857', 'border': 'a7f3d0'},
    'normal room temperature': {'emoji': '🌡️', 'label': 'Normal Room Temp. (<25°C)', 'bg': 'ecfdf5', 'color': '047857', 'border': 'a7f3d0'},
    'cool_dry':                {'emoji': '🌤️', 'label': 'Cool & Dry Place (<25°C)',  'bg': 'f0fdf4', 'color': '166534', 'border': '86efac'},
    'cool & dry':              {'emoji': '🌤️', 'label': 'Cool & Dry Place (<25°C)',  'bg': 'f0fdf4', 'color': '166534', 'border': '86efac'},
    'refrigerated':            {'emoji': '❄️', 'label': 'Refrigerated (2°C – 8°C)',  'bg': 'eff6ff', 'color': '1d4ed8', 'border': 'bfdbfe'},
    'frozen':                  {'emoji': '🧊', 'label': 'Frozen (Below -18°C)',       'bg': 'eff6ff', 'color': '1e40af', 'border': '93c5fd'},
    'protect_light':           {'emoji': '☀️', 'label': 'Protect from Light',         'bg': 'fffbeb', 'color': '92400e', 'border': 'fde68a'},
    'protect from light':      {'emoji': '☀️', 'label': 'Protect from Light',         'bg': 'fffbeb', 'color': '92400e', 'border': 'fde68a'},
    'protect_moist':           {'emoji': '💧', 'label': 'Protect from Moisture',      'bg': 'eff6ff', 'color': '1e40af', 'border': 'bfdbfe'},
    'protect_moisture':        {'emoji': '💧', 'label': 'Protect from Moisture',      'bg': 'eff6ff', 'color': '1e40af', 'border': 'bfdbfe'},
    'protect from moisture':   {'emoji': '💧', 'label': 'Protect from Moisture',      'bg': 'eff6ff', 'color': '1e40af', 'border': 'bfdbfe'},
    'keep_children':           {'emoji': '👶', 'label': 'Keep Out of Reach of Children', 'bg': 'fef2f2', 'color': '991b1b', 'border': 'fecaca'},
    'keep_reach':              {'emoji': '👶', 'label': 'Keep Out of Reach of Children', 'bg': 'fef2f2', 'color': '991b1b', 'border': 'fecaca'},
    'keep out of reach':       {'emoji': '👶', 'label': 'Keep Out of Reach of Children', 'bg': 'fef2f2', 'color': '991b1b', 'border': 'fecaca'},
    'original_pack':           {'emoji': '📦', 'label': 'Store in Original Container', 'bg': 'f8fafc', 'color': '334155', 'border': 'cbd5e1'},
    'store_original':          {'emoji': '📦', 'label': 'Store in Original Container', 'bg': 'f8fafc', 'color': '334155', 'border': 'cbd5e1'},
    'store in original':       {'emoji': '📦', 'label': 'Store in Original Container', 'bg': 'f8fafc', 'color': '334155', 'border': 'cbd5e1'},
    'do not freeze':           {'emoji': '🚫', 'label': 'Do Not Freeze',              'bg': 'fef2f2', 'color': '991b1b', 'border': 'fecaca'},
  };

  // Convert a hex string like 'ecfdf5' to Color
  static Color _hex(String h) {
    return Color(int.parse('FF$h', radix: 16));
  }

  List<Map<String, dynamic>> _parseStorageChips(String? raw) {
    if (raw == null || raw.trim().isEmpty) {
      return [{'emoji': '🌡️', 'label': 'Normal Room Temp. (<25°C)', 'bg': _hex('ecfdf5'), 'color': _hex('047857'), 'border': _hex('a7f3d0')}];
    }
    final parts = raw.split(RegExp(r'[,;]+')).map((s) => s.trim()).where((s) => s.isNotEmpty).toList();
    return parts.map((part) {
      final lower = part.toLowerCase();
      for (final entry in _storageMap.entries) {
        if (lower.contains(entry.key)) {
          final d = entry.value;
          return {'emoji': d['emoji']!, 'label': d['label']!, 'bg': _hex(d['bg']!), 'color': _hex(d['color']!), 'border': _hex(d['border']!)};
        }
      }
      return {'emoji': '📋', 'label': part, 'bg': _hex('f8fafc'), 'color': _hex('334155'), 'border': _hex('cbd5e1')};
    }).toList();
  }

  Widget _buildSmartImage(String rawUrl, {BoxFit fit = BoxFit.cover}) {
    final cleanUrl = MedicineModel.resolveImageUrl(rawUrl).trim();
    if (cleanUrl.isEmpty) {
      return const Center(child: Icon(Icons.medication_liquid, size: 40, color: Color(0xFF94A3B8)));
    }
    if (cleanUrl.startsWith('data:image/') && cleanUrl.contains(';base64,')) {
      try {
        final base64Str = cleanUrl.split(';base64,').last;
        final bytes = base64Decode(base64Str);
        return Image.memory(
          bytes,
          fit: fit,
          errorBuilder: (c, e, s) => const Center(child: Icon(Icons.medication_liquid, size: 40, color: Color(0xFF94A3B8))),
        );
      } catch (_) {
        return const Center(child: Icon(Icons.medication_liquid, size: 40, color: Color(0xFF94A3B8)));
      }
    }
    return Image.network(
      cleanUrl,
      fit: fit,
      errorBuilder: (c, e, s) => Image.network(
        'https://images.unsplash.com/photo-1585435557343-3b092031a831?w=500&auto=format&fit=crop',
        fit: fit,
        errorBuilder: (c2, e2, s2) => const Center(child: Icon(Icons.medication_liquid, size: 40, color: Color(0xFF94A3B8))),
      ),
    );
  }

  Future<void> _launchGoogleSearch(String query) async {
    final searchUrl = Uri.parse('https://www.google.com/search?q=${Uri.encodeComponent(query + " medicine dosage brand details")}');
    if (await canLaunchUrl(searchUrl)) {
      await launchUrl(searchUrl, mode: LaunchMode.externalApplication);
    }
  }

  @override
  Widget build(BuildContext context) {
    final med = widget.medicine;
    final images = med.galleryImages;
    final activeImg = images.isNotEmpty && _selectedImageIndex < images.length
        ? images[_selectedImageIndex]
        : (med.imageUrl ?? '');
    final brand = med.brandName?.isNotEmpty == true ? med.brandName! : 'CIPLA PHARMA';
    final isRx = med.requiresPrescription;

    return Container(
      height: MediaQuery.of(context).size.height * 0.88,
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      child: Column(
        children: [
          // Header Bar: ← Back to Products | CATEGORY BADGE | Close X
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: const BoxDecoration(
              border: Border(bottom: BorderSide(color: Color(0xFFE2E8F0))),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                InkWell(
                  onTap: () => Navigator.pop(context),
                  child: Row(
                    children: const [
                      Icon(Icons.arrow_back, size: 18, color: Color(0xFF059669)),
                      SizedBox(width: 4),
                      Text(
                        'Back to Products',
                        style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF059669)),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: const Color(0xFFECFDF5),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: const Color(0xFFA7F3D0)),
                  ),
                  child: Text(
                    med.categoryName.toUpperCase(),
                    style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF047857)),
                  ),
                ),
                IconButton(
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.close, color: Color(0xFF64748B)),
                ),
              ],
            ),
          ),

          // Scrollable Content
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Main Image View with Genuine Medicine Seal
                  Stack(
                    children: [
                      Container(
                        height: 260,
                        width: double.infinity,
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                        ),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(16),
                          child: _buildSmartImage(activeImg, fit: BoxFit.contain),
                        ),
                      ),
                      Positioned(
                        top: 12,
                        left: 12,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                          decoration: BoxDecoration(
                            color: Colors.white.withAlpha(235),
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(color: const Color(0xFFA7F3D0)),
                            boxShadow: [
                              BoxShadow(color: Colors.black.withAlpha(13), blurRadius: 6),
                            ],
                          ),
                          child: Row(
                            children: const [
                              Icon(Icons.verified, color: Color(0xFF059669), size: 14),
                              SizedBox(width: 4),
                              Text(
                                '100% Genuine Medicine',
                                style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF065F46)),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),

                  // Gallery Thumbnail Strip
                  if (images.length > 1) ...[
                    const SizedBox(height: 12),
                    SizedBox(
                      height: 60,
                      child: ListView.builder(
                        scrollDirection: Axis.horizontal,
                        itemCount: images.length,
                        itemBuilder: (ctx, idx) {
                          final imgUrl = images[idx];
                          final isSel = idx == _selectedImageIndex;
                          return GestureDetector(
                            onTap: () => setState(() => _selectedImageIndex = idx),
                            child: Container(
                              margin: const EdgeInsets.only(right: 10),
                              width: 60,
                              decoration: BoxDecoration(
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(
                                  color: isSel ? const Color(0xFF059669) : const Color(0xFFCBD5E1),
                                  width: isSel ? 2.5 : 1,
                                ),
                              ),
                              child: ClipRRect(
                                borderRadius: BorderRadius.circular(8),
                                child: _buildSmartImage(imgUrl, fit: BoxFit.cover),
                              ),
                            ),
                          );
                        },
                      ),
                    ),
                  ],

                  const SizedBox(height: 20),

                  // Brand Tag & Verified Brand Subtitle
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFFEFF6FF),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: const Color(0xFFBFDBFE)),
                        ),
                        child: Text(
                          brand.toUpperCase(),
                          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF1D4ED8)),
                        ),
                      ),
                      const SizedBox(width: 8),
                      const Text(
                        '• Verified Pharmaceutical Brand',
                        style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF64748B)),
                      ),
                    ],
                  ),

                  const SizedBox(height: 8),

                  // Medicine Title
                  Text(
                    med.name,
                    style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                  ),

                  const SizedBox(height: 14),

                  // Description Section
                  const Text(
                    'PRODUCT DESCRIPTION',
                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF64748B), letterSpacing: 0.5),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    med.description,
                    style: const TextStyle(fontSize: 13, color: Color(0xFF334155), height: 1.45),
                  ),

                  const SizedBox(height: 18),

                  // Pricing & Stock Availability Box
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                    ),
                    child: Builder(
                      builder: (context) {
                        final sUnit = (med.sellingUnit).toUpperCase();
                        String unitLabel = 'UNIT PRICE (PER ${sUnit == 'PILLS' ? 'PILL' : sUnit}): ';
                        String packPriceLabel = 'ONE CARD PRICE: ';
                        String packQtyText = 'PILLS IN ONE CARD: ${med.pillsPerCard} pills in one card';

                        if (sUnit == 'SACHET') {
                          packPriceLabel = 'ONE BOX PRICE: ';
                          packQtyText = 'SACHETS IN ONE BOX: ${med.sachetsPerBox ?? 10} sachets in one box';
                        } else if (sUnit == 'VIAL') {
                          packPriceLabel = 'ONE BOX PRICE: ';
                          packQtyText = 'VIALS IN ONE BOX: ${med.vialsPerBox ?? 5} vials in one box';
                        } else if (sUnit == 'BOTTLE') {
                          packPriceLabel = 'BOTTLE SIZE: ';
                          packQtyText = 'VOLUME: ${med.bottleSize ?? 100} ml bottle';
                        } else if (sUnit == 'TUBE') {
                          packPriceLabel = 'TUBE WEIGHT: ';
                          packQtyText = 'NET WEIGHT: ${med.tubeWeight ?? 20} g tube';
                        } else if (sUnit == 'INHALER') {
                          packPriceLabel = 'INHALER SPEC: ';
                          packQtyText = 'PUFFS PER INHALER: ${med.puffsPerInhaler ?? 200} puffs';
                        }

                        final double pPrice = (sUnit == 'SACHET' || sUnit == 'VIAL')
                            ? (med.boxPrice ?? med.cardPrice)
                            : med.cardPrice;

                        return Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Text(unitLabel, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF64748B))),
                                Text(
                                  'Rs. ${med.price.toStringAsFixed(2)}',
                                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF059669)),
                                ),
                              ],
                            ),
                            if (sUnit != 'BOTTLE' && sUnit != 'TUBE' && sUnit != 'INHALER') ...[
                              const SizedBox(height: 6),
                              Row(
                                children: [
                                  Text(packPriceLabel, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF64748B))),
                                  Text(
                                    'Rs. ${pPrice.toStringAsFixed(2)}',
                                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                                  ),
                                ],
                              ),
                            ],
                            const SizedBox(height: 10),
                            Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFF1F5F9),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Text(
                                    packQtyText,
                                    style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF475569)),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 12),
                            Row(
                              children: [
                                Icon(
                                  med.stockQuantity > 0 ? Icons.check_circle : Icons.cancel,
                                  color: med.stockQuantity > 0 ? const Color(0xFF059669) : const Color(0xFFDC2626),
                                  size: 16,
                                ),
                                const SizedBox(width: 6),
                                Text(
                                  med.stockQuantity > 0
                                      ? 'In Stock \u2022 Express Dispatch Ready'
                                      : 'Out of Stock \u2014 Currently Unavailable',
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.bold,
                                    color: med.stockQuantity > 0 ? const Color(0xFF059669) : const Color(0xFFDC2626),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        );
                      },
                    ),
                  ),

                  const SizedBox(height: 18),

                  // Storage Requirement Section — Chip Badges
                  const Text(
                    'STORAGE REQUIREMENT',
                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF64748B), letterSpacing: 0.5),
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: _parseStorageChips(med.storageCondition).map((chip) {
                      return Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
                        decoration: BoxDecoration(
                          color: chip['bg']!,
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: chip['border']!),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(chip['emoji']!, style: const TextStyle(fontSize: 15)),
                            const SizedBox(width: 6),
                            Text(
                              chip['label']!,
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                                color: chip['color']!,
                              ),
                            ),
                          ],
                        ),
                      );
                    }).toList(),
                  ),

                  const SizedBox(height: 18),

                  // Google External Identification Link Button
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      onPressed: () => _launchGoogleSearch(med.name),
                      icon: const Icon(Icons.search, size: 18, color: Color(0xFF1E293B)),
                      label: const Text(
                        'Search & Identify More Details on Google ↗',
                        style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF1E293B)),
                      ),
                      style: OutlinedButton.styleFrom(
                        backgroundColor: const Color(0xFFF1F5F9),
                        side: const BorderSide(color: Color(0xFFCBD5E1)),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Bottom Fixed Action Bar: Quantity Selector + Add Pill / Add Card Buttons
          Container(
            padding: const EdgeInsets.all(16),
            decoration: const BoxDecoration(
              color: Colors.white,
              border: Border(top: BorderSide(color: Color(0xFFE2E8F0))),
            ),
            child: SafeArea(
              top: false,
              child: isRx
                  ? SizedBox(
                      width: double.infinity,
                      child: ElevatedButton.icon(
                        onPressed: () {
                          Navigator.pop(context);
                          widget.onAddToCart('RxQuote', 1);
                        },
                        icon: const Icon(Icons.upload_file, size: 18),
                        label: const Text('Request Prescription Quote', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFD97706),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                      ),
                    )
                  : Row(
                      children: [
                        // Quantity selector (- 1 +)
                        Container(
                          decoration: BoxDecoration(
                            color: const Color(0xFFF1F5F9),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: const Color(0xFFCBD5E1)),
                          ),
                          child: Row(
                            children: [
                              IconButton(
                                onPressed: _quantity > 1 ? () => setState(() => _quantity--) : null,
                                icon: const Icon(Icons.remove, size: 16),
                                padding: EdgeInsets.zero,
                                constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                              ),
                              Text(
                                '$_quantity',
                                style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                              ),
                              IconButton(
                                onPressed: () => setState(() => _quantity++),
                                icon: const Icon(Icons.add, size: 16),
                                padding: EdgeInsets.zero,
                                constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 10),

                        // Add Pill Button
                        Expanded(
                          child: ElevatedButton(
                            onPressed: () {
                              Navigator.pop(context);
                              widget.onAddToCart('Pill', _quantity);
                            },
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF059669),
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            ),
                            child: Text('+ Add Pill ($_quantity)', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                          ),
                        ),
                        const SizedBox(width: 8),

                        // Add Card Button
                        Expanded(
                          child: ElevatedButton(
                            onPressed: () {
                              Navigator.pop(context);
                              widget.onAddToCart('Card', _quantity);
                            },
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF047857),
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            ),
                            child: Text('+ Add Card (${med.pillsPerCard}s)', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                          ),
                        ),
                      ],
                    ),
            ),
          ),
        ],
      ),
    );
  }
}

class FlutterUnitConfig {
  final String priceLine;
  final String packLine;
  final List<FlutterUnitButton> buttons;

  FlutterUnitConfig({
    required this.priceLine,
    required this.packLine,
    required this.buttons,
  });
}

class FlutterUnitButton {
  final String label;
  final String unitType;
  final double price;

  FlutterUnitButton({
    required this.label,
    required this.unitType,
    required this.price,
  });
}

FlutterUnitConfig getFlutterDisplayConfig(MedicineModel med) {
  final unit = med.sellingUnit.toUpperCase();
  switch (unit) {
    case 'PILLS':
      final uPrice = med.price;
      final pills = med.pillsPerCard;
      final cPrice = med.cardPrice;
      return FlutterUnitConfig(
        priceLine: 'Rs. ${uPrice.toStringAsFixed(2)} / pill',
        packLine: 'Card ($pills pills): Rs. ${cPrice.toStringAsFixed(2)}',
        buttons: [
          FlutterUnitButton(label: '+ Pill', unitType: 'Pill', price: uPrice),
          FlutterUnitButton(label: '+ Card', unitType: 'Card', price: cPrice),
        ],
      );
    case 'BOTTLE':
      final pPrice = med.pricePerBottle ?? med.price;
      final size = med.bottleSize ?? 100;
      return FlutterUnitConfig(
        priceLine: 'Rs. ${pPrice.toStringAsFixed(2)} / bottle',
        packLine: 'Size: $size ml',
        buttons: [
          FlutterUnitButton(label: '+ Bottle', unitType: 'Bottle', price: pPrice),
        ],
      );
    case 'TUBE':
      final tPrice = med.pricePerTube ?? med.price;
      final weight = med.tubeWeight ?? 20;
      return FlutterUnitConfig(
        priceLine: 'Rs. ${tPrice.toStringAsFixed(2)} / tube',
        packLine: 'Weight: $weight g',
        buttons: [
          FlutterUnitButton(label: '+ Tube', unitType: 'Tube', price: tPrice),
        ],
      );
    case 'SACHET':
      final sPrice = med.pricePerSachet ?? med.price;
      final sachets = med.sachetsPerBox ?? 10;
      final bPrice = med.boxPrice ?? (sPrice * sachets);
      return FlutterUnitConfig(
        priceLine: 'Rs. ${sPrice.toStringAsFixed(2)} / sachet',
        packLine: 'Box ($sachets sachets): Rs. ${bPrice.toStringAsFixed(2)}',
        buttons: [
          FlutterUnitButton(label: '+ Sachet', unitType: 'Sachet', price: sPrice),
          FlutterUnitButton(label: '+ Box', unitType: 'Box', price: bPrice),
        ],
      );
    case 'VIAL':
      final vPrice = med.pricePerVial ?? med.price;
      final vials = med.vialsPerBox ?? 5;
      final bPrice = med.boxPrice ?? (vPrice * vials);
      return FlutterUnitConfig(
        priceLine: 'Rs. ${vPrice.toStringAsFixed(2)} / vial',
        packLine: 'Box ($vials vials): Rs. ${bPrice.toStringAsFixed(2)}',
        buttons: [
          FlutterUnitButton(label: '+ Vial', unitType: 'Vial', price: vPrice),
          FlutterUnitButton(label: '+ Box', unitType: 'Box', price: bPrice),
        ],
      );
    case 'DROPS':
      final dPrice = med.pricePerBottle ?? med.price;
      final vol = med.volumeMl ?? 10;
      return FlutterUnitConfig(
        priceLine: 'Rs. ${dPrice.toStringAsFixed(2)} / bottle',
        packLine: 'Volume: $vol ml',
        buttons: [
          FlutterUnitButton(label: '+ Bottle', unitType: 'Bottle', price: dPrice),
        ],
      );
    case 'INHALER':
      final iPrice = med.pricePerInhaler ?? med.price;
      final puffs = med.puffsPerInhaler ?? 200;
      return FlutterUnitConfig(
        priceLine: 'Rs. ${iPrice.toStringAsFixed(2)} / inhaler',
        packLine: 'Puffs: $puffs',
        buttons: [
          FlutterUnitButton(label: '+ Inhaler', unitType: 'Inhaler', price: iPrice),
        ],
      );
    case 'CUSTOM':
      final uName = med.unitName ?? 'Unit';
      final cPrice = med.pricePerUnit ?? med.price;
      return FlutterUnitConfig(
        priceLine: 'Rs. ${cPrice.toStringAsFixed(2)} / ${uName.toLowerCase()}',
        packLine: '',
        buttons: [
          FlutterUnitButton(label: '+ $uName', unitType: uName, price: cPrice),
        ],
      );
    default:
      final uPrice = med.price;
      final pills = med.pillsPerCard;
      final cPrice = med.cardPrice;
      return FlutterUnitConfig(
        priceLine: 'Rs. ${uPrice.toStringAsFixed(2)} / pill',
        packLine: 'Card ($pills pills): Rs. ${cPrice.toStringAsFixed(2)}',
        buttons: [
          FlutterUnitButton(label: '+ Pill', unitType: 'Pill', price: uPrice),
          FlutterUnitButton(label: '+ Card', unitType: 'Card', price: cPrice),
        ],
      );
  }
}
