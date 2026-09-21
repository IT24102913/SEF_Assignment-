import 'dart:convert';
import 'package:http/http.dart' as http;
import '../utils/config.dart';
import 'auth_service.dart';

// ─── Data Models ─────────────────────────────────────────────────────────────

class Doctor {
  final int id;
  final String fullName;
  final String specialization;
  final String qualifications;
  final String hospital;
  final String hospitalBranch;
  final String roomNumber;
  final double consultationFee;
  final String availableDays;
  final String availableTime;
  final String? imageUrl;
  final String phoneNumber;
  final double rating;
  final int reviewCount;
  final int experienceYears;
  final bool isVerifiedConsultant;
  final String bio;
  final bool isAvailable;
  final bool availableToday;
  final bool availableTomorrow;
  final int slotsLeft;

  Doctor({
    required this.id,
    required this.fullName,
    required this.specialization,
    required this.qualifications,
    required this.hospital,
    required this.hospitalBranch,
    required this.roomNumber,
    required this.consultationFee,
    required this.availableDays,
    required this.availableTime,
    this.imageUrl,
    required this.phoneNumber,
    required this.rating,
    required this.reviewCount,
    required this.experienceYears,
    required this.isVerifiedConsultant,
    required this.bio,
    required this.isAvailable,
    required this.availableToday,
    required this.availableTomorrow,
    required this.slotsLeft,
  });

  factory Doctor.fromJson(Map<String, dynamic> json) => Doctor(
    id: (json['id'] as num?)?.toInt() ?? 0,
    fullName: json['fullName']?.toString() ?? '',
    specialization: json['specialization']?.toString() ?? '',
    qualifications: json['qualifications']?.toString() ?? '',
    hospital: json['hospital']?.toString() ?? '',
    hospitalBranch: json['hospitalBranch']?.toString() ?? '',
    roomNumber: json['roomNumber']?.toString() ?? '',
    consultationFee: (json['consultationFee'] as num?)?.toDouble() ?? 0.0,
    availableDays: json['availableDays']?.toString() ?? '',
    availableTime: json['availableTime']?.toString() ?? '',
    imageUrl: json['imageUrl']?.toString(),
    phoneNumber: json['phoneNumber']?.toString() ?? '',
    rating: (json['rating'] as num?)?.toDouble() ?? 4.8,
    reviewCount: (json['reviewCount'] as num?)?.toInt() ?? 0,
    experienceYears: (json['experienceYears'] as num?)?.toInt() ?? 0,
    isVerifiedConsultant: json['isVerifiedConsultant'] == true,
    bio: json['bio']?.toString() ?? '',
    isAvailable: json['isAvailable'] == true,
    availableToday: json['availableToday'] == true,
    availableTomorrow: json['availableTomorrow'] == true,
    slotsLeft: (json['slotsLeft'] as num?)?.toInt() ?? 0,
  );
}

class DoctorSession {
  final int id;
  final int doctorId;
  final String doctorName;
  final String sessionDate;
  final String sessionTime;
  final String timeFormatted;
  final int maxCapacity;
  final int currentBookings;
  final bool isAvailable;
  final int slotsLeft;

  DoctorSession({
    required this.id,
    required this.doctorId,
    required this.doctorName,
    required this.sessionDate,
    required this.sessionTime,
    required this.timeFormatted,
    required this.maxCapacity,
    required this.currentBookings,
    required this.isAvailable,
    required this.slotsLeft,
  });

  factory DoctorSession.fromJson(Map<String, dynamic> json) => DoctorSession(
    id: (json['id'] as num?)?.toInt() ?? 0,
    doctorId: (json['doctorId'] as num?)?.toInt() ?? 0,
    doctorName: json['doctorName']?.toString() ?? '',
    sessionDate: json['sessionDate']?.toString() ?? '',
    sessionTime: json['sessionTime']?.toString() ?? '',
    timeFormatted: json['timeFormatted']?.toString() ?? '',
    maxCapacity: (json['maxCapacity'] as num?)?.toInt() ?? 1,
    currentBookings: (json['currentBookings'] as num?)?.toInt() ?? 0,
    isAvailable: json['isAvailable'] == true,
    slotsLeft: (json['slotsLeft'] as num?)?.toInt() ?? 0,
  );
}

class SpecialtyCount {
  final String name;
  final int consultantCount;
  final String iconName;

  SpecialtyCount({
    required this.name,
    required this.consultantCount,
    required this.iconName,
  });

  factory SpecialtyCount.fromJson(Map<String, dynamic> json) => SpecialtyCount(
    name: json['name']?.toString() ?? '',
    consultantCount: (json['consultantCount'] as num?)?.toInt() ?? 0,
    iconName: json['iconName']?.toString() ?? '',
  );
}

class DoctorAppointment {
  final int id;
  final String appointmentNumber;
  final int doctorId;
  final String doctorName;
  final String specialization;
  final String hospital;
  final String hospitalBranch;
  final int? patientId;
  final String patientName;
  final String patientPhone;
  final String patientEmail;
  final String patientNic;
  final String? patientAddress;
  final String appointmentDate;
  final String timeSlot;
  final int? doctorSessionId;
  final int queueNumber;
  final double consultationFee;
  final double serviceCharge;
  final double totalAmount;
  final String status;
  final String paymentMethod;
  final String paymentStatus;
  final String? paymentReference;
  final String? notes;
  final String qrCodeText;

  DoctorAppointment({
    required this.id,
    required this.appointmentNumber,
    required this.doctorId,
    required this.doctorName,
    required this.specialization,
    required this.hospital,
    required this.hospitalBranch,
    this.patientId,
    required this.patientName,
    required this.patientPhone,
    required this.patientEmail,
    required this.patientNic,
    this.patientAddress,
    required this.appointmentDate,
    required this.timeSlot,
    this.doctorSessionId,
    required this.queueNumber,
    required this.consultationFee,
    required this.serviceCharge,
    required this.totalAmount,
    required this.status,
    required this.paymentMethod,
    required this.paymentStatus,
    this.paymentReference,
    this.notes,
    required this.qrCodeText,
  });

  factory DoctorAppointment.fromJson(Map<String, dynamic> json) => DoctorAppointment(
    id: (json['id'] as num?)?.toInt() ?? 0,
    appointmentNumber: json['appointmentNumber']?.toString() ?? '',
    doctorId: (json['doctorId'] as num?)?.toInt() ?? 0,
    doctorName: json['doctorName']?.toString() ?? '',
    specialization: json['specialization']?.toString() ?? '',
    hospital: json['hospital']?.toString() ?? '',
    hospitalBranch: json['hospitalBranch']?.toString() ?? '',
    patientId: (json['patientId'] as num?)?.toInt(),
    patientName: json['patientName']?.toString() ?? '',
    patientPhone: json['patientPhone']?.toString() ?? '',
    patientEmail: json['patientEmail']?.toString() ?? '',
    patientNic: json['patientNic']?.toString() ?? '',
    patientAddress: json['patientAddress']?.toString(),
    appointmentDate: json['appointmentDate']?.toString() ?? '',
    timeSlot: json['timeSlot']?.toString() ?? '',
    doctorSessionId: (json['doctorSessionId'] as num?)?.toInt(),
    queueNumber: (json['queueNumber'] as num?)?.toInt() ?? 1,
    consultationFee: (json['consultationFee'] as num?)?.toDouble() ?? 0.0,
    serviceCharge: (json['serviceCharge'] as num?)?.toDouble() ?? 300.0,
    totalAmount: (json['totalAmount'] as num?)?.toDouble() ?? 0.0,
    status: json['status']?.toString() ?? 'PendingPayment',
    paymentMethod: json['paymentMethod']?.toString() ?? '',
    paymentStatus: json['paymentStatus']?.toString() ?? 'Pending',
    paymentReference: json['paymentReference']?.toString(),
    notes: json['notes']?.toString(),
    qrCodeText: json['qrCodeText']?.toString() ?? '',
  );
}

class SpecialtyRecommendation {
  final String specialty;
  final double matchScore;
  final String reasoning;
  final int availableConsultants;

  SpecialtyRecommendation({
    required this.specialty,
    required this.matchScore,
    required this.reasoning,
    required this.availableConsultants,
  });

  factory SpecialtyRecommendation.fromJson(Map<String, dynamic> json) => SpecialtyRecommendation(
    specialty: json['specialty']?.toString() ?? '',
    matchScore: (json['matchScore'] as num?)?.toDouble() ?? 0.0,
    reasoning: json['reasoning']?.toString() ?? '',
    availableConsultants: (json['availableConsultants'] as num?)?.toInt() ?? 0,
  );
}

// ─── API Service ─────────────────────────────────────────────────────────────

class DoctorApiService {
  static Future<Map<String, String>> _getHeaders() async {
    final token = await AuthService.getToken();
    final headers = {'Content-Type': 'application/json'};
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }
    return headers;
  }

  static Future<List<Doctor>> getDoctors({
    String? search,
    String? specialization,
    String? hospital,
    String? date,
    String? sortBy,
  }) async {
    final query = <String, String>{};
    if (search != null && search.isNotEmpty) query['search'] = search;
    if (specialization != null && specialization != 'ALL') query['specialization'] = specialization;
    if (hospital != null && hospital != 'ALL') query['hospital'] = hospital;
    if (date != null && date.isNotEmpty) query['date'] = date;
    if (sortBy != null) query['sortBy'] = sortBy;

    final uri = Uri.parse(ApiConfig.doctorsUrl).replace(queryParameters: query);
    final headers = await _getHeaders();
    final res = await http.get(uri, headers: headers);

    if (res.statusCode == 200) {
      final List data = jsonDecode(res.body);
      return data.map((j) => Doctor.fromJson(j as Map<String, dynamic>)).toList();
    }
    throw Exception('Failed to load doctors: ${res.statusCode}');
  }

  static Future<List<SpecialtyCount>> getSpecialties() async {
    final uri = Uri.parse('${ApiConfig.doctorsUrl}/specialties');
    final headers = await _getHeaders();
    final res = await http.get(uri, headers: headers);

    if (res.statusCode == 200) {
      final List data = jsonDecode(res.body);
      return data.map((j) => SpecialtyCount.fromJson(j as Map<String, dynamic>)).toList();
    }
    throw Exception('Failed to load specialties: ${res.statusCode}');
  }

  static Future<Doctor> getDoctorById(int id) async {
    final uri = Uri.parse('${ApiConfig.doctorsUrl}/$id');
    final headers = await _getHeaders();
    final res = await http.get(uri, headers: headers);

    if (res.statusCode == 200) {
      return Doctor.fromJson(jsonDecode(res.body));
    }
    throw Exception('Doctor not found');
  }

  static Future<List<DoctorSession>> getDoctorSessions(int doctorId, {String? date}) async {
    final query = date != null && date.isNotEmpty ? {'date': date} : null;
    final uri = Uri.parse('${ApiConfig.doctorsUrl}/$doctorId/sessions').replace(queryParameters: query);
    final headers = await _getHeaders();
    final res = await http.get(uri, headers: headers);

    if (res.statusCode == 200) {
      final List data = jsonDecode(res.body);
      return data.map((j) => DoctorSession.fromJson(j as Map<String, dynamic>)).toList();
    }
    throw Exception('Failed to load doctor sessions');
  }

  static Future<List<SpecialtyRecommendation>> recommendSpecialty(String symptoms) async {
    final uri = Uri.parse('${ApiConfig.doctorsUrl}/recommend-specialty');
    final headers = await _getHeaders();
    final res = await http.post(
      uri,
      headers: headers,
      body: jsonEncode({'symptoms': symptoms}),
    );

    if (res.statusCode == 200) {
      final Map<String, dynamic> data = jsonDecode(res.body);
      final List recs = data['recommendations'] ?? [];
      return recs.map((j) => SpecialtyRecommendation.fromJson(j as Map<String, dynamic>)).toList();
    }
    return [];
  }

  static Future<DoctorAppointment> bookAppointment(Map<String, dynamic> bookingData) async {
    final uri = Uri.parse('${ApiConfig.appointmentsUrl}/book');
    final headers = await _getHeaders();
    final res = await http.post(
      uri,
      headers: headers,
      body: jsonEncode(bookingData),
    );

    if (res.statusCode == 200) {
      return DoctorAppointment.fromJson(jsonDecode(res.body));
    }
    final error = jsonDecode(res.body);
    throw Exception(error['message'] ?? 'Booking failed');
  }

  static Future<DoctorAppointment> payAppointment(int appointmentId, Map<String, dynamic> paymentData) async {
    final uri = Uri.parse('${ApiConfig.appointmentsUrl}/$appointmentId/pay');
    final headers = await _getHeaders();
    final res = await http.post(
      uri,
      headers: headers,
      body: jsonEncode(paymentData),
    );

    if (res.statusCode == 200) {
      return DoctorAppointment.fromJson(jsonDecode(res.body));
    }
    final error = jsonDecode(res.body);
    throw Exception(error['message'] ?? 'Payment failed');
  }

  static Future<List<DoctorAppointment>> getMyAppointments({int? patientId, String? email, String? status}) async {
    final query = <String, String>{};
    if (patientId != null && patientId > 0) query['patientId'] = patientId.toString();
    if (email != null && email.isNotEmpty) query['email'] = email;
    if (status != null && status != 'ALL') query['status'] = status;

    final uri = Uri.parse('${ApiConfig.appointmentsUrl}/mine').replace(queryParameters: query);
    final headers = await _getHeaders();
    final res = await http.get(uri, headers: headers);

    if (res.statusCode == 200) {
      final List data = jsonDecode(res.body);
      return data.map((j) => DoctorAppointment.fromJson(j as Map<String, dynamic>)).toList();
    }
    return [];
  }

  static Future<bool> cancelAppointment(int appointmentId) async {
    final uri = Uri.parse('${ApiConfig.appointmentsUrl}/$appointmentId/cancel');
    final headers = await _getHeaders();
    final res = await http.post(uri, headers: headers);
    return res.statusCode == 200;
  }

  static Future<DoctorAppointment> rescheduleAppointment(int appointmentId, int newSessionId) async {
    final uri = Uri.parse('${ApiConfig.appointmentsUrl}/$appointmentId/reschedule');
    final headers = await _getHeaders();
    final res = await http.post(
      uri,
      headers: headers,
      body: jsonEncode({'newSessionId': newSessionId}),
    );

    if (res.statusCode == 200) {
      return DoctorAppointment.fromJson(jsonDecode(res.body));
    }
    final error = jsonDecode(res.body);
    throw Exception(error['message'] ?? 'Reschedule failed');
  }
}
