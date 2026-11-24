using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AccFenix.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddonPrices : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsAddon",
                table: "CatalogAttributes",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<decimal>(
                name: "AddonPrice",
                table: "AttributeValues",
                type: "numeric(12,0)",
                precision: 12,
                scale: 0,
                nullable: true);

            migrationBuilder.AddCheckConstraint(
                name: "CK_AttributeValues_AddonPrice",
                table: "AttributeValues",
                sql: "\"AddonPrice\" IS NULL OR \"AddonPrice\" BETWEEN 0 AND 99999999");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_AttributeValues_AddonPrice",
                table: "AttributeValues");

            migrationBuilder.DropColumn(
                name: "IsAddon",
                table: "CatalogAttributes");

            migrationBuilder.DropColumn(
                name: "AddonPrice",
                table: "AttributeValues");
        }
    }
}
