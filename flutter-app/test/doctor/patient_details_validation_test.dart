import 'package:flutter_test/flutter_test.dart';

void main() {
  group('Patient Details Form Validation Tests', () {
    test('Patient Name validation requires non-empty string with at least 2 chars', () {
      String? validateName(String? val) {
        final trimmed = val?.trim() ?? '';
        if (trimmed.isEmpty) return 'Full Name is required';
        if (trimmed.length < 2) return 'Please enter at least 2 characters';
        return null;
      }

      expect(validateName(''), equals('Full Name is required'));
      expect(validateName('   '), equals('Full Name is required'));
      expect(validateName('A'), equals('Please enter at least 2 characters'));
      expect(validateName('Kamal Perera'), isNull);
    });

    test('Patient NIC validation supports Old 9-digit+letter and New 12-digit formats', () {
      String? validateNic(String? val) {
        final trimmed = val?.trim() ?? '';
        if (trimmed.isEmpty) return 'NIC / Passport number is required';
        final nicRegex = RegExp(r'^([0-9]{9}[vVxX]|[0-9]{12}|[A-Za-z0-9]{7,10})$');
        if (!nicRegex.hasMatch(trimmed)) {
          return 'Invalid format (e.g. 199512345678 or 987654321V)';
        }
        return null;
      }

      expect(validateNic(''), equals('NIC / Passport number is required'));
      expect(validateNic('12345'), equals('Invalid format (e.g. 199512345678 or 987654321V)'));
      expect(validateNic('987654321V'), isNull);      // Old NIC valid
      expect(validateNic('987654321X'), isNull);      // Old NIC with X valid
      expect(validateNic('199512345678'), isNull);    // New 12-digit NIC valid
      expect(validateNic('N1234567'), isNull);        // Passport number valid
    });

    test('Patient Phone validation accepts local and international formats', () {
      String? validatePhone(String? val) {
        final trimmed = val?.trim() ?? '';
        if (trimmed.isEmpty) return 'Phone number is required';
        final cleanPhone = trimmed.replaceAll(RegExp(r'[\s\-]'), '');
        final phoneRegex = RegExp(r'^(?:\+94|0)?7[0-9]{8}$');
        if (!phoneRegex.hasMatch(cleanPhone)) {
          return 'Enter a valid Sri Lankan phone number (e.g. +94 77 123 4567)';
        }
        return null;
      }

      expect(validatePhone(''), equals('Phone number is required'));
      expect(validatePhone('12345'), contains('Enter a valid Sri Lankan phone number'));
      expect(validatePhone('0771234567'), isNull);
      expect(validatePhone('+94 77 123 4567'), isNull);
      expect(validatePhone('071-9876543'), isNull);
    });

    test('Patient Email validation checks format or allows optional blank', () {
      String? validateEmail(String? val) {
        final trimmed = val?.trim() ?? '';
        if (trimmed.isEmpty) return null; // Email is optional for counter reservation
        final emailRegex = RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$');
        if (!emailRegex.hasMatch(trimmed)) {
          return 'Enter a valid email address';
        }
        return null;
      }

      expect(validateEmail(''), isNull);
      expect(validateEmail('invalid-email'), equals('Enter a valid email address'));
      expect(validateEmail('patient@example.com'), isNull);
    });
  });
}
