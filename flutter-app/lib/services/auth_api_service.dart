import 'dart:convert';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/services.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:http/http.dart' as http;
import 'auth_service.dart';
import '../utils/config.dart';

// Your Google Web Client ID from Google Cloud Console
const String _googleWebClientId = '759562655348-7ebotj1htbvmls68lrmle79n58l0qdd2.apps.googleusercontent.com';

final _googleSignIn = GoogleSignIn(
  clientId: kIsWeb ? _googleWebClientId : null,
  serverClientId: _googleWebClientId,
  scopes: ['email', 'profile'],
);

class AuthApiService {
  // ─── Email/Password Login ─────────────────────────────────────────────────
  static Future<AuthUser> login(String email, String password) async {
    Object? lastException;
    for (final host in ApiConfig.candidateHosts) {
      try {
        final response = await http.post(
          Uri.parse('$host/api/auth/login'),
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode({'email': email, 'password': password}),
        ).timeout(const Duration(seconds: 4));

        if (response.statusCode == 200) {
          return AuthUser.fromJson(jsonDecode(response.body));
        } else {
          // Got a real response from backend (4xx/5xx) — stop retrying other hosts
          dynamic body;
          try { body = jsonDecode(response.body); } catch (_) {}
          final msg = (body is Map ? (body['message'] ?? body['title']) : null)
              ?? 'Invalid email or password.';
          throw Exception(msg.toString());
        }
      } catch (e) {
        lastException = e;
        final msg = e.toString();
        // If this is a real server error (not a connection/timeout) stop retrying
        if (!msg.contains('TimeoutException') &&
            !msg.contains('SocketException') &&
            !msg.contains('Connection refused') &&
            !msg.contains('Failed host lookup')) {
          rethrow;
        }
      }
    }
    throw Exception(lastException?.toString().replaceAll('Exception: ', '') ?? 'Cannot connect to server. Please check your USB connection (adb reverse must be active).');
  }

  // ─── Register ─────────────────────────────────────────────────────────────
  static Future<AuthUser> register({
    required String name,
    required String email,
    required String password,
    String? phone,
    String? nic,
    String? gender,
  }) async {
    Object? lastException;
    final payload = {
      'fullName': name,
      'email': email,
      'phoneNumber': phone ?? '0770000000',
      'nicNumber': nic ?? '900000000V',
      'gender': gender ?? 'Prefer not to say',
      'password': password,
    };

    for (final host in ApiConfig.candidateHosts) {
      try {
        final response = await http.post(
          Uri.parse('$host/api/auth/register'),
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode(payload),
        ).timeout(const Duration(seconds: 4));

        if (response.statusCode == 200 || response.statusCode == 201) {
          final data = jsonDecode(response.body);
          return AuthUser.fromJson(data);
        } else {
          final body = jsonDecode(response.body);
          final msg = body['message'] ?? 'Registration failed. Please check details.';
          throw Exception(msg);
        }
      } catch (e) {
        lastException = e;
        final msg = e.toString();
        // If real server error, stop retrying hosts
        if (!msg.contains('TimeoutException') &&
            !msg.contains('SocketException') &&
            !msg.contains('Connection refused') &&
            !msg.contains('Failed host lookup')) {
          rethrow;
        }
      }
    }
    throw Exception(lastException?.toString().replaceAll('Exception: ', '') ?? 'Unable to connect to server. Please check your internet connection.');
  }

  // ─── Google Sign-In ───────────────────────────────────────────────────────
  static Future<AuthUser> googleSignIn() async {
    try {
      final googleUser = await _googleSignIn.signIn();
      if (googleUser == null) throw Exception('Google sign-in was cancelled.');

      final googleAuth = await googleUser.authentication;
      final idToken = googleAuth.idToken;
      if (idToken == null) throw Exception('Failed to get Google ID token.');

      for (final host in ApiConfig.candidateHosts) {
        try {
          final response = await http.post(
            Uri.parse('$host/api/auth/google'),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({'idToken': idToken}),
          ).timeout(const Duration(seconds: 5));

          if (response.statusCode == 200) {
            return AuthUser.fromJson(jsonDecode(response.body));
          }
        } catch (_) {}
      }
      throw Exception('Google sign-in server connection failed.');
    } catch (e) {
      if (e.toString().contains('cancelled')) {
        throw Exception('Sign-in was cancelled.');
      }
      if (e is PlatformException) {
        throw Exception('Google Sign-In failed! Error code: ${e.code}');
      }
      rethrow;
    }
  }

  // ─── Sign Out ─────────────────────────────────────────────────────────────
  static Future<void> signOut() async {
    await _googleSignIn.signOut();
    await AuthService.logout();
  }
}

