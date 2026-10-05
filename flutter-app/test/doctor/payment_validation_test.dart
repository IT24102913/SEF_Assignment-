import 'package:flutter_test/flutter_test.dart';
import 'package:flutter/services.dart';
import 'package:lab_patient_app/screens/doctor/payment_confirmation_screen.dart';

void main() {
  group('Payment Validation & Formatter Tests', () {
    test('CardNumberFormatter formats digits with space every 4 characters', () {
      final formatter = CardNumberFormatter();
      const oldValue = TextEditingValue.empty;
      const newValue = TextEditingValue(text: '1234567812345678');

      final formatted = formatter.formatEditUpdate(oldValue, newValue);

      expect(formatted.text, equals('1234 5678 1234 5678'));
    });

    test('CardNumberFormatter strips non-digit characters', () {
      final formatter = CardNumberFormatter();
      const oldValue = TextEditingValue.empty;
      const newValue = TextEditingValue(text: '1234-abcd-5678');

      final formatted = formatter.formatEditUpdate(oldValue, newValue);

      expect(formatted.text, equals('1234 5678'));
    });

    test('CardExpiryFormatter formats MMYY into MM/YY', () {
      final formatter = CardExpiryFormatter();
      const oldValue = TextEditingValue.empty;
      const newValue = TextEditingValue(text: '1228');

      final formatted = formatter.formatEditUpdate(oldValue, newValue);

      expect(formatted.text, equals('12/28'));
    });

    test('CardExpiryFormatter limits input to 4 digits', () {
      final formatter = CardExpiryFormatter();
      const oldValue = TextEditingValue.empty;
      const newValue = TextEditingValue(text: '12289999');

      final formatted = formatter.formatEditUpdate(oldValue, newValue);

      expect(formatted.text, equals('12/28'));
    });

    test('Card number validation requires 15 or 16 digits', () {
      String? validateCard(String? val) {
        final digits = (val ?? '').replaceAll(RegExp(r'\D'), '');
        if (digits.isEmpty) return 'Card number is required';
        if (digits.length < 15 || digits.length > 16) {
          return 'Enter a valid 15 or 16 digit card number';
        }
        return null;
      }

      expect(validateCard(''), equals('Card number is required'));
      expect(validateCard('1234 5678'), equals('Enter a valid 15 or 16 digit card number'));
      expect(validateCard('1234 5678 1234 5678'), isNull); // 16 digits valid
      expect(validateCard('3782 822463 10005'), isNull);   // 15 digits Amex valid
    });

    test('CVV validation requires 3 or 4 digits', () {
      String? validateCvv(String? val) {
        final trimmed = (val ?? '').trim();
        if (trimmed.isEmpty) return 'CVV is required';
        if (!RegExp(r'^[0-9]{3,4}$').hasMatch(trimmed)) {
          return 'CVV must be 3 or 4 digits';
        }
        return null;
      }

      expect(validateCvv(''), equals('CVV is required'));
      expect(validateCvv('12'), equals('CVV must be 3 or 4 digits'));
      expect(validateCvv('abc'), equals('CVV must be 3 or 4 digits'));
      expect(validateCvv('123'), isNull);
      expect(validateCvv('1234'), isNull);
    });

    test('Card expiry validation rejects past years and invalid months', () {
      String? validateExpiry(String? val) {
        final trimmed = (val ?? '').trim();
        if (trimmed.isEmpty) return 'Expiry required';
        final parts = trimmed.split('/');
        if (parts.length != 2) return 'Invalid MM/YY format';
        final month = int.tryParse(parts[0]);
        final year = int.tryParse(parts[1]);
        if (month == null || year == null || month < 1 || month > 12) {
          return 'Invalid month (01-12)';
        }
        final now = DateTime.now();
        final currentYearShort = now.year % 100;
        final currentMonth = now.month;
        if (year < currentYearShort || (year == currentYearShort && month < currentMonth)) {
          return 'Card has expired';
        }
        return null;
      }

      expect(validateExpiry('13/28'), equals('Invalid month (01-12)'));
      expect(validateExpiry('00/28'), equals('Invalid month (01-12)'));
      expect(validateExpiry('01/20'), equals('Card has expired'));
      expect(validateExpiry('12/30'), isNull); // Future valid
    });
  });
}
