using HealthBridge.Api.Models;
using HealthBridge.Api.Models.EMR;
using Microsoft.EntityFrameworkCore;

namespace HealthBridge.Api.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<PatientProfile> PatientProfiles => Set<PatientProfile>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Medicine> Medicines => Set<Medicine>();
    public DbSet<PrescriptionSubmission> PrescriptionSubmissions => Set<PrescriptionSubmission>();
    public DbSet<PharmacyOrder> PharmacyOrders => Set<PharmacyOrder>();
    public DbSet<PharmacyOrderItem> PharmacyOrderItems => Set<PharmacyOrderItem>();
    public DbSet<LabTest> LabTests => Set<LabTest>();
    public DbSet<LabBooking> LabBookings => Set<LabBooking>();
    public DbSet<LabTimeSlot> LabTimeSlots => Set<LabTimeSlot>();
    public DbSet<Doctor> Doctors => Set<Doctor>();
    public DbSet<DoctorSession> DoctorSessions => Set<DoctorSession>();
    public DbSet<DoctorAppointment> DoctorAppointments => Set<DoctorAppointment>();
    public DbSet<PatientFeedback> PatientFeedbacks => Set<PatientFeedback>();
    public DbSet<Payment> Payments => Set<Payment>();

    // EMR Module
    public DbSet<Patient> Patients => Set<Patient>();
    public DbSet<ConsultationNote> ConsultationNotes => Set<ConsultationNote>();
    public DbSet<LabReport> LabReports => Set<LabReport>();
    public DbSet<Prescription> Prescriptions => Set<Prescription>();
    public DbSet<ChannelingAppointment> ChannelingAppointments => Set<ChannelingAppointment>();
    public DbSet<EMRAuditLog> EMRAuditLogs => Set<EMRAuditLog>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // User entity configuration
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasIndex(u => u.Email).IsUnique();
            entity.Property(u => u.Role).HasDefaultValue(UserRole.Patient);
            entity.Property(u => u.IsActive).HasDefaultValue(true);
        });

        // PatientProfile configuration
        modelBuilder.Entity<PatientProfile>(entity =>
        {
            entity.HasKey(p => p.Id);
            entity.HasOne(p => p.User)
                  .WithOne()
                  .HasForeignKey<PatientProfile>(p => p.UserId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // Category entity configuration
        modelBuilder.Entity<Category>(entity =>
        {
            entity.Property(c => c.Name).IsRequired().HasMaxLength(100);
        });

        // Medicine entity configuration
        modelBuilder.Entity<Medicine>(entity =>
        {
            entity.Property(m => m.Name).IsRequired().HasMaxLength(150);
            entity.Property(m => m.Price).HasPrecision(18, 2);

            entity.HasOne(m => m.Category)
                .WithMany(c => c.Medicines)
                .HasForeignKey(m => m.CategoryId)
                .OnDelete(DeleteBehavior.Restrict); // Prevent deletion of Category if Medicines exist
        });

        // PrescriptionSubmission configuration
        modelBuilder.Entity<PrescriptionSubmission>(entity =>
        {
            entity.HasKey(p => p.Id);
            entity.HasIndex(p => p.PrescriptionCode).IsUnique();
            entity.HasOne(p => p.Patient)
                  .WithMany()
                  .HasForeignKey(p => p.PatientId)
                  .OnDelete(DeleteBehavior.SetNull);
        });

        // PharmacyOrder configuration
        modelBuilder.Entity<PharmacyOrder>(entity =>
        {
            entity.HasKey(o => o.Id);
            entity.HasIndex(o => o.OrderNumber).IsUnique();
            entity.Property(o => o.TotalAmount).HasPrecision(18, 2);
            entity.HasOne(o => o.Patient)
                  .WithMany()
                  .HasForeignKey(o => o.PatientId)
                  .OnDelete(DeleteBehavior.SetNull);
        });

        // PharmacyOrderItem configuration
        modelBuilder.Entity<PharmacyOrderItem>(entity =>
        {
            entity.HasKey(i => i.Id);
            entity.Property(i => i.UnitPrice).HasPrecision(18, 2);
            entity.Property(i => i.Subtotal).HasPrecision(18, 2);
            entity.HasOne(i => i.PharmacyOrder)
                  .WithMany(o => o.Items)
                  .HasForeignKey(i => i.PharmacyOrderId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(i => i.Medicine)
                  .WithMany()
                  .HasForeignKey(i => i.MedicineId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        // LabTest configuration
        modelBuilder.Entity<LabTest>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Price).HasColumnType("decimal(10,2)");
            entity.HasIndex(e => e.Name);
            entity.HasIndex(e => e.Category);
        });

        // LabBooking configuration
        modelBuilder.Entity<LabBooking>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Status).HasConversion<string>();
            entity.Property(e => e.AIVerification).HasConversion<string>();
            entity.Property(e => e.PaymentStatus).HasConversion<string>();
            entity.HasOne(e => e.LabTest)
                  .WithMany(t => t.Bookings)
                  .HasForeignKey(e => e.LabTestId)
                  .OnDelete(DeleteBehavior.Restrict);
            entity.HasIndex(e => e.PatientId);
            entity.HasIndex(e => e.Status);
        });

        // LabTimeSlot configuration
        modelBuilder.Entity<LabTimeSlot>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.Date, e.Time }).IsUnique();
        });

        // Payment configuration
        modelBuilder.Entity<Payment>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Amount).HasPrecision(18, 2);
            entity.Property(e => e.Status).HasConversion<string>();
            entity.Property(e => e.Module).HasConversion<string>();
            entity.HasIndex(e => e.ReferenceId);
        });

        // Doctor configuration
        modelBuilder.Entity<Doctor>(entity =>
        {
            entity.HasKey(d => d.Id);
            entity.Property(d => d.ConsultationFee).HasPrecision(18, 2);
            entity.Property(d => d.Rating).HasPrecision(3, 2);
            entity.HasIndex(d => d.Specialization);
            entity.HasIndex(d => d.HospitalBranch);
        });

        // DoctorSession configuration
        modelBuilder.Entity<DoctorSession>(entity =>
        {
            entity.HasKey(s => s.Id);
            entity.HasIndex(s => new { s.DoctorId, s.SessionDate, s.SessionTime }).IsUnique();
            entity.HasOne(s => s.Doctor)
                  .WithMany(d => d.Sessions)
                  .HasForeignKey(s => s.DoctorId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // DoctorAppointment configuration
        modelBuilder.Entity<DoctorAppointment>(entity =>
        {
            entity.HasKey(a => a.Id);
            entity.Property(a => a.Status).HasConversion<string>();
            entity.Property(a => a.ConsultationFee).HasPrecision(18, 2);
            entity.Property(a => a.ServiceCharge).HasPrecision(18, 2);
            entity.Property(a => a.TotalAmount).HasPrecision(18, 2);

            entity.HasOne(a => a.Doctor)
                  .WithMany(d => d.Appointments)
                  .HasForeignKey(a => a.DoctorId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(a => a.DoctorSession)
                  .WithMany()
                  .HasForeignKey(a => a.DoctorSessionId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(a => a.AppointmentNumber).IsUnique();
            entity.HasIndex(a => a.PatientId);
            entity.HasIndex(a => a.Status);
        });

        // Seed some lab tests
        modelBuilder.Entity<LabTest>().HasData(
            new LabTest { Id = Guid.Parse("11111111-1111-1111-1111-111111111111"), Name = "Complete Blood Count (CBC)", Description = "Measures different components of blood including red/white cells and platelets.", Price = 1500, IsRestricted = false, TurnaroundDays = 1, Category = "Haematology" },
            new LabTest { Id = Guid.Parse("22222222-2222-2222-2222-222222222222"), Name = "Lipid Panel", Description = "Measures cholesterol and triglyceride levels in the blood.", Price = 2500, IsRestricted = true, TurnaroundDays = 1, Category = "Biochemistry" },
            new LabTest { Id = Guid.Parse("33333333-3333-3333-3333-333333333333"), Name = "Blood Glucose Fasting", Description = "Measures blood sugar levels after an 8-hour fast.", Price = 500, IsRestricted = false, TurnaroundDays = 1, Category = "Biochemistry" },
            new LabTest { Id = Guid.Parse("44444444-4444-4444-4444-444444444444"), Name = "Thyroid Function Test (TFT)", Description = "Evaluates thyroid gland function (TSH, T3, T4).", Price = 3500, IsRestricted = true, TurnaroundDays = 2, Category = "Endocrinology" },
            new LabTest { Id = Guid.Parse("55555555-5555-5555-5555-555555555555"), Name = "Urine Full Report (UFR)", Description = "Analyses physical, chemical and microscopic properties of urine.", Price = 800, IsRestricted = false, TurnaroundDays = 1, Category = "Microbiology" },
            new LabTest { Id = Guid.Parse("66666666-6666-6666-6666-666666666666"), Name = "Chest X-Ray", Description = "Imaging of lungs, heart and chest wall.", Price = 2000, IsRestricted = true, TurnaroundDays = 1, Category = "Radiology" },
            new LabTest { Id = Guid.Parse("77777777-7777-7777-7777-777777777777"), Name = "Liver Function Test (LFT)", Description = "Assesses liver health via enzyme and protein levels.", Price = 3000, IsRestricted = true, TurnaroundDays = 2, Category = "Biochemistry" },
            new LabTest { Id = Guid.Parse("88888888-8888-8888-8888-888888888888"), Name = "ESR (Erythrocyte Sedimentation Rate)", Description = "Detects inflammation in the body.", Price = 600, IsRestricted = false, TurnaroundDays = 1, Category = "Haematology" }
        );

        // ─── EMR Configurations ───────────────────────────────────────────────

        // Patient configuration
        modelBuilder.Entity<Patient>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.PatientCode).IsUnique();
            entity.HasIndex(e => e.Email);
            entity.Property(e => e.PatientCode).IsRequired().HasMaxLength(50);
            entity.Property(e => e.FullName).IsRequired().HasMaxLength(200);
            entity.Property(e => e.BloodGroup).HasMaxLength(10);
            entity.Property(e => e.Gender).HasMaxLength(20);
        });

        // ConsultationNote configuration
        modelBuilder.Entity<ConsultationNote>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.Patient)
                  .WithMany(p => p.ConsultationNotes)
                  .HasForeignKey(e => e.PatientId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(e => e.PatientId);
            entity.HasIndex(e => e.PatientCode);
            entity.HasIndex(e => e.ConsultationDate);
        });

        // LabReport configuration
        modelBuilder.Entity<LabReport>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.Patient)
                  .WithMany(p => p.LabReports)
                  .HasForeignKey(e => e.PatientId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(e => e.PatientId);
            entity.HasIndex(e => e.PatientCode);
            entity.HasIndex(e => e.Status);
        });

        // Prescription configuration
        modelBuilder.Entity<Prescription>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.UnitPrice).HasColumnType("decimal(10,2)");
            entity.HasOne(e => e.Patient)
                  .WithMany(p => p.Prescriptions)
                  .HasForeignKey(e => e.PatientId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(e => e.PatientId);
            entity.HasIndex(e => e.PatientCode);
            entity.HasIndex(e => e.Status);
        });

        // ChannelingAppointment configuration
        modelBuilder.Entity<ChannelingAppointment>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.Patient)
                  .WithMany(p => p.ChannelingAppointments)
                  .HasForeignKey(e => e.PatientId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(e => e.PatientId);
            entity.HasIndex(e => e.PatientCode);
            entity.HasIndex(e => e.AppointmentDate);
        });

        // EMRAuditLog configuration
        modelBuilder.Entity<EMRAuditLog>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Timestamp);
            entity.HasIndex(e => e.PatientId);
        });

        // ─── EMR Seed Data ────────────────────────────────────────────────────
        var patient1Id = Guid.Parse("a1111111-1111-1111-1111-111111111111");
        var patient2Id = Guid.Parse("a2222222-2222-2222-2222-222222222222");
        var patient3Id = Guid.Parse("a3333333-3333-3333-3333-333333333333");

        modelBuilder.Entity<Patient>().HasData(
            new Patient
            {
                Id = patient1Id,
                PatientCode = "PAT-1001",
                FullName = "John Anderson",
                DateOfBirth = new DateTime(1985, 5, 14, 0, 0, 0, DateTimeKind.Utc),
                Gender = "Male",
                BloodGroup = "O+",
                ContactPhone = "+1 555-0192",
                Email = "john.anderson@example.com",
                Address = "742 Evergreen Terrace, Springfield",
                EmergencyContactName = "Mary Anderson (Spouse)",
                EmergencyContactPhone = "+1 555-0193",
                Allergies = "Penicillin, Peanuts",
                ChronicConditions = "Stage 1 Hypertension, Mild Asthma",
                CreatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc),
                UpdatedAt = new DateTime(2026, 8, 1, 0, 0, 0, DateTimeKind.Utc)
            },
            new Patient
            {
                Id = patient2Id,
                PatientCode = "PAT-1002",
                FullName = "Maria Garcia",
                DateOfBirth = new DateTime(1992, 8, 22, 0, 0, 0, DateTimeKind.Utc),
                Gender = "Female",
                BloodGroup = "A+",
                ContactPhone = "+1 555-0284",
                Email = "maria.garcia@example.com",
                Address = "120 Elm Street, Dallas",
                EmergencyContactName = "Carlos Garcia (Brother)",
                EmergencyContactPhone = "+1 555-0285",
                Allergies = "Sulfa antibiotics",
                ChronicConditions = "Type 2 Diabetes Mellitus",
                CreatedAt = new DateTime(2026, 2, 10, 0, 0, 0, DateTimeKind.Utc),
                UpdatedAt = new DateTime(2026, 8, 10, 0, 0, 0, DateTimeKind.Utc)
            },
            new Patient
            {
                Id = patient3Id,
                PatientCode = "PAT-1003",
                FullName = "Robert Kim",
                DateOfBirth = new DateTime(1968, 11, 3, 0, 0, 0, DateTimeKind.Utc),
                Gender = "Male",
                BloodGroup = "B+",
                ContactPhone = "+1 555-0371",
                Email = "robert.kim@example.com",
                Address = "88 Pine Avenue, Seattle",
                EmergencyContactName = "Susan Kim (Daughter)",
                EmergencyContactPhone = "+1 555-0372",
                Allergies = "None reported",
                ChronicConditions = "Hyperlipidemia",
                CreatedAt = new DateTime(2026, 3, 15, 0, 0, 0, DateTimeKind.Utc),
                UpdatedAt = new DateTime(2026, 8, 15, 0, 0, 0, DateTimeKind.Utc)
            }
        );

        // Seed Consultation Notes for PAT-1001
        modelBuilder.Entity<ConsultationNote>().HasData(
            new ConsultationNote
            {
                Id = Guid.Parse("c1111111-1111-1111-1111-111111111111"),
                PatientId = patient1Id,
                PatientCode = "PAT-1001",
                DoctorId = "DOC-101",
                DoctorName = "Dr. Sarah Chen",
                DoctorDesignation = "Senior Consultant Cardiologist",
                ConsultationDate = new DateTime(2026, 8, 10, 10, 30, 0, DateTimeKind.Utc),
                Diagnosis = "Stage 1 Essential Hypertension with sinus rhythm",
                RecommendedTests = "Complete Blood Count (CBC), Lipid Panel, Resting ECG",
                PrescribedMedicines = "[{\"name\":\"Lisinopril\",\"dosage\":\"10mg once daily in morning\",\"duration\":\"30 Days\"},{\"name\":\"Amlodipine\",\"dosage\":\"5mg once daily\",\"duration\":\"30 Days\"}]",
                ClinicalNotes = "Patient presented with mild morning headaches and recorded BP 142/92 mmHg over 3 consecutive clinic visits. Denies chest pain, palpitation, or dyspnea. Advised DASH diet, sodium restriction < 2g/day, and routine aerobic exercise. Follow-up in 4 weeks.",
                Status = "Completed",
                CreatedAt = new DateTime(2026, 8, 10, 11, 0, 0, DateTimeKind.Utc),
                UpdatedAt = new DateTime(2026, 8, 10, 11, 0, 0, DateTimeKind.Utc)
            },
            new ConsultationNote
            {
                Id = Guid.Parse("c2222222-2222-2222-2222-222222222222"),
                PatientId = patient1Id,
                PatientCode = "PAT-1001",
                DoctorId = "DOC-102",
                DoctorName = "Dr. Michael Chang",
                DoctorDesignation = "Consultant Pulmonologist",
                ConsultationDate = new DateTime(2026, 7, 18, 14, 0, 0, DateTimeKind.Utc),
                Diagnosis = "Mild Seasonal Allergic Asthma exacerbation",
                RecommendedTests = "Chest X-Ray, Total Serum IgE",
                PrescribedMedicines = "[{\"name\":\"Salbutamol (Ventolin) Inhaler\",\"dosage\":\"2 puffs as needed for wheeze\",\"duration\":\"As needed\"}]",
                ClinicalNotes = "Occasional nocturnal dry cough following high pollen exposure. Spirometry showed FEV1 84% predicted, fully responsive to bronchodilators. Avoid known triggers.",
                Status = "Completed",
                CreatedAt = new DateTime(2026, 7, 18, 14, 30, 0, DateTimeKind.Utc),
                UpdatedAt = new DateTime(2026, 7, 18, 14, 30, 0, DateTimeKind.Utc)
            }
        );

        // Seed Lab Reports for PAT-1001
        modelBuilder.Entity<LabReport>().HasData(
            new LabReport
            {
                Id = Guid.Parse("b1111111-1111-1111-1111-111111111111"),
                PatientId = patient1Id,
                PatientCode = "PAT-1001",
                TestTitle = "Complete Blood Count (CBC)",
                Category = "Haematology",
                OrderedDoctor = "Dr. Sarah Chen",
                ReportDate = new DateTime(2026, 8, 11, 9, 15, 0, DateTimeKind.Utc),
                Status = "Completed",
                FileName = "CBC_Report_PAT1001.pdf",
                FileUrl = "/uploads/reports/CBC_PAT1001.pdf",
                ResultsSummary = "WBC: 6.8 x10^3/uL (Normal), RBC: 4.9 x10^6/uL, Hemoglobin: 14.8 g/dL, Platelets: 240 x10^3/uL. Indices within normal physiological limits.",
                CreatedAt = new DateTime(2026, 8, 11, 9, 30, 0, DateTimeKind.Utc),
                UpdatedAt = new DateTime(2026, 8, 11, 9, 30, 0, DateTimeKind.Utc)
            },
            new LabReport
            {
                Id = Guid.Parse("b2222222-2222-2222-2222-222222222222"),
                PatientId = patient1Id,
                PatientCode = "PAT-1001",
                TestTitle = "Fasting Lipid Profile",
                Category = "Biochemistry",
                OrderedDoctor = "Dr. Sarah Chen",
                ReportDate = new DateTime(2026, 8, 11, 9, 20, 0, DateTimeKind.Utc),
                Status = "Completed",
                FileName = "Lipid_Profile_PAT1001.pdf",
                FileUrl = "/uploads/reports/Lipid_PAT1001.pdf",
                ResultsSummary = "Total Cholesterol: 185 mg/dL (Normal < 200), HDL: 48 mg/dL, LDL: 112 mg/dL, Triglycerides: 125 mg/dL.",
                CreatedAt = new DateTime(2026, 8, 11, 9, 45, 0, DateTimeKind.Utc),
                UpdatedAt = new DateTime(2026, 8, 11, 9, 45, 0, DateTimeKind.Utc)
            },
            new LabReport
            {
                Id = Guid.Parse("b3333333-3333-3333-3333-333333333333"),
                PatientId = patient1Id,
                PatientCode = "PAT-1001",
                TestTitle = "Resting 12-Lead Electrocardiogram (ECG)",
                Category = "Cardiology",
                OrderedDoctor = "Dr. Sarah Chen",
                ReportDate = new DateTime(2026, 8, 15, 11, 0, 0, DateTimeKind.Utc),
                Status = "Pending",
                FileName = null,
                FileUrl = null,
                ResultsSummary = "Specimen collected; awaiting cardiologist interpretation signature.",
                CreatedAt = new DateTime(2026, 8, 15, 11, 0, 0, DateTimeKind.Utc),
                UpdatedAt = new DateTime(2026, 8, 15, 11, 0, 0, DateTimeKind.Utc)
            }
        );

        // Seed Prescriptions for PAT-1001
        modelBuilder.Entity<Prescription>().HasData(
            new Prescription
            {
                Id = Guid.Parse("d1111111-1111-1111-1111-111111111111"),
                PatientId = patient1Id,
                PatientCode = "PAT-1001",
                MedicationName = "Lisinopril 10mg",
                Dosage = "Take 1 tablet by mouth daily in the morning with water",
                Duration = "30 Days",
                StartDate = new DateTime(2026, 8, 10, 0, 0, 0, DateTimeKind.Utc),
                EndDate = new DateTime(2026, 9, 9, 0, 0, 0, DateTimeKind.Utc),
                UnitPrice = 12.50m,
                PrescribedDoctor = "Dr. Sarah Chen",
                Status = "Active",
                CreatedAt = new DateTime(2026, 8, 10, 11, 15, 0, DateTimeKind.Utc),
                UpdatedAt = new DateTime(2026, 8, 10, 11, 15, 0, DateTimeKind.Utc)
            },
            new Prescription
            {
                Id = Guid.Parse("d2222222-2222-2222-2222-222222222222"),
                PatientId = patient1Id,
                PatientCode = "PAT-1001",
                MedicationName = "Amlodipine 5mg",
                Dosage = "Take 1 tablet daily with or without food",
                Duration = "30 Days",
                StartDate = new DateTime(2026, 8, 10, 0, 0, 0, DateTimeKind.Utc),
                EndDate = new DateTime(2026, 9, 9, 0, 0, 0, DateTimeKind.Utc),
                UnitPrice = 10.00m,
                PrescribedDoctor = "Dr. Sarah Chen",
                Status = "Active",
                CreatedAt = new DateTime(2026, 8, 10, 11, 15, 0, DateTimeKind.Utc),
                UpdatedAt = new DateTime(2026, 8, 10, 11, 15, 0, DateTimeKind.Utc)
            },
            new Prescription
            {
                Id = Guid.Parse("d3333333-3333-3333-3333-333333333333"),
                PatientId = patient1Id,
                PatientCode = "PAT-1001",
                MedicationName = "Amoxicillin 500mg",
                Dosage = "Take 1 capsule every 8 hours for 7 days",
                Duration = "7 Days",
                StartDate = new DateTime(2026, 6, 1, 0, 0, 0, DateTimeKind.Utc),
                EndDate = new DateTime(2026, 6, 8, 0, 0, 0, DateTimeKind.Utc),
                UnitPrice = 15.00m,
                PrescribedDoctor = "Dr. Michael Chang",
                Status = "Completed",
                CreatedAt = new DateTime(2026, 6, 1, 15, 0, 0, DateTimeKind.Utc),
                UpdatedAt = new DateTime(2026, 6, 8, 15, 0, 0, DateTimeKind.Utc)
            }
        );

        // Seed Channeling Appointments for PAT-1001
        modelBuilder.Entity<ChannelingAppointment>().HasData(
            new ChannelingAppointment
            {
                Id = Guid.Parse("e1111111-1111-1111-1111-111111111111"),
                AppointmentCode = "APT-3011",
                PatientId = patient1Id,
                PatientCode = "PAT-1001",
                DoctorName = "Dr. Sarah Jenkins",
                Specialty = "Cardiologist",
                AppointmentDate = new DateTime(2026, 8, 24, 10, 30, 0, DateTimeKind.Utc),
                Room = "Room 304, West Wing",
                Status = "Upcoming",
                CreatedAt = new DateTime(2026, 8, 1, 10, 0, 0, DateTimeKind.Utc)
            },
            new ChannelingAppointment
            {
                Id = Guid.Parse("e2222222-2222-2222-2222-222222222222"),
                AppointmentCode = "APT-2890",
                PatientId = patient1Id,
                PatientCode = "PAT-1001",
                DoctorName = "Dr. Michael Chang",
                Specialty = "General Practitioner",
                AppointmentDate = new DateTime(2026, 7, 22, 14, 0, 0, DateTimeKind.Utc),
                Room = "Room 108, Main Clinic",
                Status = "Completed",
                CreatedAt = new DateTime(2026, 7, 10, 14, 0, 0, DateTimeKind.Utc)
            }
        );
    }
}

