import 'package:shared_preferences/shared_preferences.dart';

/// Stores/retrieves the logged-in user's JWT token and profile info
class AuthService {
  static const _keyToken = 'auth_token';
  static const _keyUserId = 'auth_userId';
  static const _keyName = 'auth_name';
  static const _keyEmail = 'auth_email';
  static const _keyRole = 'auth_role';
  static const _keyPicture = 'auth_picture';

  /// Save user after login/register
  static Future<void> saveUser(AuthUser user) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_keyToken, user.token);
    await prefs.setString(_keyUserId, user.userId);
    await prefs.setString(_keyName, user.name);
    await prefs.setString(_keyEmail, user.email);
    await prefs.setString(_keyRole, user.role);
    if (user.profilePicture != null) {
      await prefs.setString(_keyPicture, user.profilePicture!);
    }
  }

  /// Load saved user from storage
  static Future<AuthUser?> getUser() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString(_keyToken);
    if (token == null) return null;
    return AuthUser(
      token: token,
      userId: prefs.getString(_keyUserId) ?? '',
      name: prefs.getString(_keyName) ?? '',
      email: prefs.getString(_keyEmail) ?? '',
      role: prefs.getString(_keyRole) ?? 'Patient',
      profilePicture: prefs.getString(_keyPicture),
    );
  }

  /// Get the JWT token for API calls
  static Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_keyToken);
  }

  /// Log out — clears all stored data
  static Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_keyToken);
    await prefs.remove(_keyUserId);
    await prefs.remove(_keyName);
    await prefs.remove(_keyEmail);
    await prefs.remove(_keyRole);
    await prefs.remove(_keyPicture);
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
