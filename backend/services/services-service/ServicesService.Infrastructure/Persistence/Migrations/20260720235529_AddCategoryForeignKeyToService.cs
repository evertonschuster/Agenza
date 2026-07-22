using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ServicesService.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddCategoryForeignKeyToService : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Pre-fix data: CategoryId had no FK, so a deleted Category could leave a
            // dangling reference on a Service. Clear those before the constraint is added,
            // or AddForeignKey fails against any row that violates it.
            migrationBuilder.Sql(
                "UPDATE \"services\".\"Services\" SET \"CategoryId\" = NULL " +
                "WHERE \"CategoryId\" IS NOT NULL " +
                "AND \"CategoryId\" NOT IN (SELECT \"Id\" FROM \"services\".\"Categories\");");

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
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Services_Categories_CategoryId",
                schema: "services",
                table: "Services");

            migrationBuilder.DropIndex(
                name: "IX_Services_CategoryId",
                schema: "services",
                table: "Services");
        }
    }
}
