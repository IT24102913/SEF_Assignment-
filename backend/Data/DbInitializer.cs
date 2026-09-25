using HealthBridge.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace HealthBridge.Api.Data;

public static class DbInitializer
{
    public static async Task SeedAsync(ApplicationDbContext context)
    {
        // Ensure database is created/migrated and schema contains UnitType and Medicine columns
        try
        {
            await context.Database.ExecuteSqlRawAsync("ALTER TABLE \"PharmacyOrderItems\" ADD COLUMN IF NOT EXISTS \"UnitType\" text DEFAULT 'Pill';");
            await context.Database.ExecuteSqlRawAsync("ALTER TABLE \"Medicines\" ADD COLUMN IF NOT EXISTS \"BrandName\" text;");
            await context.Database.ExecuteSqlRawAsync("ALTER TABLE \"Medicines\" ADD COLUMN IF NOT EXISTS \"StorageCondition\" text DEFAULT 'Normal Room Temperature';");
            await context.Database.ExecuteSqlRawAsync("ALTER TABLE \"Medicines\" ADD COLUMN IF NOT EXISTS \"PillsPerCard\" integer DEFAULT 10;");
            await context.Database.ExecuteSqlRawAsync("ALTER TABLE \"Medicines\" ADD COLUMN IF NOT EXISTS \"CardPrice\" numeric(18,2) DEFAULT 0;");
            await context.Database.ExecuteSqlRawAsync("ALTER TABLE \"Medicines\" ADD COLUMN IF NOT EXISTS \"AdditionalImagesJson\" text;");
            await context.Database.ExecuteSqlRawAsync("ALTER TABLE \"Patients\" ADD COLUMN IF NOT EXISTS \"UserId\" integer;");

            // Mark existing baseline migrations as applied so EF Core does not attempt to recreate existing tables
            await context.Database.ExecuteSqlRawAsync(@"
                CREATE TABLE IF NOT EXISTS ""__EFMigrationsHistory"" (
                    ""MigrationId"" character varying(150) NOT NULL,
                    ""ProductVersion"" character varying(32) NOT NULL,
                    CONSTRAINT ""PK___EFMigrationsHistory"" PRIMARY KEY (""MigrationId"")
                );
                INSERT INTO ""__EFMigrationsHistory"" (""MigrationId"", ""ProductVersion"")
                VALUES ('20260924175311_InitialCreate', '8.0.4')
                ON CONFLICT (""MigrationId"") DO NOTHING;
                INSERT INTO ""__EFMigrationsHistory"" (""MigrationId"", ""ProductVersion"")
                VALUES ('20260924183649_AddUserIdToEMRPatient', '8.0.4')
                ON CONFLICT (""MigrationId"") DO NOTHING;
            ");
        }
        catch { }

        try
        {
            await context.Database.MigrateAsync();
        }
        catch { }

        // 1. Seed Initial Admin Accounts if none exist
        if (!await context.Users.AnyAsync(u => u.Email == "nirwan@gmail.com"))
        {
            var nirwanAdmin = new User
            {
                FullName = "Nirwan Admin",
                Email = "nirwan@gmail.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("nirwan123"),
                Role = UserRole.Admin,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };
            context.Users.Add(nirwanAdmin);
        }

        if (!await context.Users.AnyAsync(u => u.Email == "admin@healthbridge.com"))
        {
            var adminUser = new User
            {
                FullName = "System Admin",
                Email = "admin@healthbridge.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin123!"),
                Role = UserRole.Admin,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };
            context.Users.Add(adminUser);
        }

        if (!await context.Users.AnyAsync(u => u.Email == "admin@medix.com"))
        {
            var medixAdmin = new User
            {
                FullName = "Medix Admin",
                Email = "admin@medix.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin@123"),
                Role = UserRole.Admin,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };
            context.Users.Add(medixAdmin);
        }

        // Seed Quick Demo Accounts for UI
        if (!await context.Users.AnyAsync(u => u.Email == "pharmacist@gmail.com"))
        {
            context.Users.Add(new User
            {
                FullName = "Demo Pharmacist",
                Email = "pharmacist@gmail.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("pharmacist123"),
                Role = UserRole.Pharmacist,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            });
        }

        if (!await context.Users.AnyAsync(u => u.Email == "lab@gmail.com"))
        {
            context.Users.Add(new User
            {
                FullName = "Demo Lab Officer",
                Email = "lab@gmail.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("lab123"),
                Role = UserRole.Laboratory,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            });
        }

        if (!await context.Users.AnyAsync(u => u.Email == "doctor@gmail.com"))
        {
            context.Users.Add(new User
            {
                FullName = "Demo Doctor",
                Email = "doctor@gmail.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("doctor123"),
                Role = UserRole.Doctor,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            });
        }

        // 2. Seed Initial Pharmacist Account if none exists
        if (!await context.Users.AnyAsync(u => u.Role == UserRole.Pharmacist))
        {
            var pharmacistUser = new User
            {
                FullName = "Lead Pharmacist",
                Email = "pharmacist@medix.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Pharmacy@123"),
                Role = UserRole.Pharmacist,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };
            context.Users.Add(pharmacistUser);
        }

        // 3. Seed Initial Patient Account
        var patientUser = await context.Users.FirstOrDefaultAsync(u => u.Email == "patient@medix.com");
        if (patientUser == null)
        {
            patientUser = new User
            {
                FullName = "John Doe",
                Email = "patient@medix.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Patient@123"),
                Role = UserRole.Patient,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };
            context.Users.Add(patientUser);
            await context.SaveChangesAsync();
        }

        // Ensure PatientProfile exists for patientUser
        if (!await context.PatientProfiles.AnyAsync(p => p.UserId == patientUser.Id))
        {
            var profile = new PatientProfile
            {
                UserId = patientUser.Id,
                PhoneNumber = "+94 77 123 4567",
                Address = "742 Evergreen Terrace",
                City = "Colombo",
                NicNumber = "199512345678",
                Gender = "Male",
                DateOfBirth = DateTime.UtcNow.AddYears(-30),
                EmergencyContact = "+94 71 987 6543",
                CreatedAt = DateTime.UtcNow
            };
            context.PatientProfiles.Add(profile);
        }

        // 4. Seed Categories if none exist
        if (!await context.Categories.AnyAsync())
        {
            var categories = new List<Category>
            {
                new Category { Name = "Antibiotics", Description = "Medications used to treat and prevent bacterial infections.", CreatedAt = DateTime.UtcNow },
                new Category { Name = "Pain Relievers", Description = "Analgesic medications for fast pain relief and fever management.", CreatedAt = DateTime.UtcNow },
                new Category { Name = "Gastrointestinal", Description = "Treatments for acid reflux, stomach ulcers, and digestive balance.", CreatedAt = DateTime.UtcNow },
                new Category { Name = "Vitamins & Supplements", Description = "Immunity boosters, dietary supplements, and daily multivitamin care.", CreatedAt = DateTime.UtcNow },
                new Category { Name = "Antihistamines", Description = "Non-drowsy relief from allergies, fever, and bronchial congestion.", CreatedAt = DateTime.UtcNow },
                new Category { Name = "Diabetes Management", Description = "Oral blood glucose controls and insulin therapies.", CreatedAt = DateTime.UtcNow },
                new Category { Name = "Cardiovascular", Description = "Statins, blood pressure management, and heart health care.", CreatedAt = DateTime.UtcNow }
            };
            context.Categories.AddRange(categories);
            await context.SaveChangesAsync();
        }

        // 5. Seed Medicines if none exist
        if (!await context.Medicines.AnyAsync())
        {
            var antibioticCat = await context.Categories.FirstOrDefaultAsync(c => c.Name == "Antibiotics");
            var painCat = await context.Categories.FirstOrDefaultAsync(c => c.Name == "Pain Relievers");
            var gastroCat = await context.Categories.FirstOrDefaultAsync(c => c.Name == "Gastrointestinal");
            var vitaminCat = await context.Categories.FirstOrDefaultAsync(c => c.Name == "Vitamins & Supplements");
            var antiHisCat = await context.Categories.FirstOrDefaultAsync(c => c.Name == "Antihistamines");
            var diabetesCat = await context.Categories.FirstOrDefaultAsync(c => c.Name == "Diabetes Management");
            var cardioCat = await context.Categories.FirstOrDefaultAsync(c => c.Name == "Cardiovascular");

            if (antibioticCat != null)
            {
                context.Medicines.AddRange(
                    new Medicine
                    {
                        Name = "Amoxicillin 500mg Capsules",
                        CategoryId = antibioticCat.Id,
                        Description = "Broad-spectrum antibiotic used to treat bacterial infections.",
                        Price = 450.00m,
                        StockQuantity = 120,
                        RequiresPrescription = true,
                        ImageUrl = "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop",
                        ExpiryDate = DateTime.UtcNow.AddMonths(18),
                        CreatedAt = DateTime.UtcNow
                    },
                    new Medicine
                    {
                        Name = "Augmentin 625mg Tablets",
                        CategoryId = antibioticCat.Id,
                        Description = "Amoxicillin + Clavulanic acid combination antibiotic.",
                        Price = 1450.00m,
                        StockQuantity = 40,
                        RequiresPrescription = true,
                        ImageUrl = "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=500&auto=format&fit=crop",
                        ExpiryDate = DateTime.UtcNow.AddMonths(12),
                        CreatedAt = DateTime.UtcNow
                    }
                );
            }

            if (painCat != null)
            {
                context.Medicines.Add(
                    new Medicine
                    {
                        Name = "Paracetamol Extra 500mg",
                        CategoryId = painCat.Id,
                        Description = "Fast acting pain relief and fever reducer.",
                        Price = 180.00m,
                        StockQuantity = 250,
                        RequiresPrescription = false,
                        ImageUrl = "https://images.unsplash.com/photo-1585435557343-3b092031a831?w=500&auto=format&fit=crop",
                        ExpiryDate = DateTime.UtcNow.AddYears(2),
                        CreatedAt = DateTime.UtcNow
                    }
                );
            }

            if (gastroCat != null)
            {
                context.Medicines.Add(
                    new Medicine
                    {
                        Name = "Omeprazole 20mg Acid Reducer",
                        CategoryId = gastroCat.Id,
                        Description = "Treats acid reflux, heartburn, and stomach ulcers.",
                        Price = 620.00m,
                        StockQuantity = 85,
                        RequiresPrescription = true,
                        ImageUrl = "https://images.unsplash.com/photo-1550572017-edd951baa74c?w=500&auto=format&fit=crop",
                        ExpiryDate = DateTime.UtcNow.AddMonths(15),
                        CreatedAt = DateTime.UtcNow
                    }
                );
            }

            if (vitaminCat != null)
            {
                context.Medicines.Add(
                    new Medicine
                    {
                        Name = "Vitamin C 1000mg Effervescent",
                        CategoryId = vitaminCat.Id,
                        Description = "High potency immunity booster with Zinc.",
                        Price = 1250.00m,
                        StockQuantity = 60,
                        RequiresPrescription = false,
                        ImageUrl = "https://images.unsplash.com/photo-1576602976047-174e57a47881?w=500&auto=format&fit=crop",
                        ExpiryDate = DateTime.UtcNow.AddYears(1),
                        CreatedAt = DateTime.UtcNow
                    }
                );
            }

            if (antiHisCat != null)
            {
                context.Medicines.Add(
                    new Medicine
                    {
                        Name = "Cetirizine 10mg Allergy Relief",
                        CategoryId = antiHisCat.Id,
                        Description = "Non-drowsy 24-hour relief from allergies and hay fever.",
                        Price = 320.00m,
                        StockQuantity = 140,
                        RequiresPrescription = false,
                        ImageUrl = "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop",
                        ExpiryDate = DateTime.UtcNow.AddYears(2),
                        CreatedAt = DateTime.UtcNow
                    }
                );
            }

            if (diabetesCat != null)
            {
                context.Medicines.Add(
                    new Medicine
                    {
                        Name = "Metformin 500mg Extended Release",
                        CategoryId = diabetesCat.Id,
                        Description = "Oral blood glucose lowering drug for type 2 diabetes.",
                        Price = 890.00m,
                        StockQuantity = 95,
                        RequiresPrescription = true,
                        ImageUrl = "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=500&auto=format&fit=crop",
                        ExpiryDate = DateTime.UtcNow.AddMonths(18),
                        CreatedAt = DateTime.UtcNow
                    }
                );
            }

            if (cardioCat != null)
            {
                context.Medicines.Add(
                    new Medicine
                    {
                        Name = "Atorvastatin 20mg Lipid Lowering",
                        CategoryId = cardioCat.Id,
                        Description = "Statin medication used to prevent cardiovascular disease.",
                        Price = 1100.00m,
                        StockQuantity = 75,
                        RequiresPrescription = true,
                        ImageUrl = "https://images.unsplash.com/photo-1585435557343-3b092031a831?w=500&auto=format&fit=crop",
                        ExpiryDate = DateTime.UtcNow.AddMonths(20),
                        CreatedAt = DateTime.UtcNow
                    }
                );
            }

            await context.SaveChangesAsync();
        }
        else
        {
            // Backfill ImageUrl for existing medicines that have null ImageUrl
            var existingMeds = await context.Medicines.Where(m => m.ImageUrl == null || m.ImageUrl == "").ToListAsync();
            if (existingMeds.Any())
            {
                var sampleImages = new[]
                {
                    "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop",
                    "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=500&auto=format&fit=crop",
                    "https://images.unsplash.com/photo-1585435557343-3b092031a831?w=500&auto=format&fit=crop",
                    "https://images.unsplash.com/photo-1550572017-edd951baa74c?w=500&auto=format&fit=crop",
                    "https://images.unsplash.com/photo-1576602976047-174e57a47881?w=500&auto=format&fit=crop"
                };

                for (int i = 0; i < existingMeds.Count; i++)
                {
                    existingMeds[i].ImageUrl = sampleImages[i % sampleImages.Length];
                }
                await context.SaveChangesAsync();
            }
        }

        // 7. Seed Doctors and Sessions if none exist
        var demoDoctorUser = await context.Users.FirstOrDefaultAsync(u => u.Email == "doctor@gmail.com");

        if (!await context.DoctorSessions.AnyAsync())
        {
            if (await context.Doctors.CountAsync() <= 4 && !await context.DoctorAppointments.AnyAsync())
            {
                context.Doctors.RemoveRange(await context.Doctors.ToListAsync());
                await context.SaveChangesAsync();
            }

            if (!await context.Doctors.AnyAsync())
            {
                var doctors = new List<Doctor>
                {
                new Doctor
                {
                    FullName = "Dr. Anjali Perera",
                    Specialization = "Cardiology",
                    Qualifications = "MD, FRCP - Cardiologist",
                    Hospital = "Health Bridge Hospital - Colombo",
                    HospitalBranch = "Health Bridge Hospital - Colombo",
                    RoomNumber = "Suite 201, 2nd Floor",
                    ConsultationFee = 2500.00m,
                    AvailableDays = "Mon, Tue, Wed, Thu, Fri",
                    AvailableTime = "08:00 AM - 04:00 PM",
                    ImageUrl = "/src/assets/doctor.jpg",
                    PhoneNumber = "+94 76 447 7999",
                    Rating = 4.9,
                    ReviewCount = 142,
                    ExperienceYears = 15,
                    IsVerifiedConsultant = true,
                    Bio = "Specializing in interventional cardiology, coronary artery disease, and heart failure management.",
                    Email = "doctor@gmail.com",
                    UserId = demoDoctorUser?.Id,
                    IsAvailable = true
                },
                new Doctor
                {
                    FullName = "Dr. M.T.D Lakshan",
                    Specialization = "ENT",
                    Qualifications = "MBBS, MS (ENT), FRCS - Consultant ENT Surgeon",
                    Hospital = "Health Bridge Hospital - Colombo",
                    HospitalBranch = "Health Bridge Hospital - Colombo",
                    RoomNumber = "Suite 104, 1st Floor",
                    ConsultationFee = 2500.00m,
                    AvailableDays = "Mon, Tue, Wed, Thu, Fri",
                    AvailableTime = "08:00 AM - 04:00 PM",
                    ImageUrl = "/src/assets/doctor1.jpg",
                    PhoneNumber = "+94 76 447 7888",
                    Rating = 4.9,
                    ReviewCount = 120,
                    ExperienceYears = 18,
                    IsVerifiedConsultant = true,
                    Bio = "Specialist in Ear, Nose & Throat disorders, endoscopic sinus surgery, and Head & Neck surgery.",
                    Email = "lakshan.ent@healthbridge.com",
                    IsAvailable = true
                },
                new Doctor
                {
                    FullName = "Dr. Malya Gunasekara",
                    Specialization = "General Medicine",
                    Qualifications = "MBBS, MD, MRCP - Consultant Physician & Gastroenterologist",
                    Hospital = "Health Bridge Hospital - Colombo",
                    HospitalBranch = "Health Bridge Hospital - Colombo",
                    RoomNumber = "Suite 108, 1st Floor",
                    ConsultationFee = 3200.00m,
                    AvailableDays = "Mon, Tue, Wed, Thu, Fri",
                    AvailableTime = "08:00 AM - 04:00 PM",
                    ImageUrl = "/src/assets/doctor2.jpg",
                    PhoneNumber = "+94 76 447 7999",
                    Rating = 4.8,
                    ReviewCount = 95,
                    ExperienceYears = 22,
                    IsVerifiedConsultant = true,
                    Bio = "Expertise in adult internal medicine, lifestyle illnesses, and digestive wellness.",
                    Email = "malya.physician@healthbridge.com",
                    IsAvailable = true
                },
                new Doctor
                {
                    FullName = "Dr. Pumsith Gunawardena",
                    Specialization = "Neurology",
                    Qualifications = "MBBS, MD (Neuro), FCPS - Consultant Neurosurgeon",
                    Hospital = "Health Bridge Hospital - Kandy",
                    HospitalBranch = "Health Bridge Hospital - Kandy",
                    RoomNumber = "Suite 305, 3rd Floor",
                    ConsultationFee = 4000.00m,
                    AvailableDays = "Mon, Tue, Wed, Thu, Fri",
                    AvailableTime = "08:00 AM - 04:00 PM",
                    ImageUrl = "/src/assets/doctor7.jpg",
                    PhoneNumber = "+94 81 223 4567",
                    Rating = 4.7,
                    ReviewCount = 78,
                    ExperienceYears = 15,
                    IsVerifiedConsultant = true,
                    Bio = "Brain & spinal cord surgery, stroke rehabilitation, and minimally invasive neurological interventions.",
                    Email = "pumsith.neuro@healthbridge.com",
                    IsAvailable = true
                },
                new Doctor
                {
                    FullName = "Dr. Rohan Wickramasinghe",
                    Specialization = "Orthopaedics",
                    Qualifications = "MBBS, MS (Ortho), FRCS - Orthopaedic Surgeon",
                    Hospital = "Health Bridge Hospital - Colombo",
                    HospitalBranch = "Health Bridge Hospital - Colombo",
                    RoomNumber = "Suite 204, 2nd Floor",
                    ConsultationFee = 3500.00m,
                    AvailableDays = "Mon, Tue, Wed, Thu, Fri",
                    AvailableTime = "09:00 AM - 04:00 PM",
                    ImageUrl = "/src/assets/doctor.jpg",
                    PhoneNumber = "+94 76 447 7999",
                    Rating = 4.9,
                    ReviewCount = 110,
                    ExperienceYears = 20,
                    IsVerifiedConsultant = true,
                    Bio = "Specializing in joint replacement, sports injury reconstruction, and spine surgery.",
                    Email = "rohan.ortho@healthbridge.com",
                    IsAvailable = true
                },
                new Doctor
                {
                    FullName = "Dr. Malith Silva",
                    Specialization = "Paediatrics",
                    Qualifications = "MBBS, DCH, MD (Paediatrics) - Consultant Paediatrician",
                    Hospital = "Health Bridge Hospital - Kandy",
                    HospitalBranch = "Health Bridge Hospital - Kandy",
                    RoomNumber = "Suite 102, 1st Floor",
                    ConsultationFee = 2800.00m,
                    AvailableDays = "Mon, Tue, Wed, Thu, Fri",
                    AvailableTime = "08:00 AM - 03:00 PM",
                    ImageUrl = "/src/assets/doctor2.jpg",
                    PhoneNumber = "+94 81 223 4568",
                    Rating = 4.8,
                    ReviewCount = 88,
                    ExperienceYears = 10,
                    IsVerifiedConsultant = true,
                    Bio = "Dedicated paediatric care, newborn health assessment, immunization, and adolescent growth.",
                    Email = "malith.paed@healthbridge.com",
                    IsAvailable = true
                },
                new Doctor
                {
                    FullName = "Dr. Nilmini Senanayake",
                    Specialization = "Gynaecology",
                    Qualifications = "MBBS, MS (Obs & Gynae), FRCOG - Consultant Obstetrician & Gynaecologist",
                    Hospital = "Health Bridge Hospital - Kandy",
                    HospitalBranch = "Health Bridge Hospital - Kandy",
                    RoomNumber = "Suite 206, 2nd Floor",
                    ConsultationFee = 3600.00m,
                    AvailableDays = "Mon, Tue, Wed, Thu, Fri",
                    AvailableTime = "08:30 AM - 04:00 PM",
                    ImageUrl = "/src/assets/doctor1.jpg",
                    PhoneNumber = "+94 81 223 4569",
                    Rating = 4.9,
                    ReviewCount = 135,
                    ExperienceYears = 17,
                    IsVerifiedConsultant = true,
                    Bio = "Comprehensive maternal and foetal health, laparoscopic gynaecological procedures, and fertility counsel.",
                    Email = "nilmini.gynae@healthbridge.com",
                    IsAvailable = true
                },
                new Doctor
                {
                    FullName = "Dr. Rashmi Fernando",
                    Specialization = "Dermatology",
                    Qualifications = "MBBS, MD (Dermatology) - Consultant Dermatologist",
                    Hospital = "Health Bridge Hospital - Colombo",
                    HospitalBranch = "Health Bridge Hospital - Colombo",
                    RoomNumber = "Suite 112, 1st Floor",
                    ConsultationFee = 3000.00m,
                    AvailableDays = "Mon, Tue, Wed, Thu, Fri",
                    AvailableTime = "09:00 AM - 04:00 PM",
                    ImageUrl = "/src/assets/doctor7.jpg",
                    PhoneNumber = "+94 76 447 7999",
                    Rating = 4.8,
                    ReviewCount = 92,
                    ExperienceYears = 14,
                    IsVerifiedConsultant = true,
                    Bio = "Advanced clinical dermatology, allergy testing, acne and eczema management, and aesthetic therapies.",
                    Email = "rashmi.derma@healthbridge.com",
                    IsAvailable = true
                }
            };

            context.Doctors.AddRange(doctors);
            await context.SaveChangesAsync();

            // Seed Weekday Sessions for each doctor (Today + next 6 days)
            var slotTimes = new List<TimeOnly>
            {
                new TimeOnly(8, 0),
                new TimeOnly(9, 0),
                new TimeOnly(10, 0),
                new TimeOnly(11, 0),
                new TimeOnly(14, 0),
                new TimeOnly(15, 0),
                new TimeOnly(16, 0)
            };

            var sessions = new List<DoctorSession>();
            var today = DateOnly.FromDateTime(DateTime.UtcNow);

            foreach (var doc in doctors)
            {
                for (int dayOffset = 0; dayOffset < 7; dayOffset++)
                {
                    var sessionDate = today.AddDays(dayOffset);
                    if (sessionDate.DayOfWeek == DayOfWeek.Saturday || sessionDate.DayOfWeek == DayOfWeek.Sunday)
                        continue;

                    foreach (var time in slotTimes)
                    {
                        sessions.Add(new DoctorSession
                        {
                            DoctorId = doc.Id,
                            SessionDate = sessionDate,
                            SessionTime = time,
                            MaxCapacity = 1,
                            CurrentBookings = 0,
                            IsActive = true
                        });
                    }
                }
            }

            context.DoctorSessions.AddRange(sessions);
            await context.SaveChangesAsync();
        }
    }

        // 8. Seed Patient Feedbacks if none exist
        if (!await context.PatientFeedbacks.AnyAsync())
        {
            context.PatientFeedbacks.AddRange(
                new PatientFeedback
                {
                    PatientName = "Sunil Shantha",
                    PatientEmail = "sunil@gmail.com",
                    Rating = 5,
                    Subject = "Outstanding Pharmacy & Doctor Care",
                    Comment = "The pharmacy fast delivery and online verification for prescription saved me so much time. Highly recommend Health Bridge!",
                    CreatedAt = DateTime.UtcNow.AddDays(-5)
                },
                new PatientFeedback
                {
                    PatientName = "Dilini Wijesinghe",
                    PatientEmail = "dilini@gmail.com",
                    Rating = 5,
                    Subject = "Excellent Lab & Channeling Service",
                    Comment = "Booked Dr. Anura Perera for my father. The room appointment was right on schedule and the staff was extremely compassionate.",
                    CreatedAt = DateTime.UtcNow.AddDays(-2)
                }
            );
        }

        await context.SaveChangesAsync();
    }
}
