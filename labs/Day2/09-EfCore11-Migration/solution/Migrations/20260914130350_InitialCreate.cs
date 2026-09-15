using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Lab04.Migrations;

/// <inheritdoc />
public partial class _20260914130350_InitialCreate : Migration
{
    /// <inheritdoc />
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "Orders",
            columns: table => new
            {
                Id = table.Column<int>(type: "INTEGER", nullable: false)
                    .Annotation("Sqlite:Autoincrement", true),
                Reference = table.Column<string>(type: "TEXT", nullable: false),
                TenantId = table.Column<string>(type: "TEXT", nullable: false),
                IsArchived = table.Column<bool>(type: "INTEGER", nullable: false),
                Status = table.Column<string>(type: "TEXT", nullable: false),
                ShippingAddress_City = table.Column<string>(type: "TEXT", nullable: false),
                ShippingAddress_Country = table.Column<string>(type: "TEXT", nullable: false),
                ShippingAddress_Line1 = table.Column<string>(type: "TEXT", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_Orders", x => x.Id);
            });

        migrationBuilder.CreateIndex(
            name: "IX_Orders_Reference",
            table: "Orders",
            column: "Reference",
            unique: true);

        migrationBuilder.CreateIndex(
            name: "IX_Orders_ShippingCity",
            table: "Orders",
            column: "ShippingAddress_City");
    }

    /// <inheritdoc />
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(
            name: "Orders");
    }
}
