using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ServicesService.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class ServiceTagsAsChildren : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ServiceTags_Tags_TenantId_TagsId",
                schema: "services",
                table: "ServiceTags");

            migrationBuilder.DropPrimaryKey(
                name: "PK_ServiceTags",
                schema: "services",
                table: "ServiceTags");

            migrationBuilder.RenameColumn(
                name: "TagsId",
                schema: "services",
                table: "ServiceTags",
                newName: "TagId");

            migrationBuilder.RenameIndex(
                name: "IX_ServiceTags_TenantId_TagsId",
                schema: "services",
                table: "ServiceTags",
                newName: "IX_ServiceTags_TenantId_TagId");

            migrationBuilder.AddColumn<Guid>(
                name: "Id",
                schema: "services",
                table: "ServiceTags",
                type: "uuid",
                nullable: false,
                defaultValueSql: "gen_random_uuid()");

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "CreatedAt",
                schema: "services",
                table: "ServiceTags",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "now()");

            migrationBuilder.AddColumn<Guid>(
                name: "CreatedBy",
                schema: "services",
                table: "ServiceTags",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "DeletedAt",
                schema: "services",
                table: "ServiceTags",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "DeletedBy",
                schema: "services",
                table: "ServiceTags",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "UpdatedAt",
                schema: "services",
                table: "ServiceTags",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "UpdatedBy",
                schema: "services",
                table: "ServiceTags",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddPrimaryKey(
                name: "PK_ServiceTags",
                schema: "services",
                table: "ServiceTags",
                column: "Id");

            migrationBuilder.AlterColumn<Guid>(
                name: "Id",
                schema: "services",
                table: "ServiceTags",
                type: "uuid",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldDefaultValueSql: "gen_random_uuid()");

            migrationBuilder.AlterColumn<DateTimeOffset>(
                name: "CreatedAt",
                schema: "services",
                table: "ServiceTags",
                type: "timestamp with time zone",
                nullable: false,
                oldClrType: typeof(DateTimeOffset),
                oldType: "timestamp with time zone",
                oldDefaultValueSql: "now()");

            migrationBuilder.CreateIndex(
                name: "IX_ServiceTags_DeletedAt",
                schema: "services",
                table: "ServiceTags",
                column: "DeletedAt");

            migrationBuilder.CreateIndex(
                name: "IX_ServiceTags_TenantId",
                schema: "services",
                table: "ServiceTags",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_ServiceTags_TenantId_ServiceId_TagId",
                schema: "services",
                table: "ServiceTags",
                columns: new[] { "TenantId", "ServiceId", "TagId" },
                unique: true,
                filter: "\"DeletedAt\" IS NULL");

            migrationBuilder.AddForeignKey(
                name: "FK_ServiceTags_Tags_TenantId_TagId",
                schema: "services",
                table: "ServiceTags",
                columns: new[] { "TenantId", "TagId" },
                principalSchema: "services",
                principalTable: "Tags",
                principalColumns: new[] { "TenantId", "Id" },
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DELETE FROM services.\"ServiceTags\" WHERE \"DeletedAt\" IS NOT NULL;");

            migrationBuilder.DropForeignKey(
                name: "FK_ServiceTags_Tags_TenantId_TagId",
                schema: "services",
                table: "ServiceTags");

            migrationBuilder.DropPrimaryKey(
                name: "PK_ServiceTags",
                schema: "services",
                table: "ServiceTags");

            migrationBuilder.DropIndex(
                name: "IX_ServiceTags_DeletedAt",
                schema: "services",
                table: "ServiceTags");

            migrationBuilder.DropIndex(
                name: "IX_ServiceTags_TenantId",
                schema: "services",
                table: "ServiceTags");

            migrationBuilder.DropIndex(
                name: "IX_ServiceTags_TenantId_ServiceId_TagId",
                schema: "services",
                table: "ServiceTags");

            migrationBuilder.DropColumn(
                name: "Id",
                schema: "services",
                table: "ServiceTags");

            migrationBuilder.DropColumn(
                name: "CreatedAt",
                schema: "services",
                table: "ServiceTags");

            migrationBuilder.DropColumn(
                name: "CreatedBy",
                schema: "services",
                table: "ServiceTags");

            migrationBuilder.DropColumn(
                name: "DeletedAt",
                schema: "services",
                table: "ServiceTags");

            migrationBuilder.DropColumn(
                name: "DeletedBy",
                schema: "services",
                table: "ServiceTags");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                schema: "services",
                table: "ServiceTags");

            migrationBuilder.DropColumn(
                name: "UpdatedBy",
                schema: "services",
                table: "ServiceTags");

            migrationBuilder.RenameColumn(
                name: "TagId",
                schema: "services",
                table: "ServiceTags",
                newName: "TagsId");

            migrationBuilder.RenameIndex(
                name: "IX_ServiceTags_TenantId_TagId",
                schema: "services",
                table: "ServiceTags",
                newName: "IX_ServiceTags_TenantId_TagsId");

            migrationBuilder.AddPrimaryKey(
                name: "PK_ServiceTags",
                schema: "services",
                table: "ServiceTags",
                columns: new[] { "TenantId", "ServiceId", "TagsId" });

            migrationBuilder.AddForeignKey(
                name: "FK_ServiceTags_Tags_TenantId_TagsId",
                schema: "services",
                table: "ServiceTags",
                columns: new[] { "TenantId", "TagsId" },
                principalSchema: "services",
                principalTable: "Tags",
                principalColumns: new[] { "TenantId", "Id" },
                onDelete: ReferentialAction.Cascade);
        }
    }
}
