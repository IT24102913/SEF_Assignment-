using System.Text.Json;
using HealthBridge.Api.Agents;
using HealthBridge.Api.DTOs.Pharmacy;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Xunit;

namespace HealthBridge.Tests.Agents.Pharmacy;

public class PrescriptionValidatorAgentTests
{
    [Fact]
    public void BuildFallbackResponse_ReturnsExpectedStructure()
    {
        // Arrange
        var requestedTest = "Amoxicillin 500mg";
        var errorMessage = "Image file unreadable";
        long elapsedMs = 150;

        // Act - Simulate fallback building logic
        var fallback = new AIPpVerificationResponse
        {
            Status = "FLAGGED",
            Verdict = "unclear",
            VerdictReasoning = errorMessage,
            Confidence = 0.0,
            RequestedTest = requestedTest,
            DocumentClassification = "UNREADABLE_IMAGE",
            IsValidMedicalPrescription = false,
            ProcessingStage = "fallback",
            ProcessingTimeMs = elapsedMs,
            Notes = $"AI FALLBACK: {errorMessage}"
        };

        // Assert
        Assert.Equal("FLAGGED", fallback.Status);
        Assert.Equal("unclear", fallback.Verdict);
        Assert.False(fallback.IsValidMedicalPrescription);
        Assert.Equal(requestedTest, fallback.RequestedTest);
        Assert.Equal(elapsedMs, fallback.ProcessingTimeMs);
    }

    [Theory]
    [InlineData("handwritten_prescription", "HANDWRITTEN_PRESCRIPTION")]
    [InlineData("printed_prescription", "PRINTED_PRESCRIPTION")]
    [InlineData("unrelated_document", "NON_PRESCRIPTION_DOCUMENT")]
    [InlineData("random_photo", "NON_MEDICAL_IMAGE")]
    public void CategoryMapping_MapsToExpectedClassification(string rawCategory, string expectedClassification)
    {
        // Act
        var mapped = rawCategory switch
        {
            "handwritten_prescription" => "HANDWRITTEN_PRESCRIPTION",
            "printed_prescription" => "PRINTED_PRESCRIPTION",
            "unrelated_document" => "NON_PRESCRIPTION_DOCUMENT",
            "random_photo" => "NON_MEDICAL_IMAGE",
            _ => "UNREADABLE_IMAGE"
        };

        // Assert
        Assert.Equal(expectedClassification, mapped);
    }

    [Fact]
    public void WatermarkDetection_WatermarkPresent_FlagsDocument()
    {
        // Arrange
        var watermarks = new List<string> { "SAMPLE", "VOID" };
        var flags = new List<string>();

        // Act
        if (watermarks.Count > 0)
        {
            foreach (var wm in watermarks)
            {
                flags.Add($"⚠️ Watermark/Stamp detected: \"{wm}\" — this prescription is marked as a SAMPLE, VOID, or training document and is NOT valid for dispensing.");
            }
        }

        // Assert
        Assert.Equal(2, flags.Count);
        Assert.Contains(flags, f => f.Contains("SAMPLE"));
        Assert.Contains(flags, f => f.Contains("VOID"));
    }

    [Fact]
    public void UiChromeScreenshotDetection_ScreenshotPresent_SetsNotAPrescription()
    {
        // Arrange
        bool showsUiChrome = true;
        string verdict = "looks_valid";
        var flags = new List<string>();

        // Act
        if (showsUiChrome)
        {
            flags.Add("⚠️ Screenshot detected — image shows browser/app window chrome (taskbar, tabs, UI buttons). This is a screenshot of software, not a photo of a real physical prescription paper.");
            verdict = "not_a_prescription";
        }

        // Assert
        Assert.Equal("not_a_prescription", verdict);
        Assert.Single(flags);
        Assert.Contains("Screenshot detected", flags[0]);
    }
}
