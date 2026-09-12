import 'dart:convert';
import 'dart:io' show Platform;
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

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

  /// Automatically resolves base URL depending on platform
  static String get baseUrl {
    if (_customHost != null && _customHost!.isNotEmpty) {
      return 'http://$_customHost:5238/api/emr';
    }
    if (!kIsWeb && Platform.isAndroid) {
      return 'http://10.0.2.2:5238/api/emr';
    }
    return 'http://localhost:5238/api/emr';
  }

  // ── Active Patient State ───────────────────────────────────────────────────
  static String activePatientCode = 'PAT-1001';
  static String activePatientName = 'John Anderson';

  static void setActivePatient(String code, String name) {
    activePatientCode = code;
    activePatientName = name;
  }

  // ── Network Helper ─────────────────────────────────────────────────────────
  static Future<dynamic> _get(String path) async {
    final uri = Uri.parse('$baseUrl$path');
    final res = await http.get(uri).timeout(const Duration(seconds: 8));
    if (res.statusCode >= 200 && res.statusCode < 300) {
      return jsonDecode(res.body);
    }
    throw Exception('API ${res.statusCode}: ${res.body}');
  }

  // ── Patients ───────────────────────────────────────────────────────────────
  static Future<List<Patient>> getPatients({String? search}) async {
    try {
      final q = search != null && search.isNotEmpty ? '?search=${Uri.encodeComponent(search)}' : '';
      final data = await _get('/patients$q') as List<dynamic>;
      return data.map((e) => Patient.fromJson(e)).toList();
    } catch (_) {
      // Fallback
      return [
        Patient(
          id: 'a1111111-1111-1111-1111-111111111111',
          patientCode: 'PAT-1001',
          fullName: 'John Anderson',
          age: 41,
          gender: 'Male',
          bloodGroup: 'O+',
          contactPhone: '+1 555-0192',
          email: 'john.anderson@example.com',
          address: '742 Evergreen Terrace',
          allergies: 'Penicillin, Peanuts',
          chronicConditions: 'Stage 1 Hypertension, Mild Asthma',
          emergencyContactName: 'Mary Anderson',
          emergencyContactPhone: '+1 555-0193',
        ),
        Patient(
          id: 'a2222222-2222-2222-2222-222222222222',
          patientCode: 'PAT-1002',
          fullName: 'Maria Garcia',
          age: 34,
          gender: 'Female',
          bloodGroup: 'A+',
          contactPhone: '+1 555-0284',
          email: 'maria.garcia@example.com',
          address: '120 Elm Street',
          allergies: 'Sulfa antibiotics',
          chronicConditions: 'Type 2 Diabetes Mellitus',
          emergencyContactName: 'Carlos Garcia',
          emergencyContactPhone: '+1 555-0285',
        ),
      ];
    }
  }

  static Future<Patient> getPatient(String idOrCode) async {
    final data = await _get('/patients/${Uri.encodeComponent(idOrCode)}');
    return Patient.fromJson(data);
  }

  // ── Consultations ──────────────────────────────────────────────────────────
  static Future<List<ConsultationNote>> getConsultations({String? patientCode}) async {
    final code = patientCode ?? activePatientCode;
    final q = '?patientCode=${Uri.encodeComponent(code)}';
    final data = await _get('/consultations$q') as List<dynamic>;
    return data.map((e) => ConsultationNote.fromJson(e)).toList();
  }

  // ── Lab Reports ────────────────────────────────────────────────────────────
  static Future<List<LabReport>> getLabReports({String? patientCode}) async {
    final code = patientCode ?? activePatientCode;
    final q = '?patientCode=${Uri.encodeComponent(code)}';
    final data = await _get('/lab-reports$q') as List<dynamic>;
    return data.map((e) => LabReport.fromJson(e)).toList();
  }

  // ── Prescriptions ──────────────────────────────────────────────────────────
  static Future<List<Prescription>> getPrescriptions({String? patientCode}) async {
    final code = patientCode ?? activePatientCode;
    final q = '?patientCode=${Uri.encodeComponent(code)}';
    final data = await _get('/prescriptions$q') as List<dynamic>;
    return data.map((e) => Prescription.fromJson(e)).toList();
  }

  // ── Clinical Summary (Business-Specific Operation) ─────────────────────────
  static Future<ClinicalSummary> getClinicalSummary(String patientCodeOrId) async {
    final data = await _get('/patients/${Uri.encodeComponent(patientCodeOrId)}/clinical-summary');
    return ClinicalSummary.fromJson(data);
  }

  // ── Patient Profile Update ────────────────────────────────────────────────
  static Future<Patient> updatePatientProfile(String patientCode, Map<String, dynamic> body) async {
    final uri = Uri.parse('$baseUrl/patients/code/${Uri.encodeComponent(patientCode)}');
    final res = await http.put(
      uri,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(body),
    ).timeout(const Duration(seconds: 10));

    if (res.statusCode >= 200 && res.statusCode < 300) {
      return Patient.fromJson(jsonDecode(res.body));
    }
    throw Exception('Failed to update patient profile: ${res.statusCode} ${res.body}');
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
