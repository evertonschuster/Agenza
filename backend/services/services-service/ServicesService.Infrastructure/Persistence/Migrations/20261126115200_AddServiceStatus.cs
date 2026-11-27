using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ServicesService.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddServiceStatus : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Status",
                schema: "services",
                table: "Services",
                type: "character varying(16)",
                maxLength: 16,
                nullable: false,
                defaultValue: "Active");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Services_Status",
                schema: "services",
                table: "Services",
                sql: "\"Status\" IN ('Active', 'Inactive')");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_Services_Status",
                schema: "services",
                table: "Services");

            migrationBuilder.DropColumn(
                name: "Status",
                schema: "services",
                table: "Services");
        }
    }
}
