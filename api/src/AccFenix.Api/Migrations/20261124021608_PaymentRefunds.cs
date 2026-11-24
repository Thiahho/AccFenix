using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AccFenix.Api.Migrations
{
    /// <inheritdoc />
    public partial class PaymentRefunds : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_Orders_PaidAt",
                table: "Orders");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Orders_PaymentStatus",
                table: "Orders");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Orders_PaidAt",
                table: "Orders",
                sql: "(\"PaymentStatus\" IN (1, 3)) = (\"PaidAt\" IS NOT NULL)");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Orders_PaymentStatus",
                table: "Orders",
                sql: "\"PaymentStatus\" IN (0, 1, 2, 3)");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_Orders_PaidAt",
                table: "Orders");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Orders_PaymentStatus",
                table: "Orders");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Orders_PaidAt",
                table: "Orders",
                sql: "(\"PaymentStatus\" = 1) = (\"PaidAt\" IS NOT NULL)");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Orders_PaymentStatus",
                table: "Orders",
                sql: "\"PaymentStatus\" IN (0, 1, 2)");
        }
    }
}
