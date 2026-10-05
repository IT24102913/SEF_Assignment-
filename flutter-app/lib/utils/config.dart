import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

class ApiConfig {
  /// Remote Production Backend Host (e.g. Railway URL)
  /// Can be supplied at build time:
  ///   flutter build apk --dart-define=BACKEND_URL=https://sefassignment-production.up.railway.app
  /// Or defaults to manualRemoteHost below:
  static const String _dartDefinedBackendUrl = String.fromEnvironment('BACKEND_URL', defaultValue: '');

  /// Set to true so the mobile/web app connects to the running local backend and database
  static const bool _useLocalInDebug = true;

  /// Automatically safe for Git and CI/CD:
  /// - Release APK builds (GitHub Actions / production) use Railway hosted backend unless defined.
  /// - Debug mode or Web uses local backend by default.
  static bool get useLocalBackend {
    if (kIsWeb) return true;
    if (kReleaseMode && _dartDefinedBackendUrl.isNotEmpty) {
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
  /// - 'http://localhost:5126'   -> Web or local Windows desktop
  /// - 'http://10.0.2.2:5126'    -> Android Emulator
  /// - 'http://192.168.91.48:5126' -> Physical Android phone on the same Wi-Fi
  static String get localHost {
    if (kIsWeb) return 'http://localhost:5126';
    return 'http://10.183.84.217:5126';
  }

  static String _activeHost = kIsWeb ? 'http://localhost:5126' : 'http://10.183.84.217:5126';

  static String get activeHost => _activeHost;

  static List<String> get candidateHosts {
    return [
      'http://10.183.84.217:5126',
      'http://localhost:5126',
      'http://192.168.1.6:5126',
      'http://127.0.0.1:5126',
      'http://10.0.2.2:5126',
      productionHost,
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
        final res = await http.get(Uri.parse('$host/api/doctors')).timeout(const Duration(seconds: 3));
        if (res.statusCode == 200) {
          _activeHost = host;
          return '$host/api';
        }
      } catch (_) {}
    }
    _activeHost = kIsWeb ? 'http://localhost:5126' : 'http://10.183.84.217:5126';
    return '$_activeHost/api';
  }
}
