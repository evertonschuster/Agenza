using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ServicesService.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddServiceCatalogFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "Description",
                schema: "services",
                table: "Services",
                newName: "InternalDescription");

            migrationBuilder.AlterColumn<decimal>(
                name: "Price",
                schema: "services",
                table: "Services",
                type: "numeric(10,2)",
                precision: 10,
                scale: 2,
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "numeric(10,2)",
                oldPrecision: 10,
                oldScale: 2);

            migrationBuilder.AlterColumn<int>(
                name: "MinDurationMinutes",
                schema: "services",
                table: "Services",
                type: "integer",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AlterColumn<int>(
                name: "MaxDurationMinutes",
                schema: "services",
                table: "Services",
                type: "integer",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AlterColumn<decimal>(
                name: "MaxDiscountPercentage",
                schema: "services",
                table: "Services",
                type: "numeric(5,2)",
                precision: 5,
                scale: 2,
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "numeric(5,2)",
                oldPrecision: 5,
                oldScale: 2);

            migrationBuilder.AddColumn<int>(
                name: "CleanupMinutes",
                schema: "services",
                table: "Services",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "ClientDescription",
                schema: "services",
                table: "Services",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "PreparationMinutes",
                schema: "services",
                table: "Services",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "PricingType",
                schema: "services",
                table: "Services",
                type: "character varying(16)",
                maxLength: 16,
                nullable: false,
                defaultValue: "Fixed");

            migrationBuilder.AddColumn<string>(
                name: "Status",
                schema: "services",
                table: "Services",
                type: "character varying(16)",
                maxLength: 16,
                nullable: false,
                defaultValue: "Active");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Services_PricingType",
                schema: "services",
                table: "Services",
                sql: "\"PricingType\" IN ('Fixed', 'Variable')");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Services_Status",
                schema: "services",
                table: "Services",
                sql: "\"Status\" IN ('Active', 'Inactive')");

            migrationBuilder.AlterColumn<int>(
                name: "CleanupMinutes",
                schema: "services",
                table: "Services",
                type: "integer",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer",
                oldDefaultValue: 0);

            migrationBuilder.AlterColumn<int>(
                name: "PreparationMinutes",
                schema: "services",
                table: "Services",
                type: "integer",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer",
                oldDefaultValue: 0);

            migrationBuilder.AlterColumn<string>(
                name: "PricingType",
                schema: "services",
                table: "Services",
                type: "character varying(16)",
                maxLength: 16,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(16)",
                oldMaxLength: 16,
                oldDefaultValue: "Fixed");

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                schema: "services",
                table: "Services",
                type: "character varying(16)",
                maxLength: 16,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(16)",
                oldMaxLength: 16,
                oldDefaultValue: "Active");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_Services_PricingType",
                schema: "services",
                table: "Services");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Services_Status",
                schema: "services",
                table: "Services");

            migrationBuilder.DropColumn(
                name: "CleanupMinutes",
                schema: "services",
                table: "Services");

            migrationBuilder.DropColumn(
                name: "ClientDescription",
                schema: "services",
                table: "Services");

            migrationBuilder.DropColumn(
                name: "PreparationMinutes",
                schema: "services",
                table: "Services");

            migrationBuilder.DropColumn(
                name: "PricingType",
                schema: "services",
                table: "Services");

            migrationBuilder.DropColumn(
                name: "Status",
                schema: "services",
                table: "Services");

            migrationBuilder.RenameColumn(
                name: "InternalDescription",
                schema: "services",
                table: "Services",
                newName: "Description");

            migrationBuilder.Sql("UPDATE services.\"Services\" SET \"Price\" = 0 WHERE \"Price\" IS NULL;");
            migrationBuilder.Sql("UPDATE services.\"Services\" SET \"MaxDiscountPercentage\" = 0 WHERE \"MaxDiscountPercentage\" IS NULL;");
            migrationBuilder.Sql("UPDATE services.\"Services\" SET \"MinDurationMinutes\" = \"DurationMinutes\" WHERE \"MinDurationMinutes\" IS NULL;");
            migrationBuilder.Sql("UPDATE services.\"Services\" SET \"MaxDurationMinutes\" = \"DurationMinutes\" WHERE \"MaxDurationMinutes\" IS NULL;");

            migrationBuilder.AlterColumn<decimal>(
                name: "Price",
                schema: "services",
                table: "Services",
                type: "numeric(10,2)",
                precision: 10,
                scale: 2,
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "numeric(10,2)",
                oldPrecision: 10,
                oldScale: 2,
                oldNullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "MinDurationMinutes",
                schema: "services",
                table: "Services",
                type: "integer",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "MaxDurationMinutes",
                schema: "services",
                table: "Services",
                type: "integer",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);

            migrationBuilder.AlterColumn<decimal>(
                name: "MaxDiscountPercentage",
                schema: "services",
                table: "Services",
                type: "numeric(5,2)",
                precision: 5,
                scale: 2,
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "numeric(5,2)",
                oldPrecision: 5,
                oldScale: 2,
                oldNullable: true);
        }
    }
}
