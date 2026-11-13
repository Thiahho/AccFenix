using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AccFenix.Api.Data.Migrations
{
    /// <summary>The order phone becomes optional and the business name is no longer recorded.</summary>
    public partial class MakeOrderPhoneOptionalAndDropBusinessName : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_Orders_BusinessName",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "BusinessName",
                table: "Orders");

            migrationBuilder.AlterColumn<string>(
                name: "Phone",
                table: "Orders",
                type: "character varying(40)",
                maxLength: 40,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(40)",
                oldMaxLength: 40);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Orders placed without a phone get an empty one so the column can be required again.
            migrationBuilder.Sql("UPDATE \"Orders\" SET \"Phone\" = '' WHERE \"Phone\" IS NULL;");

            migrationBuilder.AlterColumn<string>(
                name: "Phone",
                table: "Orders",
                type: "character varying(40)",
                maxLength: 40,
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "character varying(40)",
                oldMaxLength: 40,
                oldNullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BusinessName",
                table: "Orders",
                type: "character varying(120)",
                maxLength: 120,
                nullable: true);

            // Business orders placed without a business name fall back to the customer name.
            migrationBuilder.Sql("UPDATE \"Orders\" SET \"BusinessName\" = \"CustomerName\" WHERE \"CustomerType\" = 1;");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Orders_BusinessName",
                table: "Orders",
                sql: "(\"CustomerType\" = 1) = (\"BusinessName\" IS NOT NULL)");
        }
    }
}
