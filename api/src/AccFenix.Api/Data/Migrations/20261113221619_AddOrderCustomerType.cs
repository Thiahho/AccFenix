using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AccFenix.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddOrderCustomerType : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "BusinessName",
                table: "Orders",
                type: "character varying(120)",
                maxLength: 120,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "CustomerType",
                table: "Orders",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddCheckConstraint(
                name: "CK_Orders_BusinessName",
                table: "Orders",
                sql: "(\"CustomerType\" = 1) = (\"BusinessName\" IS NOT NULL)");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Orders_CustomerType",
                table: "Orders",
                sql: "\"CustomerType\" IN (0, 1)");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_Orders_BusinessName",
                table: "Orders");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Orders_CustomerType",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "BusinessName",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "CustomerType",
                table: "Orders");
        }
    }
}
