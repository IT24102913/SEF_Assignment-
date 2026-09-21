namespace HealthBridge.Api.Models;

public static class UserRole
{
    public const string Patient = "Patient";
    public const string Admin = "Admin";
    public const string Pharmacist = "Pharmacist";
    public const string Doctor = "Doctor";
    public const string Laboratory = "Laboratory";

    public static readonly IReadOnlyCollection<string> All = new[]
    {
        Patient, Admin, Pharmacist, Doctor, Laboratory
    };
}
