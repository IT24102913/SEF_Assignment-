using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace HealthBridge.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddSymptomAdviceHistory : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_DoctorSessions_DoctorId_SessionDate_SessionTime",
                table: "DoctorSessions");

            migrationBuilder.DropIndex(
                name: "IX_DoctorAppointments_DoctorSessionId",
                table: "DoctorAppointments");

            migrationBuilder.AddColumn<bool>(
                name: "IsEmailVerified",
                table: "Users",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "NicNumber",
                table: "Users",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "EmrLabReportId",
                table: "LabBookings",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsSavedToEmr",
                table: "LabBookings",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "ActualStartTime",
                table: "DoctorSessions",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "CurrentlyServingQueueNumber",
                table: "DoctorSessions",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DelayReason",
                table: "DoctorSessions",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ExpectedStartTime",
                table: "DoctorSessions",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SessionStatus",
                table: "DoctorSessions",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "SessionType",
                table: "DoctorSessions",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "ArrivalStatus",
                table: "DoctorAppointments",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "BookingType",
                table: "DoctorAppointments",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTime>(
                name: "CalledAt",
                table: "DoctorAppointments",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "CheckedInAt",
                table: "DoctorAppointments",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "CheckedInByUserId",
                table: "DoctorAppointments",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "QrToken",
                table: "DoctorAppointments",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<int>(
                name: "QueueStatus",
                table: "DoctorAppointments",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTime>(
                name: "ReadyAlertSentAt",
                table: "DoctorAppointments",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "StatusChangeReason",
                table: "DoctorAppointments",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "RecommendationWorkflows",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PatientId = table.Column<int>(type: "integer", nullable: true),
                    InputText = table.Column<string>(type: "text", nullable: false),
                    Objective = table.Column<string>(type: "text", nullable: false),
                    PlanJson = table.Column<string>(type: "text", nullable: false),
                    StepResultsJson = table.Column<string>(type: "text", nullable: false),
                    StatusPath = table.Column<string>(type: "text", nullable: false),
                    FinalStatus = table.Column<string>(type: "text", nullable: false),
                    Specialty = table.Column<string>(type: "text", nullable: true),
                    Confidence = table.Column<double>(type: "double precision", nullable: false),
                    Retries = table.Column<int>(type: "integer", nullable: false),
                    Errors = table.Column<string>(type: "text", nullable: true),
                    DurationMs = table.Column<long>(type: "bigint", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RecommendationWorkflows", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "SymptomAdviceHistory",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    PatientEmail = table.Column<string>(type: "text", nullable: true),
                    Symptom = table.Column<string>(type: "text", nullable: false),
                    SymptomCategory = table.Column<string>(type: "text", nullable: false),
                    Summary = table.Column<string>(type: "text", nullable: false),
                    ResponseJson = table.Column<string>(type: "text", nullable: false),
                    EngineUsed = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SymptomAdviceHistory", x => x.Id);
                });

            migrationBuilder.UpdateData(
                table: "LabTests",
                keyColumn: "Id",
                keyValue: new Guid("11111111-1111-1111-1111-111111111111"),
                column: "CreatedAt",
                value: new DateTime(2026, 10, 7, 16, 48, 38, 592, DateTimeKind.Utc).AddTicks(2547));

            migrationBuilder.UpdateData(
                table: "LabTests",
                keyColumn: "Id",
                keyValue: new Guid("22222222-2222-2222-2222-222222222222"),
                column: "CreatedAt",
                value: new DateTime(2026, 10, 7, 16, 48, 38, 592, DateTimeKind.Utc).AddTicks(2560));

            migrationBuilder.UpdateData(
                table: "LabTests",
                keyColumn: "Id",
                keyValue: new Guid("33333333-3333-3333-3333-333333333333"),
                column: "CreatedAt",
                value: new DateTime(2026, 10, 7, 16, 48, 38, 592, DateTimeKind.Utc).AddTicks(2563));

            migrationBuilder.UpdateData(
                table: "LabTests",
                keyColumn: "Id",
                keyValue: new Guid("44444444-4444-4444-4444-444444444444"),
                column: "CreatedAt",
                value: new DateTime(2026, 10, 7, 16, 48, 38, 592, DateTimeKind.Utc).AddTicks(2576));

            migrationBuilder.UpdateData(
                table: "LabTests",
                keyColumn: "Id",
                keyValue: new Guid("55555555-5555-5555-5555-555555555555"),
                column: "CreatedAt",
                value: new DateTime(2026, 10, 7, 16, 48, 38, 592, DateTimeKind.Utc).AddTicks(2579));

            migrationBuilder.UpdateData(
                table: "LabTests",
                keyColumn: "Id",
                keyValue: new Guid("66666666-6666-6666-6666-666666666666"),
                column: "CreatedAt",
                value: new DateTime(2026, 10, 7, 16, 48, 38, 592, DateTimeKind.Utc).AddTicks(2581));

            migrationBuilder.UpdateData(
                table: "LabTests",
                keyColumn: "Id",
                keyValue: new Guid("77777777-7777-7777-7777-777777777777"),
                column: "CreatedAt",
                value: new DateTime(2026, 10, 7, 16, 48, 38, 592, DateTimeKind.Utc).AddTicks(2583));

            migrationBuilder.UpdateData(
                table: "LabTests",
                keyColumn: "Id",
                keyValue: new Guid("88888888-8888-8888-8888-888888888888"),
                column: "CreatedAt",
                value: new DateTime(2026, 10, 7, 16, 48, 38, 592, DateTimeKind.Utc).AddTicks(2586));

            migrationBuilder.CreateIndex(
                name: "IX_DoctorSessions_DoctorId_SessionDate_SessionType",
                table: "DoctorSessions",
                columns: new[] { "DoctorId", "SessionDate", "SessionType" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_DoctorAppointments_DoctorSessionId_QueueNumber",
                table: "DoctorAppointments",
                columns: new[] { "DoctorSessionId", "QueueNumber" },
                unique: true,
                filter: "\"Status\" <> 'Cancelled'");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "RecommendationWorkflows");

            migrationBuilder.DropTable(
                name: "SymptomAdviceHistory");

            migrationBuilder.DropIndex(
                name: "IX_DoctorSessions_DoctorId_SessionDate_SessionType",
                table: "DoctorSessions");

            migrationBuilder.DropIndex(
                name: "IX_DoctorAppointments_DoctorSessionId_QueueNumber",
                table: "DoctorAppointments");

            migrationBuilder.DropColumn(
                name: "IsEmailVerified",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "NicNumber",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "EmrLabReportId",
                table: "LabBookings");

            migrationBuilder.DropColumn(
                name: "IsSavedToEmr",
                table: "LabBookings");

            migrationBuilder.DropColumn(
                name: "ActualStartTime",
                table: "DoctorSessions");

            migrationBuilder.DropColumn(
                name: "CurrentlyServingQueueNumber",
                table: "DoctorSessions");

            migrationBuilder.DropColumn(
                name: "DelayReason",
                table: "DoctorSessions");

            migrationBuilder.DropColumn(
                name: "ExpectedStartTime",
                table: "DoctorSessions");

            migrationBuilder.DropColumn(
                name: "SessionStatus",
                table: "DoctorSessions");

            migrationBuilder.DropColumn(
                name: "SessionType",
                table: "DoctorSessions");

            migrationBuilder.DropColumn(
                name: "ArrivalStatus",
                table: "DoctorAppointments");

            migrationBuilder.DropColumn(
                name: "BookingType",
                table: "DoctorAppointments");

            migrationBuilder.DropColumn(
                name: "CalledAt",
                table: "DoctorAppointments");

            migrationBuilder.DropColumn(
                name: "CheckedInAt",
                table: "DoctorAppointments");

            migrationBuilder.DropColumn(
                name: "CheckedInByUserId",
                table: "DoctorAppointments");

            migrationBuilder.DropColumn(
                name: "QrToken",
                table: "DoctorAppointments");

            migrationBuilder.DropColumn(
                name: "QueueStatus",
                table: "DoctorAppointments");

            migrationBuilder.DropColumn(
                name: "ReadyAlertSentAt",
                table: "DoctorAppointments");

            migrationBuilder.DropColumn(
                name: "StatusChangeReason",
                table: "DoctorAppointments");

            migrationBuilder.UpdateData(
                table: "LabTests",
                keyColumn: "Id",
                keyValue: new Guid("11111111-1111-1111-1111-111111111111"),
                column: "CreatedAt",
                value: new DateTime(2026, 10, 2, 12, 18, 23, 299, DateTimeKind.Utc).AddTicks(158));

            migrationBuilder.UpdateData(
                table: "LabTests",
                keyColumn: "Id",
                keyValue: new Guid("22222222-2222-2222-2222-222222222222"),
                column: "CreatedAt",
                value: new DateTime(2026, 10, 2, 12, 18, 23, 299, DateTimeKind.Utc).AddTicks(174));

            migrationBuilder.UpdateData(
                table: "LabTests",
                keyColumn: "Id",
                keyValue: new Guid("33333333-3333-3333-3333-333333333333"),
                column: "CreatedAt",
                value: new DateTime(2026, 10, 2, 12, 18, 23, 299, DateTimeKind.Utc).AddTicks(177));

            migrationBuilder.UpdateData(
                table: "LabTests",
                keyColumn: "Id",
                keyValue: new Guid("44444444-4444-4444-4444-444444444444"),
                column: "CreatedAt",
                value: new DateTime(2026, 10, 2, 12, 18, 23, 299, DateTimeKind.Utc).AddTicks(179));

            migrationBuilder.UpdateData(
                table: "LabTests",
                keyColumn: "Id",
                keyValue: new Guid("55555555-5555-5555-5555-555555555555"),
                column: "CreatedAt",
                value: new DateTime(2026, 10, 2, 12, 18, 23, 299, DateTimeKind.Utc).AddTicks(182));

            migrationBuilder.UpdateData(
                table: "LabTests",
                keyColumn: "Id",
                keyValue: new Guid("66666666-6666-6666-6666-666666666666"),
                column: "CreatedAt",
                value: new DateTime(2026, 10, 2, 12, 18, 23, 299, DateTimeKind.Utc).AddTicks(184));

            migrationBuilder.UpdateData(
                table: "LabTests",
                keyColumn: "Id",
                keyValue: new Guid("77777777-7777-7777-7777-777777777777"),
                column: "CreatedAt",
                value: new DateTime(2026, 10, 2, 12, 18, 23, 299, DateTimeKind.Utc).AddTicks(186));

            migrationBuilder.UpdateData(
                table: "LabTests",
                keyColumn: "Id",
                keyValue: new Guid("88888888-8888-8888-8888-888888888888"),
                column: "CreatedAt",
                value: new DateTime(2026, 10, 2, 12, 18, 23, 299, DateTimeKind.Utc).AddTicks(188));

            migrationBuilder.CreateIndex(
                name: "IX_DoctorSessions_DoctorId_SessionDate_SessionTime",
                table: "DoctorSessions",
                columns: new[] { "DoctorId", "SessionDate", "SessionTime" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_DoctorAppointments_DoctorSessionId",
                table: "DoctorAppointments",
                column: "DoctorSessionId");
        }
    }
}
