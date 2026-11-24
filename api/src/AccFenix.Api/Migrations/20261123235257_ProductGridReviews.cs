using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace AccFenix.Api.Migrations
{
    /// <inheritdoc />
    public partial class ProductGridReviews : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "Caffeine",
                table: "Products",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FlavorNotes",
                table: "Products",
                type: "character varying(160)",
                maxLength: 160,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Intensity",
                table: "Products",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Sweetness",
                table: "Products",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ReviewToken",
                table: "Orders",
                type: "character varying(32)",
                maxLength: 32,
                nullable: false,
                defaultValueSql: "replace(gen_random_uuid()::text, '-', '')");

            migrationBuilder.CreateTable(
                name: "Reviews",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ProductId = table.Column<int>(type: "integer", nullable: false),
                    OrderId = table.Column<int>(type: "integer", nullable: false),
                    Rating = table.Column<int>(type: "integer", nullable: false),
                    Comment = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    AuthorName = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Reviews", x => x.Id);
                    table.CheckConstraint("CK_Reviews_Rating", "\"Rating\" BETWEEN 1 AND 5");
                    table.ForeignKey(
                        name: "FK_Reviews_Orders_OrderId",
                        column: x => x.OrderId,
                        principalTable: "Orders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Reviews_Products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.AddCheckConstraint(
                name: "CK_Products_Caffeine",
                table: "Products",
                sql: "\"Caffeine\" IS NULL OR \"Caffeine\" IN (0, 1, 2)");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Products_Intensity",
                table: "Products",
                sql: "\"Intensity\" IS NULL OR \"Intensity\" BETWEEN 1 AND 5");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Products_Sweetness",
                table: "Products",
                sql: "\"Sweetness\" IS NULL OR \"Sweetness\" BETWEEN 1 AND 5");

            migrationBuilder.CreateIndex(
                name: "IX_Orders_ReviewToken",
                table: "Orders",
                column: "ReviewToken",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Reviews_OrderId_ProductId",
                table: "Reviews",
                columns: new[] { "OrderId", "ProductId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Reviews_ProductId_CreatedAt",
                table: "Reviews",
                columns: new[] { "ProductId", "CreatedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Reviews");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Products_Caffeine",
                table: "Products");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Products_Intensity",
                table: "Products");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Products_Sweetness",
                table: "Products");

            migrationBuilder.DropIndex(
                name: "IX_Orders_ReviewToken",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "Caffeine",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "FlavorNotes",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "Intensity",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "Sweetness",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "ReviewToken",
                table: "Orders");
        }
    }
}
