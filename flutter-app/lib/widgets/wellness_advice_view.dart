import 'package:flutter/material.dart';
import '../models/wellness_response.dart';

class WellnessAdviceView extends StatelessWidget {
  final WellnessAdvice advice;
  final void Function(WellnessProduct) onProductTap;
  final void Function(WellnessProduct) onAddToCart;

  const WellnessAdviceView({
    super.key,
    required this.advice,
    required this.onProductTap,
    required this.onAddToCart,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 6),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (advice.symptomCategory.isNotEmpty)
            Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: const Color(0xFFEFF6FF),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                '📌 ${advice.symptomCategory}',
                style: const TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF1E40AF),
                ),
              ),
            ),
          const SizedBox(height: 10),
          if (advice.summary.isNotEmpty)
            Text(
              advice.summary,
              style: const TextStyle(
                fontSize: 13.5,
                height: 1.55,
                color: Color(0xFF0F172A),
              ),
            ),
          const SizedBox(height: 12),
          if (advice.homeRemedies.isNotEmpty) ...[
            _sectionTitle('🏠 Recommended Home Remedies'),
            ...advice.homeRemedies.map(_bullet),
            const SizedBox(height: 12),
          ],
          if (advice.recommendedProducts.isNotEmpty) ...[
            _sectionTitle('💊 Safe OTC Products (In Stock)'),
            const SizedBox(height: 6),
            ...advice.recommendedProducts
                .map((p) => _productCard(context: context, p: p)),
            const SizedBox(height: 12),
          ],
          if (advice.warningSigns.isNotEmpty) ...[
            _warningBox(advice.warningSigns),
            const SizedBox(height: 12),
          ],
          if (advice.consultDoctorIf.isNotEmpty) ...[
            _consultBox(advice.consultDoctorIf),
            const SizedBox(height: 12),
          ],
          if (advice.disclaimer.isNotEmpty)
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFFF1F5F9),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                advice.disclaimer,
                style: const TextStyle(
                  fontSize: 11,
                  fontStyle: FontStyle.italic,
                  color: Color(0xFF64748B),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _sectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Text(
        title,
        style: const TextStyle(
          fontSize: 13,
          fontWeight: FontWeight.bold,
          color: Color(0xFF0F172A),
        ),
      ),
    );
  }

  Widget _bullet(String text) {
    return Padding(
      padding: const EdgeInsets.only(left: 4, bottom: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            '• ',
            style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
          ),
          Expanded(
            child: Text(
              text,
              style: const TextStyle(fontSize: 13, height: 1.5),
            ),
          ),
        ],
      ),
    );
  }

  Widget _productCard({
    required BuildContext context,
    required WellnessProduct p,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Row(
        children: [
          Expanded(
            child: GestureDetector(
              onTap: () => onProductTap(p),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Flexible(
                        child: Text(
                          p.name,
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF0F172A),
                          ),
                        ),
                      ),
                      const SizedBox(width: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 5, vertical: 1),
                        decoration: BoxDecoration(
                          color: const Color(0xFF10B981),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: const Text(
                          'OTC',
                          style: TextStyle(
                            fontSize: 9,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                      ),
                    ],
                  ),
                  if (p.whyRecommended != null &&
                      p.whyRecommended!.isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.only(top: 2),
                      child: Text(
                        p.whyRecommended!,
                        style: const TextStyle(
                          fontSize: 11,
                          color: Color(0xFF64748B),
                        ),
                      ),
                    ),
                  Padding(
                    padding: const EdgeInsets.only(top: 2),
                    child: Text(
                      'Rs. ${p.price.toStringAsFixed(2)} • ${p.productType ?? "Pill"}',
                      style: const TextStyle(
                        fontSize: 11.5,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF059669),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          ElevatedButton(
            onPressed: () => onAddToCart(p),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF10B981),
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(
                  horizontal: 10, vertical: 6),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8)),
              minimumSize: Size.zero,
            ),
            child: const Text('Add', style: TextStyle(fontSize: 11.5)),
          ),
        ],
      ),
    );
  }

  Widget _warningBox(List<String> items) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFFEF2F2),
        border: Border.all(color: const Color(0xFFFECACA)),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            '⚠️ Urgent Red Flag Warning Signs',
            style: TextStyle(
              fontSize: 12.5,
              fontWeight: FontWeight.bold,
              color: Color(0xFF991B1B),
            ),
          ),
          const SizedBox(height: 6),
          ...items.map(
            (w) => Padding(
              padding: const EdgeInsets.only(left: 4, bottom: 3),
              child: Text(
                '• $w',
                style: const TextStyle(
                  fontSize: 12,
                  color: Color(0xFF991B1B),
                  height: 1.5,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _consultBox(List<String> items) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFEFF6FF),
        border: Border.all(color: const Color(0xFFBFDBFE)),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            '🩺 When to Consult a Medical Doctor',
            style: TextStyle(
              fontSize: 12.5,
              fontWeight: FontWeight.bold,
              color: Color(0xFF1E40AF),
            ),
          ),
          const SizedBox(height: 6),
          ...items.map(
            (c) => Padding(
              padding: const EdgeInsets.only(left: 4, bottom: 3),
              child: Text(
                '• $c',
                style: const TextStyle(
                  fontSize: 12,
                  color: Color(0xFF1E40AF),
                  height: 1.5,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
