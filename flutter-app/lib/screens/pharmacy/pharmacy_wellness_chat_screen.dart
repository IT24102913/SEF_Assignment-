import 'package:flutter/material.dart';
import '../../models/wellness_response.dart';
import '../../services/wellness_api_service.dart';
import '../../widgets/wellness_message_bubble.dart';
import '../../widgets/wellness_advice_view.dart';
import '../../widgets/clarifying_questions_card.dart';

class PharmacyWellnessChatScreen extends StatefulWidget {
  const PharmacyWellnessChatScreen({super.key});

  @override
  State<PharmacyWellnessChatScreen> createState() =>
      _PharmacyWellnessChatScreenState();
}

class _PharmacyWellnessChatScreenState
    extends State<PharmacyWellnessChatScreen> {
  final TextEditingController _inputController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final List<_ChatMessage> _messages = [];
  int _activeTab = 0;
  bool _loading = false;
  List<WellnessHistoryItem> _history = [];
  bool _historyLoading = false;

  static const List<Map<String, String>> _quickChips = [
    {'label': '🤕 Headache', 'symptom': 'I have a headache'},
    {'label': '🤧 Cough & Cold', 'symptom': 'Dry cough and runny nose'},
    {'label': '🤢 Stomach Ache', 'symptom': 'Mild stomach ache'},
    {'label': '🧴 Skin Rash', 'symptom': 'Itchy skin rash'},
    {'label': '🌡️ Mild Fever', 'symptom': 'Mild fever and body aches'},
  ];

  @override
  void initState() {
    super.initState();
    _messages.add(_ChatMessage.welcome());
  }

  @override
  void dispose() {
    _inputController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _scrollToBottom() {
    Future.delayed(const Duration(milliseconds: 100), () {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _sendMessage(
    String text, {
    Map<String, String>? clarifyingAnswers,
  }) async {
    final query = text.trim();
    if (query.isEmpty || _loading) return;

    setState(() {
      _messages.add(_ChatMessage.user(
        clarifyingAnswers != null
            ? 'Answers: ${clarifyingAnswers.values.join(", ")}'
            : query,
      ));
      _loading = true;
    });
    _inputController.clear();
    _scrollToBottom();

    try {
      final advice = await WellnessApiService.getAdvice(
        symptom: query,
        clarifyingAnswers: clarifyingAnswers,
      );

      setState(() {
        _messages.add(_ChatMessage.advice(advice));
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _messages.add(_ChatMessage.error(
            'Sorry, something went wrong. Please try again.'));
        _loading = false;
      });
    }
    _scrollToBottom();
  }

  Future<void> _loadHistory() async {
    setState(() => _historyLoading = true);
    try {
      final items = await WellnessApiService.getHistory();
      setState(() {
        _history = items;
        _historyLoading = false;
      });
    } catch (_) {
      setState(() => _historyLoading = false);
    }
  }

  Future<void> _deleteHistory(int id) async {
    final ok = await WellnessApiService.deleteHistory(id);
    if (ok) {
      setState(() => _history.removeWhere((h) => h.id == id));
    }
  }

  Future<void> _showHistoryDetail(
      WellnessHistoryItem item) async {
    try {
      // Re-fetch advice for this symptom.
      // Backend returns cached result — fast.
      final advice = await WellnessApiService.getAdvice(
        symptom: item.symptom,
      );

      if (!mounted) return;

      showModalBottomSheet(
        context: context,
        isScrollControlled: true,
        backgroundColor: Colors.transparent,
        builder: (_) => DraggableScrollableSheet(
          initialChildSize: 0.85,
          minChildSize: 0.5,
          maxChildSize: 0.95,
          builder: (_, controller) => Container(
            decoration: const BoxDecoration(
              color: Color(0xFFF8FAFC),
              borderRadius: BorderRadius.vertical(
                top: Radius.circular(20),
              ),
            ),
            child: Column(
              children: [
                Container(
                  margin: const EdgeInsets.symmetric(vertical: 10),
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: const Color(0xFFCBD5E1),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                Expanded(
                  child: ListView(
                    controller: controller,
                    padding: const EdgeInsets.all(16),
                    children: [
                      WellnessAdviceView(
                        advice: advice,
                        onProductTap: (p) {
                          Navigator.pop(context);
                        },
                        onAddToCart: (p) {
                          ScaffoldMessenger.of(context)
                              .showSnackBar(
                            SnackBar(
                              content: Text(
                                  'Added ${p.name} to cart'),
                              duration:
                                  const Duration(seconds: 2),
                            ),
                          );
                        },
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Could not load history detail'),
        ),
      );
    }
  }

  void _startNewChat() {
    if (_messages.length <= 1) return;

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Start a new chat?'),
        content: const Text(
            'This will clear your current conversation. History is still saved.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(ctx);
              setState(() {
                _messages.clear();
                _messages.add(_ChatMessage.welcome());
              });
            },
            child: const Text('Yes, clear'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: const Color(0xFF00897B),
        foregroundColor: Colors.white,
        elevation: 0,
        title: const Text(
          'Wellness Assistant',
          style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold),
        ),
        actions: [
          if (_activeTab == 0 && _messages.length > 1)
            IconButton(
              tooltip: 'New chat',
              onPressed: _startNewChat,
              icon: const Icon(Icons.add_comment_outlined),
            ),
        ],
      ),
      body: Column(
        children: [
          Container(
            color: Colors.white,
            child: Row(
              children: [
                _tab('AI Chat', 0),
                _tab('History', 1),
              ],
            ),
          ),
          Expanded(
            child: _activeTab == 0 ? _buildChat() : _buildHistory(),
          ),
        ],
      ),
    );
  }

  Widget _tab(String label, int index) {
    final active = _activeTab == index;
    return Expanded(
      child: GestureDetector(
        onTap: () {
          setState(() => _activeTab = index);
          if (index == 1) _loadHistory();
        },
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 14),
          decoration: BoxDecoration(
            border: Border(
              bottom: BorderSide(
                color: active
                    ? const Color(0xFF00897B)
                    : Colors.transparent,
                width: 3,
              ),
            ),
          ),
          child: Text(
            label,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 14,
              fontWeight: active ? FontWeight.bold : FontWeight.w500,
              color: active
                  ? const Color(0xFF00897B)
                  : const Color(0xFF64748B),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildChat() {
    return Column(
      children: [
        Expanded(
          child: ListView.builder(
            controller: _scrollController,
            padding: const EdgeInsets.all(16),
            itemCount: _messages.length + (_loading ? 1 : 0),
            itemBuilder: (context, idx) {
              if (idx == _messages.length && _loading) {
                return const WellnessMessageBubble(
                  text: '',
                  isUser: false,
                  isLoading: true,
                );
              }
              final msg = _messages[idx];

              if (msg.isWelcome) {
                return WellnessMessageBubble(
                  text: msg.text,
                  isUser: false,
                );
              }
              if (msg.isUser) {
                return WellnessMessageBubble(
                  text: msg.text,
                  isUser: true,
                );
              }
              if (msg.isError) {
                return WellnessMessageBubble(
                  text: msg.text,
                  isUser: false,
                );
              }
              if (msg.advice != null) {
                if (msg.advice!.needsClarification &&
                    msg.advice!.clarifyingQuestions.isNotEmpty) {
                  return ClarifyingQuestionsCard(
                    questions: msg.advice!.clarifyingQuestions,
                    summary: msg.advice!.summary,
                    category: msg.advice!.symptomCategory,
                    onSubmit: (answers) => _sendMessage(
                      msg.advice!.symptom,
                      clarifyingAnswers: answers,
                    ),
                  );
                }
                return WellnessAdviceView(
                  advice: msg.advice!,
                  onProductTap: (p) {
                    Navigator.pop(context);
                    Future.delayed(const Duration(milliseconds: 300), () {
                      if (context.mounted) {
                        Navigator.pushNamed(
                          context,
                          '/pharmacy',
                          arguments: {'medicineId': p.medicineId},
                        );
                      }
                    });
                  },
                  onAddToCart: (p) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text('Added ${p.name} to cart'),
                        duration: const Duration(seconds: 2),
                      ),
                    );
                  },
                );
              }
              return const SizedBox.shrink();
            },
          ),
        ),
        _buildQuickChips(),
        _buildInputBar(),
      ],
    );
  }

  Widget _buildQuickChips() {
    return Container(
      height: 44,
      color: Colors.white,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        itemCount: _quickChips.length,
        itemBuilder: (context, idx) {
          final chip = _quickChips[idx];
          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: GestureDetector(
              onTap: _loading
                  ? null
                  : () => _sendMessage(chip['symptom']!),
              child: Container(
                padding: const EdgeInsets.symmetric(
                    horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: const Color(0xFFEFF6FF),
                  border: Border.all(color: const Color(0xFFBFDBFE)),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Text(
                  chip['label']!,
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF1E40AF),
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildInputBar() {
    return Container(
      color: Colors.white,
      padding: EdgeInsets.only(
        left: 12,
        right: 12,
        top: 10,
        bottom: MediaQuery.of(context).viewInsets.bottom + 12,
      ),
      child: Row(
        children: [
          Expanded(
            child: TextField(
              controller: _inputController,
              enabled: !_loading,
              textInputAction: TextInputAction.send,
              onSubmitted: (val) => _sendMessage(val),
              decoration: InputDecoration(
                hintText: 'Describe your symptoms...',
                hintStyle: const TextStyle(
                    fontSize: 13, color: Color(0xFF94A3B8)),
                filled: true,
                fillColor: const Color(0xFFF1F5F9),
                contentPadding: const EdgeInsets.symmetric(
                    horizontal: 16, vertical: 12),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(24),
                  borderSide: BorderSide.none,
                ),
              ),
            ),
          ),
          const SizedBox(width: 8),
          GestureDetector(
            onTap: _loading
                ? null
                : () => _sendMessage(_inputController.text),
            child: Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: _loading
                    ? const Color(0xFFCBD5E1)
                    : const Color(0xFF00897B),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.send,
                  color: Colors.white, size: 20),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHistory() {
    if (_historyLoading) {
      return const Center(
        child: CircularProgressIndicator(color: Color(0xFF00897B)),
      );
    }
    if (_history.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: const [
            Icon(Icons.history, size: 48, color: Color(0xFF94A3B8)),
            SizedBox(height: 12),
            Text('No history yet',
                style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF334155))),
            SizedBox(height: 4),
            Text('Ask the AI about a symptom to save history.',
                style:
                    TextStyle(fontSize: 12, color: Color(0xFF64748B))),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _history.length,
      itemBuilder: (context, idx) {
        final item = _history[idx];
        return GestureDetector(
          onTap: () => _showHistoryDetail(item),
          child: Container(
            margin: const EdgeInsets.only(bottom: 10),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              color: const Color(0xFFEFF6FF),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              item.symptomCategory.isNotEmpty
                                  ? item.symptomCategory
                                  : 'General',
                              style: const TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF1E40AF),
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            _formatDate(item.createdAt),
                            style: const TextStyle(
                              fontSize: 11,
                              color: Color(0xFF94A3B8),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Text(
                        '"${item.symptom}"',
                        style: const TextStyle(
                          fontSize: 13.5,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF0F172A),
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        item.summary,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 12,
                          color: Color(0xFF64748B),
                          height: 1.4,
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.delete_outline,
                      color: Color(0xFFEF4444), size: 20),
                  onPressed: () => _deleteHistory(item.id),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  String _formatDate(DateTime d) {
    final now = DateTime.now();
    final diff = now.difference(d);
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    return '${diff.inDays}d ago';
  }
}

class _ChatMessage {
  final String text;
  final bool isUser;
  final bool isWelcome;
  final bool isError;
  final WellnessAdvice? advice;

  _ChatMessage._({
    required this.text,
    this.isUser = false,
    this.isWelcome = false,
    this.isError = false,
    this.advice,
  });

  factory _ChatMessage.user(String text) =>
      _ChatMessage._(text: text, isUser: true);

  factory _ChatMessage.advice(WellnessAdvice advice) =>
      _ChatMessage._(text: advice.summary, advice: advice);

  factory _ChatMessage.welcome() => _ChatMessage._(
        text:
            'Ayubowan! I am your AI Wellness Assistant. Tell me your symptoms, and I\'ll share home remedies, warning signs, and safe OTC products.',
        isWelcome: true,
      );

  factory _ChatMessage.error(String text) =>
      _ChatMessage._(text: text, isError: true);
}
