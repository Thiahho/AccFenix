using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace AccFenix.Api.Migrations
{
    /// <inheritdoc />
    public partial class Testimonials : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Testimonials",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Url = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    CloudinaryPublicId = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    Source = table.Column<int>(type: "integer", nullable: false),
                    Caption = table.Column<string>(type: "character varying(140)", maxLength: 140, nullable: true),
                    Width = table.Column<int>(type: "integer", nullable: false),
                    Height = table.Column<int>(type: "integer", nullable: false),
                    IsPublished = table.Column<bool>(type: "boolean", nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Testimonials", x => x.Id);
                    table.CheckConstraint("CK_Testimonials_Size", "\"Width\" BETWEEN 1 AND 20000 AND \"Height\" BETWEEN 1 AND 20000");
                    table.CheckConstraint("CK_Testimonials_Source", "\"Source\" IN (0, 1, 2)");
                });

            migrationBuilder.CreateIndex(
                name: "IX_Testimonials_IsPublished_SortOrder",
                table: "Testimonials",
                columns: new[] { "IsPublished", "SortOrder" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Testimonials");
        }
    }
}
