using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ServicesService.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddCaseInsensitiveUniquenessAndCategoryLimits : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Tags_TenantId_Name",
                schema: "services",
                table: "Tags");

            migrationBuilder.DropIndex(
                name: "IX_Services_TenantId_Name",
                schema: "services",
                table: "Services");

            migrationBuilder.DropIndex(
                name: "IX_Categories_TenantId_Name",
                schema: "services",
                table: "Categories");

            // Fail loudly instead of letting Postgres truncate/reject rows
            // silently: a Service.Name longer than the new 80-char limit
            // must be sanitized by a human before this migration can run.
            migrationBuilder.Sql(
                "DO $$ BEGIN " +
                "IF EXISTS (SELECT 1 FROM \"services\".\"Services\" WHERE length(\"Name\") > 80) THEN " +
                "RAISE EXCEPTION 'Cannot shrink Services.Name to 80 characters: one or more existing rows exceed the new limit. Sanitize the data before re-running this migration.'; " +
                "END IF; " +
                "END $$;");

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                schema: "services",
                table: "Services",
                type: "character varying(80)",
                maxLength: 80,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(100)",
                oldMaxLength: 100);

            // Same guard for Category.Name shrinking to 60 characters.
            migrationBuilder.Sql(
                "DO $$ BEGIN " +
                "IF EXISTS (SELECT 1 FROM \"services\".\"Categories\" WHERE length(\"Name\") > 60) THEN " +
                "RAISE EXCEPTION 'Cannot shrink Categories.Name to 60 characters: one or more existing rows exceed the new limit. Sanitize the data before re-running this migration.'; " +
                "END IF; " +
                "END $$;");

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                schema: "services",
                table: "Categories",
                type: "character varying(60)",
                maxLength: 60,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(100)",
                oldMaxLength: 100);

            migrationBuilder.AddColumn<string>(
                name: "NameNormalized",
                schema: "services",
                table: "Tags",
                type: "text",
                nullable: true,
                computedColumnSql: "lower(\"Name\")",
                stored: true);

            migrationBuilder.AddColumn<string>(
                name: "NameNormalized",
                schema: "services",
                table: "Services",
                type: "text",
                nullable: true,
                computedColumnSql: "lower(\"Name\")",
                stored: true);

            migrationBuilder.AddColumn<string>(
                name: "NameNormalized",
                schema: "services",
                table: "Categories",
                type: "text",
                nullable: true,
                computedColumnSql: "lower(\"Name\")",
                stored: true);

            migrationBuilder.CreateIndex(
                name: "IX_Tags_TenantId_NameNormalized",
                schema: "services",
                table: "Tags",
                columns: new[] { "TenantId", "NameNormalized" },
                unique: true,
                filter: "\"DeletedAt\" IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Services_TenantId_NameNormalized",
                schema: "services",
                table: "Services",
                columns: new[] { "TenantId", "NameNormalized" },
                unique: true,
                filter: "\"DeletedAt\" IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Categories_TenantId_NameNormalized",
                schema: "services",
                table: "Categories",
                columns: new[] { "TenantId", "NameNormalized" },
                unique: true,
                filter: "\"DeletedAt\" IS NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Tags_TenantId_NameNormalized",
                schema: "services",
                table: "Tags");

            migrationBuilder.DropIndex(
                name: "IX_Services_TenantId_NameNormalized",
                schema: "services",
                table: "Services");

            migrationBuilder.DropIndex(
                name: "IX_Categories_TenantId_NameNormalized",
                schema: "services",
                table: "Categories");

            migrationBuilder.DropColumn(
                name: "NameNormalized",
                schema: "services",
                table: "Tags");

            migrationBuilder.DropColumn(
                name: "NameNormalized",
                schema: "services",
                table: "Services");

            migrationBuilder.DropColumn(
                name: "NameNormalized",
                schema: "services",
                table: "Categories");

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                schema: "services",
                table: "Services",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(80)",
                oldMaxLength: 80);

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                schema: "services",
                table: "Categories",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(60)",
                oldMaxLength: 60);

            migrationBuilder.CreateIndex(
                name: "IX_Tags_TenantId_Name",
                schema: "services",
                table: "Tags",
                columns: new[] { "TenantId", "Name" },
                unique: true,
                filter: "\"DeletedAt\" IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Services_TenantId_Name",
                schema: "services",
                table: "Services",
                columns: new[] { "TenantId", "Name" },
                unique: true,
                filter: "\"DeletedAt\" IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Categories_TenantId_Name",
                schema: "services",
                table: "Categories",
                columns: new[] { "TenantId", "Name" },
                unique: true,
                filter: "\"DeletedAt\" IS NULL");
        }
    }
}
