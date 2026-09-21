using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace LabManagement.API.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
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
                name: "LabBookings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PatientId = table.Column<Guid>(type: "uuid", nullable: false),
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

            migrationBuilder.InsertData(
                table: "LabTests",
                columns: new[] { "Id", "Category", "CreatedAt", "Description", "IsActive", "IsRestricted", "Name", "Price", "TurnaroundDays" },
                values: new object[,]
                {
                    { new Guid("11111111-1111-1111-1111-111111111111"), "Haematology", new DateTime(2026, 8, 4, 9, 40, 51, 805, DateTimeKind.Utc).AddTicks(1647), "Measures different components of blood including red/white cells and platelets.", true, false, "Complete Blood Count (CBC)", 1500m, 1 },
                    { new Guid("22222222-2222-2222-2222-222222222222"), "Biochemistry", new DateTime(2026, 8, 4, 9, 40, 51, 805, DateTimeKind.Utc).AddTicks(1663), "Measures cholesterol and triglyceride levels in the blood.", true, true, "Lipid Panel", 2500m, 1 },
                    { new Guid("33333333-3333-3333-3333-333333333333"), "Biochemistry", new DateTime(2026, 8, 4, 9, 40, 51, 805, DateTimeKind.Utc).AddTicks(1667), "Measures blood sugar levels after an 8-hour fast.", true, false, "Blood Glucose Fasting", 500m, 1 },
                    { new Guid("44444444-4444-4444-4444-444444444444"), "Endocrinology", new DateTime(2026, 8, 4, 9, 40, 51, 805, DateTimeKind.Utc).AddTicks(1670), "Evaluates thyroid gland function (TSH, T3, T4).", true, true, "Thyroid Function Test (TFT)", 3500m, 2 },
                    { new Guid("55555555-5555-5555-5555-555555555555"), "Microbiology", new DateTime(2026, 8, 4, 9, 40, 51, 805, DateTimeKind.Utc).AddTicks(1685), "Analyses physical, chemical and microscopic properties of urine.", true, false, "Urine Full Report (UFR)", 800m, 1 },
                    { new Guid("66666666-6666-6666-6666-666666666666"), "Radiology", new DateTime(2026, 8, 4, 9, 40, 51, 805, DateTimeKind.Utc).AddTicks(1688), "Imaging of lungs, heart and chest wall.", true, true, "Chest X-Ray", 2000m, 1 },
                    { new Guid("77777777-7777-7777-7777-777777777777"), "Biochemistry", new DateTime(2026, 8, 4, 9, 40, 51, 805, DateTimeKind.Utc).AddTicks(1690), "Assesses liver health via enzyme and protein levels.", true, true, "Liver Function Test (LFT)", 3000m, 2 },
                    { new Guid("88888888-8888-8888-8888-888888888888"), "Haematology", new DateTime(2026, 8, 4, 9, 40, 51, 805, DateTimeKind.Utc).AddTicks(1693), "Detects inflammation in the body.", true, false, "ESR (Erythrocyte Sedimentation Rate)", 600m, 1 }
                });

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
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "LabBookings");

            migrationBuilder.DropTable(
                name: "LabTimeSlots");

            migrationBuilder.DropTable(
                name: "LabTests");
        }
    }
}
