import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

class ApiConfig {
  /// Remote Production Backend Host (e.g. Railway URL)
  /// Can be supplied at build time:
  ///   flutter build apk --dart-define=BACKEND_URL=https://sefassignment-production.up.railway.app
  /// Or defaults to manualRemoteHost below:
  static const String _dartDefinedBackendUrl = String.fromEnvironment('BACKEND_URL', defaultValue: '');

  /// Set to false if you want to test against Railway while debugging locally
  static const bool _useLocalInDebug = true;

  /// Automatically safe for Git and CI/CD:
  /// - Release APK builds (GitHub Actions / production) ALWAYS use Railway hosted backend.
  /// - Debug mode (flutter run on your PC) uses local backend unless _useLocalInDebug is set to false.
  static bool get useLocalBackend {
    if (kReleaseMode || _dartDefinedBackendUrl.isNotEmpty) {
      return false;
    }
    return _useLocalInDebug;
  }

  /// Configured Railway production backend host
  static String manualRemoteHost = 'https://sefassignment-production.up.railway.app';

  static String get productionHost {
    final raw = _dartDefinedBackendUrl.isNotEmpty ? _dartDefinedBackendUrl : manualRemoteHost;
    return _cleanUrl(raw);
  }

  static String _cleanUrl(String url) {
    var cleaned = url.trim();
    if (cleaned.endsWith('/')) {
      cleaned = cleaned.substring(0, cleaned.length - 1);
    }
    if (cleaned.endsWith('/api')) {
      cleaned = cleaned.substring(0, cleaned.length - 4);
    }
    return cleaned;
  }

  /// Preferred local host:
  /// - 'http://192.168.1.6:5126' -> Physical Android phone on the same Wi-Fi
  /// - 'http://10.0.2.2:5126'     -> Android Emulator
  /// - 'http://localhost:5126'    -> Web, Windows, or Phone with `adb reverse tcp:5126 tcp:5126`
  static String localHost = 'http://192.168.1.6:5126';

  static String _activeHost = useLocalBackend ? localHost : productionHost;

  static List<String> get candidateHosts {
    if (!useLocalBackend) {
      return [productionHost];
    }
    return [
      localHost,
      'http://192.168.1.6:5126',   // Current Wi-Fi IPv4 address of PC
      'http://10.0.2.2:5126',     // Android Emulator default loopback
      'http://localhost:5126',    // Web / Direct local
      productionHost,             // Hosted fallback
    ];
  }

  static String get baseUrl => '$_activeHost/api';
  static String get authUrl => '$baseUrl/auth';
  static String get labUrl => '$baseUrl/lab';
  static String get paymentsUrl => '$baseUrl/payments';
  static String get emrUrl => '$baseUrl/emr';
  static String get doctorsUrl => '$baseUrl/doctors';
  static String get appointmentsUrl => '$baseUrl/doctorappointments';

  /// Probe and set the fastest working backend host URL
  static Future<String> getWorkingBaseUrl() async {
    for (final host in candidateHosts) {
      try {
        final res = await http.get(Uri.parse('$host/api/Medicines')).timeout(const Duration(seconds: 2));
        if (res.statusCode == 200) {
          _activeHost = host;
          return '$host/api';
        }
      } catch (_) {}
    }
    return baseUrl;
  }
}
