import 'dart:convert';
import 'package:http/http.dart' as http;
import '../utils/config.dart';
import 'auth_service.dart';

// ─── Simple In-Memory Auth State ─────────────────────────────────────────────
class AuthState {
  static String? token;
  static String? userId;
  static String? name;
  static String? email;
  static String? role = 'Patient';
  static String? patientCode;
  static int? age;
  static String? phoneNumber;

  static bool get isLoggedIn => token != null && token!.isNotEmpty;

  static void setUser(Map<String, dynamic> data) {
    token = data['token'] as String?;
    userId = data['userId'] as String?;
    name = data['name'] as String?;
    email = data['email'] as String?;
    role = data['role'] as String? ?? 'Patient';
    patientCode = data['patientCode'] as String?;
    age = data['age'] is int
        ? data['age'] as int
        : (data['age'] != null ? int.tryParse(data['age'].toString()) : null);
    phoneNumber = data['phoneNumber'] as String?;
  }

  static void clear() {
    token = userId = name = email = patientCode = phoneNumber = null;
    role = 'Patient';
    age = null;
  }

  static String get initials {
    if (name == null || name!.trim().isEmpty) return 'P';
    final parts = name!.trim().split(RegExp(r'\s+'));
    if (parts.length >= 2 && parts[0].isNotEmpty && parts[1].isNotEmpty) {
      return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    }
    return parts[0][0].toUpperCase();
  }
}

// ─── Data Models ──────────────────────────────────────────────────────────────

class Patient {
  final String id;
  final String patientCode;
  final String fullName;
  final int age;
  final String gender;
  final String bloodGroup;
  final String contactPhone;
  final String email;
  final String address;
  final String allergies;
  final String chronicConditions;
  final String emergencyContactName;
  final String emergencyContactPhone;
  final DateTime? dateOfBirth;

  Patient({
    required this.id,
    required this.patientCode,
    required this.fullName,
    required this.age,
    required this.gender,
    required this.bloodGroup,
    required this.contactPhone,
    required this.email,
    required this.address,
    required this.allergies,
    required this.chronicConditions,
    required this.emergencyContactName,
    required this.emergencyContactPhone,
    this.dateOfBirth,
  });

  factory Patient.fromJson(Map<String, dynamic> json) => Patient(
        id: json['id'] ?? '',
        patientCode: json['patientCode'] ?? '',
        fullName: json['fullName'] ?? '',
        age: json['age'] ?? 0,
        gender: json['gender'] ?? '',
        bloodGroup: json['bloodGroup'] ?? '',
        contactPhone: json['contactPhone'] ?? '',
        email: json['email'] ?? '',
        address: json['address'] ?? '',
        allergies: json['allergies'] ?? '',
        chronicConditions: json['chronicConditions'] ?? '',
        emergencyContactName: json['emergencyContactName'] ?? '',
        emergencyContactPhone: json['emergencyContactPhone'] ?? '',
        dateOfBirth: json['dateOfBirth'] != null ? DateTime.tryParse(json['dateOfBirth'].toString()) : null,
      );
}

class ConsultationNote {
  final String id;
  final String patientCode;
  final String doctorName;
  final String doctorDesignation;
  final String consultationDate;
  final String diagnosis;
  final String recommendedTests;
  final List<dynamic> medicines;
  final String clinicalNotes;
  final String status;

  ConsultationNote({
    required this.id,
    required this.patientCode,
    required this.doctorName,
    required this.doctorDesignation,
    required this.consultationDate,
    required this.diagnosis,
    required this.recommendedTests,
    required this.medicines,
    required this.clinicalNotes,
    required this.status,
  });

  factory ConsultationNote.fromJson(Map<String, dynamic> json) {
    List<dynamic> meds = [];
    final rawMeds = json['prescribedMedicines'];
    if (rawMeds is String && rawMeds.isNotEmpty) {
      try {
        meds = jsonDecode(rawMeds);
      } catch (_) {
        meds = [];
      }
    } else if (rawMeds is List) {
      meds = rawMeds;
    }

    return ConsultationNote(
      id: json['id'] ?? '',
      patientCode: json['patientCode'] ?? '',
      doctorName: json['doctorName'] ?? '',
      doctorDesignation: json['doctorDesignation'] ?? '',
      consultationDate: (json['consultationDate'] ?? '').toString().split('T').first,
      diagnosis: json['diagnosis'] ?? '',
      recommendedTests: json['recommendedTests'] ?? '',
      medicines: meds,
      clinicalNotes: json['clinicalNotes'] ?? '',
      status: json['status'] ?? 'Completed',
    );
  }
}

class LabReport {
  final String id;
  final String patientCode;
  final String testTitle;
  final String category;
  final String orderedDoctor;
  final String reportDate;
  final String status;
  final String resultsSummary;
  final String? fileName;

  LabReport({
    required this.id,
    required this.patientCode,
    required this.testTitle,
    required this.category,
    required this.orderedDoctor,
    required this.reportDate,
    required this.status,
    required this.resultsSummary,
    this.fileName,
  });

  factory LabReport.fromJson(Map<String, dynamic> json) => LabReport(
        id: json['id'] ?? '',
        patientCode: json['patientCode'] ?? '',
        testTitle: json['testTitle'] ?? '',
        category: json['category'] ?? 'General',
        orderedDoctor: json['orderedDoctor'] ?? '',
        reportDate: (json['reportDate'] ?? '').toString().split('T').first,
        status: json['status'] ?? 'Pending',
        resultsSummary: json['resultsSummary'] ?? '',
        fileName: json['fileName'],
      );
}

class Prescription {
  final String id;
  final String patientCode;
  final String medicationName;
  final String dosage;
  final String duration;
  final String startDate;
  final String endDate;
  final double unitPrice;
  final String prescribedDoctor;
  final String status;

  Prescription({
    required this.id,
    required this.patientCode,
    required this.medicationName,
    required this.dosage,
    required this.duration,
    required this.startDate,
    required this.endDate,
    required this.unitPrice,
    required this.prescribedDoctor,
    required this.status,
  });

  factory Prescription.fromJson(Map<String, dynamic> json) => Prescription(
        id: json['id'] ?? '',
        patientCode: json['patientCode'] ?? '',
        medicationName: json['medicationName'] ?? '',
        dosage: json['dosage'] ?? '',
        duration: json['duration'] ?? '',
        startDate: (json['startDate'] ?? '').toString().split('T').first,
        endDate: (json['endDate'] ?? '').toString().split('T').first,
        unitPrice: (json['unitPrice'] as num?)?.toDouble() ?? 0.0,
        prescribedDoctor: json['prescribedDoctor'] ?? '',
        status: json['status'] ?? 'Active',
      );
}

class ChannelingAppointment {
  final String id;
  final String doctorName;
  final String specialty;
  final String date;
  final String time;
  final String room;
  final String status;

  ChannelingAppointment({
    required this.id,
    required this.doctorName,
    required this.specialty,
    required this.date,
    required this.time,
    required this.room,
    required this.status,
  });

  factory ChannelingAppointment.fromJson(Map<String, dynamic> json) => ChannelingAppointment(
        id: json['appointmentCode'] ?? json['id'] ?? '',
        doctorName: json['doctorName'] ?? '',
        specialty: json['specialty'] ?? '',
        date: json['formattedDate'] ?? json['date'] ?? '',
        time: json['formattedTime'] ?? json['time'] ?? '',
        room: json['room'] ?? '',
        status: json['status'] ?? 'Upcoming',
      );
}

class ClinicalSummary {
  final String patientCode;
  final String fullName;
  final int age;
  final String gender;
  final String bloodGroup;
  final String emergencyContact;
  final List<String> knownAllergies;
  final List<String> chronicConditions;
  final int totalConsultationsCount;
  final int activePrescriptionsCount;
  final int completedLabReportsCount;
  final int pendingLabReportsCount;
  final List<Prescription> activeMedications;
  final List<ConsultationNote> recentConsultations;
  final List<LabReport> recentLabReports;
  final List<String> clinicalAlerts;
  final String overallAssessment;

  ClinicalSummary({
    required this.patientCode,
    required this.fullName,
    required this.age,
    required this.gender,
    required this.bloodGroup,
    required this.emergencyContact,
    required this.knownAllergies,
    required this.chronicConditions,
    required this.totalConsultationsCount,
    required this.activePrescriptionsCount,
    required this.completedLabReportsCount,
    required this.pendingLabReportsCount,
    required this.activeMedications,
    required this.recentConsultations,
    required this.recentLabReports,
    required this.clinicalAlerts,
    required this.overallAssessment,
  });

  factory ClinicalSummary.fromJson(Map<String, dynamic> json) => ClinicalSummary(
        patientCode: json['patientCode'] ?? '',
        fullName: json['fullName'] ?? '',
        age: json['age'] ?? 0,
        gender: json['gender'] ?? '',
        bloodGroup: json['bloodGroup'] ?? '',
        emergencyContact: json['emergencyContact'] ?? '',
        knownAllergies: List<String>.from(json['knownAllergies'] ?? []),
        chronicConditions: List<String>.from(json['chronicConditions'] ?? []),
        totalConsultationsCount: json['totalConsultationsCount'] ?? 0,
        activePrescriptionsCount: json['activePrescriptionsCount'] ?? 0,
        completedLabReportsCount: json['completedLabReportsCount'] ?? 0,
        pendingLabReportsCount: json['pendingLabReportsCount'] ?? 0,
        activeMedications: (json['activeMedications'] as List<dynamic>? ?? [])
            .map((e) => Prescription.fromJson(e))
            .toList(),
        recentConsultations: (json['recentConsultations'] as List<dynamic>? ?? [])
            .map((e) => ConsultationNote.fromJson(e))
            .toList(),
        recentLabReports: (json['recentLabReports'] as List<dynamic>? ?? [])
            .map((e) => LabReport.fromJson(e))
            .toList(),
        clinicalAlerts: List<String>.from(json['clinicalAlerts'] ?? []),
        overallAssessment: json['overallAssessment'] ?? '',
      );
}

// ─── EMR API Service ──────────────────────────────────────────────────────────

class EmrApiService {
  static String? _customHost;

  /// Sets custom API host if running on physical device on local Wi-Fi
  static void setCustomHost(String host) {
    _customHost = host;
  }

  /// Automatically resolves base URL depending on platform and ApiConfig
  static String get baseUrl {
    if (_customHost != null && _customHost!.isNotEmpty) {
      return 'http://$_customHost:5126/api/emr';
    }
    return ApiConfig.emrUrl;
  }

  // ── Active Patient State ───────────────────────────────────────────────────
  static String activePatientCode = 'PAT-1001';
  static String activePatientName = 'Patient';

  static void setActivePatient(String code, String name) {
    activePatientCode = code;
    activePatientName = name;
  }

  // ── Network Helper ─────────────────────────────────────────────────────────
  static Future<Map<String, String>> _buildHeaders() async {
    String? token = AuthState.token;
    if (token == null || token.isEmpty) {
      token = await AuthService.getToken();
      if (token != null && token.isNotEmpty) {
        AuthState.token = token;
      }
    }
    final headers = <String, String>{
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }
    return headers;
  }

  static Future<dynamic> _get(String path) async {
    final headers = await _buildHeaders();
    // Try ADB reverse (physical device via USB) first with fast timeout
    const preferredHost = 'http://127.0.0.1:5126';
    try {
      final uri = Uri.parse('$preferredHost/api/emr$path');
      final res = await http.get(uri, headers: headers).timeout(const Duration(seconds: 3));
      if (res.statusCode >= 200 && res.statusCode < 300) {
        return jsonDecode(res.body);
      }
    } catch (_) {}

    // Fall through to other candidate hosts
    for (final host in ApiConfig.candidateHosts) {
      if (host == preferredHost) continue; // already tried
      try {
        final uri = Uri.parse('$host/api/emr$path');
        final res = await http.get(uri, headers: headers).timeout(const Duration(seconds: 3));
        if (res.statusCode >= 200 && res.statusCode < 300) {
          return jsonDecode(res.body);
        }
      } catch (_) {}
    }
    throw Exception('Failed to connect to EMR API');
  }

  /// Fetches the profile of the currently authenticated patient from /patients/me
  static Future<Patient> getMyPatient() async {
    // 1. Sync from AuthService if AuthState is missing token or details
    final user = await AuthService.getUser();
    if (user != null) {
      if (AuthState.token == null || AuthState.token!.isEmpty) {
        AuthState.token = user.token;
      }
      AuthState.userId ??= user.userId;
      AuthState.name ??= user.name;
      AuthState.email ??= user.email;
      AuthState.role ??= user.role;
    }

    // 2. Query backend /patients/me with Bearer token
    try {
      final data = await _get('/patients/me');
      if (data != null && data is Map<String, dynamic>) {
        final patient = Patient.fromJson(data);
        AuthState.patientCode = patient.patientCode;
        AuthState.name = patient.fullName;
        AuthState.email = patient.email;
        AuthState.phoneNumber = patient.contactPhone;
        AuthState.age = patient.age;
        setActivePatient(patient.patientCode, patient.fullName);
        return patient;
      }
    } catch (e) {
      // If /patients/me fails, try getPatient with existing patientCode if present
      if (AuthState.patientCode != null &&
          AuthState.patientCode!.isNotEmpty &&
          AuthState.patientCode != 'PAT-1001') {
        try {
          return await getPatient(AuthState.patientCode!);
        } catch (_) {}
      }
    }

    // 3. Fallback using real logged-in user credentials (never fake 'John Anderson')
    final realName = (AuthState.name?.isNotEmpty == true)
        ? AuthState.name!
        : (user?.name.isNotEmpty == true ? user!.name : 'Patient');
    final realEmail = (AuthState.email?.isNotEmpty == true)
        ? AuthState.email!
        : (user?.email.isNotEmpty == true ? user!.email : '');
    final realUserId = (AuthState.userId?.isNotEmpty == true)
        ? AuthState.userId!
        : (user?.userId.isNotEmpty == true ? user!.userId : '1');
    final code = AuthState.patientCode ?? 'PAT-$realUserId';

    return Patient(
      id: realUserId,
      patientCode: code,
      fullName: realName,
      age: AuthState.age ?? 0,
      gender: 'Other',
      bloodGroup: 'Unknown',
      contactPhone: AuthState.phoneNumber ?? '',
      email: realEmail,
      address: '',
      allergies: '',
      chronicConditions: '',
      emergencyContactName: '',
      emergencyContactPhone: '',
    );
  }

  // ── Patients ───────────────────────────────────────────────────────────────
  static Future<List<Patient>> getPatients({String? search}) async {
    try {
      final q = search != null && search.isNotEmpty ? '?search=${Uri.encodeComponent(search)}' : '';
      final data = await _get('/patients$q') as List<dynamic>;
      return data.map((e) => Patient.fromJson(e)).toList();
    } catch (_) {
      final realName = AuthState.name ?? 'Patient';
      final realEmail = AuthState.email ?? '';
      return [
        Patient(
          id: AuthState.userId ?? '1',
          patientCode: AuthState.patientCode ?? 'PAT-1',
          fullName: realName,
          age: AuthState.age ?? 0,
          gender: 'Other',
          bloodGroup: 'Unknown',
          contactPhone: AuthState.phoneNumber ?? '',
          email: realEmail,
          address: '',
          allergies: '',
          chronicConditions: '',
          emergencyContactName: '',
          emergencyContactPhone: '',
        ),
      ];
    }
  }

  static Future<Patient> getPatient(String idOrCode) async {
    try {
      final data = await _get('/patients/${Uri.encodeComponent(idOrCode)}');
      return Patient.fromJson(data);
    } catch (_) {
      try {
        final list = await getPatients(search: idOrCode);
        if (list.isNotEmpty) return list.first;
      } catch (_) {}

      return Patient(
        id: AuthState.userId ?? '1',
        patientCode: AuthState.patientCode ?? idOrCode,
        fullName: AuthState.name ?? 'Patient',
        age: AuthState.age ?? 0,
        gender: 'Other',
        bloodGroup: 'Unknown',
        contactPhone: AuthState.phoneNumber ?? '',
        email: AuthState.email ?? '',
        address: '',
        allergies: '',
        chronicConditions: '',
        emergencyContactName: '',
        emergencyContactPhone: '',
      );
    }
  }

  // ── Consultations ──────────────────────────────────────────────────────────
  static Future<List<ConsultationNote>> getConsultations({String? patientCode}) async {
    final code = patientCode ?? activePatientCode;
    try {
      final q = '?patientCode=${Uri.encodeComponent(code)}';
      final data = await _get('/consultations$q') as List<dynamic>;
      return data.map((e) => ConsultationNote.fromJson(e)).toList();
    } catch (_) {
      return [];
    }
  }

  // ── Lab Reports ────────────────────────────────────────────────────────────
  static Future<List<LabReport>> getLabReports({String? patientCode}) async {
    final code = patientCode ?? activePatientCode;
    try {
      final q = '?patientCode=${Uri.encodeComponent(code)}';
      final data = await _get('/lab-reports$q') as List<dynamic>;
      return data.map((e) => LabReport.fromJson(e)).toList();
    } catch (_) {
      return [];
    }
  }

  // ── Prescriptions ──────────────────────────────────────────────────────────
  static Future<List<Prescription>> getPrescriptions({String? patientCode}) async {
    final code = patientCode ?? activePatientCode;
    try {
      final q = '?patientCode=${Uri.encodeComponent(code)}';
      final data = await _get('/prescriptions$q') as List<dynamic>;
      return data.map((e) => Prescription.fromJson(e)).toList();
    } catch (_) {
      return [];
    }
  }

  // ── Clinical Summary (Business-Specific Operation) ─────────────────────────
  static Future<ClinicalSummary> getClinicalSummary(String patientCodeOrId) async {
    try {
      final data = await _get('/patients/${Uri.encodeComponent(patientCodeOrId)}/clinical-summary');
      return ClinicalSummary.fromJson(data);
    } catch (_) {
      // Graceful offline fallback using authenticated session data
      return ClinicalSummary(
        patientCode: patientCodeOrId,
        fullName: AuthState.name ?? 'Patient',
        age: AuthState.age ?? 30,
        gender: 'Not specified',
        bloodGroup: 'Not specified',
        emergencyContact: 'Not specified',
        knownAllergies: const [],
        chronicConditions: const [],
        totalConsultationsCount: 0,
        activePrescriptionsCount: 0,
        completedLabReportsCount: 0,
        pendingLabReportsCount: 0,
        activeMedications: const [],
        recentConsultations: const [],
        recentLabReports: const [],
        clinicalAlerts: const [],
        overallAssessment: 'No data available. Please check your connection.',
      );
    }
  }

  // ── Patient Profile Update ────────────────────────────────────────────────
  static Future<Patient> updatePatientProfile(String patientCode, Map<String, dynamic> body) async {
    final headers = await _buildHeaders();
    for (final host in ApiConfig.candidateHosts) {
      try {
        final uri = Uri.parse('$host/api/emr/patients/code/${Uri.encodeComponent(patientCode)}');
        final res = await http.put(
          uri,
          headers: headers,
          body: jsonEncode(body),
        ).timeout(const Duration(seconds: 6));

        if (res.statusCode >= 200 && res.statusCode < 300) {
          return Patient.fromJson(jsonDecode(res.body));
        }
      } catch (_) {}
    }
    return Patient.fromJson({
      'id': AuthState.userId ?? '1',
      'patientCode': patientCode,
      'fullName': body['fullName'] ?? AuthState.name ?? 'Patient',
      'age': AuthState.age ?? 0,
      'gender': body['gender'] ?? 'Other',
      'bloodGroup': body['bloodGroup'] ?? 'Unknown',
      'contactPhone': body['contactPhone'] ?? AuthState.phoneNumber ?? '',
      'email': body['email'] ?? AuthState.email ?? '',
      'address': body['address'] ?? '',
      'allergies': body['allergies'] ?? '',
      'chronicConditions': body['chronicConditions'] ?? '',
      'emergencyContactName': body['emergencyContactName'] ?? '',
      'emergencyContactPhone': body['emergencyContactPhone'] ?? '',
      'dateOfBirth': body['dateOfBirth'],
    });
  }

  // ── Channeling History ─────────────────────────────────────────────────────
  static Future<List<ChannelingAppointment>> getChannelingHistory({String? patientCode}) async {
    final code = patientCode ?? activePatientCode;
    try {
      final q = '?patientCode=${Uri.encodeComponent(code)}';
      final data = await _get('/channeling-appointments$q') as List<dynamic>;
      return data.map((e) => ChannelingAppointment.fromJson(e)).toList();
    } catch (_) {
      if (code == 'PAT-1001') {
        return [
          ChannelingAppointment(
            id: 'APT-3011',
            doctorName: 'Dr. Sarah Jenkins',
            specialty: 'Cardiologist',
            date: 'Aug 24, 2026',
            time: '10:30 AM',
            room: 'Room 304, West Wing',
            status: 'Upcoming',
          ),
          ChannelingAppointment(
            id: 'APT-2890',
            doctorName: 'Dr. Michael Chang',
            specialty: 'General Practitioner',
            date: 'Jul 22, 2026',
            time: '02:00 PM',
            room: 'Room 108, Main Clinic',
            status: 'Completed',
          ),
        ];
      }
      return [];
    }
  }
}
