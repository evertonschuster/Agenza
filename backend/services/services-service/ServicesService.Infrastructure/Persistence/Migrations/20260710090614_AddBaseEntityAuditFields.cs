using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ServicesService.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddBaseEntityAuditFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Tags_TenantId_Name",
                schema: "services",
                table: "Tags");

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "CreatedAt",
                schema: "services",
                table: "Tags",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTimeOffset(new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)));

            migrationBuilder.AddColumn<Guid>(
                name: "CreatedBy",
                schema: "services",
                table: "Tags",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "DeletedAt",
                schema: "services",
                table: "Tags",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "DeletedBy",
                schema: "services",
                table: "Tags",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "UpdatedAt",
                schema: "services",
                table: "Tags",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "UpdatedBy",
                schema: "services",
                table: "Tags",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Tags_TenantId_Name",
                schema: "services",
                table: "Tags",
                columns: new[] { "TenantId", "Name" },
                unique: true,
                filter: "\"DeletedAt\" IS NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Tags_TenantId_Name",
                schema: "services",
                table: "Tags");

            migrationBuilder.DropColumn(
                name: "CreatedAt",
                schema: "services",
                table: "Tags");

            migrationBuilder.DropColumn(
                name: "CreatedBy",
                schema: "services",
                table: "Tags");

            migrationBuilder.DropColumn(
                name: "DeletedAt",
                schema: "services",
                table: "Tags");

            migrationBuilder.DropColumn(
                name: "DeletedBy",
                schema: "services",
                table: "Tags");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                schema: "services",
                table: "Tags");

            migrationBuilder.DropColumn(
                name: "UpdatedBy",
                schema: "services",
                table: "Tags");

            migrationBuilder.CreateIndex(
                name: "IX_Tags_TenantId_Name",
                schema: "services",
                table: "Tags",
                columns: new[] { "TenantId", "Name" },
                unique: true);
        }
    }
}
