using System.ComponentModel.DataAnnotations;

namespace HealthBridge.Api.Models.Pharmacy;

public class SymptomAdviceHistory
{
    [Key]
    public int Id { get; set; }
    
    public string? PatientEmail { get; set; }
    public string Symptom { get; set; } = "";
    public string SymptomCategory { get; set; } = "";
    public string Summary { get; set; } = "";
    public string ResponseJson { get; set; } = "";
    public string EngineUsed { get; set; } = "";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
