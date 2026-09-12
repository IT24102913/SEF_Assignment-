using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace LabManagement.API.Migrations
{
    /// <inheritdoc />
    public partial class AddUserPatientLinkAndChanneling : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "Age",
                table: "AppUsers",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PatientCode",
                table: "AppUsers",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PhoneNumber",
                table: "AppUsers",
                type: "text",
                nullable: true);

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

            migrationBuilder.InsertData(
                table: "ChannelingAppointments",
                columns: new[] { "Id", "AppointmentCode", "AppointmentDate", "CreatedAt", "DoctorName", "PatientCode", "PatientId", "Room", "Specialty", "Status" },
                values: new object[,]
                {
                    { new Guid("e1111111-1111-1111-1111-111111111111"), "APT-3011", new DateTime(2026, 8, 24, 10, 30, 0, 0, DateTimeKind.Utc), new DateTime(2026, 8, 1, 10, 0, 0, 0, DateTimeKind.Utc), "Dr. Sarah Jenkins", "PAT-1001", new Guid("a1111111-1111-1111-1111-111111111111"), "Room 304, West Wing", "Cardiologist", "Upcoming" },
                    { new Guid("e2222222-2222-2222-2222-222222222222"), "APT-2890", new DateTime(2026, 7, 22, 14, 0, 0, 0, DateTimeKind.Utc), new DateTime(2026, 7, 10, 14, 0, 0, 0, DateTimeKind.Utc), "Dr. Michael Chang", "PAT-1001", new Guid("a1111111-1111-1111-1111-111111111111"), "Room 108, Main Clinic", "General Practitioner", "Completed" }
                });

            migrationBuilder.UpdateData(
                table: "LabTests",
                keyColumn: "Id",
                keyValue: new Guid("11111111-1111-1111-1111-111111111111"),
                column: "CreatedAt",
                value: new DateTime(2026, 9, 11, 10, 36, 15, 740, DateTimeKind.Utc).AddTicks(6483));

            migrationBuilder.UpdateData(
                table: "LabTests",
                keyColumn: "Id",
                keyValue: new Guid("22222222-2222-2222-2222-222222222222"),
                column: "CreatedAt",
                value: new DateTime(2026, 9, 11, 10, 36, 15, 740, DateTimeKind.Utc).AddTicks(6527));

            migrationBuilder.UpdateData(
                table: "LabTests",
                keyColumn: "Id",
                keyValue: new Guid("33333333-3333-3333-3333-333333333333"),
                column: "CreatedAt",
                value: new DateTime(2026, 9, 11, 10, 36, 15, 740, DateTimeKind.Utc).AddTicks(6534));

            migrationBuilder.UpdateData(
                table: "LabTests",
                keyColumn: "Id",
                keyValue: new Guid("44444444-4444-4444-4444-444444444444"),
                column: "CreatedAt",
                value: new DateTime(2026, 9, 11, 10, 36, 15, 740, DateTimeKind.Utc).AddTicks(6539));

            migrationBuilder.UpdateData(
                table: "LabTests",
                keyColumn: "Id",
                keyValue: new Guid("55555555-5555-5555-5555-555555555555"),
                column: "CreatedAt",
                value: new DateTime(2026, 9, 11, 10, 36, 15, 740, DateTimeKind.Utc).AddTicks(6562));

            migrationBuilder.UpdateData(
                table: "LabTests",
                keyColumn: "Id",
                keyValue: new Guid("66666666-6666-6666-6666-666666666666"),
                column: "CreatedAt",
                value: new DateTime(2026, 9, 11, 10, 36, 15, 740, DateTimeKind.Utc).AddTicks(6568));

            migrationBuilder.UpdateData(
                table: "LabTests",
                keyColumn: "Id",
                keyValue: new Guid("77777777-7777-7777-7777-777777777777"),
                column: "CreatedAt",
                value: new DateTime(2026, 9, 11, 10, 36, 15, 740, DateTimeKind.Utc).AddTicks(6572));

            migrationBuilder.UpdateData(
                table: "LabTests",
                keyColumn: "Id",
                keyValue: new Guid("88888888-8888-8888-8888-888888888888"),
                column: "CreatedAt",
                value: new DateTime(2026, 9, 11, 10, 36, 15, 740, DateTimeKind.Utc).AddTicks(6575));

            migrationBuilder.CreateIndex(
                name: "IX_AppUsers_PatientCode",
                table: "AppUsers",
                column: "PatientCode");

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
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ChannelingAppointments");

            migrationBuilder.DropIndex(
                name: "IX_AppUsers_PatientCode",
                table: "AppUsers");

            migrationBuilder.DropColumn(
                name: "Age",
                table: "AppUsers");

            migrationBuilder.DropColumn(
                name: "PatientCode",
                table: "AppUsers");

            migrationBuilder.DropColumn(
                name: "PhoneNumber",
                table: "AppUsers");

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
        }
    }
}
