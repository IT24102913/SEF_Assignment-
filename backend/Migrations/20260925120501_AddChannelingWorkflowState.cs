using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HealthBridge.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddChannelingWorkflowState : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<DateTime>(
                name: "DateOfBirth",
                table: "Patients",
                type: "timestamp with time zone",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone");

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

            migrationBuilder.UpdateData(
                table: "LabTests",
                keyColumn: "Id",
                keyValue: new Guid("11111111-1111-1111-1111-111111111111"),
                column: "CreatedAt",
                value: new DateTime(2026, 9, 25, 12, 5, 0, 528, DateTimeKind.Utc).AddTicks(6131));

            migrationBuilder.UpdateData(
                table: "LabTests",
                keyColumn: "Id",
                keyValue: new Guid("22222222-2222-2222-2222-222222222222"),
                column: "CreatedAt",
                value: new DateTime(2026, 9, 25, 12, 5, 0, 528, DateTimeKind.Utc).AddTicks(6146));

            migrationBuilder.UpdateData(
                table: "LabTests",
                keyColumn: "Id",
                keyValue: new Guid("33333333-3333-3333-3333-333333333333"),
                column: "CreatedAt",
                value: new DateTime(2026, 9, 25, 12, 5, 0, 528, DateTimeKind.Utc).AddTicks(6148));

            migrationBuilder.UpdateData(
                table: "LabTests",
                keyColumn: "Id",
                keyValue: new Guid("44444444-4444-4444-4444-444444444444"),
                column: "CreatedAt",
                value: new DateTime(2026, 9, 25, 12, 5, 0, 528, DateTimeKind.Utc).AddTicks(6150));

            migrationBuilder.UpdateData(
                table: "LabTests",
                keyColumn: "Id",
                keyValue: new Guid("55555555-5555-5555-5555-555555555555"),
                column: "CreatedAt",
                value: new DateTime(2026, 9, 25, 12, 5, 0, 528, DateTimeKind.Utc).AddTicks(6191));

            migrationBuilder.UpdateData(
                table: "LabTests",
                keyColumn: "Id",
                keyValue: new Guid("66666666-6666-6666-6666-666666666666"),
                column: "CreatedAt",
                value: new DateTime(2026, 9, 25, 12, 5, 0, 528, DateTimeKind.Utc).AddTicks(6193));

            migrationBuilder.UpdateData(
                table: "LabTests",
                keyColumn: "Id",
                keyValue: new Guid("77777777-7777-7777-7777-777777777777"),
                column: "CreatedAt",
                value: new DateTime(2026, 9, 25, 12, 5, 0, 528, DateTimeKind.Utc).AddTicks(6195));

            migrationBuilder.UpdateData(
                table: "LabTests",
                keyColumn: "Id",
                keyValue: new Guid("88888888-8888-8888-8888-888888888888"),
                column: "CreatedAt",
                value: new DateTime(2026, 9, 25, 12, 5, 0, 528, DateTimeKind.Utc).AddTicks(6206));

            migrationBuilder.CreateIndex(
                name: "IX_DoctorAppointments_QrToken",
                table: "DoctorAppointments",
                column: "QrToken",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_DoctorAppointments_QrToken",
                table: "DoctorAppointments");

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
                name: "QrToken",
                table: "DoctorAppointments");

            migrationBuilder.DropColumn(
                name: "QueueStatus",
                table: "DoctorAppointments");

            migrationBuilder.AlterColumn<DateTime>(
                name: "DateOfBirth",
                table: "Patients",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified),
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldNullable: true);

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
        }
    }
}
