using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace HealthBridge.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddAIForecastNotes : Migration
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
                value: new DateTime(2026, 10, 1, 10, 19, 39, 40, DateTimeKind.Utc).AddTicks(4597));

            migrationBuilder.UpdateData(
                table: "LabTests",
                keyColumn: "Id",
                keyValue: new Guid("22222222-2222-2222-2222-222222222222"),
                column: "CreatedAt",
                value: new DateTime(2026, 10, 1, 10, 19, 39, 40, DateTimeKind.Utc).AddTicks(4614));

            migrationBuilder.UpdateData(
                table: "LabTests",
                keyColumn: "Id",
                keyValue: new Guid("33333333-3333-3333-3333-333333333333"),
                column: "CreatedAt",
                value: new DateTime(2026, 10, 1, 10, 19, 39, 40, DateTimeKind.Utc).AddTicks(4618));

            migrationBuilder.UpdateData(
                table: "LabTests",
                keyColumn: "Id",
                keyValue: new Guid("44444444-4444-4444-4444-444444444444"),
                column: "CreatedAt",
                value: new DateTime(2026, 10, 1, 10, 19, 39, 40, DateTimeKind.Utc).AddTicks(4621));

            migrationBuilder.UpdateData(
                table: "LabTests",
                keyColumn: "Id",
                keyValue: new Guid("55555555-5555-5555-5555-555555555555"),
                column: "CreatedAt",
                value: new DateTime(2026, 10, 1, 10, 19, 39, 40, DateTimeKind.Utc).AddTicks(4623));

            migrationBuilder.UpdateData(
                table: "LabTests",
                keyColumn: "Id",
                keyValue: new Guid("66666666-6666-6666-6666-666666666666"),
                column: "CreatedAt",
                value: new DateTime(2026, 10, 1, 10, 19, 39, 40, DateTimeKind.Utc).AddTicks(4626));

            migrationBuilder.UpdateData(
                table: "LabTests",
                keyColumn: "Id",
                keyValue: new Guid("77777777-7777-7777-7777-777777777777"),
                column: "CreatedAt",
                value: new DateTime(2026, 10, 1, 10, 19, 39, 40, DateTimeKind.Utc).AddTicks(4641));

            migrationBuilder.UpdateData(
                table: "LabTests",
                keyColumn: "Id",
                keyValue: new Guid("88888888-8888-8888-8888-888888888888"),
                column: "CreatedAt",
                value: new DateTime(2026, 10, 1, 10, 19, 39, 40, DateTimeKind.Utc).AddTicks(4644));
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AIForecastNotes");

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
