import 'package:flutter/material.dart';

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
