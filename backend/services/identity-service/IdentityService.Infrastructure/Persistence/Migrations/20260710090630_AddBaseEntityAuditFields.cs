using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace IdentityService.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddBaseEntityAuditFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Tenants_Name",
                schema: "identity",
                table: "Tenants");

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "CreatedAt",
                schema: "identity",
                table: "Tenants",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTimeOffset(new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)));

            migrationBuilder.AddColumn<Guid>(
                name: "CreatedBy",
                schema: "identity",
                table: "Tenants",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "DeletedAt",
                schema: "identity",
                table: "Tenants",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "DeletedBy",
                schema: "identity",
                table: "Tenants",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "UpdatedAt",
                schema: "identity",
                table: "Tenants",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "UpdatedBy",
                schema: "identity",
                table: "Tenants",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Tenants_Name",
                schema: "identity",
                table: "Tenants",
                column: "Name",
                unique: true,
                filter: "\"DeletedAt\" IS NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Tenants_Name",
                schema: "identity",
                table: "Tenants");

            migrationBuilder.DropColumn(
                name: "CreatedAt",
                schema: "identity",
                table: "Tenants");

            migrationBuilder.DropColumn(
                name: "CreatedBy",
                schema: "identity",
                table: "Tenants");

            migrationBuilder.DropColumn(
                name: "DeletedAt",
                schema: "identity",
                table: "Tenants");

            migrationBuilder.DropColumn(
                name: "DeletedBy",
                schema: "identity",
                table: "Tenants");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                schema: "identity",
                table: "Tenants");

            migrationBuilder.DropColumn(
                name: "UpdatedBy",
                schema: "identity",
                table: "Tenants");

            migrationBuilder.CreateIndex(
                name: "IX_Tenants_Name",
                schema: "identity",
                table: "Tenants",
                column: "Name",
                unique: true);
        }
    }
}
