import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

class DraggableFloatingSupportButtons extends StatefulWidget {
  const DraggableFloatingSupportButtons({super.key});

  @override
  State<DraggableFloatingSupportButtons> createState() => _DraggableFloatingSupportButtonsState();
}

class _DraggableFloatingSupportButtonsState extends State<DraggableFloatingSupportButtons> {
  double? _x;
  double? _y;

  Future<void> _launchWhatsApp() async {
    final uri = Uri.parse("https://wa.me/94764887396?text=Hello%20MediBridge%20Support,%20I%20need%20assistance");
    try {
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      } else {
        await launchUrl(uri);
      }
    } catch (e) {
      debugPrint("Error launching WhatsApp: $e");
    }
  }

  Future<void> _makeCall() async {
    final uri = Uri.parse("tel:0764887396");
    try {
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri);
      }
    } catch (e) {
      debugPrint("Error launching call: $e");
    }
  }

  @override
  Widget build(BuildContext context) {
    final screenSize = MediaQuery.of(context).size;

    // Default starting position: Right side, near bottom above bottom navigation
    _x ??= screenSize.width - 66.0;
    _y ??= screenSize.height - 230.0;

    return Positioned(
      left: _x,
      top: _y,
      child: GestureDetector(
        onPanUpdate: (details) {
          setState(() {
            // Keep floating logo buttons safely inside visible screen bounds
            _x = (_x! + details.delta.dx).clamp(12.0, screenSize.width - 66.0);
            _y = (_y! + details.delta.dy).clamp(80.0, screenSize.height - 140.0);
          });
        },
        child: Material(
          type: MaterialType.transparency,
          child: Container(
            padding: const EdgeInsets.all(4),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.95),
              borderRadius: BorderRadius.circular(30),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.18),
                  blurRadius: 12,
                  spreadRadius: 1,
                  offset: const Offset(0, 4),
                ),
              ],
              border: Border.all(color: const Color(0xFFE2E8F0), width: 1.5),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // ── 1. WHATSAPP SUPPORT BUTTON (LOGO ONLY) ───────────────────
                Tooltip(
                  message: 'WhatsApp MediBridge Support',
                  child: InkWell(
                    onTap: _launchWhatsApp,
                    borderRadius: BorderRadius.circular(26),
                    child: Container(
                      width: 48,
                      height: 48,
                      decoration: const BoxDecoration(
                        color: Color(0xFF25D366), // Official WhatsApp Green
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                            color: Color(0x4025D366),
                            blurRadius: 8,
                            offset: Offset(0, 3),
                          ),
                        ],
                      ),
                      child: const Center(
                        child: Icon(
                          Icons.chat_bubble,
                          color: Colors.white,
                          size: 24,
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 8),

                // ── 2. PHONE CALL BUTTON (LOGO ONLY) ─────────────────────────
                Tooltip(
                  message: 'Call MediBridge Hotline',
                  child: InkWell(
                    onTap: _makeCall,
                    borderRadius: BorderRadius.circular(26),
                    child: Container(
                      width: 48,
                      height: 48,
                      decoration: const BoxDecoration(
                        color: Color(0xFF0284C7), // Vibrant Call Blue
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                            color: Color(0x400284C7),
                            blurRadius: 8,
                            offset: Offset(0, 3),
                          ),
                        ],
                      ),
                      child: const Center(
                        child: Icon(
                          Icons.phone,
                          color: Colors.white,
                          size: 24,
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 4),

                // Tiny Drag Handle Indicator Icon
                const Icon(
                  Icons.drag_handle,
                  size: 14,
                  color: Color(0xFF94A3B8),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
