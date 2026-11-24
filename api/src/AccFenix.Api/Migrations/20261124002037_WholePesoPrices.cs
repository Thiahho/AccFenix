using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AccFenix.Api.Migrations
{
    /// <inheritdoc />
    public partial class WholePesoPrices : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_Variants_RetailPrice",
                table: "Variants");

            migrationBuilder.AlterColumn<decimal>(
                name: "RetailPrice",
                table: "Variants",
                type: "numeric(12,0)",
                precision: 12,
                scale: 0,
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "numeric(12,2)",
                oldPrecision: 12,
                oldScale: 2,
                oldNullable: true);

            migrationBuilder.AlterColumn<decimal>(
                name: "Total",
                table: "Orders",
                type: "numeric(12,0)",
                precision: 12,
                scale: 0,
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "numeric(12,2)",
                oldPrecision: 12,
                oldScale: 2);

            migrationBuilder.AlterColumn<decimal>(
                name: "UnitPrice",
                table: "OrderItems",
                type: "numeric(12,0)",
                precision: 12,
                scale: 0,
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "numeric(12,2)",
                oldPrecision: 12,
                oldScale: 2,
                oldNullable: true);

            migrationBuilder.AlterColumn<decimal>(
                name: "Subtotal",
                table: "OrderItems",
                type: "numeric(12,0)",
                precision: 12,
                scale: 0,
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "numeric(12,2)",
                oldPrecision: 12,
                oldScale: 2,
                oldNullable: true);

            migrationBuilder.AddCheckConstraint(
                name: "CK_Variants_RetailPrice",
                table: "Variants",
                sql: "\"RetailPrice\" IS NULL OR \"RetailPrice\" BETWEEN 0 AND 99999999");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_Variants_RetailPrice",
                table: "Variants");

            migrationBuilder.AlterColumn<decimal>(
                name: "RetailPrice",
                table: "Variants",
                type: "numeric(12,2)",
                precision: 12,
                scale: 2,
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "numeric(12,0)",
                oldPrecision: 12,
                oldScale: 0,
                oldNullable: true);

            migrationBuilder.AlterColumn<decimal>(
                name: "Total",
                table: "Orders",
                type: "numeric(12,2)",
                precision: 12,
                scale: 2,
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "numeric(12,0)",
                oldPrecision: 12,
                oldScale: 0);

            migrationBuilder.AlterColumn<decimal>(
                name: "UnitPrice",
                table: "OrderItems",
                type: "numeric(12,2)",
                precision: 12,
                scale: 2,
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "numeric(12,0)",
                oldPrecision: 12,
                oldScale: 0,
                oldNullable: true);

            migrationBuilder.AlterColumn<decimal>(
                name: "Subtotal",
                table: "OrderItems",
                type: "numeric(12,2)",
                precision: 12,
                scale: 2,
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "numeric(12,0)",
                oldPrecision: 12,
                oldScale: 0,
                oldNullable: true);

            migrationBuilder.AddCheckConstraint(
                name: "CK_Variants_RetailPrice",
                table: "Variants",
                sql: "\"RetailPrice\" IS NULL OR \"RetailPrice\" BETWEEN 0 AND 99999999.99");
        }
    }
}
