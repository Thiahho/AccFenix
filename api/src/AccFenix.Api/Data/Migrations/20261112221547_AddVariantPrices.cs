using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AccFenix.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddVariantPrices : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "RetailPrice",
                table: "Variants",
                type: "numeric(12,2)",
                precision: 12,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "WholesalePrice",
                table: "Variants",
                type: "numeric(12,2)",
                precision: 12,
                scale: 2,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "RetailPrice",
                table: "Variants");

            migrationBuilder.DropColumn(
                name: "WholesalePrice",
                table: "Variants");
        }
    }
}
