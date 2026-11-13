using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AccFenix.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddOrderCheckConstraints : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddCheckConstraint(
                name: "CK_Variants_RetailPrice",
                table: "Variants",
                sql: "\"RetailPrice\" IS NULL OR \"RetailPrice\" BETWEEN 0 AND 99999999.99");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Variants_WholesalePrice",
                table: "Variants",
                sql: "\"WholesalePrice\" IS NULL OR \"WholesalePrice\" BETWEEN 0 AND 99999999.99");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Orders_Coordinates",
                table: "Orders",
                sql: "(\"Latitude\" IS NULL) = (\"Longitude\" IS NULL)");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Orders_Latitude",
                table: "Orders",
                sql: "\"Latitude\" IS NULL OR \"Latitude\" BETWEEN -90 AND 90");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Orders_Longitude",
                table: "Orders",
                sql: "\"Longitude\" IS NULL OR \"Longitude\" BETWEEN -180 AND 180");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Orders_Number",
                table: "Orders",
                sql: "\"Number\" > 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Orders_Status",
                table: "Orders",
                sql: "\"Status\" IN (0, 1, 2, 3, 4)");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Orders_Total",
                table: "Orders",
                sql: "\"Total\" >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Orders_Zone",
                table: "Orders",
                sql: "\"Zone\" IN (0, 1)");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Orders_ZoneFields",
                table: "Orders",
                sql: "(\"Zone\" = 0 AND \"Locality\" IS NOT NULL AND \"Address\" IS NOT NULL AND \"Province\" IS NULL AND \"Carrier\" IS NULL) OR (\"Zone\" = 1 AND \"Province\" IS NOT NULL AND \"Carrier\" IS NOT NULL AND \"Locality\" IS NULL AND \"Address\" IS NULL AND \"Latitude\" IS NULL AND \"Longitude\" IS NULL)");

            migrationBuilder.AddCheckConstraint(
                name: "CK_OrderItems_Quantity",
                table: "OrderItems",
                sql: "\"Quantity\" BETWEEN 1 AND 100000");

            migrationBuilder.AddCheckConstraint(
                name: "CK_OrderItems_Subtotal",
                table: "OrderItems",
                sql: "\"Subtotal\" IS NULL OR \"Subtotal\" >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_OrderItems_UnitPrice",
                table: "OrderItems",
                sql: "\"UnitPrice\" IS NULL OR \"UnitPrice\" >= 0");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_Variants_RetailPrice",
                table: "Variants");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Variants_WholesalePrice",
                table: "Variants");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Orders_Coordinates",
                table: "Orders");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Orders_Latitude",
                table: "Orders");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Orders_Longitude",
                table: "Orders");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Orders_Number",
                table: "Orders");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Orders_Status",
                table: "Orders");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Orders_Total",
                table: "Orders");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Orders_Zone",
                table: "Orders");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Orders_ZoneFields",
                table: "Orders");

            migrationBuilder.DropCheckConstraint(
                name: "CK_OrderItems_Quantity",
                table: "OrderItems");

            migrationBuilder.DropCheckConstraint(
                name: "CK_OrderItems_Subtotal",
                table: "OrderItems");

            migrationBuilder.DropCheckConstraint(
                name: "CK_OrderItems_UnitPrice",
                table: "OrderItems");
        }
    }
}
