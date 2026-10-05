import 'package:flutter_test/flutter_test.dart';
import 'package:lab_patient_app/services/doctor_api_service.dart';

void main() {
  group('Doctor Model and Session Expiration Logic Tests', () {
    test('Doctor.fromJson parses complete backend payload correctly', () {
      final json = {
        'id': 1,
        'fullName': 'Dr. Anjali Perera',
        'specialization': 'Cardiology',
        'qualifications': 'MD, FRCP - Cardiologist',
        'hospital': 'Health Bridge Hospital',
        'hospitalBranch': 'Colombo',
        'roomNumber': 'Suite 201',
        'consultationFee': 2500.0,
        'availableDays': 'Mon, Wed, Fri',
        'availableTime': '08:00 AM - 04:00 PM',
        'rating': 4.9,
        'reviewCount': 142,
        'experienceYears': 15,
        'isVerifiedConsultant': true,
        'phoneNumber': '+94 77 123 4567',
      };

      final doctor = Doctor.fromJson(json);

      expect(doctor.id, equals(1));
      expect(doctor.fullName, equals('Dr. Anjali Perera'));
      expect(doctor.specialization, equals('Cardiology'));
      expect(doctor.consultationFee, equals(2500.0));
      expect(doctor.isVerifiedConsultant, isTrue);
      expect(doctor.phoneNumber, equals('+94 77 123 4567'));
    });

    test('DoctorSession.fromJson parses session slot status and capacity', () {
      final json = {
        'id': 101,
        'doctorId': 1,
        'doctorName': 'Dr. Anjali Perera',
        'sessionDate': '2026-10-10',
        'sessionTime': '08:30:00',
        'sessionType': 'Morning',
        'timeFormatted': '08:30 AM',
        'maxCapacity': 25,
        'currentBookings': 12,
        'isAvailable': true,
        'slotsLeft': 13,
        'sessionStatus': 'Scheduled',
        'isExpired': false,
        'roomNumber': 'Suite 201',
        'hospitalBranch': 'Colombo',
      };

      final session = DoctorSession.fromJson(json);

      expect(session.id, equals(101));
      expect(session.doctorId, equals(1));
      expect(session.doctorName, equals('Dr. Anjali Perera'));
      expect(session.sessionDate, equals('2026-10-10'));
      expect(session.sessionType, equals('Morning'));
      expect(session.maxCapacity, equals(25));
      expect(session.currentBookings, equals(12));
      expect(session.slotsLeft, equals(13));
      expect(session.isExpired, isFalse);
    });

    test('Session expiration detector correctly flags past dates and expired statuses', () {
      bool isSessionExpired(DoctorSession sess) {
        if (sess.isExpired) return true;
        if (sess.sessionStatus.toLowerCase() == 'expired') return true;

        try {
          final now = DateTime.now();
          final today = DateTime(now.year, now.month, now.day);
          final parts = sess.sessionDate.split('-');
          if (parts.length == 3) {
            final sessDate = DateTime(int.parse(parts[0]), int.parse(parts[1]), int.parse(parts[2]));
            if (sessDate.isBefore(today)) return true;
          }
        } catch (_) {}
        return false;
      }

      final pastSession = DoctorSession(
        id: 1,
        doctorId: 1,
        doctorName: 'Dr. Anjali Perera',
        sessionDate: '2020-01-01',
        sessionTime: '08:00',
        sessionType: 'Morning',
        timeFormatted: '08:00 AM',
        timeRange: '08:00 - 12:00',
        maxCapacity: 20,
        currentBookings: 5,
        isAvailable: false,
        slotsLeft: 0,
        sessionStatus: 'Scheduled',
        isExpired: false,
      );

      final expiredStatusSession = DoctorSession(
        id: 2,
        doctorId: 1,
        doctorName: 'Dr. Anjali Perera',
        sessionDate: '2030-01-01',
        sessionTime: '08:00',
        sessionType: 'Morning',
        timeFormatted: '08:00 AM',
        timeRange: '08:00 - 12:00',
        maxCapacity: 20,
        currentBookings: 5,
        isAvailable: false,
        slotsLeft: 0,
        sessionStatus: 'Expired',
        isExpired: true,
      );

      final futureValidSession = DoctorSession(
        id: 3,
        doctorId: 1,
        doctorName: 'Dr. Anjali Perera',
        sessionDate: '2030-01-01',
        sessionTime: '08:00',
        sessionType: 'Morning',
        timeFormatted: '08:00 AM',
        timeRange: '08:00 - 12:00',
        maxCapacity: 20,
        currentBookings: 5,
        isAvailable: true,
        slotsLeft: 15,
        sessionStatus: 'Scheduled',
        isExpired: false,
      );

      expect(isSessionExpired(pastSession), isTrue);
      expect(isSessionExpired(expiredStatusSession), isTrue);
      expect(isSessionExpired(futureValidSession), isFalse);
    });
  });
}
