using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ServicesService.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddClientTags : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ClientTags",
                schema: "services",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ClientId = table.Column<Guid>(type: "uuid", nullable: false),
                    TagId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    DeletedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    DeletedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ClientTags", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ClientTags_Clients_TenantId_ClientId",
                        columns: x => new { x.TenantId, x.ClientId },
                        principalSchema: "services",
                        principalTable: "Clients",
                        principalColumns: new[] { "TenantId", "Id" },
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ClientTags_Tags_TenantId_TagId",
                        columns: x => new { x.TenantId, x.TagId },
                        principalSchema: "services",
                        principalTable: "Tags",
                        principalColumns: new[] { "TenantId", "Id" },
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ClientTags_DeletedAt",
                schema: "services",
                table: "ClientTags",
                column: "DeletedAt");

            migrationBuilder.CreateIndex(
                name: "IX_ClientTags_TenantId",
                schema: "services",
                table: "ClientTags",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_ClientTags_TenantId_ClientId_TagId",
                schema: "services",
                table: "ClientTags",
                columns: new[] { "TenantId", "ClientId", "TagId" },
                unique: true,
                filter: "\"DeletedAt\" IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_ClientTags_TenantId_TagId",
                schema: "services",
                table: "ClientTags",
                columns: new[] { "TenantId", "TagId" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ClientTags",
                schema: "services");
        }
    }
}
