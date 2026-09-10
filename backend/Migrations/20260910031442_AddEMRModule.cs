using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace LabManagement.API.Migrations
{
    /// <inheritdoc />
    public partial class AddEMRModule : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
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

            migrationBuilder.UpdateData(
                table: "LabTests",
                keyColumn: "Id",
                keyValue: new Guid("11111111-1111-1111-1111-111111111111"),
                column: "CreatedAt",
                value: new DateTime(2026, 9, 10, 3, 14, 39, 829, DateTimeKind.Utc).AddTicks(2627));

            migrationBuilder.UpdateData(
                table: "LabTests",
                keyColumn: "Id",
                keyValue: new Guid("22222222-2222-2222-2222-222222222222"),
                column: "CreatedAt",
                value: new DateTime(2026, 9, 10, 3, 14, 39, 829, DateTimeKind.Utc).AddTicks(2710));

            migrationBuilder.UpdateData(
                table: "LabTests",
                keyColumn: "Id",
                keyValue: new Guid("33333333-3333-3333-3333-333333333333"),
                column: "CreatedAt",
                value: new DateTime(2026, 9, 10, 3, 14, 39, 829, DateTimeKind.Utc).AddTicks(2718));

            migrationBuilder.UpdateData(
                table: "LabTests",
                keyColumn: "Id",
                keyValue: new Guid("44444444-4444-4444-4444-444444444444"),
                column: "CreatedAt",
                value: new DateTime(2026, 9, 10, 3, 14, 39, 829, DateTimeKind.Utc).AddTicks(2725));

            migrationBuilder.UpdateData(
                table: "LabTests",
                keyColumn: "Id",
                keyValue: new Guid("55555555-5555-5555-5555-555555555555"),
                column: "CreatedAt",
                value: new DateTime(2026, 9, 10, 3, 14, 39, 829, DateTimeKind.Utc).AddTicks(2734));

            migrationBuilder.UpdateData(
                table: "LabTests",
                keyColumn: "Id",
                keyValue: new Guid("66666666-6666-6666-6666-666666666666"),
                column: "CreatedAt",
                value: new DateTime(2026, 9, 10, 3, 14, 39, 829, DateTimeKind.Utc).AddTicks(2740));

            migrationBuilder.UpdateData(
                table: "LabTests",
                keyColumn: "Id",
                keyValue: new Guid("77777777-7777-7777-7777-777777777777"),
                column: "CreatedAt",
                value: new DateTime(2026, 9, 10, 3, 14, 39, 829, DateTimeKind.Utc).AddTicks(2748));

            migrationBuilder.UpdateData(
                table: "LabTests",
                keyColumn: "Id",
                keyValue: new Guid("88888888-8888-8888-8888-888888888888"),
                column: "CreatedAt",
                value: new DateTime(2026, 9, 10, 3, 14, 39, 829, DateTimeKind.Utc).AddTicks(2766));

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
                name: "IX_EMRAuditLogs_PatientId",
                table: "EMRAuditLogs",
                column: "PatientId");

            migrationBuilder.CreateIndex(
                name: "IX_EMRAuditLogs_Timestamp",
                table: "EMRAuditLogs",
                column: "Timestamp");

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
                name: "IX_Patients_Email",
                table: "Patients",
                column: "Email");

            migrationBuilder.CreateIndex(
                name: "IX_Patients_PatientCode",
                table: "Patients",
                column: "PatientCode",
                unique: true);

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
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ConsultationNotes");

            migrationBuilder.DropTable(
                name: "EMRAuditLogs");

            migrationBuilder.DropTable(
                name: "LabReports");

            migrationBuilder.DropTable(
                name: "Prescriptions");

            migrationBuilder.DropTable(
                name: "Patients");

            migrationBuilder.UpdateData(
                table: "LabTests",
                keyColumn: "Id",
                keyValue: new Guid("11111111-1111-1111-1111-111111111111"),
                column: "CreatedAt",
                value: new DateTime(2026, 8, 6, 10, 19, 18, 354, DateTimeKind.Utc).AddTicks(628));

            migrationBuilder.UpdateData(
                table: "LabTests",
                keyColumn: "Id",
                keyValue: new Guid("22222222-2222-2222-2222-222222222222"),
                column: "CreatedAt",
                value: new DateTime(2026, 8, 6, 10, 19, 18, 354, DateTimeKind.Utc).AddTicks(646));

            migrationBuilder.UpdateData(
                table: "LabTests",
                keyColumn: "Id",
                keyValue: new Guid("33333333-3333-3333-3333-333333333333"),
                column: "CreatedAt",
                value: new DateTime(2026, 8, 6, 10, 19, 18, 354, DateTimeKind.Utc).AddTicks(649));

            migrationBuilder.UpdateData(
                table: "LabTests",
                keyColumn: "Id",
                keyValue: new Guid("44444444-4444-4444-4444-444444444444"),
                column: "CreatedAt",
                value: new DateTime(2026, 8, 6, 10, 19, 18, 354, DateTimeKind.Utc).AddTicks(652));

            migrationBuilder.UpdateData(
                table: "LabTests",
                keyColumn: "Id",
                keyValue: new Guid("55555555-5555-5555-5555-555555555555"),
                column: "CreatedAt",
                value: new DateTime(2026, 8, 6, 10, 19, 18, 354, DateTimeKind.Utc).AddTicks(664));

            migrationBuilder.UpdateData(
                table: "LabTests",
                keyColumn: "Id",
                keyValue: new Guid("66666666-6666-6666-6666-666666666666"),
                column: "CreatedAt",
                value: new DateTime(2026, 8, 6, 10, 19, 18, 354, DateTimeKind.Utc).AddTicks(668));

            migrationBuilder.UpdateData(
                table: "LabTests",
                keyColumn: "Id",
                keyValue: new Guid("77777777-7777-7777-7777-777777777777"),
                column: "CreatedAt",
                value: new DateTime(2026, 8, 6, 10, 19, 18, 354, DateTimeKind.Utc).AddTicks(671));

            migrationBuilder.UpdateData(
                table: "LabTests",
                keyColumn: "Id",
                keyValue: new Guid("88888888-8888-8888-8888-888888888888"),
                column: "CreatedAt",
                value: new DateTime(2026, 8, 6, 10, 19, 18, 354, DateTimeKind.Utc).AddTicks(674));
        }
    }
}
