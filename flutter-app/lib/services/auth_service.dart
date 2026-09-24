import 'package:shared_preferences/shared_preferences.dart';

/// Stores/retrieves the logged-in user's JWT token and profile info
class AuthService {
  static const _keyToken = 'auth_token';
  static const _keyUserId = 'auth_userId';
  static const _keyName = 'auth_name';
  static const _keyEmail = 'auth_email';
  static const _keyRole = 'auth_role';
  static const _keyPicture = 'auth_picture';

  // In-memory fallback storage if native SharedPreferences channel fails
  static final Map<String, String> _memStorage = {};

  static Future<SharedPreferences?> _getPrefs() async {
    try {
      final Future<SharedPreferences?> prefsFuture = SharedPreferences.getInstance();
      return await prefsFuture.timeout(
        const Duration(milliseconds: 500),
      );
    } catch (_) {
      return null;
    }
  }

  /// Save user after login/register
  static Future<void> saveUser(AuthUser user) async {
    _memStorage[_keyToken] = user.token;
    _memStorage[_keyUserId] = user.userId;
    _memStorage[_keyName] = user.name;
    _memStorage[_keyEmail] = user.email;
    _memStorage[_keyRole] = user.role;
    if (user.profilePicture != null) {
      _memStorage[_keyPicture] = user.profilePicture!;
    }

    try {
      final prefs = await _getPrefs();
      if (prefs != null) {
        await prefs.setString(_keyToken, user.token);
        await prefs.setString(_keyUserId, user.userId);
        await prefs.setString(_keyName, user.name);
        await prefs.setString(_keyEmail, user.email);
        await prefs.setString(_keyRole, user.role);
        if (user.profilePicture != null) {
          await prefs.setString(_keyPicture, user.profilePicture!);
        }
      }
    } on Object catch (_) {
      // Safe fallback to _memStorage
    }
  }

  /// Load saved user from storage
  static Future<AuthUser?> getUser() async {
    String? token = _memStorage[_keyToken];
    String userId = _memStorage[_keyUserId] ?? '';
    String name = _memStorage[_keyName] ?? '';
    String email = _memStorage[_keyEmail] ?? '';
    String role = _memStorage[_keyRole] ?? 'Patient';
    String? picture = _memStorage[_keyPicture];

    try {
      final prefs = await _getPrefs();
      if (prefs != null) {
        token ??= prefs.getString(_keyToken);
        if (userId.isEmpty) userId = prefs.getString(_keyUserId) ?? '';
        if (name.isEmpty) name = prefs.getString(_keyName) ?? '';
        if (email.isEmpty) email = prefs.getString(_keyEmail) ?? '';
        if (role == 'Patient') role = prefs.getString(_keyRole) ?? 'Patient';
        picture ??= prefs.getString(_keyPicture);
      }
    } catch (_) {}

    if (token == null || token.isEmpty) return null;
    return AuthUser(
      token: token,
      userId: userId,
      name: name,
      email: email,
      role: role,
      profilePicture: picture,
    );
  }

  /// Get the JWT token for API calls
  static Future<String?> getToken() async {
    if (_memStorage.containsKey(_keyToken) && _memStorage[_keyToken]!.isNotEmpty) {
      return _memStorage[_keyToken];
    }
    try {
      final prefs = await _getPrefs();
      return prefs?.getString(_keyToken);
    } catch (_) {
      return null;
    }
  }

  /// Log out — clears all stored data
  static Future<void> logout() async {
    _memStorage.clear();
    try {
      final prefs = await _getPrefs();
      if (prefs != null) {
        await prefs.remove(_keyToken);
        await prefs.remove(_keyUserId);
        await prefs.remove(_keyName);
        await prefs.remove(_keyEmail);
        await prefs.remove(_keyRole);
        await prefs.remove(_keyPicture);
      }
    } catch (_) {}
  }

  /// Returns true if a user is logged in
  static Future<bool> isLoggedIn() async {
    final token = await getToken();
    return token != null && token.isNotEmpty;
  }
}

class AuthUser {
  final String token;
  final String userId;
  final String name;
  final String email;
  final String role;
  final String? profilePicture;

  AuthUser({
    required this.token,
    required this.userId,
    required this.name,
    required this.email,
    required this.role,
    this.profilePicture,
  });

  factory AuthUser.fromJson(Map<String, dynamic> j) {
    final userObj = j['user'] is Map<String, dynamic> ? j['user'] as Map<String, dynamic> : null;

    // Role can be int enum (0=Patient,1=Pharmacist,2=Admin,3=Doctor,4=Staff) or string
    String parseRole(dynamic raw) {
      if (raw == null) return 'Patient';
      if (raw is String && raw.isNotEmpty) return raw;
      final n = raw is int ? raw : int.tryParse(raw.toString());
      switch (n) {
        case 0: return 'Patient';
        case 1: return 'Pharmacist';
        case 2: return 'Admin';
        case 3: return 'Doctor';
        default: return 'Patient';
      }
    }

    return AuthUser(
      // Backend LoginResponse has top-level computed props: Token, UserId, Name, Email, Role
      token: j['token']?.toString() ?? j['Token']?.toString() ?? '',
      userId: j['userId']?.toString() ?? j['UserId']?.toString() ?? userObj?['id']?.toString() ?? j['id']?.toString() ?? '',
      name: j['name']?.toString() ?? j['Name']?.toString() ?? userObj?['fullName']?.toString() ?? userObj?['name']?.toString() ?? j['fullName']?.toString() ?? '',
      email: j['email']?.toString() ?? j['Email']?.toString() ?? userObj?['email']?.toString() ?? '',
      role: parseRole(j['role'] ?? j['Role'] ?? userObj?['role']),
      profilePicture: j['profilePicture']?.toString() ?? userObj?['profilePicture']?.toString(),
    );
  }
}
