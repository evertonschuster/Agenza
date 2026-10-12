using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ServicesService.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddClientSearchColumns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CpfNormalized",
                schema: "services",
                table: "Clients",
                type: "text",
                nullable: true,
                computedColumnSql: "\"Cpf\"",
                stored: true);

            migrationBuilder.AddColumn<string>(
                name: "EmailNormalized",
                schema: "services",
                table: "Clients",
                type: "text",
                nullable: true,
                computedColumnSql: "lower(\"Email\")",
                stored: true);

            migrationBuilder.AddColumn<string>(
                name: "NameNormalized",
                schema: "services",
                table: "Clients",
                type: "text",
                nullable: true,
                computedColumnSql: "lower(\"FullName\")",
                stored: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CpfNormalized",
                schema: "services",
                table: "Clients");

            migrationBuilder.DropColumn(
                name: "EmailNormalized",
                schema: "services",
                table: "Clients");

            migrationBuilder.DropColumn(
                name: "NameNormalized",
                schema: "services",
                table: "Clients");
        }
    }
}
