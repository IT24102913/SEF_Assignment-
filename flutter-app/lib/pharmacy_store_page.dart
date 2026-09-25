import 'dart:io';
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
  List<MedicineModel> _allMedicines = [];
  List<MedicineModel> _filteredMedicines = [];
  List<CategoryModel> _categories = [];
  bool _isLoading = true;

  String _searchQuery = '';
  String _selectedCategoryName = 'ALL';

  // Cart state
  final List<CartItemModel> _cart = [];
  String _deliveryMethod = 'HomeDelivery'; // 'HomeDelivery' | 'Pickup'

  // Cart Toast notification state
  String? _notificationName;
  double? _notificationPrice;
  bool _showCartToast = false;

  @override
  void initState() {
    super.initState();
    _loadPharmacyData();
  }

  Future<void> _loadPharmacyData() async {
    setState(() => _isLoading = true);
    final medicines = await PharmacyService.getMedicines();
    final categories = await PharmacyService.getCategories();

    if (mounted) {
      setState(() {
        _allMedicines = medicines;
        _categories = categories;
        _applyFilters();
        _isLoading = false;
      });
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
                                                      items: [
                                                        DropdownMenuItem(
                                                          value: 'Pill',
                                                          child: Text(
                                                            '💊 1 Pill (Rs. ${item.medicine.price.toStringAsFixed(2)})',
                                                            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF065F46)),
                                                          ),
                                                        ),
                                                        DropdownMenuItem(
                                                          value: 'Card',
                                                          child: Text(
                                                            '🎴 1 Card (${item.medicine.pillsPerCard} Pills - Rs. ${item.medicine.cardPrice.toStringAsFixed(2)})',
                                                            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF065F46)),
                                                          ),
                                                        ),
                                                      ],
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
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        // Fulfillment Options
                        const Text(
                          '🚚 Select Delivery Option:',
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
                                    '🚚 Home Delivery\n(+ Delivery Charges < 500)',
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
                                    '🏥 Counter Pickup\n(FREE)',
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
              ],
            ),
          );
        },
      ),
    );
  }

  void _showOrderSuccessDialog(Map<String, dynamic> orderData) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        contentPadding: const EdgeInsets.all(24),
        content: Column(
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
            const Text(
              'Prescription Order Submitted!',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
            ),
            const SizedBox(height: 8),
            const Text(
              'Your doctor prescription photo & details have been sent to our registered pharmacists for verification.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 12, color: Color(0xFF475569), height: 1.4),
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: const [
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
                slivers: [
                  // App Bar / Top Navigation
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Row(
                            children: const [
                              Icon(Icons.local_pharmacy, color: Color(0xFF059669), size: 28),
                              SizedBox(width: 8),
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'Pharmacy Store',
                                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                                  ),
                                  Text(
                                    'Manage health records & pharmacy orders',
                                    style: TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                                  ),
                                ],
                              ),
                            ],
                          ),
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
                                  MaterialPageRoute(builder: (context) => const MyPharmacyOrdersPage()),
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
                                    return ProductCard(
                                      medicine: med,
                                      onAddToCart: (unit) => _addToCart(med, defaultUnitType: unit),
                                      onOpenDetail: () => _openMedicineDetailModal(med),
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

    return InkWell(
      onTap: onOpenDetail,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: isRx ? const Color(0xFFFCA5A5) : const Color(0xFFE2E8F0)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.02),
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
                ClipRRect(
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
                  child: medicine.imageUrl != null && medicine.imageUrl!.startsWith('http')
                      ? Image.network(
                          medicine.imageUrl!,
                          height: 120,
                          width: double.infinity,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => _buildImagePlaceholder(),
                        )
                      : _buildImagePlaceholder(),
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
                    Text(
                      medicine.categoryName.toUpperCase(),
                      style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF059669)),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      medicine.name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      medicine.description,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                    ),
                    const Spacer(),

                    // Prices
                    Text(
                      'Rs. ${medicine.price.toStringAsFixed(2)} / pill',
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Color(0xFF059669)),
                    ),
                    Text(
                      'Card (${medicine.pillsPerCard} pills): Rs. ${medicine.cardPrice.toStringAsFixed(2)}',
                      style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: Color(0xFF475569)),
                    ),
                    const SizedBox(height: 8),

                    // Action Buttons
                    if (isRx)
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton.icon(
                          onPressed: () => _showRxInfoModal(context),
                          icon: const Icon(Icons.assignment, size: 12),
                          label: const Text('Request Quote', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFFD97706),
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 8),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          ),
                        ),
                      )
                    else
                      Row(
                        children: [
                          Expanded(
                            child: ElevatedButton(
                              onPressed: () => onAddToCart('Pill'),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF059669),
                                foregroundColor: Colors.white,
                                padding: const EdgeInsets.symmetric(vertical: 8),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                              ),
                              child: const Text('+ Pill', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                            ),
                          ),
                          const SizedBox(width: 6),
                          Expanded(
                            child: ElevatedButton(
                              onPressed: () => onAddToCart('Card'),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF047857),
                                foregroundColor: Colors.white,
                                padding: const EdgeInsets.symmetric(vertical: 8),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                              ),
                              child: const Text('+ Card', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                            ),
                          ),
                        ],
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

  Future<void> _submitOrder() async {
    if (_isDirectRxOnly && _prescriptionImageFile == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Doctor prescription photo is mandatory for direct prescription orders!'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    if (_hasRxItems && _prescriptionImageFile == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Doctor prescription photo is mandatory for prescription-restricted items!'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    if (!_formKey.currentState!.validate()) return;

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
    final totalAmount = isRx ? 0.0 : subtotal;

    final resData = await PharmacyService.placeOrder(
      customerName: _nameCtrl.text.trim(),
      customerEmail: AppSession.loggedInUserEmail ?? AuthState.email ?? '',
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
          padding: const EdgeInsets.all(20),
          child: Form(
            key: _formKey,
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
                  validator: (v) => v == null || v.trim().isEmpty ? 'Enter full name' : null,
                ),
                const SizedBox(height: 10),
                TextFormField(
                  controller: _phoneCtrl,
                  decoration: const InputDecoration(labelText: 'Phone Number *', border: OutlineInputBorder()),
                  validator: (v) => v == null || v.trim().isEmpty ? 'Enter phone number' : null,
                ),
                const SizedBox(height: 10),
                TextFormField(
                  controller: _addressCtrl,
                  maxLines: 2,
                  decoration: const InputDecoration(labelText: 'Delivery Address *', border: OutlineInputBorder()),
                  validator: (v) => v == null || v.trim().isEmpty ? 'Enter delivery address' : null,
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
                  // Main Image View with 100% Genuine Medicine Badge
                  Stack(
                    children: [
                      Container(
                        height: 220,
                        width: double.infinity,
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                        ),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(16),
                          child: activeImg.startsWith('http')
                              ? Image.network(
                                  activeImg,
                                  fit: BoxFit.contain,
                                  errorBuilder: (c, e, s) => const Center(
                                    child: Icon(Icons.medication_liquid, size: 64, color: Color(0xFF94A3B8)),
                                  ),
                                )
                              : const Center(
                                  child: Icon(Icons.medication_liquid, size: 64, color: Color(0xFF94A3B8)),
                                ),
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
                                child: Image.network(
                                  imgUrl,
                                  fit: BoxFit.cover,
                                  errorBuilder: (c, e, s) => const Icon(Icons.image, color: Colors.grey),
                                ),
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
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            const Text('UNIT PRICE (PER PILL): ', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF64748B))),
                            Text(
                              'Rs. ${med.price.toStringAsFixed(2)}',
                              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF059669)),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Row(
                          children: [
                            const Text('ONE CARD PRICE: ', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF64748B))),
                            Text(
                              'Rs. ${med.cardPrice.toStringAsFixed(2)}',
                              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                            ),
                          ],
                        ),
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
                                'PILLS IN ONE CARD: ${med.pillsPerCard} pills in one card',
                                style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF475569)),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            const Icon(Icons.check_circle, color: Color(0xFF059669), size: 16),
                            const SizedBox(width: 6),
                            Text(
                              'In stock (${med.stockQuantity > 0 ? med.stockQuantity : 100} available) • Express Dispatch Ready',
                              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF059669)),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 18),

                  // Storage Requirement Section
                  const Text(
                    'STORAGE REQUIREMENT',
                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF64748B), letterSpacing: 0.5),
                  ),
                  const SizedBox(height: 6),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: med.storageCondition?.contains('2°C') == true ? const Color(0xFFEFF6FF) : const Color(0xFFECFDF5),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: med.storageCondition?.contains('2°C') == true ? const Color(0xFFBFDBFE) : const Color(0xFFA7F3D0),
                      ),
                    ),
                    child: Text(
                      med.storageCondition?.isNotEmpty == true
                          ? med.storageCondition!
                          : 'Normal Room Temperature (Store in a cool, dry place below 25°C)',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                        color: med.storageCondition?.contains('2°C') == true ? const Color(0xFF1E40AF) : const Color(0xFF065F46),
                      ),
                    ),
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
        ],
      ),
    );
  }
}