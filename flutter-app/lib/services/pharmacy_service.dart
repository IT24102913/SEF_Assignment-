import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import '../utils/config.dart';

class MedicineModel {
  final int id;
  final String name;
  final int categoryId;
  final String categoryName;
  final String description;
  final double price; // Unit/Pill price
  final int pillsPerCard;
  final double cardPrice;
  final int stockQuantity;
  final bool requiresPrescription;
  final DateTime? expiryDate;
  final String? imageUrl;

  MedicineModel({
    required this.id,
    required this.name,
    required this.categoryId,
    required this.categoryName,
    required this.description,
    required this.price,
    this.pillsPerCard = 10,
    double? cardPrice,
    required this.stockQuantity,
    required this.requiresPrescription,
    this.expiryDate,
    this.imageUrl,
  }) : cardPrice = cardPrice ?? (price * (pillsPerCard > 0 ? pillsPerCard : 10));

  factory MedicineModel.fromJson(Map<String, dynamic> json) {
    final pills = json['pillsPerCard'] is int
        ? json['pillsPerCard']
        : int.tryParse(json['pillsPerCard']?.toString() ?? '10') ?? 10;
    final uPrice = (json['price'] is num)
        ? (json['price'] as num).toDouble()
        : (json['unitPrice'] is num)
            ? (json['unitPrice'] as num).toDouble()
            : double.tryParse(json['price']?.toString() ?? json['unitPrice']?.toString() ?? '0.0') ?? 0.0;
    final cPrice = (json['cardPrice'] is num)
        ? (json['cardPrice'] as num).toDouble()
        : (uPrice * pills);

    return MedicineModel(
      id: json['id'] is int ? json['id'] : int.tryParse(json['id']?.toString() ?? '0') ?? 0,
      name: json['name']?.toString() ?? 'Unknown Medicine',
      categoryId: json['categoryId'] is int ? json['categoryId'] : int.tryParse(json['categoryId']?.toString() ?? '0') ?? 0,
      categoryName: json['categoryName']?.toString() ?? (json['category'] != null ? json['category']['name']?.toString() ?? 'General' : 'General'),
      description: json['description']?.toString() ?? 'No description available.',
      price: uPrice,
      pillsPerCard: pills,
      cardPrice: cPrice,
      stockQuantity: json['stockQuantity'] is int ? json['stockQuantity'] : int.tryParse(json['stockQuantity']?.toString() ?? '0') ?? 0,
      requiresPrescription: json['requiresPrescription'] == true || json['requiresPrescription']?.toString().toLowerCase() == 'true',
      expiryDate: json['expiryDate'] != null ? DateTime.tryParse(json['expiryDate'].toString()) : null,
      imageUrl: json['imageUrl']?.toString(),
    );
  }
}

class CategoryModel {
  final int id;
  final String name;
  final String description;

  CategoryModel({
    required this.id,
    required this.name,
    required this.description,
  });

  factory CategoryModel.fromJson(Map<String, dynamic> json) {
    return CategoryModel(
      id: json['id'] is int ? json['id'] : int.tryParse(json['id']?.toString() ?? '0') ?? 0,
      name: json['name']?.toString() ?? 'General',
      description: json['description']?.toString() ?? '',
    );
  }
}

class CartItemModel {
  final MedicineModel medicine;
  String unitType; // 'Pill', 'Card', or 'RxQuote'
  int quantity;

  CartItemModel({
    required this.medicine,
    this.unitType = 'Pill',
    this.quantity = 1,
  });

  double get unitPrice {
    if (unitType == 'Card') {
      return medicine.cardPrice;
    }
    return medicine.price;
  }

  double get lineTotal => unitPrice * quantity;
}

class PrescriptionSubmission {
  final String id;
  final String patientName;
  final String patientEmail;
  final String doctorName;
  final String notes;
  final String? imageUrl;
  final DateTime dateSubmitted;
  final String status;

  PrescriptionSubmission({
    required this.id,
    required this.patientName,
    required this.patientEmail,
    required this.doctorName,
    required this.notes,
    this.imageUrl,
    required this.dateSubmitted,
    this.status = 'Submitted - Pending Pharmacist Approval',
  });

  factory PrescriptionSubmission.fromJson(Map<String, dynamic> json) {
    return PrescriptionSubmission(
      id: json['prescriptionCode']?.toString() ?? (json['id']?.toString() ?? 'RX-0000'),
      patientName: json['patientName']?.toString() ?? 'Unknown Patient',
      patientEmail: json['patientEmail']?.toString() ?? '',
      doctorName: json['doctorName']?.toString() ?? 'Consultant Doctor',
      notes: json['notes']?.toString() ?? '',
      imageUrl: json['imageUrl']?.toString(),
      dateSubmitted: json['submittedAt'] != null ? DateTime.tryParse(json['submittedAt'].toString()) ?? DateTime.now() : DateTime.now(),
      status: json['status']?.toString() ?? 'Pending',
    );
  }
}

class PharmacyOrderItemModel {
  final int? id;
  final int? medicineId;
  final String medicineName;
  final bool requiresPrescription;
  final String unitType;
  final int quantity;
  final double unitPrice;
  final double subtotal;

  PharmacyOrderItemModel({
    this.id,
    this.medicineId,
    required this.medicineName,
    this.requiresPrescription = false,
    this.unitType = 'Pill',
    required this.quantity,
    required this.unitPrice,
    required this.subtotal,
  });

  factory PharmacyOrderItemModel.fromJson(Map<String, dynamic> json) {
    final qty = json['quantity'] is int ? json['quantity'] : int.tryParse(json['quantity']?.toString() ?? '1') ?? 1;
    final price = (json['price'] is num)
        ? (json['price'] as num).toDouble()
        : (json['unitPrice'] is num)
            ? (json['unitPrice'] as num).toDouble()
            : double.tryParse(json['price']?.toString() ?? json['unitPrice']?.toString() ?? '0.0') ?? 0.0;
    final sub = (json['subtotal'] is num)
        ? (json['subtotal'] as num).toDouble()
        : (json['lineTotal'] is num)
            ? (json['lineTotal'] as num).toDouble()
            : (price * qty);

    return PharmacyOrderItemModel(
      id: json['id'] is int ? json['id'] : int.tryParse(json['id']?.toString() ?? '0'),
      medicineId: json['medicineId'] is int ? json['medicineId'] : int.tryParse(json['medicineId']?.toString() ?? '0'),
      medicineName: json['medicineName']?.toString() ?? json['name']?.toString() ?? 'Medicine Item',
      requiresPrescription: json['requiresPrescription'] == true || json['requiresPrescription']?.toString().toLowerCase() == 'true',
      unitType: json['unitType']?.toString() ?? 'Pill',
      quantity: qty,
      unitPrice: price,
      subtotal: sub,
    );
  }
}

class PharmacyOrderModel {
  final int id;
  final String orderNumber;
  final int? patientId;
  final String customerName;
  final String customerEmail;
  final String customerPhone;
  final String deliveryAddress;
  final String deliveryMethod;
  final String paymentMethod;
  final String? prescriptionImageUrl;
  final String status;
  final double totalAmount;
  final String? adminNote;
  final DateTime createdAt;
  final List<PharmacyOrderItemModel> items;
  final bool patientConfirmed;

  PharmacyOrderModel({
    required this.id,
    required this.orderNumber,
    this.patientId,
    required this.customerName,
    required this.customerEmail,
    required this.customerPhone,
    required this.deliveryAddress,
    required this.deliveryMethod,
    required this.paymentMethod,
    this.prescriptionImageUrl,
    required this.status,
    required this.totalAmount,
    this.adminNote,
    required this.createdAt,
    required this.items,
    this.patientConfirmed = false,
  });

  factory PharmacyOrderModel.fromJson(Map<String, dynamic> json) {
    final rawItems = json['items'] as List<dynamic>? ?? [];
    return PharmacyOrderModel(
      id: json['id'] is int ? json['id'] : int.tryParse(json['id']?.toString() ?? '0') ?? 0,
      orderNumber: json['orderNumber']?.toString() ?? 'ORD-${json['id']}',
      patientId: json['patientId'] is int ? json['patientId'] : int.tryParse(json['patientId']?.toString() ?? '0'),
      customerName: json['customerName']?.toString() ?? 'Patient Customer',
      customerEmail: json['customerEmail']?.toString() ?? '',
      customerPhone: json['customerPhone']?.toString() ?? '',
      deliveryAddress: json['deliveryAddress']?.toString() ?? '',
      deliveryMethod: json['deliveryMethod']?.toString() ?? 'HomeDelivery',
      paymentMethod: json['paymentMethod']?.toString() ?? 'CashOnDelivery',
      prescriptionImageUrl: json['prescriptionImageUrl']?.toString(),
      status: json['status']?.toString() ?? 'PendingVerification',
      totalAmount: (json['totalAmount'] is num) ? (json['totalAmount'] as num).toDouble() : double.tryParse(json['totalAmount']?.toString() ?? '0.0') ?? 0.0,
      adminNote: json['adminNote']?.toString(),
      createdAt: json['createdAt'] != null ? DateTime.tryParse(json['createdAt'].toString()) ?? DateTime.now() : DateTime.now(),
      items: rawItems.map((i) => PharmacyOrderItemModel.fromJson(i)).toList(),
      patientConfirmed: json['patientConfirmed'] == true || json['patientConfirmed']?.toString().toLowerCase() == 'true',
    );
  }
}

class PharmacyService {
  static final List<PharmacyOrderModel> _localOrders = [];

  static final List<PrescriptionSubmission> patientPrescriptions = [
    PrescriptionSubmission(
      id: 'RX-8841',
      patientName: 'John Doe',
      patientEmail: 'patient@medix.com',
      doctorName: 'Dr. A. Perera (Cardiologist)',
      notes: 'Monthly refills for Amoxicillin and Atorvastatin 20mg.',
      dateSubmitted: DateTime.now().subtract(const Duration(days: 2)),
      status: 'Approved by Pharmacist',
    ),
  ];

  /// Upload prescription image file to server
  static Future<String?> uploadPrescriptionImage(dynamic imageFile) async {
    final baseUrl = await ApiConfig.getWorkingBaseUrl();
    try {
      if (imageFile is File) {
        final request = http.MultipartRequest('POST', Uri.parse('$baseUrl/uploads'));
        request.files.add(await http.MultipartFile.fromPath('file', imageFile.path));
        final streamedResponse = await request.send().timeout(const Duration(seconds: 10));
        final response = await http.Response.fromStream(streamedResponse);
        if (response.statusCode == 200 || response.statusCode == 201) {
          final data = jsonDecode(response.body);
          return data['fileUrl']?.toString();
        }
      }
    } catch (e) {
      print('Image upload error: $e');
    }
    return null;
  }

  /// Fetch all live admin-inserted medicines directly from PostgreSQL database
  static Future<List<MedicineModel>> getMedicines() async {
    for (final host in ApiConfig.candidateHosts) {
      try {
        final response = await http
            .get(Uri.parse('$host/api/Medicines'))
            .timeout(const Duration(seconds: 4));

        if (response.statusCode == 200) {
          final List<dynamic> data = jsonDecode(response.body);
          return data.map((item) => MedicineModel.fromJson(item)).toList();
        }
      } catch (e) {
        print('Fetch medicines error on $host: $e');
      }
    }
    return [];
  }

  /// Fetch all live categories from backend database
  static Future<List<CategoryModel>> getCategories() async {
    for (final host in ApiConfig.candidateHosts) {
      try {
        final response = await http
            .get(Uri.parse('$host/api/Categories'))
            .timeout(const Duration(seconds: 4));

        if (response.statusCode == 200) {
          final List<dynamic> data = jsonDecode(response.body);
          return data.map((item) => CategoryModel.fromJson(item)).toList();
        }
      } catch (e) {
        print('Fetch categories error on $host: $e');
      }
    }
    return [];
  }

  /// Submit a prescription to backend database API
  static Future<PrescriptionSubmission> submitPrescription({
    required String patientName,
    required String patientEmail,
    required String doctorName,
    required String notes,
    String? imageUrl,
  }) async {
    final baseUrl = await ApiConfig.getWorkingBaseUrl();
    final payload = {
      'patientName': patientName,
      'patientEmail': patientEmail,
      'doctorName': doctorName,
      'notes': notes,
      'imageUrl': imageUrl,
    };

    try {
      final response = await http.post(
        Uri.parse('$baseUrl/Prescriptions'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(payload),
      ).timeout(const Duration(seconds: 5));

      if (response.statusCode == 201 || response.statusCode == 200) {
        final submission = PrescriptionSubmission.fromJson(jsonDecode(response.body));
        patientPrescriptions.insert(0, submission);
        return submission;
      }
    } catch (e) {
      print('Submit prescription error: $e');
    }

    final newSubmission = PrescriptionSubmission(
      id: 'RX-${1000 + patientPrescriptions.length + 1}',
      patientName: patientName,
      patientEmail: patientEmail,
      doctorName: doctorName.isEmpty ? 'Consultant Doctor' : doctorName,
      notes: notes,
      imageUrl: imageUrl,
      dateSubmitted: DateTime.now(),
      status: 'Pending Pharmacist Approval',
    );

    patientPrescriptions.insert(0, newSubmission);
    return newSubmission;
  }

  /// Place a pharmacy order directly to PostgreSQL backend
  static Future<Map<String, dynamic>?> placeOrder({
    int? patientId,
    required String customerName,
    required String customerEmail,
    required String customerPhone,
    required String deliveryAddress,
    required String deliveryMethod,
    required String paymentMethod,
    String? prescriptionImageUrl,
    required String status,
    required double totalAmount,
    String? adminNote,
    required List<Map<String, dynamic>> items,
  }) async {
    final payload = {
      'patientId': patientId,
      'customerName': customerName,
      'customerEmail': customerEmail,
      'customerPhone': customerPhone,
      'deliveryAddress': deliveryAddress,
      'deliveryMethod': deliveryMethod,
      'paymentMethod': paymentMethod,
      'prescriptionImageUrl': prescriptionImageUrl,
      'status': status,
      'totalAmount': totalAmount,
      'adminNote': adminNote,
      'items': items,
    };

    for (final host in ApiConfig.candidateHosts) {
      try {
        final response = await http.post(
          Uri.parse('$host/api/PharmacyOrders'),
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode(payload),
        ).timeout(const Duration(seconds: 8));

        if (response.statusCode == 201 || response.statusCode == 200) {
          final resObj = jsonDecode(response.body) as Map<String, dynamic>;
          _localOrders.insert(0, PharmacyOrderModel.fromJson(resObj));
          return resObj;
        }
      } catch (e) {
        print('Place order error on $host: $e');
      }
    }

    // Local fallback object
    final id = DateTime.now().millisecondsSinceEpoch % 100000;
    final orderNum = 'ORD-${DateTime.now().year}${DateTime.now().month.toString().padLeft(2, '0')}${DateTime.now().day.toString().padLeft(2, '0')}-$id';
    final fallbackMap = {
      'id': id,
      'orderNumber': orderNum,
      'patientId': patientId,
      'customerName': customerName,
      'customerEmail': customerEmail,
      'customerPhone': customerPhone,
      'deliveryAddress': deliveryAddress,
      'deliveryMethod': deliveryMethod,
      'paymentMethod': paymentMethod,
      'prescriptionImageUrl': prescriptionImageUrl,
      'status': status,
      'totalAmount': totalAmount,
      'adminNote': adminNote,
      'createdAt': DateTime.now().toIso8601String(),
      'items': items,
    };

    final fallbackOrder = PharmacyOrderModel.fromJson(fallbackMap);
    _localOrders.insert(0, fallbackOrder);
    return fallbackMap;
  }

  /// Fetch patient orders from backend database
  static Future<List<PharmacyOrderModel>> getPatientOrders(String email) async {
    List<PharmacyOrderModel> remoteOrders = [];
    for (final host in ApiConfig.candidateHosts) {
      try {
        final response = await http
            .get(Uri.parse('$host/api/PharmacyOrders'))
            .timeout(const Duration(seconds: 5));

        if (response.statusCode == 200) {
          final List<dynamic> data = jsonDecode(response.body);
          remoteOrders = data.map((item) => PharmacyOrderModel.fromJson(item)).toList();
          break;
        }
      } catch (e) {
        print('Fetch patient orders error on $host: $e');
      }
    }

    final normalizedEmail = email.trim().toLowerCase();

    // Filter remote & local orders by patient email if provided
    final filteredRemote = normalizedEmail.isNotEmpty
        ? remoteOrders.where((o) => o.customerEmail.trim().toLowerCase() == normalizedEmail).toList()
        : remoteOrders;

    final filteredLocal = normalizedEmail.isNotEmpty
        ? _localOrders.where((o) => o.customerEmail.trim().toLowerCase() == normalizedEmail).toList()
        : _localOrders;

    final Map<String, PharmacyOrderModel> map = {};
    for (final o in [...filteredLocal, ...filteredRemote]) {
      map[o.orderNumber] = o;
    }

    for (final remote in filteredRemote) {
      final idx = _localOrders.indexWhere((l) => l.orderNumber == remote.orderNumber || l.id == remote.id);
      if (idx != -1) {
        _localOrders[idx] = remote;
      } else {
        _localOrders.add(remote);
      }
    }

    final merged = map.values.toList();
    merged.sort((a, b) => b.createdAt.compareTo(a.createdAt));
    return merged;
  }

  /// Update order status / payment on backend database
  static Future<bool> updateOrderStatus(int orderId, String newStatus, {String? paymentMethod, bool? patientConfirmed}) async {
    final payload = {
      'status': newStatus,
      if (paymentMethod != null) 'paymentMethod': paymentMethod,
      if (patientConfirmed != null) 'patientConfirmed': patientConfirmed,
    };

    for (final host in ApiConfig.candidateHosts) {
      try {
        final response = await http.put(
          Uri.parse('$host/api/PharmacyOrders/$orderId/status'),
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode(payload),
        ).timeout(const Duration(seconds: 5));

        if (response.statusCode == 200 || response.statusCode == 204) {
          return true;
        }
      } catch (e) {
        print('Update order status error on $host: $e');
      }
    }

    final idx = _localOrders.indexWhere((o) => o.id == orderId);
    if (idx != -1) {
      final old = _localOrders[idx];
      _localOrders[idx] = PharmacyOrderModel(
        id: old.id,
        orderNumber: old.orderNumber,
        patientId: old.patientId,
        customerName: old.customerName,
        customerEmail: old.customerEmail,
        customerPhone: old.customerPhone,
        deliveryAddress: old.deliveryAddress,
        deliveryMethod: old.deliveryMethod,
        paymentMethod: paymentMethod ?? old.paymentMethod,
        prescriptionImageUrl: old.prescriptionImageUrl,
        status: newStatus,
        totalAmount: old.totalAmount,
        adminNote: old.adminNote,
        createdAt: old.createdAt,
        items: old.items,
        patientConfirmed: patientConfirmed ?? old.patientConfirmed,
      );
      return true;
    }

    return false;
  }

  /// Delete an order from backend database
  static Future<bool> deleteOrder(int orderId) async {
    for (final host in ApiConfig.candidateHosts) {
      try {
        final response = await http.delete(
          Uri.parse('$host/api/PharmacyOrders/$orderId'),
        ).timeout(const Duration(seconds: 5));

        if (response.statusCode == 200 || response.statusCode == 204) {
          _localOrders.removeWhere((o) => o.id == orderId);
          return true;
        }
      } catch (e) {
        print('Delete order error on $host: $e');
      }
    }

    _localOrders.removeWhere((o) => o.id == orderId);
    return true;
  }
}
