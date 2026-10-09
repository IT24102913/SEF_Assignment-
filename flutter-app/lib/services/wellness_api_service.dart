import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/wellness_response.dart';
import '../utils/config.dart';
import 'auth_service.dart';

/// Service for the Wellness AI chat feature.
/// Connects to the SAME backend the React web app uses.
/// Patient email determines history sync between web and mobile.
class WellnessApiService {
  static const Duration _timeout = Duration(seconds: 60);

  /// Send a symptom to the AI and get structured advice.
  /// If clarifyingAnswers is provided, resubmit with the
  /// user's answers to the follow-up questions.
  static Future<WellnessAdvice> getAdvice({
    required String symptom,
    Map<String, String>? clarifyingAnswers,
  }) async {
    final user = await AuthService.getUser();
    final email = user?.email ?? '';

    final baseUrl = await ApiConfig.getWorkingBaseUrl();

    final payload = <String, dynamic>{
      'symptom': symptom,
      'patientEmail': email,
    };

    if (clarifyingAnswers != null && clarifyingAnswers.isNotEmpty) {
      payload['clarifyingAnswers'] = clarifyingAnswers;
    }

    final response = await http
        .post(
          Uri.parse('$baseUrl/pharmacy/symptom/advice'),
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode(payload),
        )
        .timeout(_timeout);

    if (response.statusCode != 200) {
      throw Exception(
          'AI service error (${response.statusCode}). Please try again.');
    }

    final json = jsonDecode(response.body) as Map<String, dynamic>;
    return WellnessAdvice.fromJson(json);
  }

  /// Get past Wellness AI queries for the current patient.
  /// Syncs with the React web app (same patient email, same backend).
  static Future<List<WellnessHistoryItem>> getHistory({
    int limit = 30,
  }) async {
    final user = await AuthService.getUser();
    final email = user?.email ?? '';

    final baseUrl = await ApiConfig.getWorkingBaseUrl();

    final uri = Uri.parse(
      '$baseUrl/pharmacy/symptom/history'
      '?patientEmail=${Uri.encodeComponent(email)}&limit=$limit',
    );

    final response = await http.get(uri).timeout(_timeout);

    if (response.statusCode != 200) {
      return [];
    }

    final list = jsonDecode(response.body) as List;
    return list
        .map((e) =>
            WellnessHistoryItem.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// Delete a single history entry by ID.
  static Future<bool> deleteHistory(int id) async {
    try {
      final baseUrl = await ApiConfig.getWorkingBaseUrl();
      final response = await http
          .delete(
              Uri.parse('$baseUrl/pharmacy/symptom/history/$id'))
          .timeout(_timeout);

      return response.statusCode == 204 || response.statusCode == 200;
    } catch (_) {
      return false;
    }
  }
}
