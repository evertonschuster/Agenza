using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ServicesService.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddServiceModality : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "Modality",
                schema: "services",
                table: "Services",
                type: "integer",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.AddCheckConstraint(
                name: "CK_Services_Modality",
                schema: "services",
                table: "Services",
                sql: "\"Modality\" BETWEEN 1 AND 3");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_Services_Modality",
                schema: "services",
                table: "Services");

            migrationBuilder.DropColumn(
                name: "Modality",
                schema: "services",
                table: "Services");
        }
    }
}
