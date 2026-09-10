import 'package:flutter_test/flutter_test.dart';
import 'package:lab_patient_app/main.dart';

void main() {
  testWidgets('Health Bridge App Smoke Test', (WidgetTester tester) async {
    await tester.pumpWidget(const HealthBridgeApp());
    expect(find.byType(HealthBridgeApp), findsOneWidget);
  });
}
