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

        // â”€â”€â”€ EMR Configurations â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

        // Patient configuration
        modelBuilder.Entity<Patient>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.PatientCode).IsUnique();
            entity.HasIndex(e => e.Email);
            entity.HasIndex(e => e.UserId); // Link to auth user
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

        // NOTE: No EMR demo seed data â€” real patient records are created automatically
        // when users register via AuthService.RegisterPatientAsync()
    }
}
