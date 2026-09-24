using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace HealthBridge.Api.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Categories",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Categories", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Doctors",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    FullName = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    Specialization = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Qualifications = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Hospital = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    HospitalBranch = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    RoomNumber = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    ConsultationFee = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    AvailableDays = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    AvailableTime = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    ImageUrl = table.Column<string>(type: "text", nullable: true),
                    PhoneNumber = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    Rating = table.Column<double>(type: "double precision", precision: 3, scale: 2, nullable: false),
                    ReviewCount = table.Column<int>(type: "integer", nullable: false),
                    ExperienceYears = table.Column<int>(type: "integer", nullable: false),
                    IsVerifiedConsultant = table.Column<bool>(type: "boolean", nullable: false),
                    Bio = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    UserId = table.Column<int>(type: "integer", nullable: true),
                    Email = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    IsAvailable = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Doctors", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "EMRAuditLogs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PatientId = table.Column<Guid>(type: "uuid", nullable: true),
                    ActorId = table.Column<string>(type: "text", nullable: false),
                    ActorRole = table.Column<string>(type: "text", nullable: false),
                    ActionType = table.Column<string>(type: "text", nullable: false),
                    EntityType = table.Column<string>(type: "text", nullable: false),
                    EntityId = table.Column<string>(type: "text", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: false),
                    Timestamp = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EMRAuditLogs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "LabTests",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "text", nullable: false),
                    Price = table.Column<decimal>(type: "numeric(10,2)", nullable: false),
                    IsRestricted = table.Column<bool>(type: "boolean", nullable: false),
                    TurnaroundDays = table.Column<int>(type: "integer", nullable: false),
                    Category = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LabTests", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "LabTimeSlots",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Date = table.Column<DateOnly>(type: "date", nullable: false),
                    Time = table.Column<TimeOnly>(type: "time without time zone", nullable: false),
                    MaxCapacity = table.Column<int>(type: "integer", nullable: false),
                    CurrentBookings = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LabTimeSlots", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "PatientFeedbacks",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    PatientName = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    PatientEmail = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    Rating = table.Column<int>(type: "integer", nullable: false),
                    Subject = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Comment = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PatientFeedbacks", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Patients",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PatientCode = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    FullName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    DateOfBirth = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Gender = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    BloodGroup = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    ContactPhone = table.Column<string>(type: "text", nullable: false),
                    Email = table.Column<string>(type: "text", nullable: false),
                    Address = table.Column<string>(type: "text", nullable: false),
                    EmergencyContactName = table.Column<string>(type: "text", nullable: false),
                    EmergencyContactPhone = table.Column<string>(type: "text", nullable: false),
                    Allergies = table.Column<string>(type: "text", nullable: false),
                    ChronicConditions = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Patients", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Payments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Module = table.Column<string>(type: "text", nullable: false),
                    ReferenceId = table.Column<string>(type: "text", nullable: false),
                    PatientId = table.Column<int>(type: "integer", nullable: false),
                    PatientName = table.Column<string>(type: "text", nullable: false),
                    PatientEmail = table.Column<string>(type: "text", nullable: false),
                    Amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    Currency = table.Column<string>(type: "text", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    PaymentMethod = table.Column<string>(type: "text", nullable: false),
                    TransactionReference = table.Column<string>(type: "text", nullable: true),
                    ReceiptNumber = table.Column<string>(type: "text", nullable: true),
                    CollectedByStaffId = table.Column<string>(type: "text", nullable: true),
                    Notes = table.Column<string>(type: "text", nullable: true),
                    PaidAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Payments", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Users",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    FullName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Email = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    PasswordHash = table.Column<string>(type: "text", nullable: false),
                    Role = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false, defaultValue: "Patient"),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Users", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Medicines",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    CategoryId = table.Column<int>(type: "integer", nullable: false),
                    Description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    Price = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    StockQuantity = table.Column<int>(type: "integer", nullable: false),
                    ExpiryDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    RequiresPrescription = table.Column<bool>(type: "boolean", nullable: false),
                    BrandName = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    StorageCondition = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    PillsPerCard = table.Column<int>(type: "integer", nullable: false),
                    CardPrice = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    AdditionalImagesJson = table.Column<string>(type: "text", nullable: true),
                    ImageUrl = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Medicines", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Medicines_Categories_CategoryId",
                        column: x => x.CategoryId,
                        principalTable: "Categories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "DoctorSessions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    DoctorId = table.Column<int>(type: "integer", nullable: false),
                    SessionDate = table.Column<DateOnly>(type: "date", nullable: false),
                    SessionTime = table.Column<TimeOnly>(type: "time without time zone", nullable: false),
                    MaxCapacity = table.Column<int>(type: "integer", nullable: false),
                    CurrentBookings = table.Column<int>(type: "integer", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DoctorSessions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DoctorSessions_Doctors_DoctorId",
                        column: x => x.DoctorId,
                        principalTable: "Doctors",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "LabBookings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PatientId = table.Column<int>(type: "integer", nullable: false),
                    PatientName = table.Column<string>(type: "text", nullable: false),
                    PatientEmail = table.Column<string>(type: "text", nullable: false),
                    LabTestId = table.Column<Guid>(type: "uuid", nullable: false),
                    BookingDate = table.Column<DateOnly>(type: "date", nullable: false),
                    TimeSlot = table.Column<TimeOnly>(type: "time without time zone", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    PrescriptionImageUrl = table.Column<string>(type: "text", nullable: true),
                    AIVerification = table.Column<string>(type: "text", nullable: false),
                    AIVerificationNotes = table.Column<string>(type: "text", nullable: true),
                    AIConfidenceScore = table.Column<double>(type: "double precision", nullable: true),
                    AIExtractedDoctorName = table.Column<string>(type: "text", nullable: true),
                    AIPrescriptionDate = table.Column<DateOnly>(type: "date", nullable: true),
                    TechnicianId = table.Column<Guid>(type: "uuid", nullable: true),
                    TechnicianNotes = table.Column<string>(type: "text", nullable: true),
                    ResultFileUrl = table.Column<string>(type: "text", nullable: true),
                    ResultsUploadedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    QueueToken = table.Column<string>(type: "text", nullable: true),
                    PriorityTier = table.Column<string>(type: "text", nullable: true),
                    EstimatedServiceDurationMinutes = table.Column<int>(type: "integer", nullable: false),
                    EstimatedWaitMinutes = table.Column<int>(type: "integer", nullable: false),
                    AssignedChairNo = table.Column<int>(type: "integer", nullable: false),
                    AgentWorkflowStateJson = table.Column<string>(type: "text", nullable: true),
                    PaymentStatus = table.Column<string>(type: "text", nullable: false),
                    PaymentMethod = table.Column<string>(type: "text", nullable: true),
                    ReceiptNumber = table.Column<string>(type: "text", nullable: true),
                    AmountPaid = table.Column<decimal>(type: "numeric", nullable: false),
                    PaidAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LabBookings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LabBookings_LabTests_LabTestId",
                        column: x => x.LabTestId,
                        principalTable: "LabTests",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ChannelingAppointments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    AppointmentCode = table.Column<string>(type: "text", nullable: false),
                    PatientId = table.Column<Guid>(type: "uuid", nullable: false),
                    PatientCode = table.Column<string>(type: "text", nullable: false),
                    DoctorName = table.Column<string>(type: "text", nullable: false),
                    Specialty = table.Column<string>(type: "text", nullable: false),
                    AppointmentDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Room = table.Column<string>(type: "text", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ChannelingAppointments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ChannelingAppointments_Patients_PatientId",
                        column: x => x.PatientId,
                        principalTable: "Patients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ConsultationNotes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PatientId = table.Column<Guid>(type: "uuid", nullable: false),
                    PatientCode = table.Column<string>(type: "text", nullable: false),
                    DoctorId = table.Column<string>(type: "text", nullable: false),
                    DoctorName = table.Column<string>(type: "text", nullable: false),
                    DoctorDesignation = table.Column<string>(type: "text", nullable: false),
                    ConsultationDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Diagnosis = table.Column<string>(type: "text", nullable: false),
                    RecommendedTests = table.Column<string>(type: "text", nullable: false),
                    PrescribedMedicines = table.Column<string>(type: "text", nullable: false),
                    ClinicalNotes = table.Column<string>(type: "text", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ConsultationNotes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ConsultationNotes_Patients_PatientId",
                        column: x => x.PatientId,
                        principalTable: "Patients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "LabReports",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PatientId = table.Column<Guid>(type: "uuid", nullable: false),
                    PatientCode = table.Column<string>(type: "text", nullable: false),
                    TestTitle = table.Column<string>(type: "text", nullable: false),
                    Category = table.Column<string>(type: "text", nullable: false),
                    OrderedDoctor = table.Column<string>(type: "text", nullable: false),
                    ReportDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    FileName = table.Column<string>(type: "text", nullable: true),
                    FileUrl = table.Column<string>(type: "text", nullable: true),
                    ResultsSummary = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LabReports", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LabReports_Patients_PatientId",
                        column: x => x.PatientId,
                        principalTable: "Patients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Prescriptions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PatientId = table.Column<Guid>(type: "uuid", nullable: false),
                    PatientCode = table.Column<string>(type: "text", nullable: false),
                    MedicationName = table.Column<string>(type: "text", nullable: false),
                    Dosage = table.Column<string>(type: "text", nullable: false),
                    Duration = table.Column<string>(type: "text", nullable: false),
                    StartDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    EndDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UnitPrice = table.Column<decimal>(type: "numeric(10,2)", nullable: false),
                    PrescribedDoctor = table.Column<string>(type: "text", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Prescriptions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Prescriptions_Patients_PatientId",
                        column: x => x.PatientId,
                        principalTable: "Patients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PatientProfiles",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<int>(type: "integer", nullable: false),
                    PhoneNumber = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    Address = table.Column<string>(type: "character varying(250)", maxLength: 250, nullable: true),
                    City = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    NicNumber = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    DateOfBirth = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Gender = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    EmergencyContact = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PatientProfiles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PatientProfiles_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PharmacyOrders",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    OrderNumber = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    PatientId = table.Column<int>(type: "integer", nullable: true),
                    CustomerName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    CustomerEmail = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    CustomerPhone = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    DeliveryAddress = table.Column<string>(type: "character varying(250)", maxLength: 250, nullable: true),
                    TotalAmount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    PaymentMethod = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    PrescriptionImageUrl = table.Column<string>(type: "text", nullable: true),
                    DaysSupply = table.Column<int>(type: "integer", nullable: true),
                    AdminNote = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    PatientConfirmed = table.Column<bool>(type: "boolean", nullable: false),
                    PrescriptionHash = table.Column<string>(type: "text", nullable: true),
                    SafetyRiskScore = table.Column<int>(type: "integer", nullable: true),
                    SafetyFlags = table.Column<string>(type: "text", nullable: true),
                    SafetyRecommendedAction = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    SafetyValidatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PharmacyOrders", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PharmacyOrders_Users_PatientId",
                        column: x => x.PatientId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "PrescriptionSubmissions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    PrescriptionCode = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    PatientId = table.Column<int>(type: "integer", nullable: true),
                    PatientName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    PatientEmail = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    DoctorName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Notes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    ImageUrl = table.Column<string>(type: "text", nullable: true),
                    Status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    SubmittedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ProcessedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PrescriptionSubmissions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PrescriptionSubmissions_Users_PatientId",
                        column: x => x.PatientId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "DoctorAppointments",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    AppointmentNumber = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    DoctorId = table.Column<int>(type: "integer", nullable: false),
                    DoctorName = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    Specialization = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    PatientId = table.Column<int>(type: "integer", nullable: true),
                    PatientName = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    PatientPhone = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    PatientEmail = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    PatientNic = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    PatientAddress = table.Column<string>(type: "character varying(250)", maxLength: 250, nullable: true),
                    AppointmentDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    TimeSlot = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    DoctorSessionId = table.Column<int>(type: "integer", nullable: true),
                    QueueNumber = table.Column<int>(type: "integer", nullable: false),
                    ConsultationFee = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    ServiceCharge = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    TotalAmount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    PaymentMethod = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    PaymentStatus = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    PaymentReference = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Notes = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DoctorAppointments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DoctorAppointments_DoctorSessions_DoctorSessionId",
                        column: x => x.DoctorSessionId,
                        principalTable: "DoctorSessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_DoctorAppointments_Doctors_DoctorId",
                        column: x => x.DoctorId,
                        principalTable: "Doctors",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "PharmacyOrderItems",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    PharmacyOrderId = table.Column<int>(type: "integer", nullable: false),
                    MedicineId = table.Column<int>(type: "integer", nullable: false),
                    MedicineName = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    UnitPrice = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    Quantity = table.Column<int>(type: "integer", nullable: false),
                    Subtotal = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    UnitType = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PharmacyOrderItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PharmacyOrderItems_Medicines_MedicineId",
                        column: x => x.MedicineId,
                        principalTable: "Medicines",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PharmacyOrderItems_PharmacyOrders_PharmacyOrderId",
                        column: x => x.PharmacyOrderId,
                        principalTable: "PharmacyOrders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.InsertData(
                table: "LabTests",
                columns: new[] { "Id", "Category", "CreatedAt", "Description", "IsActive", "IsRestricted", "Name", "Price", "TurnaroundDays" },
                values: new object[,]
                {
                    { new Guid("11111111-1111-1111-1111-111111111111"), "Haematology", new DateTime(2026, 9, 24, 17, 53, 10, 711, DateTimeKind.Utc).AddTicks(289), "Measures different components of blood including red/white cells and platelets.", true, false, "Complete Blood Count (CBC)", 1500m, 1 },
                    { new Guid("22222222-2222-2222-2222-222222222222"), "Biochemistry", new DateTime(2026, 9, 24, 17, 53, 10, 711, DateTimeKind.Utc).AddTicks(324), "Measures cholesterol and triglyceride levels in the blood.", true, true, "Lipid Panel", 2500m, 1 },
                    { new Guid("33333333-3333-3333-3333-333333333333"), "Biochemistry", new DateTime(2026, 9, 24, 17, 53, 10, 711, DateTimeKind.Utc).AddTicks(329), "Measures blood sugar levels after an 8-hour fast.", true, false, "Blood Glucose Fasting", 500m, 1 },
                    { new Guid("44444444-4444-4444-4444-444444444444"), "Endocrinology", new DateTime(2026, 9, 24, 17, 53, 10, 711, DateTimeKind.Utc).AddTicks(333), "Evaluates thyroid gland function (TSH, T3, T4).", true, true, "Thyroid Function Test (TFT)", 3500m, 2 },
                    { new Guid("55555555-5555-5555-5555-555555555555"), "Microbiology", new DateTime(2026, 9, 24, 17, 53, 10, 711, DateTimeKind.Utc).AddTicks(337), "Analyses physical, chemical and microscopic properties of urine.", true, false, "Urine Full Report (UFR)", 800m, 1 },
                    { new Guid("66666666-6666-6666-6666-666666666666"), "Radiology", new DateTime(2026, 9, 24, 17, 53, 10, 711, DateTimeKind.Utc).AddTicks(353), "Imaging of lungs, heart and chest wall.", true, true, "Chest X-Ray", 2000m, 1 },
                    { new Guid("77777777-7777-7777-7777-777777777777"), "Biochemistry", new DateTime(2026, 9, 24, 17, 53, 10, 711, DateTimeKind.Utc).AddTicks(358), "Assesses liver health via enzyme and protein levels.", true, true, "Liver Function Test (LFT)", 3000m, 2 },
                    { new Guid("88888888-8888-8888-8888-888888888888"), "Haematology", new DateTime(2026, 9, 24, 17, 53, 10, 711, DateTimeKind.Utc).AddTicks(362), "Detects inflammation in the body.", true, false, "ESR (Erythrocyte Sedimentation Rate)", 600m, 1 }
                });

            migrationBuilder.InsertData(
                table: "Patients",
                columns: new[] { "Id", "Address", "Allergies", "BloodGroup", "ChronicConditions", "ContactPhone", "CreatedAt", "DateOfBirth", "Email", "EmergencyContactName", "EmergencyContactPhone", "FullName", "Gender", "PatientCode", "UpdatedAt" },
                values: new object[,]
                {
                    { new Guid("a1111111-1111-1111-1111-111111111111"), "742 Evergreen Terrace, Springfield", "Penicillin, Peanuts", "O+", "Stage 1 Hypertension, Mild Asthma", "+1 555-0192", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), new DateTime(1985, 5, 14, 0, 0, 0, 0, DateTimeKind.Utc), "john.anderson@example.com", "Mary Anderson (Spouse)", "+1 555-0193", "John Anderson", "Male", "PAT-1001", new DateTime(2026, 8, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { new Guid("a2222222-2222-2222-2222-222222222222"), "120 Elm Street, Dallas", "Sulfa antibiotics", "A+", "Type 2 Diabetes Mellitus", "+1 555-0284", new DateTime(2026, 2, 10, 0, 0, 0, 0, DateTimeKind.Utc), new DateTime(1992, 8, 22, 0, 0, 0, 0, DateTimeKind.Utc), "maria.garcia@example.com", "Carlos Garcia (Brother)", "+1 555-0285", "Maria Garcia", "Female", "PAT-1002", new DateTime(2026, 8, 10, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { new Guid("a3333333-3333-3333-3333-333333333333"), "88 Pine Avenue, Seattle", "None reported", "B+", "Hyperlipidemia", "+1 555-0371", new DateTime(2026, 3, 15, 0, 0, 0, 0, DateTimeKind.Utc), new DateTime(1968, 11, 3, 0, 0, 0, 0, DateTimeKind.Utc), "robert.kim@example.com", "Susan Kim (Daughter)", "+1 555-0372", "Robert Kim", "Male", "PAT-1003", new DateTime(2026, 8, 15, 0, 0, 0, 0, DateTimeKind.Utc) }
                });

            migrationBuilder.InsertData(
                table: "ChannelingAppointments",
                columns: new[] { "Id", "AppointmentCode", "AppointmentDate", "CreatedAt", "DoctorName", "PatientCode", "PatientId", "Room", "Specialty", "Status" },
                values: new object[,]
                {
                    { new Guid("e1111111-1111-1111-1111-111111111111"), "APT-3011", new DateTime(2026, 8, 24, 10, 30, 0, 0, DateTimeKind.Utc), new DateTime(2026, 8, 1, 10, 0, 0, 0, DateTimeKind.Utc), "Dr. Sarah Jenkins", "PAT-1001", new Guid("a1111111-1111-1111-1111-111111111111"), "Room 304, West Wing", "Cardiologist", "Upcoming" },
                    { new Guid("e2222222-2222-2222-2222-222222222222"), "APT-2890", new DateTime(2026, 7, 22, 14, 0, 0, 0, DateTimeKind.Utc), new DateTime(2026, 7, 10, 14, 0, 0, 0, DateTimeKind.Utc), "Dr. Michael Chang", "PAT-1001", new Guid("a1111111-1111-1111-1111-111111111111"), "Room 108, Main Clinic", "General Practitioner", "Completed" }
                });

            migrationBuilder.InsertData(
                table: "ConsultationNotes",
                columns: new[] { "Id", "ClinicalNotes", "ConsultationDate", "CreatedAt", "Diagnosis", "DoctorDesignation", "DoctorId", "DoctorName", "PatientCode", "PatientId", "PrescribedMedicines", "RecommendedTests", "Status", "UpdatedAt" },
                values: new object[,]
                {
                    { new Guid("c1111111-1111-1111-1111-111111111111"), "Patient presented with mild morning headaches and recorded BP 142/92 mmHg over 3 consecutive clinic visits. Denies chest pain, palpitation, or dyspnea. Advised DASH diet, sodium restriction < 2g/day, and routine aerobic exercise. Follow-up in 4 weeks.", new DateTime(2026, 8, 10, 10, 30, 0, 0, DateTimeKind.Utc), new DateTime(2026, 8, 10, 11, 0, 0, 0, DateTimeKind.Utc), "Stage 1 Essential Hypertension with sinus rhythm", "Senior Consultant Cardiologist", "DOC-101", "Dr. Sarah Chen", "PAT-1001", new Guid("a1111111-1111-1111-1111-111111111111"), "[{\"name\":\"Lisinopril\",\"dosage\":\"10mg once daily in morning\",\"duration\":\"30 Days\"},{\"name\":\"Amlodipine\",\"dosage\":\"5mg once daily\",\"duration\":\"30 Days\"}]", "Complete Blood Count (CBC), Lipid Panel, Resting ECG", "Completed", new DateTime(2026, 8, 10, 11, 0, 0, 0, DateTimeKind.Utc) },
                    { new Guid("c2222222-2222-2222-2222-222222222222"), "Occasional nocturnal dry cough following high pollen exposure. Spirometry showed FEV1 84% predicted, fully responsive to bronchodilators. Avoid known triggers.", new DateTime(2026, 7, 18, 14, 0, 0, 0, DateTimeKind.Utc), new DateTime(2026, 7, 18, 14, 30, 0, 0, DateTimeKind.Utc), "Mild Seasonal Allergic Asthma exacerbation", "Consultant Pulmonologist", "DOC-102", "Dr. Michael Chang", "PAT-1001", new Guid("a1111111-1111-1111-1111-111111111111"), "[{\"name\":\"Salbutamol (Ventolin) Inhaler\",\"dosage\":\"2 puffs as needed for wheeze\",\"duration\":\"As needed\"}]", "Chest X-Ray, Total Serum IgE", "Completed", new DateTime(2026, 7, 18, 14, 30, 0, 0, DateTimeKind.Utc) }
                });

            migrationBuilder.InsertData(
                table: "LabReports",
                columns: new[] { "Id", "Category", "CreatedAt", "FileName", "FileUrl", "OrderedDoctor", "PatientCode", "PatientId", "ReportDate", "ResultsSummary", "Status", "TestTitle", "UpdatedAt" },
                values: new object[,]
                {
                    { new Guid("b1111111-1111-1111-1111-111111111111"), "Haematology", new DateTime(2026, 8, 11, 9, 30, 0, 0, DateTimeKind.Utc), "CBC_Report_PAT1001.pdf", "/uploads/reports/CBC_PAT1001.pdf", "Dr. Sarah Chen", "PAT-1001", new Guid("a1111111-1111-1111-1111-111111111111"), new DateTime(2026, 8, 11, 9, 15, 0, 0, DateTimeKind.Utc), "WBC: 6.8 x10^3/uL (Normal), RBC: 4.9 x10^6/uL, Hemoglobin: 14.8 g/dL, Platelets: 240 x10^3/uL. Indices within normal physiological limits.", "Completed", "Complete Blood Count (CBC)", new DateTime(2026, 8, 11, 9, 30, 0, 0, DateTimeKind.Utc) },
                    { new Guid("b2222222-2222-2222-2222-222222222222"), "Biochemistry", new DateTime(2026, 8, 11, 9, 45, 0, 0, DateTimeKind.Utc), "Lipid_Profile_PAT1001.pdf", "/uploads/reports/Lipid_PAT1001.pdf", "Dr. Sarah Chen", "PAT-1001", new Guid("a1111111-1111-1111-1111-111111111111"), new DateTime(2026, 8, 11, 9, 20, 0, 0, DateTimeKind.Utc), "Total Cholesterol: 185 mg/dL (Normal < 200), HDL: 48 mg/dL, LDL: 112 mg/dL, Triglycerides: 125 mg/dL.", "Completed", "Fasting Lipid Profile", new DateTime(2026, 8, 11, 9, 45, 0, 0, DateTimeKind.Utc) },
                    { new Guid("b3333333-3333-3333-3333-333333333333"), "Cardiology", new DateTime(2026, 8, 15, 11, 0, 0, 0, DateTimeKind.Utc), null, null, "Dr. Sarah Chen", "PAT-1001", new Guid("a1111111-1111-1111-1111-111111111111"), new DateTime(2026, 8, 15, 11, 0, 0, 0, DateTimeKind.Utc), "Specimen collected; awaiting cardiologist interpretation signature.", "Pending", "Resting 12-Lead Electrocardiogram (ECG)", new DateTime(2026, 8, 15, 11, 0, 0, 0, DateTimeKind.Utc) }
                });

            migrationBuilder.InsertData(
                table: "Prescriptions",
                columns: new[] { "Id", "CreatedAt", "Dosage", "Duration", "EndDate", "MedicationName", "PatientCode", "PatientId", "PrescribedDoctor", "StartDate", "Status", "UnitPrice", "UpdatedAt" },
                values: new object[,]
                {
                    { new Guid("d1111111-1111-1111-1111-111111111111"), new DateTime(2026, 8, 10, 11, 15, 0, 0, DateTimeKind.Utc), "Take 1 tablet by mouth daily in the morning with water", "30 Days", new DateTime(2026, 9, 9, 0, 0, 0, 0, DateTimeKind.Utc), "Lisinopril 10mg", "PAT-1001", new Guid("a1111111-1111-1111-1111-111111111111"), "Dr. Sarah Chen", new DateTime(2026, 8, 10, 0, 0, 0, 0, DateTimeKind.Utc), "Active", 12.50m, new DateTime(2026, 8, 10, 11, 15, 0, 0, DateTimeKind.Utc) },
                    { new Guid("d2222222-2222-2222-2222-222222222222"), new DateTime(2026, 8, 10, 11, 15, 0, 0, DateTimeKind.Utc), "Take 1 tablet daily with or without food", "30 Days", new DateTime(2026, 9, 9, 0, 0, 0, 0, DateTimeKind.Utc), "Amlodipine 5mg", "PAT-1001", new Guid("a1111111-1111-1111-1111-111111111111"), "Dr. Sarah Chen", new DateTime(2026, 8, 10, 0, 0, 0, 0, DateTimeKind.Utc), "Active", 10.00m, new DateTime(2026, 8, 10, 11, 15, 0, 0, DateTimeKind.Utc) },
                    { new Guid("d3333333-3333-3333-3333-333333333333"), new DateTime(2026, 6, 1, 15, 0, 0, 0, DateTimeKind.Utc), "Take 1 capsule every 8 hours for 7 days", "7 Days", new DateTime(2026, 6, 8, 0, 0, 0, 0, DateTimeKind.Utc), "Amoxicillin 500mg", "PAT-1001", new Guid("a1111111-1111-1111-1111-111111111111"), "Dr. Michael Chang", new DateTime(2026, 6, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Completed", 15.00m, new DateTime(2026, 6, 8, 15, 0, 0, 0, DateTimeKind.Utc) }
                });

            migrationBuilder.CreateIndex(
                name: "IX_ChannelingAppointments_AppointmentDate",
                table: "ChannelingAppointments",
                column: "AppointmentDate");

            migrationBuilder.CreateIndex(
                name: "IX_ChannelingAppointments_PatientCode",
                table: "ChannelingAppointments",
                column: "PatientCode");

            migrationBuilder.CreateIndex(
                name: "IX_ChannelingAppointments_PatientId",
                table: "ChannelingAppointments",
                column: "PatientId");

            migrationBuilder.CreateIndex(
                name: "IX_ConsultationNotes_ConsultationDate",
                table: "ConsultationNotes",
                column: "ConsultationDate");

            migrationBuilder.CreateIndex(
                name: "IX_ConsultationNotes_PatientCode",
                table: "ConsultationNotes",
                column: "PatientCode");

            migrationBuilder.CreateIndex(
                name: "IX_ConsultationNotes_PatientId",
                table: "ConsultationNotes",
                column: "PatientId");

            migrationBuilder.CreateIndex(
                name: "IX_DoctorAppointments_AppointmentNumber",
                table: "DoctorAppointments",
                column: "AppointmentNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_DoctorAppointments_DoctorId",
                table: "DoctorAppointments",
                column: "DoctorId");

            migrationBuilder.CreateIndex(
                name: "IX_DoctorAppointments_DoctorSessionId",
                table: "DoctorAppointments",
                column: "DoctorSessionId");

            migrationBuilder.CreateIndex(
                name: "IX_DoctorAppointments_PatientId",
                table: "DoctorAppointments",
                column: "PatientId");

            migrationBuilder.CreateIndex(
                name: "IX_DoctorAppointments_Status",
                table: "DoctorAppointments",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_Doctors_HospitalBranch",
                table: "Doctors",
                column: "HospitalBranch");

            migrationBuilder.CreateIndex(
                name: "IX_Doctors_Specialization",
                table: "Doctors",
                column: "Specialization");

            migrationBuilder.CreateIndex(
                name: "IX_DoctorSessions_DoctorId_SessionDate_SessionTime",
                table: "DoctorSessions",
                columns: new[] { "DoctorId", "SessionDate", "SessionTime" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_EMRAuditLogs_PatientId",
                table: "EMRAuditLogs",
                column: "PatientId");

            migrationBuilder.CreateIndex(
                name: "IX_EMRAuditLogs_Timestamp",
                table: "EMRAuditLogs",
                column: "Timestamp");

            migrationBuilder.CreateIndex(
                name: "IX_LabBookings_LabTestId",
                table: "LabBookings",
                column: "LabTestId");

            migrationBuilder.CreateIndex(
                name: "IX_LabBookings_PatientId",
                table: "LabBookings",
                column: "PatientId");

            migrationBuilder.CreateIndex(
                name: "IX_LabBookings_Status",
                table: "LabBookings",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_LabReports_PatientCode",
                table: "LabReports",
                column: "PatientCode");

            migrationBuilder.CreateIndex(
                name: "IX_LabReports_PatientId",
                table: "LabReports",
                column: "PatientId");

            migrationBuilder.CreateIndex(
                name: "IX_LabReports_Status",
                table: "LabReports",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_LabTests_Category",
                table: "LabTests",
                column: "Category");

            migrationBuilder.CreateIndex(
                name: "IX_LabTests_Name",
                table: "LabTests",
                column: "Name");

            migrationBuilder.CreateIndex(
                name: "IX_LabTimeSlots_Date_Time",
                table: "LabTimeSlots",
                columns: new[] { "Date", "Time" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Medicines_CategoryId",
                table: "Medicines",
                column: "CategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_PatientProfiles_UserId",
                table: "PatientProfiles",
                column: "UserId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Patients_Email",
                table: "Patients",
                column: "Email");

            migrationBuilder.CreateIndex(
                name: "IX_Patients_PatientCode",
                table: "Patients",
                column: "PatientCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Payments_ReferenceId",
                table: "Payments",
                column: "ReferenceId");

            migrationBuilder.CreateIndex(
                name: "IX_PharmacyOrderItems_MedicineId",
                table: "PharmacyOrderItems",
                column: "MedicineId");

            migrationBuilder.CreateIndex(
                name: "IX_PharmacyOrderItems_PharmacyOrderId",
                table: "PharmacyOrderItems",
                column: "PharmacyOrderId");

            migrationBuilder.CreateIndex(
                name: "IX_PharmacyOrders_OrderNumber",
                table: "PharmacyOrders",
                column: "OrderNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PharmacyOrders_PatientId",
                table: "PharmacyOrders",
                column: "PatientId");

            migrationBuilder.CreateIndex(
                name: "IX_Prescriptions_PatientCode",
                table: "Prescriptions",
                column: "PatientCode");

            migrationBuilder.CreateIndex(
                name: "IX_Prescriptions_PatientId",
                table: "Prescriptions",
                column: "PatientId");

            migrationBuilder.CreateIndex(
                name: "IX_Prescriptions_Status",
                table: "Prescriptions",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_PrescriptionSubmissions_PatientId",
                table: "PrescriptionSubmissions",
                column: "PatientId");

            migrationBuilder.CreateIndex(
                name: "IX_PrescriptionSubmissions_PrescriptionCode",
                table: "PrescriptionSubmissions",
                column: "PrescriptionCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Users_Email",
                table: "Users",
                column: "Email",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ChannelingAppointments");

            migrationBuilder.DropTable(
                name: "ConsultationNotes");

            migrationBuilder.DropTable(
                name: "DoctorAppointments");

            migrationBuilder.DropTable(
                name: "EMRAuditLogs");

            migrationBuilder.DropTable(
                name: "LabBookings");

            migrationBuilder.DropTable(
                name: "LabReports");

            migrationBuilder.DropTable(
                name: "LabTimeSlots");

            migrationBuilder.DropTable(
                name: "PatientFeedbacks");

            migrationBuilder.DropTable(
                name: "PatientProfiles");

            migrationBuilder.DropTable(
                name: "Payments");

            migrationBuilder.DropTable(
                name: "PharmacyOrderItems");

            migrationBuilder.DropTable(
                name: "Prescriptions");

            migrationBuilder.DropTable(
                name: "PrescriptionSubmissions");

            migrationBuilder.DropTable(
                name: "DoctorSessions");

            migrationBuilder.DropTable(
                name: "LabTests");

            migrationBuilder.DropTable(
                name: "Medicines");

            migrationBuilder.DropTable(
                name: "PharmacyOrders");

            migrationBuilder.DropTable(
                name: "Patients");

            migrationBuilder.DropTable(
                name: "Doctors");

            migrationBuilder.DropTable(
                name: "Categories");

            migrationBuilder.DropTable(
                name: "Users");
        }
    }
}
