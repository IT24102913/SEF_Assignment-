import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

class ApiConfig {
  /// Remote Production Backend Host (Railway URL)
  /// Can be supplied at build time:
  ///   flutter build apk --dart-define=BACKEND_URL=https://sefassignment-production.up.railway.app
  /// Or defaults to manualRemoteHost below:
  static const String _dartDefinedBackendUrl = String.fromEnvironment('BACKEND_URL', defaultValue: '');

  /// Set to true only for local debugging (via flutter run with local backend)
  static const bool _useLocalInDebug = false;

  /// Automatically safe for Git and CI/CD:
  /// - Release APK builds (GitHub Actions / downloaded release) ALWAYS connect to live Railway backend.
  /// - Web builds use relative or local by default.
  /// - Debug mode connects locally only if _useLocalInDebug is explicitly true.
  static bool get useLocalBackend {
    if (kIsWeb) return true;
    if (kReleaseMode) return false;
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

  static String get localHost => 'http://localhost:5126';

  // In release mode or default configuration, activeHost defaults to live Railway production!
  static String _activeHost = (kReleaseMode || !useLocalBackend)
      ? 'https://sefassignment-production.up.railway.app'
      : 'http://localhost:5126';

  static String get activeHost => _activeHost;

  static List<String> get candidateHosts {
    if (kReleaseMode || !useLocalBackend) {
      return [
        productionHost,
        'http://localhost:5126',
        'http://10.0.2.2:5126',
      ];
    }
    return [
      'http://localhost:5126',
      'http://10.0.2.2:5126',
      'http://127.0.0.1:5126',
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
        final res = await http.get(Uri.parse('$host/api/Medicines')).timeout(const Duration(seconds: 4));
        if (res.statusCode == 200) {
          _activeHost = host;
          return '$host/api';
        }
      } catch (_) {}
    }
    _activeHost = (kReleaseMode || !useLocalBackend)
        ? productionHost
        : (kIsWeb ? 'http://localhost:5126' : 'http://10.0.2.2:5126');
    return '$_activeHost/api';
  }
}
