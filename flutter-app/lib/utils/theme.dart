import 'package:flutter/material.dart';

// ─── Color Palette ────────────────────────────────────────────────────────────
const kPrimary = Color(0xFF00897B); // Vibrant Teal
const kPrimaryDark = Color(0xFF004D40); // Deep Teal
const kPrimaryLight = Color(0xFF26A69A);
const kSecondary = Color(0xFFFFC107); // Amber Accent
const kSuccess = Color(0xFF10B981);
const kWarning = Color(0xFFF59E0B);
const kDanger = Color(0xFFEF4444);
const kBg = Color(0xFFF0FDF4); // Soft Mint Background
const kCard = Colors.white;
const kBorder = Color(0xFFD1E7DD); // Soft sage border
const kText = Color(0xFF064E3B); // Dark Forest Teal
const kTextMuted = Color(0xFF52796F); // Muted Sage Grey
const kCardShadow = Color(0x12004D40); // Soft elevation shadow

// Category Theme Colors
const Map<String, Color> kCategoryColors = {
  'Haematology': Color(0xFFEF4444),
  'Biochemistry': Color(0xFF00897B),
  'Microbiology': Color(0xFF8B5CF6),
  'Radiology': Color(0xFF3B82F6),
  'Endocrinology': Color(0xFFF59E0B),
  'Immunology': Color(0xFF10B981),
  'Pathology': Color(0xFFEC4899),
};

// ─── Theme ────────────────────────────────────────────────────────────────────
ThemeData buildAppTheme() {
  return ThemeData(
    useMaterial3: true,
    fontFamily: 'Inter',
    scaffoldBackgroundColor: kBg,
    colorScheme: ColorScheme.light(
      primary: kPrimary,
      secondary: kSecondary,
      surface: kCard,
      onSurface: kText,
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: kPrimaryDark,
      foregroundColor: Colors.white,
      elevation: 0,
      centerTitle: true,
      titleTextStyle: TextStyle(
        fontFamily: 'Inter',
        fontSize: 18,
        fontWeight: FontWeight.w800,
        color: Colors.white,
        letterSpacing: -0.3,
      ),
    ),
    cardTheme: CardThemeData(
      color: kCard,
      elevation: 3,
      shadowColor: kCardShadow,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: kBorder, width: 0.8),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colors.white,
      hintStyle: const TextStyle(color: kTextMuted, fontSize: 14),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: kBorder),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: kBorder),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: kPrimary, width: 1.8),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: kPrimary,
        foregroundColor: Colors.white,
        elevation: 2,
        shadowColor: kPrimary.withOpacity(0.4),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        padding: const EdgeInsets.symmetric(vertical: 15, horizontal: 22),
        textStyle: const TextStyle(
          fontFamily: 'Inter',
          fontWeight: FontWeight.w700,
          fontSize: 15,
        ),
      ),
    ),
  );
}

// ─── Reusable Animated & Styled Widgets ───────────────────────────────────────

class AppCard extends StatelessWidget {
  final Widget child;
  final EdgeInsets? padding;
  final Color? color;
  final VoidCallback? onTap;
  final double radius;
  final Border? border;

  const AppCard({
    super.key,
    required this.child,
    this.padding,
    this.color,
    this.onTap,
    this.radius = 16,
    this.border,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: padding ?? const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: color ?? kCard,
          borderRadius: BorderRadius.circular(radius),
          border: border ?? Border.all(color: kBorder, width: 0.8),
          boxShadow: const [
            BoxShadow(
              color: kCardShadow,
              blurRadius: 12,
              offset: Offset(0, 4),
            )
          ],
        ),
        child: child,
      ),
    );
  }
}

class StatusBadge extends StatelessWidget {
  final String status;
  const StatusBadge({super.key, required this.status});

  @override
  Widget build(BuildContext context) {
    final map = {
      'PendingPrescriptionUpload': [kWarning, '📎 Upload Rx'],
      'PendingAIVerification': [kWarning, '🤖 AI Verifying'],
      'PendingLabApproval': [kWarning, '⏳ Pending Review'],
      'Confirmed': [kPrimary, '✅ Confirmed'],
      'Rejected': [kDanger, '❌ Rejected'],
      'SampleCollected': [const Color(0xFF3B82F6), '🧪 Specimen Taken'],
      'TestingInProgress': [const Color(0xFF8B5CF6), '🔬 In Analysis'],
      'ResultsReady': [const Color(0xFF10B981), '📄 Report Ready'],
      'ReportDelivered': [kSuccess, '📬 Delivered'],
      'Completed': [kSuccess, '✓ Completed'],
      'Cancelled': [kDanger, '✗ Cancelled'],
    };
    final entry = map[status] ?? [kTextMuted, status];
    final color = entry[0] as Color;
    final label = entry[1] as String;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: color.withOpacity(0.12),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: color.withOpacity(0.25)),
      ),
      child: Text(
        label,
        style: TextStyle(color: color, fontSize: 11.5, fontWeight: FontWeight.w700),
      ),
    );
  }
}

class PulsingLiveDot extends StatefulWidget {
  final Color color;
  const PulsingLiveDot({super.key, this.color = kSuccess});
  @override
  State<PulsingLiveDot> createState() => _PulsingLiveDotState();
}

class _PulsingLiveDotState extends State<PulsingLiveDot> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: const Duration(seconds: 2))..repeat();
    _animation = Tween<double>(begin: 0.4, end: 1.0).animate(CurvedAnimation(parent: _controller, curve: Curves.easeInOut));
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _animation,
      builder: (context, child) => Container(
        width: 10,
        height: 10,
        decoration: BoxDecoration(
          color: widget.color,
          shape: BoxShape.circle,
          boxShadow: [
            BoxShadow(
              color: widget.color.withOpacity(0.6 * _animation.value),
              blurRadius: 8 * _animation.value,
              spreadRadius: 2 * _animation.value,
            )
          ],
        ),
      ),
    );
  }
}

class FadeSlideAnimation extends StatelessWidget {
  final Widget child;
  final Duration delay;
  const FadeSlideAnimation({super.key, required this.child, this.delay = Duration.zero});

  @override
  Widget build(BuildContext context) {
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0.0, end: 1.0),
      duration: const Duration(milliseconds: 450),
      curve: Curves.easeOutCubic,
      builder: (context, val, ch) => Opacity(
        opacity: val,
        child: Transform.translate(
          offset: Offset(0, 16 * (1 - val)),
          child: ch,
        ),
      ),
      child: child,
    );
  }
}

class LoadingWidget extends StatelessWidget {
  const LoadingWidget({super.key});
  @override
  Widget build(BuildContext context) => const Center(
    child: CircularProgressIndicator(color: kPrimary),
  );
}

class EmptyStateWidget extends StatelessWidget {
  final String message;
  final IconData icon;
  final String? subtitle;
  const EmptyStateWidget({super.key, required this.message, required this.icon, this.subtitle});

  @override
  Widget build(BuildContext context) => Center(
    child: Padding(
      padding: const EdgeInsets.all(32),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 72,
            height: 72,
            decoration: BoxDecoration(
              color: kPrimary.withOpacity(0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, size: 36, color: kPrimary),
          ),
          const SizedBox(height: 16),
          Text(
            message,
            style: const TextStyle(color: kText, fontSize: 16, fontWeight: FontWeight.w700),
            textAlign: TextAlign.center,
          ),
          if (subtitle != null) ...[
            const SizedBox(height: 6),
            Text(
              subtitle!,
              style: const TextStyle(color: kTextMuted, fontSize: 13),
              textAlign: TextAlign.center,
            ),
          ],
        ],
      ),
    ),
  );
}

// ─── Health Bridge EMR Theme ──────────────────────────────────────────────────
class HealthBridgeTheme {
  // ── Brand Colors (Matching React Web Palette) ──────────────────────────────
  static const Color primaryTeal = Color(0xFF095E51);
  static const Color accentTeal = Color(0xFF0D7C6B);
  static const Color mintAccent = Color(0xFFE6F5F2);
  static const Color lightBg = Color(0xFFF2FAF8);
  static const Color sidebarBorder = Color(0x14FFFFFF);
  static const Color cardBg = Colors.white;
  static const Color cardBorder = Color(0xFFE2E8F0);

  // ── Text Colors ─────────────────────────────────────────────────────────────
  static const Color textPrimary = Color(0xFF0F172A);
  static const Color textSecondary = Color(0xFF64748B);
  static const Color textMuted = Color(0xFF94A3B8);

  // ── Status Badge Colors ─────────────────────────────────────────────────────
  static const Color statusCompletedBg = Color(0xFFDCFCE7);
  static const Color statusCompletedText = Color(0xFF15803D);

  static const Color statusPendingBg = Color(0xFFFFF7ED);
  static const Color statusPendingText = Color(0xFFC2410C);

  static const Color statusActiveBg = Color(0xFFDBEAFE);
  static const Color statusActiveText = Color(0xFF1D4ED8);

  static const Color statusAlertBg = Color(0xFFFEF2F2);
  static const Color statusAlertText = Color(0xFFDC2626);

  // ── Card Decoration Helper ──────────────────────────────────────────────────
  static BoxDecoration cardDecoration({
    Color bg = Colors.white,
    Color border = cardBorder,
    double radius = 16,
    bool shadow = true,
  }) {
    return BoxDecoration(
      color: bg,
      borderRadius: BorderRadius.circular(radius),
      border: Border.all(color: border, width: 1),
      boxShadow: shadow
          ? [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.04),
                blurRadius: 10,
                offset: const Offset(0, 2),
              ),
            ]
          : null,
    );
  }

  // ── Pill Status Badge Helper ────────────────────────────────────────────────
  static Widget statusBadge({
    required String text,
    required Color bg,
    required Color textCol,
    IconData? icon,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 12, color: textCol),
            const SizedBox(width: 4),
          ],
          Text(
            text,
            style: TextStyle(
              color: textCol,
              fontSize: 11,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }

  // ── Dot Tag Badge Helper (Matching Web 2x2 cards) ───────────────────────────
  static Widget dotBadge({
    required String text,
    required Color dotColor,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.94),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.08),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 8,
            height: 8,
            decoration: BoxDecoration(
              color: dotColor,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 6),
          Text(
            text,
            style: const TextStyle(
              color: textPrimary,
              fontSize: 11,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}
