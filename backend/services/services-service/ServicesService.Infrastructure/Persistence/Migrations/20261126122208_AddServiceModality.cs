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
            migrationBuilder.AddColumn<bool>(
                name: "AttendsInPerson",
                schema: "services",
                table: "Services",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<bool>(
                name: "AttendsOnline",
                schema: "services",
                table: "Services",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddCheckConstraint(
                name: "CK_Services_Modality",
                schema: "services",
                table: "Services",
                sql: "\"AttendsInPerson\" OR \"AttendsOnline\"");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_Services_Modality",
                schema: "services",
                table: "Services");

            migrationBuilder.DropColumn(
                name: "AttendsInPerson",
                schema: "services",
                table: "Services");

            migrationBuilder.DropColumn(
                name: "AttendsOnline",
                schema: "services",
                table: "Services");
        }
    }
}
