using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace HealthBridge.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddUserIdToEMRPatient : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "ChannelingAppointments",
                keyColumn: "Id",
                keyValue: new Guid("e1111111-1111-1111-1111-111111111111"));

            migrationBuilder.DeleteData(
                table: "ChannelingAppointments",
                keyColumn: "Id",
                keyValue: new Guid("e2222222-2222-2222-2222-222222222222"));

            migrationBuilder.DeleteData(
                table: "ConsultationNotes",
                keyColumn: "Id",
                keyValue: new Guid("c1111111-1111-1111-1111-111111111111"));

            migrationBuilder.DeleteData(
                table: "ConsultationNotes",
                keyColumn: "Id",
                keyValue: new Guid("c2222222-2222-2222-2222-222222222222"));

            migrationBuilder.DeleteData(
                table: "LabReports",
                keyColumn: "Id",
                keyValue: new Guid("b1111111-1111-1111-1111-111111111111"));

            migrationBuilder.DeleteData(
                table: "LabReports",
                keyColumn: "Id",
                keyValue: new Guid("b2222222-2222-2222-2222-222222222222"));

            migrationBuilder.DeleteData(
                table: "LabReports",
                keyColumn: "Id",
                keyValue: new Guid("b3333333-3333-3333-3333-333333333333"));

            migrationBuilder.DeleteData(
                table: "Patients",
                keyColumn: "Id",
                keyValue: new Guid("a2222222-2222-2222-2222-222222222222"));

            migrationBuilder.DeleteData(
                table: "Patients",
                keyColumn: "Id",
                keyValue: new Guid("a3333333-3333-3333-3333-333333333333"));

            migrationBuilder.DeleteData(
                table: "Prescriptions",
                keyColumn: "Id",
                keyValue: new Guid("d1111111-1111-1111-1111-111111111111"));

            migrationBuilder.DeleteData(
                table: "Prescriptions",
                keyColumn: "Id",
                keyValue: new Guid("d2222222-2222-2222-2222-222222222222"));

            migrationBuilder.DeleteData(
                table: "Prescriptions",
                keyColumn: "Id",
                keyValue: new Guid("d3333333-3333-3333-3333-333333333333"));

            migrationBuilder.DeleteData(
                table: "Patients",
                keyColumn: "Id",
                keyValue: new Guid("a1111111-1111-1111-1111-111111111111"));

            migrationBuilder.AddColumn<int>(
                name: "UserId",
                table: "Patients",
                type: "integer",
                nullable: true);

            migrationBuilder.UpdateData(
                table: "LabTests",
                keyColumn: "Id",
                keyValue: new Guid("11111111-1111-1111-1111-111111111111"),
                column: "CreatedAt",
                value: new DateTime(2026, 9, 24, 18, 36, 48, 456, DateTimeKind.Utc).AddTicks(9327));

            migrationBuilder.UpdateData(
                table: "LabTests",
                keyColumn: "Id",
                keyValue: new Guid("22222222-2222-2222-2222-222222222222"),
                column: "CreatedAt",
                value: new DateTime(2026, 9, 24, 18, 36, 48, 456, DateTimeKind.Utc).AddTicks(9356));

            migrationBuilder.UpdateData(
                table: "LabTests",
                keyColumn: "Id",
                keyValue: new Guid("33333333-3333-3333-3333-333333333333"),
                column: "CreatedAt",
                value: new DateTime(2026, 9, 24, 18, 36, 48, 456, DateTimeKind.Utc).AddTicks(9375));

            migrationBuilder.UpdateData(
                table: "LabTests",
                keyColumn: "Id",
                keyValue: new Guid("44444444-4444-4444-4444-444444444444"),
                column: "CreatedAt",
                value: new DateTime(2026, 9, 24, 18, 36, 48, 456, DateTimeKind.Utc).AddTicks(9379));

            migrationBuilder.UpdateData(
                table: "LabTests",
                keyColumn: "Id",
                keyValue: new Guid("55555555-5555-5555-5555-555555555555"),
                column: "CreatedAt",
                value: new DateTime(2026, 9, 24, 18, 36, 48, 456, DateTimeKind.Utc).AddTicks(9383));

            migrationBuilder.UpdateData(
                table: "LabTests",
                keyColumn: "Id",
                keyValue: new Guid("66666666-6666-6666-6666-666666666666"),
                column: "CreatedAt",
                value: new DateTime(2026, 9, 24, 18, 36, 48, 456, DateTimeKind.Utc).AddTicks(9388));

            migrationBuilder.UpdateData(
                table: "LabTests",
                keyColumn: "Id",
                keyValue: new Guid("77777777-7777-7777-7777-777777777777"),
                column: "CreatedAt",
                value: new DateTime(2026, 9, 24, 18, 36, 48, 456, DateTimeKind.Utc).AddTicks(9392));

            migrationBuilder.UpdateData(
                table: "LabTests",
                keyColumn: "Id",
                keyValue: new Guid("88888888-8888-8888-8888-888888888888"),
                column: "CreatedAt",
                value: new DateTime(2026, 9, 24, 18, 36, 48, 456, DateTimeKind.Utc).AddTicks(9394));

            migrationBuilder.CreateIndex(
                name: "IX_Patients_UserId",
                table: "Patients",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Patients_UserId",
                table: "Patients");

            migrationBuilder.DropColumn(
                name: "UserId",
                table: "Patients");

            migrationBuilder.UpdateData(
                table: "LabTests",
                keyColumn: "Id",
                keyValue: new Guid("11111111-1111-1111-1111-111111111111"),
                column: "CreatedAt",
                value: new DateTime(2026, 9, 24, 17, 53, 10, 711, DateTimeKind.Utc).AddTicks(289));

            migrationBuilder.UpdateData(
                table: "LabTests",
                keyColumn: "Id",
                keyValue: new Guid("22222222-2222-2222-2222-222222222222"),
                column: "CreatedAt",
                value: new DateTime(2026, 9, 24, 17, 53, 10, 711, DateTimeKind.Utc).AddTicks(324));

            migrationBuilder.UpdateData(
                table: "LabTests",
                keyColumn: "Id",
                keyValue: new Guid("33333333-3333-3333-3333-333333333333"),
                column: "CreatedAt",
                value: new DateTime(2026, 9, 24, 17, 53, 10, 711, DateTimeKind.Utc).AddTicks(329));

            migrationBuilder.UpdateData(
                table: "LabTests",
                keyColumn: "Id",
                keyValue: new Guid("44444444-4444-4444-4444-444444444444"),
                column: "CreatedAt",
                value: new DateTime(2026, 9, 24, 17, 53, 10, 711, DateTimeKind.Utc).AddTicks(333));

            migrationBuilder.UpdateData(
                table: "LabTests",
                keyColumn: "Id",
                keyValue: new Guid("55555555-5555-5555-5555-555555555555"),
                column: "CreatedAt",
                value: new DateTime(2026, 9, 24, 17, 53, 10, 711, DateTimeKind.Utc).AddTicks(337));

            migrationBuilder.UpdateData(
                table: "LabTests",
                keyColumn: "Id",
                keyValue: new Guid("66666666-6666-6666-6666-666666666666"),
                column: "CreatedAt",
                value: new DateTime(2026, 9, 24, 17, 53, 10, 711, DateTimeKind.Utc).AddTicks(353));

            migrationBuilder.UpdateData(
                table: "LabTests",
                keyColumn: "Id",
                keyValue: new Guid("77777777-7777-7777-7777-777777777777"),
                column: "CreatedAt",
                value: new DateTime(2026, 9, 24, 17, 53, 10, 711, DateTimeKind.Utc).AddTicks(358));

            migrationBuilder.UpdateData(
                table: "LabTests",
                keyColumn: "Id",
                keyValue: new Guid("88888888-8888-8888-8888-888888888888"),
                column: "CreatedAt",
                value: new DateTime(2026, 9, 24, 17, 53, 10, 711, DateTimeKind.Utc).AddTicks(362));

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
        }
    }
}
