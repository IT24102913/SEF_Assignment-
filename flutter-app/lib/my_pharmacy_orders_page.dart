import 'dart:async';
import 'package:flutter/material.dart';
import 'services/pharmacy_service.dart';
import 'services/emr_api_service.dart'; // For AuthState
import 'main.dart'; // For AppSession

class MyPharmacyOrdersPage extends StatefulWidget {
  const MyPharmacyOrdersPage({super.key});

  @override
  State<MyPharmacyOrdersPage> createState() => _MyPharmacyOrdersPageState();
}

class _MyPharmacyOrdersPageState extends State<MyPharmacyOrdersPage> {
  List<PharmacyOrderModel> _orders = [];
  bool _isLoading = true;
  Timer? _timer;
  Timer? _pollTimer;

  @override
  void initState() {
    super.initState();
    _fetchOrders(showLoading: true);
    // Update countdown timer every second
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) setState(() {});
    });
    // Auto-poll backend every 3 seconds for live admin status updates
    _pollTimer = Timer.periodic(const Duration(seconds: 3), (_) {
      if (mounted) _fetchOrders(showLoading: false);
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    _pollTimer?.cancel();
    super.dispose();
  }

  Future<void> _fetchOrders({bool showLoading = false}) async {
    if (showLoading && _orders.isEmpty) {
      setState(() => _isLoading = true);
    }
    final userEmail = AppSession.loggedInUserEmail ?? AuthState.email ?? '';
    final orders = await PharmacyService.getPatientOrders(userEmail);
    if (mounted) {
      setState(() {
        _orders = orders;
        _isLoading = false;
      });
    }
  }

  void _showSnackBar(String msg, {bool isError = false}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg),
        backgroundColor: isError ? Colors.red : const Color(0xFF059669),
        duration: const Duration(seconds: 3),
      ),
    );
  }

  void _confirmAndPayModal(PharmacyOrderModel order) {
    String paymentMethod = 'CashOnDelivery';
    bool submitting = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setModalState) {
          return Container(
            padding: const EdgeInsets.all(24),
            decoration: const BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Confirm Order #${order.orderNumber}',
                      style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close),
                      onPressed: () => Navigator.pop(context),
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                // Verified Pharmacist Quote Card
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: const Color(0xFFECFDF5),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: const Color(0xFFA7F3D0)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'VERIFIED PHARMACIST QUOTE',
                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF047857), letterSpacing: 0.5),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Rs. ${order.totalAmount.toStringAsFixed(2)}',
                        style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: Color(0xFF059669)),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Delivery Address: ${order.deliveryAddress}',
                        style: const TextStyle(fontSize: 12, color: Color(0xFF065F46)),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),

                const Text('Select Payment Method:', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
                const SizedBox(height: 10),

                RadioListTile<String>(
                  value: 'CashOnDelivery',
                  groupValue: paymentMethod,
                  title: const Text('💵 Cash on Home Delivery (COD)', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                  subtitle: const Text('Pay cash to dispatch rider when items arrive', style: TextStyle(fontSize: 11)),
                  onChanged: (val) => setModalState(() => paymentMethod = val!),
                ),
                RadioListTile<String>(
                  value: 'Card',
                  groupValue: paymentMethod,
                  title: const Text('💳 Credit / Debit Card', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                  subtitle: const Text('Instant online card checkout', style: TextStyle(fontSize: 11)),
                  onChanged: (val) => setModalState(() => paymentMethod = val!),
                ),
                RadioListTile<String>(
                  value: 'BankTransfer',
                  groupValue: paymentMethod,
                  title: const Text('🏦 Direct Bank Transfer', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                  subtitle: const Text('Health Bridge Commercial Bank Acc #8001239942', style: TextStyle(fontSize: 11)),
                  onChanged: (val) => setModalState(() => paymentMethod = val!),
                ),
                const SizedBox(height: 20),

                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: submitting
                        ? null
                        : () async {
                            setModalState(() => submitting = true);
                            final success = await PharmacyService.updateOrderStatus(
                              order.id,
                              'Confirmed',
                              paymentMethod: paymentMethod,
                              patientConfirmed: true,
                            );
                            if (mounted) {
                              Navigator.pop(context);
                              if (success) {
                                _showSnackBar('Order payment confirmed! Processing for home delivery dispatch.');
                                _fetchOrders();
                              } else {
                                _showSnackBar('Failed to confirm payment.', isError: true);
                              }
                            }
                          },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF059669),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: submitting
                        ? const CircularProgressIndicator(color: Colors.white)
                        : const Text('Confirm & Place Order', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  void _showCancelOrderDialog(PharmacyOrderModel order) {
    bool cancelling = false;
    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDlgState) {
          return AlertDialog(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
            title: const Text('Cancel This Order?', style: TextStyle(fontWeight: FontWeight.bold)),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text('Are you sure you want to cancel order ${order.orderNumber}? This action cannot be undone.'),
              ],
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(ctx),
                child: const Text('No, Keep Order'),
              ),
              ElevatedButton(
                onPressed: cancelling
                    ? null
                    : () async {
                        setDlgState(() => cancelling = true);
                        final success = await PharmacyService.updateOrderStatus(order.id, 'Cancelled');
                        if (mounted) {
                          Navigator.pop(ctx);
                          if (success) {
                            _showSnackBar('Your order has been cancelled successfully.');
                            _fetchOrders();
                          } else {
                            _showSnackBar('Failed to cancel order.', isError: true);
                          }
                        }
                      },
                style: ElevatedButton.styleFrom(backgroundColor: Colors.red, foregroundColor: Colors.white),
                child: cancelling
                    ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                    : const Text('Yes, Cancel Order'),
              ),
            ],
          );
        },
      ),
    );
  }

  void _showDeleteOrderDialog(PharmacyOrderModel order) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text('Delete Order History?'),
        content: Text('Are you sure you want to delete order ${order.orderNumber} from your history?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(ctx);
              final success = await PharmacyService.deleteOrder(order.id);
              if (success) {
                _showSnackBar('Order removed from your history.');
                _fetchOrders();
              }
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red, foregroundColor: Colors.white),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }

  void _showRxImageModal(String imageUrl) {
    showDialog(
      context: context,
      builder: (ctx) => Dialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text(
                'Doctor Prescription Receipt Photo',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
              ),
              const SizedBox(height: 12),
              ClipRRect(
                borderRadius: BorderRadius.circular(10),
                child: imageUrl.startsWith('http')
                    ? Image.network(imageUrl, height: 350, fit: BoxFit.contain, errorBuilder: (_, __, ___) => const Icon(Icons.broken_image, size: 80))
                    : Image.asset('assets/images/placeholder.png', height: 200, errorBuilder: (_, __, ___) => const Icon(Icons.description, size: 80)),
              ),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () => Navigator.pop(ctx),
                style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF059669), foregroundColor: Colors.white),
                child: const Text('Close Preview'),
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
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 1,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Color(0xFF0F172A)),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text(
          'My Pharmacy & Prescription Orders',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
        ),
      ),
      body: RefreshIndicator(
        onRefresh: _fetchOrders,
        color: const Color(0xFF059669),
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          child: Column(
            children: [
              // Header Banner (Screenshot 1 Top Dark Banner)
              Container(
                width: double.infinity,
                margin: const EdgeInsets.all(16),
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF0F172A), Color(0xFF1E293B)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.12),
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
                        color: const Color(0xFF2DD4BF).withOpacity(0.15),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: const Color(0xFF2DD4BF).withOpacity(0.4)),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: const [
                          Icon(Icons.assignment_outlined, color: Color(0xFF2DD4BF), size: 14),
                          SizedBox(width: 6),
                          Text(
                            'PRESCRIPTION & PHARMACY ORDERS',
                            style: TextStyle(color: Color(0xFF2DD4BF), fontSize: 10, fontWeight: FontWeight.w800),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 10),
                    const Text(
                      'My Order History & Verification Quotes',
                      style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w800),
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'Track prescription verification quotes from licensed pharmacists and manage home delivery payments.',
                      style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11.5, height: 1.4),
                    ),
                    const SizedBox(height: 14),
                    ElevatedButton.icon(
                      onPressed: () => Navigator.pop(context),
                      icon: const Icon(Icons.local_pharmacy, size: 14),
                      label: const Text('Browse Pharmacy Store', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
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

              // Orders List Body
              _isLoading
                  ? const Padding(
                      padding: EdgeInsets.all(60.0),
                      child: Center(child: CircularProgressIndicator(color: Color(0xFF059669))),
                    )
                  : _orders.isEmpty
                      ? Container(
                          margin: const EdgeInsets.all(16),
                          padding: const EdgeInsets.all(40),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(color: const Color(0xFFE2E8F0)),
                          ),
                          child: Column(
                            children: [
                              const Icon(Icons.assignment_outlined, size: 64, color: Color(0xFFCBD5E1)),
                              const SizedBox(height: 12),
                              const Text('No Orders Found', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
                              const SizedBox(height: 6),
                              const Text('You have not placed any pharmacy orders or uploaded prescription receipts yet.', textAlign: TextAlign.center, style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                              const SizedBox(height: 16),
                              ElevatedButton(
                                onPressed: () => Navigator.pop(context),
                                style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF059669), foregroundColor: Colors.white),
                                child: const Text('Visit Pharmacy Store', style: TextStyle(fontWeight: FontWeight.bold)),
                              ),
                            ],
                          ),
                        )
                      : ListView.builder(
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          itemCount: _orders.length,
                          itemBuilder: (context, index) {
                            final order = _orders[index];
                            return OrderCardItem(
                              order: order,
                              onConfirmPay: () => _confirmAndPayModal(order),
                              onCancelOrder: () => _showCancelOrderDialog(order),
                              onDeleteOrder: () => _showDeleteOrderDialog(order),
                              onViewRxPhoto: (url) => _showRxImageModal(url),
                            );
                          },
                        ),
              const SizedBox(height: 30),
            ],
          ),
        ),
      ),
    );
  }
}

class OrderCardItem extends StatelessWidget {
  final PharmacyOrderModel order;
  final VoidCallback onConfirmPay;
  final VoidCallback onCancelOrder;
  final VoidCallback onDeleteOrder;
  final Function(String url) onViewRxPhoto;

  const OrderCardItem({
    super.key,
    required this.order,
    required this.onConfirmPay,
    required this.onCancelOrder,
    required this.onDeleteOrder,
    required this.onViewRxPhoto,
  });

  Map<String, dynamic> _getStatusBadge(String status) {
    switch (status) {
      case 'PendingVerification':
      case 'Pending':
        return {
          'bg': const Color(0xFFFEF3C7),
          'color': const Color(0xFFD97706),
          'border': const Color(0xFFFDE68A),
          'label': 'Pending Pharmacist Review',
          'icon': Icons.access_time_filled,
        };
      case 'Approved':
        return {
          'bg': const Color(0xFFE0F2FE),
          'color': const Color(0xFF0284C7),
          'border': const Color(0xFFBAE6FD),
          'label': 'Quoted — Ready for Payment',
          'icon': Icons.check_circle,
        };
      case 'Confirmed':
        return {
          'bg': const Color(0xFFECFDF5),
          'color': const Color(0xFF059669),
          'border': const Color(0xFFA7F3D0),
          'label': 'Order Confirmed',
          'icon': Icons.check_circle,
        };
      case 'Dispatched':
        return {
          'bg': const Color(0xFFF0FDFA),
          'color': const Color(0xFF0D9488),
          'border': const Color(0xFF99F6E4),
          'label': 'Out for Delivery',
          'icon': Icons.local_shipping,
        };
      case 'Delivered':
        return {
          'bg': const Color(0xFFD1FAE5),
          'color': const Color(0xFF047857),
          'border': const Color(0xFF6EE7B7),
          'label': 'Delivered',
          'icon': Icons.check_circle,
        };
      case 'Cancelled':
        return {
          'bg': const Color(0xFFFEE2E2),
          'color': const Color(0xFFDC2626),
          'border': const Color(0xFFFCA5A5),
          'label': 'Cancelled',
          'icon': Icons.error_outline,
        };
      default:
        return {
          'bg': const Color(0xFFF1F5F9),
          'color': const Color(0xFF475569),
          'border': const Color(0xFFE2E8F0),
          'label': status,
          'icon': Icons.access_time,
        };
    }
  }

  int _getActiveStageIndex(String s) {
    if (s == 'Cancelled') return -1;
    if (s == 'PendingVerification' || s == 'Pending' || s == 'Approved') return 0;
    if (s == 'Confirmed') return 1;
    if (s == 'Dispatched') return 2;
    if (s == 'Delivered') return 3;
    return 0;
  }

  int get _cancelSecondsLeft {
    final placed = order.createdAt.millisecondsSinceEpoch;
    final now = DateTime.now().millisecondsSinceEpoch;
    final elapsed = (now - placed) / 1000;
    return (21600 - elapsed).toInt();
  }

  String? get _countdownStr {
    final secs = _cancelSecondsLeft;
    if (secs <= 0) return null;
    final h = secs ~/ 3600;
    final m = (secs % 3600) ~/ 60;
    final s = secs % 60;
    return '${h}h ${m}m ${s}s';
  }

  bool get _canCancel {
    if (['Dispatched', 'Delivered', 'Cancelled'].contains(order.status)) return false;
    return _cancelSecondsLeft > 0;
  }

  @override
  Widget build(BuildContext context) {
    final badge = _getStatusBadge(order.status);
    final activeStage = _getActiveStageIndex(order.status);
    final stages = ['Order Placed', 'Order Confirmed', 'Order Shipped', 'Order Delivered'];

    final isPendingVerification = order.status == 'PendingVerification' || order.status == 'Pending' || (order.totalAmount == 0 && !order.patientConfirmed);

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.03),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header Row
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      order.orderNumber,
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Color(0xFF0F172A)),
                    ),
                    const SizedBox(height: 2),
                    Row(
                      children: [
                        const Icon(Icons.calendar_today_outlined, size: 11, color: Color(0xFF64748B)),
                        const SizedBox(width: 4),
                        Text(
                          '${order.createdAt.month}/${order.createdAt.day}/${order.createdAt.year} ${order.createdAt.hour}:${order.createdAt.minute.toString().padLeft(2, '0')}',
                          style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: badge['bg'] as Color,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: badge['border'] as Color),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(badge['icon'] as IconData, size: 12, color: badge['color'] as Color),
                    const SizedBox(width: 4),
                    Text(
                      badge['label'] as String,
                      style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: badge['color'] as Color),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),

          // Order Stage Progress Stepper (Screenshot 1 ORDER PROGRESS)
          if (order.status == 'Cancelled')
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFFFEF2F2),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: const Color(0xFFFECACA)),
              ),
              child: Row(
                children: const [
                  Icon(Icons.error_outline, color: Color(0xFFDC2626), size: 16),
                  SizedBox(width: 8),
                  Text('This order has been cancelled.', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF991B1B))),
                ],
              ),
            )
          else
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFF0FDF4),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFBBF7D0)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'ORDER PROGRESS',
                    style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.w800, color: Color(0xFF15803D), letterSpacing: 0.5),
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: List.generate(stages.length, (idx) {
                      final isDone = idx <= activeStage;
                      final isActive = idx == activeStage;
                      return Expanded(
                        child: Row(
                          children: [
                            Column(
                              children: [
                                CircleAvatar(
                                  radius: isActive ? 12 : 9,
                                  backgroundColor: isDone ? const Color(0xFF059669) : const Color(0xFFD1FAE5),
                                  child: isDone
                                      ? const Icon(Icons.check, size: 10, color: Colors.white)
                                      : const SizedBox(),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  stages[idx],
                                  textAlign: TextAlign.center,
                                  style: TextStyle(
                                    fontSize: 9,
                                    fontWeight: isActive ? FontWeight.bold : FontWeight.normal,
                                    color: isDone ? const Color(0xFF047857) : const Color(0xFF94A3B8),
                                  ),
                                ),
                              ],
                            ),
                            if (idx < stages.length - 1)
                              Expanded(
                                child: Container(
                                  height: 2,
                                  margin: const EdgeInsets.only(bottom: 14),
                                  color: idx < activeStage ? const Color(0xFF059669) : const Color(0xFFD1FAE5),
                                ),
                              ),
                          ],
                        ),
                      );
                    }),
                  ),
                ],
              ),
            ),
          const SizedBox(height: 14),

          // Order Items & Summary
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFF1F5F9)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('ORDER SUMMARY', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Color(0xFF64748B), letterSpacing: 0.5)),
                const SizedBox(height: 8),
                if (order.items.isEmpty)
                  const Text('Doctor Prescription Verification Request', style: TextStyle(fontSize: 12, fontStyle: FontStyle.italic, color: Color(0xFF475569)))
                else
                  ...order.items.map((item) {
                    final itemPending = isPendingVerification || item.unitType == 'RxQuote' || item.requiresPrescription;
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 4),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('${item.medicineName} (x${item.quantity})', style: const TextStyle(fontSize: 12, color: Color(0xFF334155))),
                          Text(
                            itemPending ? 'Quote Pending' : 'Rs. ${item.subtotal.toStringAsFixed(2)}',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                              color: itemPending ? const Color(0xFFD97706) : const Color(0xFF059669),
                            ),
                          ),
                        ],
                      ),
                    );
                  }),
                const Divider(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Total Quoted Price:', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF475569))),
                    Text(
                      (!isPendingVerification && order.totalAmount > 0)
                          ? 'Rs. ${order.totalAmount.toStringAsFixed(2)}'
                          : 'Awaiting Pharmacist Quote',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w800,
                        color: (!isPendingVerification && order.totalAmount > 0) ? const Color(0xFF059669) : const Color(0xFFD97706),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 10),

          // Pharmacist Quote Pending Banner
          if (isPendingVerification)
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFFFFBEB),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: const Color(0xFFFCD34D)),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: const [
                  Icon(Icons.access_time_filled, color: Color(0xFFD97706), size: 16),
                  SizedBox(width: 8),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Pharmacist Quote Pending', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Color(0xFFB45309))),
                        SizedBox(height: 2),
                        Text(
                          'Our Pharmacist is inspecting your prescription photo and calculating dosage & total cost. Once approved, the final price will be sent here for your confirmation and payment.',
                          style: TextStyle(fontSize: 11, color: Color(0xFF92400E), height: 1.35),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

          // Prescription Photo Attached Card
          if (order.prescriptionImageUrl != null && order.prescriptionImageUrl!.isNotEmpty) ...[
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFFFFFBEB),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: const Color(0xFFFDE68A)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: const [
                      Icon(Icons.description, color: Color(0xFFD97706), size: 16),
                      SizedBox(width: 8),
                      Text('Doctor Prescription Attached', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF92400E))),
                    ],
                  ),
                  OutlinedButton(
                    onPressed: () => onViewRxPhoto(order.prescriptionImageUrl!),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: const Color(0xFFB45309),
                      side: const BorderSide(color: Color(0xFFF59E0B)),
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      minimumSize: Size.zero,
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    ),
                    child: const Text('View Photo', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                  ),
                ],
              ),
            ),
          ],

          // Pharmacist Note Box
          if (order.adminNote != null && order.adminNote!.isNotEmpty) ...[
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFFF0F9FF),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: const Color(0xFFBAE6FD)),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.auto_awesome, color: Color(0xFF0284C7), size: 16),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Pharmacist Note:', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF0369A1))),
                        const SizedBox(height: 2),
                        Text(order.adminNote!, style: const TextStyle(fontSize: 11.5, color: Color(0xFF1E293B))),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],

          // 6-Hour Cancellation Window Box
          if (!['Dispatched', 'Delivered', 'Cancelled'].contains(order.status)) ...[
            const SizedBox(height: 10),
            _countdownStr != null
                ? Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFFFBEB),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: const Color(0xFFFDE68A)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.timer_outlined, size: 13, color: Color(0xFFD97706)),
                        const SizedBox(width: 6),
                        Text(
                          'Free cancel window: ${_countdownStr!} remaining',
                          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF92400E)),
                        ),
                      ],
                    ),
                  )
                : Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF1F5F9),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: const Color(0xFFCBD5E1)),
                    ),
                    child: Row(
                      children: const [
                        Icon(Icons.info_outline, size: 13, color: Color(0xFF64748B)),
                        SizedBox(width: 6),
                        Text(
                          'Cancellation window expired (6h limit passed)',
                          style: TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                        ),
                      ],
                    ),
                  ),
          ],
          const SizedBox(height: 14),

          // Actions Row
          Row(
            children: [
              if (order.status == 'Approved') ...[
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: onConfirmPay,
                    icon: const Icon(Icons.check_circle, size: 16),
                    label: const Text('Confirm & Pay', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF059669),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
              ],
              if (_canCancel) ...[
                OutlinedButton(
                  onPressed: onCancelOrder,
                  style: OutlinedButton.styleFrom(
                    foregroundColor: const Color(0xFFDC2626),
                    side: const BorderSide(color: Color(0xFFFCA5A5)),
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  child: const Text('✕ Cancel', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                ),
                const SizedBox(width: 8),
              ],
              OutlinedButton.icon(
                onPressed: onDeleteOrder,
                icon: const Icon(Icons.delete_outline, size: 14),
                label: const Text('Delete', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                style: OutlinedButton.styleFrom(
                  foregroundColor: const Color(0xFFDC2626),
                  side: const BorderSide(color: Color(0xFFFECACA)),
                  backgroundColor: const Color(0xFFFEF2F2),
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
