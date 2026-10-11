using HealthBridge.Api.Agents.Lab;
using Xunit;

namespace HealthBridge.Tests.Agents.Lab;

public class PrescriptionVerificationAgentTests
{
    [Theory]
    [InlineData("Diniru Gamage", "Diniru Gamage")]
    [InlineData("Diniru Gamage", "Mr. Diniru Gamage")]
    [InlineData("Diniru Gamage", "Diniru G.")]
    [InlineData("Diniru Gamage", "D. Gamage")]
    [InlineData("Diniru Gamage", "Dr. Diniru Gamage")]
    public void EvaluatePatientNameMatch_MatchingNames_ReturnsMatchTrue(string profileName, string detectedName)
    {
        var (isMatch, finalName, reason) = PrescriptionVerificationAgent.EvaluatePatientNameMatch(
            profileName,
            detectedName,
            geminiReportedMatch: true,
            geminiReason: null
        );

        Assert.True(isMatch);
        Assert.Null(reason);
        Assert.Equal(detectedName, finalName);
    }

    [Theory]
    [InlineData("Diniru Gamage", "Mrs. K. A. Perera")]
    [InlineData("Diniru Gamage", "Sunil Perera")]
    [InlineData("Alice Wonderland", "Bob Builder")]
    public void EvaluatePatientNameMatch_MismatchedNames_ReturnsMatchFalse(string profileName, string detectedName)
    {
        var (isMatch, finalName, reason) = PrescriptionVerificationAgent.EvaluatePatientNameMatch(
            profileName,
            detectedName,
            geminiReportedMatch: false,
            geminiReason: $"Name '{detectedName}' does not match."
        );

        Assert.False(isMatch);
        Assert.NotNull(reason);
        Assert.Contains(detectedName, finalName);
    }

    [Theory]
    [InlineData("Diniru Gamage", "")]
    [InlineData("Diniru Gamage", "Unknown")]
    [InlineData("Diniru Gamage", "Not Detected")]
    [InlineData("Diniru Gamage", null)]
    public void EvaluatePatientNameMatch_UnreadableOrEmpty_ReturnsMatchFalse(string profileName, string? detectedName)
    {
        var (isMatch, finalName, reason) = PrescriptionVerificationAgent.EvaluatePatientNameMatch(
            profileName,
            detectedName,
            geminiReportedMatch: null,
            geminiReason: null
        );

        Assert.False(isMatch);
        Assert.NotNull(reason);
        Assert.Contains("No readable patient name was identified", reason);
    }

    [Fact]
    public void EvaluatePrescriptionDate_Old2020Date_ReturnsExpired()
    {
        var refDate = new DateOnly(2026, 9, 26);
        var oldDate = new DateOnly(2020, 5, 12);

        var (isValid, isExpired, reason) = PrescriptionVerificationAgent.EvaluatePrescriptionDate(
            oldDate,
            aiReportedDateValid: null,
            aiReportedExpired: null,
            aiReportedReason: null,
            referenceDate: refDate,
            validityDays: 90
        );

        Assert.False(isValid);
        Assert.True(isExpired);
        Assert.NotNull(reason);
        Assert.Contains("expired", reason, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("2020-05-12", reason);
    }

    [Theory]
    [InlineData(10)]
    [InlineData(30)]
    [InlineData(60)]
    [InlineData(90)]
    public void EvaluatePrescriptionDate_Within90Days_ReturnsValid(int daysOld)
    {
        var refDate = new DateOnly(2026, 9, 26);
        var date = refDate.AddDays(-daysOld);

        var (isValid, isExpired, reason) = PrescriptionVerificationAgent.EvaluatePrescriptionDate(
            date,
            aiReportedDateValid: true,
            aiReportedExpired: false,
            aiReportedReason: null,
            referenceDate: refDate,
            validityDays: 90
        );

        Assert.True(isValid);
        Assert.False(isExpired);
        Assert.Null(reason);
    }

    [Fact]
    public void EvaluatePrescriptionDate_Exceeds90DaysBoundary_ReturnsExpired()
    {
        var refDate = new DateOnly(2026, 9, 26);
        var date = refDate.AddDays(-91);

        var (isValid, isExpired, reason) = PrescriptionVerificationAgent.EvaluatePrescriptionDate(
            date,
            aiReportedDateValid: null,
            aiReportedExpired: null,
            aiReportedReason: null,
            referenceDate: refDate,
            validityDays: 90
        );

        Assert.False(isValid);
        Assert.True(isExpired);
        Assert.NotNull(reason);
        Assert.Contains("expired", reason, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void EvaluatePrescriptionDate_FutureDate_ReturnsInvalid()
    {
        var refDate = new DateOnly(2026, 9, 26);
        var futureDate = new DateOnly(2026, 10, 15);

        var (isValid, isExpired, reason) = PrescriptionVerificationAgent.EvaluatePrescriptionDate(
            futureDate,
            aiReportedDateValid: null,
            aiReportedExpired: null,
            aiReportedReason: null,
            referenceDate: refDate,
            validityDays: 90
        );

        Assert.False(isValid);
        Assert.False(isExpired);
        Assert.NotNull(reason);
        Assert.Contains("future", reason, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void EvaluatePrescriptionDate_NullDate_ReturnsInvalid()
    {
        var (isValid, isExpired, reason) = PrescriptionVerificationAgent.EvaluatePrescriptionDate(null);

        Assert.False(isValid);
        Assert.False(isExpired);
        Assert.NotNull(reason);
        Assert.Contains("not detected", reason, StringComparison.OrdinalIgnoreCase);
    }

    [Theory]
    [InlineData("Full Blood Count", new[] { "CBC", "ESR" }, true)]
    [InlineData("Fasting Blood Sugar", new[] { "FBS", "Lipid Profile" }, true)]
    [InlineData("Liver Function Test", new[] { "LFT" }, true)]
    [InlineData("HIV 1/2 Antibody Screening", new[] { "HIV ELISA", "VDRL" }, true)]
    [InlineData("Lipid Profile", new[] { "Lipid Panel" }, true)]
    public void EvaluateInvestigationMatch_CanonicalSynonyms_ReturnsMatch(string requestedTest, string[] prescribed, bool expectedMatch)
    {
        var (isMatch, reason) = PrescriptionVerificationAgent.EvaluateInvestigationMatch(requestedTest, prescribed);

        Assert.Equal(expectedMatch, isMatch);
        Assert.Null(reason);
    }

    [Fact]
    public void EvaluateInvestigationMatch_Mismatch_ReturnsFalseAndReason()
    {
        var (isMatch, reason) = PrescriptionVerificationAgent.EvaluateInvestigationMatch(
            "HIV 1/2 Antibody Screening",
            new[] { "Urine Full Report", "Fasting Blood Sugar" }
        );

        Assert.False(isMatch);
        Assert.NotNull(reason);
        Assert.Contains("do not include requested test", reason, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("HIV 1/2 Antibody Screening", reason, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void EvaluateInvestigationMatch_NoTestsOnSlip_ReturnsFalseAndReason()
    {
        var (isMatch, reason) = PrescriptionVerificationAgent.EvaluateInvestigationMatch(
            "Full Blood Count",
            Array.Empty<string>()
        );

        Assert.False(isMatch);
        Assert.NotNull(reason);
        Assert.Contains("No medical investigations matching", reason, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void EvaluateInvestigationMatch_GeminiConfirmed_ReturnsMatch()
    {
        var (isMatch, reason) = PrescriptionVerificationAgent.EvaluateInvestigationMatch(
            "Custom Specialized Assay",
            new[] { "Unrecognized Text" },
            geminiReportedMatch: true
        );

        Assert.True(isMatch);
        Assert.Null(reason);
    }
}
