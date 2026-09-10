import 'dart:convert';
import 'package:http/http.dart' as http;

/// Base URL for the ASP.NET Core Health Bridge API.
/// For Android emulator use: http://10.0.2.2:5238
/// For web / Windows: http://localhost:5238
const String _apiBase = 'http://localhost:5238/api/emr';

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
  final String prescribedMedicines;
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
    required this.prescribedMedicines,
    required this.clinicalNotes,
    required this.status,
  });

  factory ConsultationNote.fromJson(Map<String, dynamic> json) =>
      ConsultationNote(
        id: json['id'] ?? '',
        patientCode: json['patientCode'] ?? '',
        doctorName: json['doctorName'] ?? '',
        doctorDesignation: json['doctorDesignation'] ?? '',
        consultationDate: (json['consultationDate'] ?? '').toString().split('T').first,
        diagnosis: json['diagnosis'] ?? '',
        recommendedTests: json['recommendedTests'] ?? '',
        prescribedMedicines: json['prescribedMedicines'] ?? '',
        clinicalNotes: json['clinicalNotes'] ?? '',
        status: json['status'] ?? '',
      );
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

  LabReport({
    required this.id,
    required this.patientCode,
    required this.testTitle,
    required this.category,
    required this.orderedDoctor,
    required this.reportDate,
    required this.status,
    required this.resultsSummary,
  });

  factory LabReport.fromJson(Map<String, dynamic> json) => LabReport(
        id: json['id'] ?? '',
        patientCode: json['patientCode'] ?? '',
        testTitle: json['testTitle'] ?? '',
        category: json['category'] ?? '',
        orderedDoctor: json['orderedDoctor'] ?? '',
        reportDate: (json['reportDate'] ?? '').toString().split('T').first,
        status: json['status'] ?? '',
        resultsSummary: json['resultsSummary'] ?? '',
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
        status: json['status'] ?? '',
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

// ─── API Service ─────────────────────────────────────────────────────────────

class EmrApiService {
  // Helper
  static Future<dynamic> _get(String path) async {
    final res = await http.get(Uri.parse('$_apiBase$path'));
    if (res.statusCode >= 200 && res.statusCode < 300) {
      return jsonDecode(res.body);
    }
    throw Exception('API Error ${res.statusCode}: ${res.body}');
  }

  static Future<dynamic> _post(String path, Map<String, dynamic> body) async {
    final res = await http.post(
      Uri.parse('$_apiBase$path'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(body),
    );
    if (res.statusCode >= 200 && res.statusCode < 300) {
      return jsonDecode(res.body);
    }
    throw Exception('API Error ${res.statusCode}: ${res.body}');
  }

  static Future<dynamic> _patch(String path, Map<String, dynamic> body) async {
    final res = await http.patch(
      Uri.parse('$_apiBase$path'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(body),
    );
    if (res.statusCode >= 200 && res.statusCode < 300) {
      return jsonDecode(res.body);
    }
    throw Exception('API Error ${res.statusCode}: ${res.body}');
  }

  // ── Patients ───────────────────────────────────────────────────────────────
  static Future<List<Patient>> getPatients({String? search}) async {
    final q = search != null && search.isNotEmpty ? '?search=${Uri.encodeComponent(search)}' : '';
    final data = await _get('/patients$q') as List<dynamic>;
    return data.map((e) => Patient.fromJson(e)).toList();
  }

  static Future<Patient> getPatient(String idOrCode) async {
    final data = await _get('/patients/${Uri.encodeComponent(idOrCode)}');
    return Patient.fromJson(data);
  }

  static Future<Patient> createPatient(Map<String, dynamic> patientData) async {
    final data = await _post('/patients', patientData);
    return Patient.fromJson(data);
  }

  // ── Consultations ──────────────────────────────────────────────────────────
  static Future<List<ConsultationNote>> getConsultations({String? patientCode}) async {
    final q = patientCode != null && patientCode.isNotEmpty
        ? '?patientCode=${Uri.encodeComponent(patientCode)}'
        : '';
    final data = await _get('/consultations$q') as List<dynamic>;
    return data.map((e) => ConsultationNote.fromJson(e)).toList();
  }

  static Future<ConsultationNote> createConsultation(Map<String, dynamic> noteData) async {
    final data = await _post('/consultations', noteData);
    return ConsultationNote.fromJson(data);
  }

  // ── Lab Reports ────────────────────────────────────────────────────────────
  static Future<List<LabReport>> getLabReports({String? patientCode}) async {
    final q = patientCode != null && patientCode.isNotEmpty
        ? '?patientCode=${Uri.encodeComponent(patientCode)}'
        : '';
    final data = await _get('/lab-reports$q') as List<dynamic>;
    return data.map((e) => LabReport.fromJson(e)).toList();
  }

  static Future<LabReport> createLabReport(Map<String, dynamic> reportData) async {
    final data = await _post('/lab-reports', reportData);
    return LabReport.fromJson(data);
  }

  static Future<LabReport> updateLabReportStatus(
      String id, String status, {String resultsSummary = ''}) async {
    final data = await _patch('/lab-reports/$id/status',
        {'status': status, 'resultsSummary': resultsSummary});
    return LabReport.fromJson(data);
  }

  // ── Prescriptions ──────────────────────────────────────────────────────────
  static Future<List<Prescription>> getPrescriptions({String? patientCode}) async {
    final q = patientCode != null && patientCode.isNotEmpty
        ? '?patientCode=${Uri.encodeComponent(patientCode)}'
        : '';
    final data = await _get('/prescriptions$q') as List<dynamic>;
    return data.map((e) => Prescription.fromJson(e)).toList();
  }

  static Future<Prescription> createPrescription(Map<String, dynamic> rxData) async {
    final data = await _post('/prescriptions', rxData);
    return Prescription.fromJson(data);
  }

  static Future<Prescription> updatePrescriptionStatus(String id, String status) async {
    final data = await _patch('/prescriptions/$id/status', {'status': status});
    return Prescription.fromJson(data);
  }

  // ── Clinical Summary (Business-Specific Operation) ─────────────────────────
  static Future<ClinicalSummary> getClinicalSummary(String patientCodeOrId) async {
    final data = await _get('/patients/${Uri.encodeComponent(patientCodeOrId)}/clinical-summary');
    return ClinicalSummary.fromJson(data);
  }
}
