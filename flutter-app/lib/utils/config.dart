import 'package:http/http.dart' as http;

class ApiConfig {
  /// Remote Production Backend Host (e.g. Railway URL)
  /// Can be supplied at build time:
  ///   flutter build apk --dart-define=BACKEND_URL=https://your-backend.up.railway.app
  /// Or assigned directly below:
  static const String _dartDefinedBackendUrl = String.fromEnvironment('BACKEND_URL', defaultValue: '');

  /// Optional manual remote host override (e.g. 'https://your-backend.up.railway.app')
  static String manualRemoteHost = '';

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

  static String _activeHost = productionHost.isNotEmpty
      ? productionHost
      : 'http://192.168.1.8:5126';

  static List<String> get candidateHosts {
    final list = <String>[];
    if (productionHost.isNotEmpty) {
      list.add(productionHost);
    }
    // Existing local candidate hosts preserved:
    list.addAll([
      'http://192.168.1.8:5126',   // ADB reverse port forwarding (USB connected physical device)
      'http://10.35.16.140:5126', // LAN IPv4 address of PC
      'http://10.0.2.2:5126',     // Android Emulator default loopback
      'http://localhost:5126',    // Web / Direct local
    ]);
    return list;
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
