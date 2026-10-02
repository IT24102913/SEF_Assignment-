using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace HealthBridge.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddPharmacyBlockedToUser : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "BlockReason",
                table: "Users",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsPharmacyBlocked",
                table: "Users",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "ProfileImage",
                table: "Users",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AdminNote",
                table: "Prescriptions",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "AuthorizationAction",
                table: "Prescriptions",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "AuthorizationRequestReason",
                table: "Prescriptions",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateTime>(
                name: "AuthorizationRequestedAt",
                table: "Prescriptions",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AuthorizationRequestedBy",
                table: "Prescriptions",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "AuthorizationStatus",
                table: "Prescriptions",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<bool>(
                name: "HasAuthorizationRequest",
                table: "Prescriptions",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AlterColumn<DateTime>(
                name: "DateOfBirth",
                table: "Patients",
                type: "timestamp with time zone",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone");

            migrationBuilder.AddColumn<int>(
                name: "BottleSize",
                table: "Medicines",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "BoxPrice",
                table: "Medicines",
                type: "numeric(18,2)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "PricePerBottle",
                table: "Medicines",
                type: "numeric(18,2)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "PricePerInhaler",
                table: "Medicines",
                type: "numeric(18,2)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "PricePerSachet",
                table: "Medicines",
                type: "numeric(18,2)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "PricePerTube",
                table: "Medicines",
                type: "numeric(18,2)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "PricePerUnit",
                table: "Medicines",
                type: "numeric(18,2)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "PricePerVial",
                table: "Medicines",
                type: "numeric(18,2)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "PuffsPerInhaler",
                table: "Medicines",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SachetsPerBox",
                table: "Medicines",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SellingUnit",
                table: "Medicines",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "TubeWeight",
                table: "Medicines",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "UnitName",
                table: "Medicines",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "VialsPerBox",
                table: "Medicines",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "VolumeMl",
                table: "Medicines",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "AIForecastNotes",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    MedicineId = table.Column<int>(type: "integer", nullable: false),
                    MedicineName = table.Column<string>(type: "text", nullable: false),
                    Category = table.Column<string>(type: "text", nullable: false),
                    UnitPrice = table.Column<decimal>(type: "numeric", nullable: false),
                    CurrentStock = table.Column<int>(type: "integer", nullable: false),
                    DaysUntilEmpty = table.Column<int>(type: "integer", nullable: true),
                    AverageDailySales = table.Column<double>(type: "double precision", nullable: false),
                    Trend = table.Column<string>(type: "text", nullable: false),
                    StockStatus = table.Column<string>(type: "text", nullable: false),
                    PredictedDemand7Days = table.Column<int>(type: "integer", nullable: false),
                    PredictedDemand30Days = table.Column<int>(type: "integer", nullable: false),
                    PredictedDemand60Days = table.Column<int>(type: "integer", nullable: false),
                    PredictedDemand90Days = table.Column<int>(type: "integer", nullable: false),
                    SeasonalFactor = table.Column<string>(type: "text", nullable: true),
                    SeasonalMultiplier = table.Column<double>(type: "double precision", nullable: false),
                    ProjectedRevenue30Days = table.Column<decimal>(type: "numeric", nullable: false),
                    AtRiskRevenue = table.Column<decimal>(type: "numeric", nullable: false),
                    ReorderPoint = table.Column<int>(type: "integer", nullable: false),
                    SuggestedOrderQty = table.Column<int>(type: "integer", nullable: false),
                    OrderByDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    AIInsight = table.Column<string>(type: "text", nullable: true),
                    AIRecommendation = table.Column<string>(type: "text", nullable: true),
                    Urgency = table.Column<string>(type: "text", nullable: false),
                    Confidence = table.Column<double>(type: "double precision", nullable: false),
                    TakenBy = table.Column<string>(type: "text", nullable: false),
                    TakenAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    NoteStatus = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AIForecastNotes", x => x.Id);
                });

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
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AIForecastNotes");

            migrationBuilder.DropColumn(
                name: "BlockReason",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "IsPharmacyBlocked",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "ProfileImage",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "AdminNote",
                table: "Prescriptions");

            migrationBuilder.DropColumn(
                name: "AuthorizationAction",
                table: "Prescriptions");

            migrationBuilder.DropColumn(
                name: "AuthorizationRequestReason",
                table: "Prescriptions");

            migrationBuilder.DropColumn(
                name: "AuthorizationRequestedAt",
                table: "Prescriptions");

            migrationBuilder.DropColumn(
                name: "AuthorizationRequestedBy",
                table: "Prescriptions");

            migrationBuilder.DropColumn(
                name: "AuthorizationStatus",
                table: "Prescriptions");

            migrationBuilder.DropColumn(
                name: "HasAuthorizationRequest",
                table: "Prescriptions");

            migrationBuilder.DropColumn(
                name: "BottleSize",
                table: "Medicines");

            migrationBuilder.DropColumn(
                name: "BoxPrice",
                table: "Medicines");

            migrationBuilder.DropColumn(
                name: "PricePerBottle",
                table: "Medicines");

            migrationBuilder.DropColumn(
                name: "PricePerInhaler",
                table: "Medicines");

            migrationBuilder.DropColumn(
                name: "PricePerSachet",
                table: "Medicines");

            migrationBuilder.DropColumn(
                name: "PricePerTube",
                table: "Medicines");

            migrationBuilder.DropColumn(
                name: "PricePerUnit",
                table: "Medicines");

            migrationBuilder.DropColumn(
                name: "PricePerVial",
                table: "Medicines");

            migrationBuilder.DropColumn(
                name: "PuffsPerInhaler",
                table: "Medicines");

            migrationBuilder.DropColumn(
                name: "SachetsPerBox",
                table: "Medicines");

            migrationBuilder.DropColumn(
                name: "SellingUnit",
                table: "Medicines");

            migrationBuilder.DropColumn(
                name: "TubeWeight",
                table: "Medicines");

            migrationBuilder.DropColumn(
                name: "UnitName",
                table: "Medicines");

            migrationBuilder.DropColumn(
                name: "VialsPerBox",
                table: "Medicines");

            migrationBuilder.DropColumn(
                name: "VolumeMl",
                table: "Medicines");

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
