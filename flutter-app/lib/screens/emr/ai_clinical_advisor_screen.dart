import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import '../../services/emr_api_service.dart';
import '../../utils/config.dart';

// ─── AI Models ────────────────────────────────────────────────────────────────

class AIInsight {
  final String patientCode;
  final String fullName;
  final String overallSummary;
  final String riskLevel;
  final List<String> keyFindings;
  final List<String> recommendations;
  final String labAnalysis;
  final String prescriptionAnalysis;
  final String conditionExplained;
  final String generatedAt;

  // Additional fields from AIClinicalInsightResponse
  final List<String> safetyAlerts;
  final List<String> questionsForNextVisit;
  final String engineUsed;

  AIInsight({
    required this.patientCode,
    required this.fullName,
    required this.overallSummary,
    required this.riskLevel,
    required this.keyFindings,
    required this.recommendations,
    required this.labAnalysis,
    required this.prescriptionAnalysis,
    required this.conditionExplained,
    required this.generatedAt,
    this.safetyAlerts = const [],
    this.questionsForNextVisit = const [],
    this.engineUsed = 'HealthBridge Agentic Clinical AI',
  });

  factory AIInsight.fromJson(Map<String, dynamic> json) {
    // Extract key findings from doctor insights
    final List<String> keyFindings = [];
    final doctorInsights = json['doctorInsights'] as List<dynamic>? ?? [];
    for (final di in doctorInsights) {
      if (di is Map<String, dynamic>) {
        if ((di['keyTakeaway'] ?? '').toString().isNotEmpty) keyFindings.add(di['keyTakeaway'].toString());
        if ((di['whatDoctorSaidPlainEnglish'] ?? '').toString().isNotEmpty) keyFindings.add('Dr. ${di['doctorName'] ?? 'Unknown'}: ${di['whatDoctorSaidPlainEnglish']}');
      }
    }

    // Extract lab analysis
    final labInsights = json['labReportInsights'] as List<dynamic>? ?? [];
    final labBuf = StringBuffer();
    for (final li in labInsights) {
      if (li is Map<String, dynamic>) {
        labBuf.writeln('• ${li['testTitle'] ?? 'Test'}: ${li['findingsSummary'] ?? ''}');
        if ((li['whatThisTestMeansPlainEnglish'] ?? '').toString().isNotEmpty) {
          labBuf.writeln('  → ${li['whatThisTestMeansPlainEnglish']}');
        }
      }
    }

    // Extract prescription analysis
    final medInsights = json['medicationInsights'] as List<dynamic>? ?? [];
    final medBuf = StringBuffer();
    for (final mi in medInsights) {
      if (mi is Map<String, dynamic>) {
        medBuf.writeln('• ${mi['medicationName'] ?? 'Medication'} (${mi['dosage'] ?? ''}): ${mi['purposeAndHowItWorks'] ?? ''}');
      }
    }

    return AIInsight(
      patientCode: json['patientCode'] ?? '',
      fullName: json['patientName'] ?? json['fullName'] ?? '',
      overallSummary: json['overallConditionSummary'] ?? json['overallSummary'] ?? '',
      riskLevel: _mapHealthStatus(json['healthStatusLevel'] ?? json['riskLevel'] ?? 'Stable'),
      keyFindings: keyFindings.isNotEmpty ? keyFindings : List<String>.from(json['keyFindings'] ?? []),
      recommendations: List<String>.from(json['actionableNextSteps'] ?? json['recommendations'] ?? []),
      labAnalysis: labBuf.isNotEmpty ? labBuf.toString().trim() : (json['labAnalysis'] ?? ''),
      prescriptionAnalysis: medBuf.isNotEmpty ? medBuf.toString().trim() : (json['prescriptionAnalysis'] ?? ''),
      conditionExplained: json['conditionExplained'] ?? '',
      generatedAt: json['generatedAt']?.toString() ?? '',
      safetyAlerts: List<String>.from(json['safetyAlerts'] ?? []),
      questionsForNextVisit: List<String>.from(json['questionsForNextVisit'] ?? []),
      engineUsed: json['engineUsed'] ?? 'HealthBridge Agentic Clinical AI',
    );
  }

  static String _mapHealthStatus(String status) {
    switch (status.toLowerCase()) {
      case 'attention needed': return 'High';
      case 'monitoring required': return 'Medium';
      default: return 'Low';
    }
  }
}


// ─── AI API Service ───────────────────────────────────────────────────────────

class _AIService {
  static Future<Map<String, String>> _headers() async {
    final token = AuthState.token ?? '';
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      if (token.isNotEmpty) 'Authorization': 'Bearer $token',
    };
  }

  static Future<AIInsight> getInsight(String patientCode) async {
    final headers = await _headers();
    final hosts = [...ApiConfig.candidateHosts, 'http://127.0.0.1:5126'];
    for (final host in hosts) {
      try {
        final q = patientCode.isNotEmpty ? '?patientCode=${Uri.encodeComponent(patientCode)}' : '';
        final uri = Uri.parse('$host/api/emr/ai/insight$q');
        final res = await http.get(uri, headers: headers).timeout(const Duration(seconds: 25));
        if (res.statusCode >= 200 && res.statusCode < 300) {
          return AIInsight.fromJson(jsonDecode(res.body) as Map<String, dynamic>);
        }
      } catch (_) {}
    }
    throw Exception('Failed to connect to AI service. Please ensure backend is running.');
  }

  static Future<Map<String, dynamic>> askQuestion(String question, String patientCode) async {
    final headers = await _headers();
    final hosts = [...ApiConfig.candidateHosts, 'http://127.0.0.1:5126'];
    for (final host in hosts) {
      try {
        final uri = Uri.parse('$host/api/emr/ai/ask');
        final res = await http.post(
          uri,
          headers: headers,
          body: jsonEncode({'question': question, 'patientCode': patientCode}),
        ).timeout(const Duration(seconds: 30));
        if (res.statusCode >= 200 && res.statusCode < 300) {
          return jsonDecode(res.body) as Map<String, dynamic>;
        }
      } catch (_) {}
    }
    throw Exception('Failed to get AI response. Please try again.');
  }
}

// ─── AI Clinical Advisor Screen ───────────────────────────────────────────────

class AIClinicalAdvisorScreen extends StatefulWidget {
  const AIClinicalAdvisorScreen({super.key});

  @override
  State<AIClinicalAdvisorScreen> createState() => _AIClinicalAdvisorScreenState();
}

class _AIClinicalAdvisorScreenState extends State<AIClinicalAdvisorScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  AIInsight? _insight;
  bool _isLoading = true;
  String? _error;

  final TextEditingController _questionCtrl = TextEditingController();
  final ScrollController _chatScroll = ScrollController();
  final List<Map<String, String>> _chatMessages = [];
  bool _isAsking = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _loadInsight();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _questionCtrl.dispose();
    _chatScroll.dispose();
    super.dispose();
  }

  Future<void> _loadInsight() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      final code = AuthState.patientCode ?? EmrApiService.activePatientCode;
      final insight = await _AIService.getInsight(code);
      if (mounted) setState(() { _insight = insight; _isLoading = false; });
    } catch (e) {
      if (mounted) setState(() { _error = e.toString(); _isLoading = false; });
    }
  }

  Future<void> _askQuestion() async {
    final q = _questionCtrl.text.trim();
    if (q.isEmpty || _isAsking) return;
    setState(() {
      _chatMessages.add({'role': 'user', 'content': q});
      _isAsking = true;
    });
    _questionCtrl.clear();
    _scrollToBottom();

    try {
      final code = AuthState.patientCode ?? EmrApiService.activePatientCode;
      final result = await _AIService.askQuestion(q, code);
      final answer = (result['answer'] ?? result['response'] ?? 'No response received.').toString();
      if (mounted) {
        setState(() {
          _chatMessages.add({'role': 'ai', 'content': answer});
          _isAsking = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _chatMessages.add({'role': 'ai', 'content': 'Sorry, I encountered an error: ${e.toString().replaceAll('Exception: ', '')}'});
          _isAsking = false;
        });
      }
    }
    _scrollToBottom();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_chatScroll.hasClients) {
        _chatScroll.animateTo(
          _chatScroll.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Color get _riskColor {
    switch (_insight?.riskLevel.toLowerCase()) {
      case 'high': return const Color(0xFFDC2626);
      case 'medium': return const Color(0xFFF59E0B);
      default: return const Color(0xFF059669);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: const Color(0xFF1E1B4B),
        foregroundColor: Colors.white,
        elevation: 0,
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.psychology, size: 18, color: Color(0xFFA78BFA)),
            ),
            const SizedBox(width: 10),
            const Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('AI Health Advisor', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800)),
                Text('Powered by Gemini AI', style: TextStyle(fontSize: 10, color: Color(0xFFBBBADA))),
              ],
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            tooltip: 'Refresh Analysis',
            onPressed: _loadInsight,
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: const Color(0xFFA78BFA),
          labelColor: Colors.white,
          unselectedLabelColor: const Color(0xFFBBBADA),
          labelStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12),
          tabs: const [
            Tab(icon: Icon(Icons.analytics_outlined, size: 16), text: 'AI Analysis'),
            Tab(icon: Icon(Icons.chat_bubble_outline, size: 16), text: 'Ask AI'),
          ],
        ),
      ),
      body: _isLoading
          ? _buildLoading()
          : _error != null
              ? _buildError()
              : TabBarView(
                  controller: _tabController,
                  children: [
                    _buildAnalysisTab(),
                    _buildChatTab(),
                  ],
                ),
    );
  }

  // ── Loading State ────────────────────────────────────────────────────────────

  Widget _buildLoading() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(28),
            decoration: BoxDecoration(
              gradient: const LinearGradient(colors: [Color(0xFF1E1B4B), Color(0xFF312E81)]),
              borderRadius: BorderRadius.circular(24),
            ),
            child: const Icon(Icons.psychology, size: 52, color: Color(0xFFA78BFA)),
          ),
          const SizedBox(height: 20),
          const Text('Analyzing your health data...', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: Color(0xFF1E1B4B))),
          const SizedBox(height: 6),
          const Text('Gemini AI is reviewing your records', style: TextStyle(fontSize: 13, color: Color(0xFF64748B))),
          const SizedBox(height: 24),
          const CircularProgressIndicator(color: Color(0xFF7C3AED)),
        ],
      ),
    );
  }

  // ── Error State ──────────────────────────────────────────────────────────────

  Widget _buildError() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(28),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 56, color: Color(0xFFDC2626)),
            const SizedBox(height: 16),
            const Text('Unable to load AI analysis', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
            const SizedBox(height: 8),
            Text(
              _error?.replaceAll('Exception: ', '') ?? 'Unknown error',
              style: const TextStyle(fontSize: 13, color: Color(0xFF64748B)),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: _loadInsight,
              icon: const Icon(Icons.refresh),
              label: const Text('Retry Analysis'),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF7C3AED),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ── Analysis Tab ─────────────────────────────────────────────────────────────

  Widget _buildAnalysisTab() {
    final insight = _insight!;
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Patient + Risk Banner
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              gradient: const LinearGradient(colors: [Color(0xFF1E1B4B), Color(0xFF312E81)], begin: Alignment.topLeft, end: Alignment.bottomRight),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.15), shape: BoxShape.circle),
                  child: const Icon(Icons.person, color: Colors.white, size: 28),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(insight.fullName.isNotEmpty ? insight.fullName : (AuthState.name ?? 'Patient'),
                          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 16)),
                      Text(insight.patientCode, style: const TextStyle(color: Color(0xFFBBBADA), fontSize: 12)),
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: _riskColor.withValues(alpha: 0.2),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: _riskColor.withValues(alpha: 0.5)),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.circle, size: 8, color: _riskColor),
                            const SizedBox(width: 5),
                            Text('${insight.riskLevel} Risk',
                                style: TextStyle(color: _riskColor, fontSize: 11, fontWeight: FontWeight.w700)),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),

          if (insight.overallSummary.isNotEmpty) ...[
            _card(
              icon: Icons.summarize_outlined,
              color: const Color(0xFF7C3AED),
              title: 'Overall Health Summary',
              child: Text(insight.overallSummary, style: const TextStyle(fontSize: 13, color: Color(0xFF475569), height: 1.6)),
            ),
            const SizedBox(height: 12),
          ],

          if (insight.keyFindings.isNotEmpty) ...[
            _bulletCard(
              icon: Icons.find_in_page_outlined,
              color: const Color(0xFF0D9488),
              title: 'Key Clinical Findings',
              items: insight.keyFindings,
            ),
            const SizedBox(height: 12),
          ],

          if (insight.labAnalysis.isNotEmpty) ...[
            _card(
              icon: Icons.science_outlined,
              color: const Color(0xFFF59E0B),
              title: 'Lab Report Analysis',
              child: Text(insight.labAnalysis, style: const TextStyle(fontSize: 13, color: Color(0xFF475569), height: 1.6)),
            ),
            const SizedBox(height: 12),
          ],

          if (insight.prescriptionAnalysis.isNotEmpty) ...[
            _card(
              icon: Icons.medication_outlined,
              color: const Color(0xFF6366F1),
              title: 'Prescription & Medication Review',
              child: Text(insight.prescriptionAnalysis, style: const TextStyle(fontSize: 13, color: Color(0xFF475569), height: 1.6)),
            ),
            const SizedBox(height: 12),
          ],

          if (insight.conditionExplained.isNotEmpty) ...[
            _card(
              icon: Icons.help_outline,
              color: const Color(0xFF0284C7),
              title: 'Your Condition Explained',
              child: Text(insight.conditionExplained, style: const TextStyle(fontSize: 13, color: Color(0xFF475569), height: 1.6)),
            ),
            const SizedBox(height: 12),
          ],

          if (insight.recommendations.isNotEmpty) ...[
            _bulletCard(
              icon: Icons.lightbulb_outline,
              color: const Color(0xFFF59E0B),
              title: 'AI Recommendations',
              items: insight.recommendations,
            ),
            const SizedBox(height: 12),
          ],

          // Disclaimer
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: const Color(0xFFFFF7ED),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFFDBA74)),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: const [
                Icon(Icons.warning_amber_outlined, color: Color(0xFFF59E0B), size: 18),
                SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'This AI analysis is for informational purposes only and does not replace professional medical advice. Always consult your doctor.',
                    style: TextStyle(color: Color(0xFF78350F), fontSize: 11.5, height: 1.5),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
        ],
      ),
    );
  }

  Widget _card({required IconData icon, required Color color, required String title, required Widget child}) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 8, offset: const Offset(0, 2))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(8)),
                child: Icon(icon, color: color, size: 16),
              ),
              const SizedBox(width: 10),
              Expanded(child: Text(title, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: Color(0xFF0F172A)))),
            ],
          ),
          const SizedBox(height: 10),
          child,
        ],
      ),
    );
  }

  Widget _bulletCard({required IconData icon, required Color color, required String title, required List<String> items}) {
    return _card(
      icon: icon,
      color: color,
      title: title,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: items
            .map((item) => Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(margin: const EdgeInsets.only(top: 6), width: 6, height: 6, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
                      const SizedBox(width: 10),
                      Expanded(child: Text(item, style: const TextStyle(fontSize: 13, color: Color(0xFF475569), height: 1.5))),
                    ],
                  ),
                ))
            .toList(),
      ),
    );
  }

  // ── Chat Tab ─────────────────────────────────────────────────────────────────

  Widget _buildChatTab() {
    return Column(
      children: [
        // Header
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          decoration: const BoxDecoration(color: Color(0xFFF5F3FF), border: Border(bottom: BorderSide(color: Color(0xFFDDD6FE)))),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(colors: [Color(0xFF7C3AED), Color(0xFF4F46E5)]),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.psychology, color: Colors.white, size: 18),
              ),
              const SizedBox(width: 12),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Ask AI About Your Health', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: Color(0xFF1E1B4B))),
                    Text('Based on your actual medical records', style: TextStyle(fontSize: 11, color: Color(0xFF6D6D9A))),
                  ],
                ),
              ),
            ],
          ),
        ),

        // Messages
        Expanded(
          child: _chatMessages.isEmpty
              ? _buildChatEmpty()
              : ListView.builder(
                  controller: _chatScroll,
                  padding: const EdgeInsets.all(16),
                  itemCount: _chatMessages.length + (_isAsking ? 1 : 0),
                  itemBuilder: (ctx, i) {
                    if (i == _chatMessages.length && _isAsking) return _buildTypingIndicator();
                    final msg = _chatMessages[i];
                    return _buildBubble(msg['role']!, msg['content']!);
                  },
                ),
        ),

        // Input
        Container(
          padding: const EdgeInsets.fromLTRB(12, 8, 12, 16),
          decoration: const BoxDecoration(color: Colors.white, border: Border(top: BorderSide(color: Color(0xFFE2E8F0)))),
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _questionCtrl,
                  maxLines: 1,
                  textInputAction: TextInputAction.send,
                  onSubmitted: (_) => _askQuestion(),
                  style: const TextStyle(fontSize: 13),
                  decoration: InputDecoration(
                    hintText: 'Ask about your health, medications, labs...',
                    hintStyle: const TextStyle(fontSize: 13, color: Color(0xFF94A3B8)),
                    filled: true,
                    fillColor: const Color(0xFFF8FAFC),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 11),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(24), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                    enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(24), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                    focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(24), borderSide: const BorderSide(color: Color(0xFF7C3AED), width: 1.5)),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              GestureDetector(
                onTap: _isAsking ? null : _askQuestion,
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: _isAsking
                          ? [const Color(0xFF94A3B8), const Color(0xFF94A3B8)]
                          : [const Color(0xFF7C3AED), const Color(0xFF4F46E5)],
                    ),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(_isAsking ? Icons.hourglass_empty : Icons.send_rounded, color: Colors.white, size: 18),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildChatEmpty() {
    final suggestions = [
      'What do my lab results mean?',
      'Are my medications safe together?',
      'How serious is my condition?',
      'What lifestyle changes should I make?',
    ];
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        const SizedBox(height: 16),
        Center(
          child: Container(
            padding: const EdgeInsets.all(22),
            decoration: BoxDecoration(
              gradient: const LinearGradient(colors: [Color(0xFF1E1B4B), Color(0xFF312E81)]),
              borderRadius: BorderRadius.circular(22),
            ),
            child: const Icon(Icons.psychology, color: Color(0xFFA78BFA), size: 44),
          ),
        ),
        const SizedBox(height: 16),
        const Center(child: Text('AI Health Assistant Ready', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16, color: Color(0xFF1E1B4B)))),
        const SizedBox(height: 6),
        const Center(
          child: Text(
            'Ask me anything about your health. I have access to your real medical records, lab reports, and prescriptions.',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 13, color: Color(0xFF64748B), height: 1.45),
          ),
        ),
        const SizedBox(height: 20),
        const Text('Suggested Questions:', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: Color(0xFF334155))),
        const SizedBox(height: 10),
        ...suggestions.map((q) => GestureDetector(
          onTap: () { _questionCtrl.text = q; _askQuestion(); },
          child: Container(
            margin: const EdgeInsets.only(bottom: 8),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            decoration: BoxDecoration(
              color: const Color(0xFFF5F3FF),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: const Color(0xFFDDD6FE)),
            ),
            child: Row(
              children: [
                const Icon(Icons.chat_bubble_outline, color: Color(0xFF7C3AED), size: 16),
                const SizedBox(width: 10),
                Expanded(child: Text(q, style: const TextStyle(fontSize: 13, color: Color(0xFF4C1D95), fontWeight: FontWeight.w600))),
                const Icon(Icons.arrow_forward_ios, color: Color(0xFF7C3AED), size: 12),
              ],
            ),
          ),
        )),
      ],
    );
  }

  Widget _buildBubble(String role, String content) {
    final isUser = role == 'user';
    return Padding(
      padding: EdgeInsets.only(bottom: 12, left: isUser ? 40 : 0, right: isUser ? 0 : 40),
      child: Row(
        mainAxisAlignment: isUser ? MainAxisAlignment.end : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (!isUser) ...[
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(gradient: const LinearGradient(colors: [Color(0xFF7C3AED), Color(0xFF4F46E5)]), shape: BoxShape.circle),
              child: const Icon(Icons.psychology, color: Colors.white, size: 14),
            ),
            const SizedBox(width: 8),
          ],
          Flexible(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: isUser ? const Color(0xFF7C3AED) : Colors.white,
                borderRadius: BorderRadius.only(
                  topLeft: const Radius.circular(16),
                  topRight: const Radius.circular(16),
                  bottomLeft: Radius.circular(isUser ? 16 : 4),
                  bottomRight: Radius.circular(isUser ? 4 : 16),
                ),
                border: isUser ? null : Border.all(color: const Color(0xFFE2E8F0)),
                boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 4, offset: const Offset(0, 2))],
              ),
              child: Text(content, style: TextStyle(fontSize: 13, color: isUser ? Colors.white : const Color(0xFF334155), height: 1.5)),
            ),
          ),
          if (isUser) ...[
            const SizedBox(width: 8),
            CircleAvatar(
              radius: 14,
              backgroundColor: const Color(0xFF0D9488),
              child: Text(AuthState.initials, style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildTypingIndicator() {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12, right: 40),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(gradient: const LinearGradient(colors: [Color(0xFF7C3AED), Color(0xFF4F46E5)]), shape: BoxShape.circle),
            child: const Icon(Icons.psychology, color: Colors.white, size: 14),
          ),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(16), topRight: Radius.circular(16),
                bottomRight: Radius.circular(16), bottomLeft: Radius.circular(4),
              ),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: const Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                _TypingDot(delay: Duration.zero),
                SizedBox(width: 5),
                _TypingDot(delay: Duration(milliseconds: 200)),
                SizedBox(width: 5),
                _TypingDot(delay: Duration(milliseconds: 400)),
                SizedBox(width: 8),
                Text('AI is thinking...', style: TextStyle(fontSize: 11, color: Color(0xFF94A3B8))),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Animated Typing Dot ──────────────────────────────────────────────────────

class _TypingDot extends StatefulWidget {
  final Duration delay;
  const _TypingDot({required this.delay});

  @override
  State<_TypingDot> createState() => _TypingDotState();
}

class _TypingDotState extends State<_TypingDot> with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;
  late Animation<double> _anim;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 600));
    _anim = Tween<double>(begin: 0, end: -6).animate(CurvedAnimation(parent: _ctrl, curve: Curves.easeInOut));
    Future.delayed(widget.delay, () { if (mounted) _ctrl.repeat(reverse: true); });
  }

  @override
  void dispose() { _ctrl.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _anim,
      builder: (_, __) => Transform.translate(
        offset: Offset(0, _anim.value),
        child: Container(width: 7, height: 7, decoration: const BoxDecoration(color: Color(0xFF7C3AED), shape: BoxShape.circle)),
      ),
    );
  }
}
