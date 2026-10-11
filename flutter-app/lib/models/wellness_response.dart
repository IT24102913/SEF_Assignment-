class WellnessAdvice {
  final int? id;
  final String symptom;
  final String symptomCategory;
  final String summary;
  final List<String> homeRemedies;
  final List<String> warningSigns;
  final List<WellnessProduct> recommendedProducts;
  final List<String> consultDoctorIf;
  final String disclaimer;
  final DateTime generatedAt;
  final String engineUsed;
  final bool fromCache;
  final bool needsClarification;
  final List<ClarifyingQuestion> clarifyingQuestions;

  WellnessAdvice({
    this.id,
    required this.symptom,
    required this.symptomCategory,
    required this.summary,
    required this.homeRemedies,
    required this.warningSigns,
    required this.recommendedProducts,
    required this.consultDoctorIf,
    required this.disclaimer,
    required this.generatedAt,
    required this.engineUsed,
    this.fromCache = false,
    this.needsClarification = false,
    this.clarifyingQuestions = const [],
  });

  factory WellnessAdvice.fromJson(Map<String, dynamic> j) {
    return WellnessAdvice(
      id: j['id'] as int?,
      symptom: j['symptom']?.toString() ?? '',
      symptomCategory: j['symptomCategory']?.toString() ?? '',
      summary: j['summary']?.toString() ?? '',
      homeRemedies: (j['homeRemedies'] as List?)
              ?.map((e) => e.toString())
              .toList() ??
          [],
      warningSigns: (j['warningSigns'] as List?)
              ?.map((e) => e.toString())
              .toList() ??
          [],
      recommendedProducts: (j['recommendedProducts'] as List?)
              ?.map((e) =>
                  WellnessProduct.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      consultDoctorIf: (j['consultDoctorIf'] as List?)
              ?.map((e) => e.toString())
              .toList() ??
          [],
      disclaimer: j['disclaimer']?.toString() ?? '',
      generatedAt: DateTime.tryParse(
              j['generatedAt']?.toString() ?? '') ??
          DateTime.now(),
      engineUsed: j['engineUsed']?.toString() ?? '',
      fromCache: j['fromCache'] == true,
      needsClarification: j['needsClarification'] == true,
      clarifyingQuestions: (j['clarifyingQuestions'] as List?)
              ?.map((e) =>
                  ClarifyingQuestion.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }
}

class WellnessProduct {
  final int medicineId;
  final String name;
  final String category;
  final double price;
  final int stockQuantity;
  final String? brandName;
  final String? productType;
  final String? whyRecommended;
  final String? howToUse;
  final String? duration;

  WellnessProduct({
    required this.medicineId,
    required this.name,
    required this.category,
    required this.price,
    required this.stockQuantity,
    this.brandName,
    this.productType,
    this.whyRecommended,
    this.howToUse,
    this.duration,
  });

  factory WellnessProduct.fromJson(Map<String, dynamic> j) {
    return WellnessProduct(
      medicineId: (j['medicineId'] as num?)?.toInt() ?? 0,
      name: j['name']?.toString() ?? '',
      category: j['category']?.toString() ?? '',
      price: (j['price'] as num?)?.toDouble() ?? 0,
      stockQuantity: (j['stockQuantity'] as num?)?.toInt() ?? 0,
      brandName: j['brandName']?.toString(),
      productType: j['productType']?.toString(),
      whyRecommended: j['whyRecommended']?.toString(),
      howToUse: j['howToUse']?.toString(),
      duration: j['duration']?.toString(),
    );
  }
}

class ClarifyingQuestion {
  final String id;
  final String question;
  final List<String> options;

  ClarifyingQuestion({
    required this.id,
    required this.question,
    required this.options,
  });

  factory ClarifyingQuestion.fromJson(Map<String, dynamic> j) {
    return ClarifyingQuestion(
      id: j['id']?.toString() ?? '',
      question: j['question']?.toString() ?? '',
      options: (j['options'] as List?)
              ?.map((e) => e.toString())
              .toList() ??
          [],
    );
  }
}

class WellnessHistoryItem {
  final int id;
  final String symptom;
  final String symptomCategory;
  final String summary;
  final DateTime createdAt;
  final String engineUsed;

  WellnessHistoryItem({
    required this.id,
    required this.symptom,
    required this.symptomCategory,
    required this.summary,
    required this.createdAt,
    required this.engineUsed,
  });

  factory WellnessHistoryItem.fromJson(Map<String, dynamic> j) {
    return WellnessHistoryItem(
      id: (j['id'] as num?)?.toInt() ?? 0,
      symptom: j['symptom']?.toString() ?? '',
      symptomCategory: j['symptomCategory']?.toString() ?? '',
      summary: j['summary']?.toString() ?? '',
      createdAt: DateTime.tryParse(
              j['createdAt']?.toString() ?? '') ??
          DateTime.now(),
      engineUsed: j['engineUsed']?.toString() ?? '',
    );
  }
}
