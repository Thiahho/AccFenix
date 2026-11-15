using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AccFenix.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddAdminSecurityStamp : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "SecurityStamp",
                table: "AdminUsers",
                type: "character varying(64)",
                maxLength: 64,
                nullable: false,
                // Existing admins get their own random stamp; the default is dropped right after, as in the model.
                defaultValueSql: "md5(random()::text || clock_timestamp()::text)");

            migrationBuilder.Sql("ALTER TABLE \"AdminUsers\" ALTER COLUMN \"SecurityStamp\" DROP DEFAULT;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SecurityStamp",
                table: "AdminUsers");
        }
    }
}
