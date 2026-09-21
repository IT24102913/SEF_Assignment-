using LabManagement.API.Models;
using Microsoft.EntityFrameworkCore;

namespace LabManagement.API.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<LabTest> LabTests { get; set; }
    public DbSet<LabBooking> LabBookings { get; set; }
    public DbSet<LabTimeSlot> LabTimeSlots { get; set; }
    public DbSet<AppUser> AppUsers { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

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

        // AppUser configuration
        modelBuilder.Entity<AppUser>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Email).IsUnique();
            entity.Property(e => e.Email).IsRequired();
            entity.Property(e => e.Name).IsRequired();
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
    }
}
