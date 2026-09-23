import 'dart:convert';
import 'package:http/http.dart' as http;

import '../utils/config.dart';

final String baseUrl = ApiConfig.labUrl;

// ─── Models ──────────────────────────────────────────────────────────────────

class LabTest {
  final String id, name, description, category;
  final double price;
  final bool isRestricted, isActive;
  final int turnaroundDays;

  LabTest({required this.id, required this.name, required this.description,
    required this.category, required this.price, required this.isRestricted,
    required this.isActive, required this.turnaroundDays});

  factory LabTest.fromJson(Map<String, dynamic> j) => LabTest(
    id: j['id']?.toString() ?? '',
    name: j['name']?.toString() ?? '',
    description: j['description']?.toString() ?? '',
    category: j['category']?.toString() ?? '',
    price: (j['price'] as num?)?.toDouble() ?? 0.0,
    isRestricted: j['isRestricted'] == true,
    isActive: j['isActive'] == true,
    turnaroundDays: (j['turnaroundDays'] as num?)?.toInt() ?? 1,
  );
}

class LabBooking {
  final String id, patientId, patientName, patientEmail, status;
  final String bookingDate, timeSlot;
  final LabTest? labTest;
  final String? prescriptionImageUrl, aiVerification, aiVerificationNotes, resultFileUrl;
  final double? aiConfidenceScore;
  final String? queueToken, priorityTier;
  final int estimatedWaitMinutes, estimatedServiceDurationMinutes, assignedChairNo;
  final String paymentStatus;
  final String? paymentMethod;
  final String? receiptNumber;
  final double amountPaid;
  final String? paidAt;
  final String createdAt;

  LabBooking({required this.id, required this.patientId, required this.patientName,
    required this.patientEmail, required this.status, required this.bookingDate,
    required this.timeSlot, this.labTest, this.prescriptionImageUrl,
    this.aiVerification, this.aiVerificationNotes, this.resultFileUrl,
    this.aiConfidenceScore, this.queueToken, this.priorityTier,
    this.estimatedWaitMinutes = 0, this.estimatedServiceDurationMinutes = 10,
    this.assignedChairNo = 1,
    this.paymentStatus = 'Unpaid',
    this.paymentMethod,
    this.receiptNumber,
    this.amountPaid = 0.0,
    this.paidAt,
    required this.createdAt});

  factory LabBooking.fromJson(Map<String, dynamic> j) => LabBooking(
    id: j['id']?.toString() ?? '',
    patientId: j['patientId']?.toString() ?? '',
    patientName: j['patientName']?.toString() ?? '',
    patientEmail: j['patientEmail']?.toString() ?? '',
    status: j['status']?.toString() ?? '',
    bookingDate: j['bookingDate']?.toString() ?? '',
    timeSlot: j['timeSlot']?.toString() ?? '',
    labTest: j['labTest'] != null ? LabTest.fromJson(j['labTest'] as Map<String, dynamic>) : null,
    prescriptionImageUrl: j['prescriptionImageUrl']?.toString(),
    aiVerification: j['aiVerification']?.toString(),
    aiVerificationNotes: j['aiVerificationNotes']?.toString(),
    resultFileUrl: j['resultFileUrl']?.toString(),
    aiConfidenceScore: j['aiConfidenceScore'] != null ? (j['aiConfidenceScore'] as num).toDouble() : null,
    queueToken: j['queueToken']?.toString(),
    priorityTier: j['priorityTier']?.toString(),
    estimatedWaitMinutes: (j['estimatedWaitMinutes'] as num?)?.toInt() ?? 0,
    estimatedServiceDurationMinutes: (j['estimatedServiceDurationMinutes'] as num?)?.toInt() ?? 10,
    assignedChairNo: (j['assignedChairNo'] as num?)?.toInt() ?? 1,
    paymentStatus: j['paymentStatus']?.toString() ?? 'Unpaid',
    paymentMethod: j['paymentMethod']?.toString(),
    receiptNumber: j['receiptNumber']?.toString(),
    amountPaid: (j['amountPaid'] as num?)?.toDouble() ?? 0.0,
    paidAt: j['paidAt']?.toString(),
    createdAt: j['createdAt']?.toString() ?? '',
  );
}

// ─── API Service ─────────────────────────────────────────────────────────────

class LabApiService {
  static final _client = http.Client();
  static const _headers = {'Content-Type': 'application/json'};

  // Lab Tests
  static Future<List<LabTest>> getTests({String search = '', String category = ''}) async {
    final res = await _client.get(Uri.parse('$baseUrl/tests?search=$search&category=$category'));
    if (res.statusCode == 200) {
      return (jsonDecode(res.body) as List).map((j) => LabTest.fromJson(j)).toList();
    }
    throw Exception('Failed to load tests');
  }

  static Future<List<String>> getCategories() async {
    final res = await _client.get(Uri.parse('$baseUrl/tests/categories'));
    if (res.statusCode == 200) return List<String>.from(jsonDecode(res.body));
    throw Exception('Failed to load categories');
  }

  // Bookings
  static Future<List<LabBooking>> getMyBookings(String patientId) async {
    final parsedId = int.tryParse(patientId) ?? 1;
    final res = await _client.get(Uri.parse('$baseUrl/bookings/my?patientId=$parsedId'));
    if (res.statusCode == 200) {
      return (jsonDecode(res.body) as List).map((j) => LabBooking.fromJson(j)).toList();
    }
    throw Exception('Failed to load bookings');
  }

  static Future<List<Map<String, dynamic>>> getSlots(String date) async {
    final res = await _client.get(Uri.parse('$baseUrl/slots?date=$date'));
    if (res.statusCode == 200) {
      return List<Map<String, dynamic>>.from(jsonDecode(res.body));
    }
    throw Exception('Failed to load slots');
  }

  static Future<LabBooking> createBooking({
    required String labTestId, required String patientId,
    required String patientName, required String patientEmail,
    required String bookingDate, required String timeSlot,
  }) async {
    final formattedTime = timeSlot.length == 5 ? '$timeSlot:00' : timeSlot;
    final parsedPatientId = int.tryParse(patientId) ?? 1;

    final res = await _client.post(
      Uri.parse('$baseUrl/bookings'),
      headers: _headers,
      body: jsonEncode({
        'labTestId': labTestId,
        'patientId': parsedPatientId,
        'patientName': patientName,
        'patientEmail': patientEmail,
        'bookingDate': bookingDate,
        'timeSlot': formattedTime,
      }),
    );
    if (res.statusCode == 200 || res.statusCode == 201) {
      return LabBooking.fromJson(jsonDecode(res.body));
    }
    throw Exception(res.body);
  }

  static Future<LabBooking> uploadPrescription(String bookingId, String imageUrl) async {
    final res = await _client.post(
      Uri.parse('$baseUrl/bookings/$bookingId/prescription'),
      headers: _headers,
      body: jsonEncode({'prescriptionImageUrl': imageUrl}),
    );
    if (res.statusCode == 200) return LabBooking.fromJson(jsonDecode(res.body));
    throw Exception('Failed to upload prescription');
  }

  static Future<void> cancelBooking(String bookingId, String patientId) async {
    final res = await _client.delete(Uri.parse('$baseUrl/bookings/$bookingId?patientId=$patientId'));
    if (res.statusCode != 204) throw Exception('Failed to cancel booking');
  }

  // Payments (Centralized Subsystem)
  static Future<Map<String, dynamic>> payBookingOnline({
    required String bookingId,
    required double amount,
    required String cardHolderName,
    required String cardNumber,
    required String expiryDate,
    required String cvv,
    String? patientEmail,
  }) async {
    final paymentsUrl = ApiConfig.paymentsUrl;
    final res = await _client.post(
      Uri.parse('$paymentsUrl/checkout'),
      headers: _headers,
      body: jsonEncode({
        'module': 'Laboratory',
        'referenceId': bookingId,
        'amount': amount,
        'currency': 'LKR',
        'cardHolderName': cardHolderName,
        'cardNumber': cardNumber,
        'expiryDate': expiryDate,
        'cvv': cvv,
        'patientEmail': patientEmail,
      }),
    );
    if (res.statusCode == 200) {
      return jsonDecode(res.body) as Map<String, dynamic>;
    }
    try {
      final error = jsonDecode(res.body);
      throw Exception(error['message'] ?? 'Payment processing failed');
    } catch (_) {
      throw Exception('Payment failed (HTTP ${res.statusCode})');
    }
  }

  static Future<Map<String, dynamic>> selectPayAtCounter(String bookingId) async {
    final paymentsUrl = ApiConfig.paymentsUrl;
    final res = await _client.post(
      Uri.parse('$paymentsUrl/intent/counter'),
      headers: _headers,
      body: jsonEncode({
        'module': 'Laboratory',
        'referenceId': bookingId,
      }),
    );
    if (res.statusCode == 200) {
      return jsonDecode(res.body) as Map<String, dynamic>;
    }
    throw Exception('Failed to update counter payment selection');
  }

  static Future<Map<String, dynamic>> getPaymentReceipt(String bookingId) async {
    final paymentsUrl = ApiConfig.paymentsUrl;
    final res = await _client.get(Uri.parse('$paymentsUrl/receipt/$bookingId'));
    if (res.statusCode == 200) {
      return jsonDecode(res.body) as Map<String, dynamic>;
    }
    throw Exception('Failed to load payment receipt');
  }
}

