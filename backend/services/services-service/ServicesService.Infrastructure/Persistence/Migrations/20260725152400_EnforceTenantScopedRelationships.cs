using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ServicesService.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class EnforceTenantScopedRelationships : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // migration-safety: tenant preflight and join backfill reviewed (ADR 0024)
            migrationBuilder.Sql(
                """
                DO $$
                DECLARE
                    category_mismatches bigint;
                    tag_mismatches bigint;
                BEGIN
                    SELECT count(*)
                    INTO category_mismatches
                    FROM services."Services" service
                    JOIN services."Categories" category
                      ON category."Id" = service."CategoryId"
                    WHERE service."TenantId" <> category."TenantId";

                    SELECT count(*)
                    INTO tag_mismatches
                    FROM services."ServiceTags" membership
                    JOIN services."Services" service
                      ON service."Id" = membership."ServiceId"
                    JOIN services."Tags" tag
                      ON tag."Id" = membership."TagsId"
                    WHERE service."TenantId" <> tag."TenantId";

                    IF category_mismatches > 0 OR tag_mismatches > 0 THEN
                        RAISE EXCEPTION
                          'Tenant relationship preflight failed: % service/category and % service/tag mismatches',
                          category_mismatches,
                          tag_mismatches;
                    END IF;
                END
                $$;
                """);

            migrationBuilder.DropForeignKey(
                name: "FK_Services_Categories_CategoryId",
                schema: "services",
                table: "Services");

            migrationBuilder.DropForeignKey(
                name: "FK_ServiceTags_Services_ServiceId",
                schema: "services",
                table: "ServiceTags");

            migrationBuilder.DropForeignKey(
                name: "FK_ServiceTags_Tags_TagsId",
                schema: "services",
                table: "ServiceTags");

            migrationBuilder.DropPrimaryKey(
                name: "PK_ServiceTags",
                schema: "services",
                table: "ServiceTags");

            migrationBuilder.DropIndex(
                name: "IX_ServiceTags_TagsId",
                schema: "services",
                table: "ServiceTags");

            migrationBuilder.DropIndex(
                name: "IX_Services_CategoryId",
                schema: "services",
                table: "Services");

            migrationBuilder.AddColumn<Guid>(
                name: "TenantId",
                schema: "services",
                table: "ServiceTags",
                type: "uuid",
                nullable: true);

            migrationBuilder.Sql(
                """
                UPDATE services."ServiceTags" membership
                SET "TenantId" = service."TenantId"
                FROM services."Services" service
                WHERE service."Id" = membership."ServiceId";
                """);

            migrationBuilder.AlterColumn<Guid>(
                name: "TenantId",
                schema: "services",
                table: "ServiceTags",
                type: "uuid",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.AddUniqueConstraint(
                name: "AK_Tags_TenantId_Id",
                schema: "services",
                table: "Tags",
                columns: new[] { "TenantId", "Id" });

            migrationBuilder.AddPrimaryKey(
                name: "PK_ServiceTags",
                schema: "services",
                table: "ServiceTags",
                columns: new[] { "TenantId", "ServiceId", "TagsId" });

            migrationBuilder.AddUniqueConstraint(
                name: "AK_Services_TenantId_Id",
                schema: "services",
                table: "Services",
                columns: new[] { "TenantId", "Id" });

            migrationBuilder.AddUniqueConstraint(
                name: "AK_Categories_TenantId_Id",
                schema: "services",
                table: "Categories",
                columns: new[] { "TenantId", "Id" });

            migrationBuilder.CreateIndex(
                name: "IX_ServiceTags_TenantId_TagsId",
                schema: "services",
                table: "ServiceTags",
                columns: new[] { "TenantId", "TagsId" });

            migrationBuilder.CreateIndex(
                name: "IX_Services_TenantId_CategoryId",
                schema: "services",
                table: "Services",
                columns: new[] { "TenantId", "CategoryId" });

            migrationBuilder.AddForeignKey(
                name: "FK_Services_Categories_TenantId_CategoryId",
                schema: "services",
                table: "Services",
                columns: new[] { "TenantId", "CategoryId" },
                principalSchema: "services",
                principalTable: "Categories",
                principalColumns: new[] { "TenantId", "Id" },
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_ServiceTags_Services_TenantId_ServiceId",
                schema: "services",
                table: "ServiceTags",
                columns: new[] { "TenantId", "ServiceId" },
                principalSchema: "services",
                principalTable: "Services",
                principalColumns: new[] { "TenantId", "Id" },
                onDelete: ReferentialAction.Cascade);

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

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Services_Categories_TenantId_CategoryId",
                schema: "services",
                table: "Services");

            migrationBuilder.DropForeignKey(
                name: "FK_ServiceTags_Services_TenantId_ServiceId",
                schema: "services",
                table: "ServiceTags");

            migrationBuilder.DropForeignKey(
                name: "FK_ServiceTags_Tags_TenantId_TagsId",
                schema: "services",
                table: "ServiceTags");

            migrationBuilder.DropUniqueConstraint(
                name: "AK_Tags_TenantId_Id",
                schema: "services",
                table: "Tags");

            migrationBuilder.DropPrimaryKey(
                name: "PK_ServiceTags",
                schema: "services",
                table: "ServiceTags");

            migrationBuilder.DropIndex(
                name: "IX_ServiceTags_TenantId_TagsId",
                schema: "services",
                table: "ServiceTags");

            migrationBuilder.DropUniqueConstraint(
                name: "AK_Services_TenantId_Id",
                schema: "services",
                table: "Services");

            migrationBuilder.DropIndex(
                name: "IX_Services_TenantId_CategoryId",
                schema: "services",
                table: "Services");

            migrationBuilder.DropUniqueConstraint(
                name: "AK_Categories_TenantId_Id",
                schema: "services",
                table: "Categories");

            migrationBuilder.DropColumn(
                name: "TenantId",
                schema: "services",
                table: "ServiceTags");

            migrationBuilder.AddPrimaryKey(
                name: "PK_ServiceTags",
                schema: "services",
                table: "ServiceTags",
                columns: new[] { "ServiceId", "TagsId" });

            migrationBuilder.CreateIndex(
                name: "IX_ServiceTags_TagsId",
                schema: "services",
                table: "ServiceTags",
                column: "TagsId");

            migrationBuilder.CreateIndex(
                name: "IX_Services_CategoryId",
                schema: "services",
                table: "Services",
                column: "CategoryId");

            migrationBuilder.AddForeignKey(
                name: "FK_Services_Categories_CategoryId",
                schema: "services",
                table: "Services",
                column: "CategoryId",
                principalSchema: "services",
                principalTable: "Categories",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_ServiceTags_Services_ServiceId",
                schema: "services",
                table: "ServiceTags",
                column: "ServiceId",
                principalSchema: "services",
                principalTable: "Services",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_ServiceTags_Tags_TagsId",
                schema: "services",
                table: "ServiceTags",
                column: "TagsId",
                principalSchema: "services",
                principalTable: "Tags",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
