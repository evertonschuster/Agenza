using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ServicesService.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddClients : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Clients",
                schema: "services",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    FullName = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    BirthDate = table.Column<DateOnly>(type: "date", nullable: true),
                    Phone = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    Email = table.Column<string>(type: "character varying(254)", maxLength: 254, nullable: true),
                    Cpf = table.Column<string>(type: "character varying(11)", maxLength: 11, nullable: true),
                    AdministrativeNotes = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    Status = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    FullNameNormalized = table.Column<string>(type: "text", nullable: true, computedColumnSql: "lower(\"FullName\")", stored: true),
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
                    table.PrimaryKey("PK_Clients", x => x.Id);
                    table.UniqueConstraint("AK_Clients_TenantId_Id", x => new { x.TenantId, x.Id });
                    table.CheckConstraint("CK_Clients_Status", "\"Status\" IN ('Active', 'Inactive', 'Deleted')");
                });

            migrationBuilder.CreateTable(
                name: "ClientGuardians",
                schema: "services",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Cpf = table.Column<string>(type: "character varying(11)", maxLength: 11, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    DeletedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    DeletedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    ClientId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    Relationship = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    Phone = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ClientGuardians", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ClientGuardians_Clients_TenantId_ClientId",
                        columns: x => new { x.TenantId, x.ClientId },
                        principalSchema: "services",
                        principalTable: "Clients",
                        principalColumns: new[] { "TenantId", "Id" },
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ClientReferenceContacts",
                schema: "services",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Purposes = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    DeletedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    DeletedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    ClientId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    Relationship = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    Phone = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ClientReferenceContacts", x => x.Id);
                    table.CheckConstraint("CK_ClientReferenceContacts_Purposes", "\"Purposes\" BETWEEN 1 AND 7");
                    table.ForeignKey(
                        name: "FK_ClientReferenceContacts_Clients_TenantId_ClientId",
                        columns: x => new { x.TenantId, x.ClientId },
                        principalSchema: "services",
                        principalTable: "Clients",
                        principalColumns: new[] { "TenantId", "Id" },
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ClientGuardians_DeletedAt",
                schema: "services",
                table: "ClientGuardians",
                column: "DeletedAt");

            migrationBuilder.CreateIndex(
                name: "IX_ClientGuardians_TenantId",
                schema: "services",
                table: "ClientGuardians",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_ClientGuardians_TenantId_ClientId",
                schema: "services",
                table: "ClientGuardians",
                columns: new[] { "TenantId", "ClientId" });

            migrationBuilder.CreateIndex(
                name: "IX_ClientReferenceContacts_DeletedAt",
                schema: "services",
                table: "ClientReferenceContacts",
                column: "DeletedAt");

            migrationBuilder.CreateIndex(
                name: "IX_ClientReferenceContacts_TenantId",
                schema: "services",
                table: "ClientReferenceContacts",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_ClientReferenceContacts_TenantId_ClientId",
                schema: "services",
                table: "ClientReferenceContacts",
                columns: new[] { "TenantId", "ClientId" });

            migrationBuilder.CreateIndex(
                name: "IX_Clients_DeletedAt",
                schema: "services",
                table: "Clients",
                column: "DeletedAt");

            migrationBuilder.CreateIndex(
                name: "IX_Clients_TenantId",
                schema: "services",
                table: "Clients",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_Clients_TenantId_Cpf",
                schema: "services",
                table: "Clients",
                columns: new[] { "TenantId", "Cpf" },
                unique: true,
                filter: "\"Cpf\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Clients_TenantId_Email",
                schema: "services",
                table: "Clients",
                columns: new[] { "TenantId", "Email" },
                unique: true,
                filter: "\"Email\" IS NOT NULL AND \"Status\" = 'Active' AND \"DeletedAt\" IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Clients_TenantId_FullNameNormalized_Id",
                schema: "services",
                table: "Clients",
                columns: new[] { "TenantId", "FullNameNormalized", "Id" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ClientGuardians",
                schema: "services");

            migrationBuilder.DropTable(
                name: "ClientReferenceContacts",
                schema: "services");

            migrationBuilder.DropTable(
                name: "Clients",
                schema: "services");
        }
    }
}
