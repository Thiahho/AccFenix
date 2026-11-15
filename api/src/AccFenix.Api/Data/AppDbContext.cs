using System.Globalization;
using AccFenix.Api.Domain;
using Microsoft.EntityFrameworkCore;
using static System.FormattableString;

namespace AccFenix.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<CatalogAttribute> Attributes => Set<CatalogAttribute>();
    public DbSet<AttributeValue> AttributeValues => Set<AttributeValue>();
    public DbSet<CategoryAttribute> CategoryAttributes => Set<CategoryAttribute>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<ProductAllowedValue> ProductAllowedValues => Set<ProductAllowedValue>();
    public DbSet<Variant> Variants => Set<Variant>();
    public DbSet<VariantValue> VariantValues => Set<VariantValue>();
    public DbSet<Media> Media => Set<Media>();
    public DbSet<Setting> Settings => Set<Setting>();
    public DbSet<AdminUser> AdminUsers => Set<AdminUser>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderItem> OrderItems => Set<OrderItem>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<Category>(e =>
        {
            e.Property(x => x.Name).HasMaxLength(120);
            e.Property(x => x.Slug).HasMaxLength(140);
            e.HasIndex(x => x.Slug).IsUnique();
        });

        b.Entity<CatalogAttribute>(e =>
        {
            e.ToTable("CatalogAttributes");
            e.Property(x => x.Name).HasMaxLength(80);
            e.Property(x => x.Slug).HasMaxLength(100);
            e.HasIndex(x => x.Slug).IsUnique();
        });

        b.Entity<AttributeValue>(e =>
        {
            e.Property(x => x.Label).HasMaxLength(80);
            e.Property(x => x.ColorHex).HasMaxLength(7);
            e.HasIndex(x => new { x.AttributeId, x.Label }).IsUnique();
            e.HasOne(x => x.Attribute).WithMany(a => a.Values).HasForeignKey(x => x.AttributeId);
        });

        b.Entity<CategoryAttribute>(e =>
        {
            e.HasKey(x => new { x.CategoryId, x.AttributeId });
            e.HasOne(x => x.Category).WithMany(c => c.Attributes).HasForeignKey(x => x.CategoryId);
            e.HasOne(x => x.Attribute).WithMany().HasForeignKey(x => x.AttributeId).OnDelete(DeleteBehavior.Restrict);
        });

        b.Entity<Product>(e =>
        {
            e.Property(x => x.Name).HasMaxLength(160);
            e.Property(x => x.Slug).HasMaxLength(180);
            e.HasIndex(x => x.Slug).IsUnique();
            e.HasOne(x => x.Category).WithMany(c => c.Products).HasForeignKey(x => x.CategoryId).OnDelete(DeleteBehavior.Restrict);
        });

        b.Entity<ProductAllowedValue>(e =>
        {
            e.HasKey(x => new { x.ProductId, x.AttributeValueId });
            e.HasOne(x => x.Product).WithMany(p => p.AllowedValues).HasForeignKey(x => x.ProductId);
            e.HasOne(x => x.AttributeValue).WithMany().HasForeignKey(x => x.AttributeValueId).OnDelete(DeleteBehavior.Restrict);
        });

        b.Entity<Variant>(e =>
        {
            e.Property(x => x.Sku).HasMaxLength(Variant.SkuMaxLength);
            e.Property(x => x.CombinationKey).HasMaxLength(200);
            e.Property(x => x.RetailPrice).HasPrecision(12, 2);
            e.Property(x => x.WholesalePrice).HasPrecision(12, 2);
            e.HasIndex(x => x.Sku).IsUnique();
            e.HasIndex(x => new { x.ProductId, x.CombinationKey }).IsUnique();
            e.HasOne(x => x.Product).WithMany(p => p.Variants).HasForeignKey(x => x.ProductId);
            // Same bounds as the API validators; a missing price means "price on request".
            e.ToTable(t =>
            {
                t.HasCheckConstraint("CK_Variants_RetailPrice", OptionalPriceRule("RetailPrice"));
                t.HasCheckConstraint("CK_Variants_WholesalePrice", OptionalPriceRule("WholesalePrice"));
            });
        });

        b.Entity<VariantValue>(e =>
        {
            e.HasKey(x => new { x.VariantId, x.AttributeValueId });
            e.HasOne(x => x.Variant).WithMany(v => v.Values).HasForeignKey(x => x.VariantId);
            e.HasOne(x => x.AttributeValue).WithMany().HasForeignKey(x => x.AttributeValueId).OnDelete(DeleteBehavior.Restrict);
        });

        b.Entity<Media>(e =>
        {
            e.Property(x => x.Url).HasMaxLength(1000);
            e.Property(x => x.CloudinaryPublicId).HasMaxLength(300);
            e.HasOne(x => x.Product).WithMany(p => p.Media).HasForeignKey(x => x.ProductId);
            e.HasOne(x => x.AttributeValue).WithMany().HasForeignKey(x => x.AttributeValueId).OnDelete(DeleteBehavior.SetNull);
        });

        b.Entity<Setting>(e =>
        {
            e.HasKey(x => x.Key);
            e.Property(x => x.Key).HasMaxLength(80);
            e.Property(x => x.Value).HasMaxLength(500);
        });

        b.Entity<AdminUser>(e =>
        {
            e.Property(x => x.Email).HasMaxLength(200);
            e.Property(x => x.SecurityStamp).HasMaxLength(AdminUser.SecurityStampMaxLength);
            e.HasIndex(x => x.Email).IsUnique();
        });

        b.Entity<Order>(e =>
        {
            // A second identity column: the database hands out consecutive order numbers.
            e.Property(x => x.Number).UseIdentityAlwaysColumn();
            e.HasIndex(x => x.Number).IsUnique();
            e.Property(x => x.CustomerName).HasMaxLength(OrderLimits.Name);
            e.Property(x => x.Phone).HasMaxLength(OrderLimits.Phone);
            e.Property(x => x.Locality).HasMaxLength(OrderLimits.Locality);
            e.Property(x => x.Address).HasMaxLength(OrderLimits.Address);
            e.Property(x => x.Province).HasMaxLength(OrderLimits.Province);
            e.Property(x => x.Carrier).HasMaxLength(OrderLimits.Carrier);
            e.Property(x => x.Comments).HasMaxLength(OrderLimits.Comments);
            e.Property(x => x.Total).HasPrecision(12, 2);
            // The admin list is read newest first, optionally by status.
            e.HasIndex(x => x.CreatedAt);
            e.HasIndex(x => new { x.Status, x.CreatedAt });
            // Enums are stored as integers; these rules mirror the order validator of the API.
            e.ToTable(t =>
            {
                t.HasCheckConstraint("CK_Orders_Status", $"\"Status\" IN ({EnumValues<OrderStatus>()})");
                t.HasCheckConstraint("CK_Orders_Zone", $"\"Zone\" IN ({EnumValues<DeliveryZone>()})");
                t.HasCheckConstraint("CK_Orders_CustomerType", $"\"CustomerType\" IN ({EnumValues<CustomerType>()})");
                t.HasCheckConstraint("CK_Orders_Number", "\"Number\" > 0");
                t.HasCheckConstraint("CK_Orders_Total", "\"Total\" >= 0");
                t.HasCheckConstraint("CK_Orders_Coordinates", "(\"Latitude\" IS NULL) = (\"Longitude\" IS NULL)");
                t.HasCheckConstraint("CK_Orders_Latitude", "\"Latitude\" IS NULL OR \"Latitude\" BETWEEN -90 AND 90");
                t.HasCheckConstraint("CK_Orders_Longitude", "\"Longitude\" IS NULL OR \"Longitude\" BETWEEN -180 AND 180");
                // Each zone carries only its own delivery fields (a single line keeps the migration SQL stable).
                t.HasCheckConstraint("CK_Orders_ZoneFields",
                    Invariant($"(\"Zone\" = {(int)DeliveryZone.BuenosAires} AND \"Locality\" IS NOT NULL AND \"Address\" IS NOT NULL AND \"Province\" IS NULL AND \"Carrier\" IS NULL)")
                    + Invariant($" OR (\"Zone\" = {(int)DeliveryZone.OtherProvince} AND \"Province\" IS NOT NULL AND \"Carrier\" IS NOT NULL")
                    + " AND \"Locality\" IS NULL AND \"Address\" IS NULL AND \"Latitude\" IS NULL AND \"Longitude\" IS NULL)");
            });
        });

        b.Entity<OrderItem>(e =>
        {
            e.Property(x => x.ProductName).HasMaxLength(160);
            e.Property(x => x.Sku).HasMaxLength(Variant.SkuMaxLength);
            e.Property(x => x.VariantLabel).HasMaxLength(OrderLimits.VariantLabel);
            e.Property(x => x.UnitPrice).HasPrecision(12, 2);
            e.Property(x => x.Subtotal).HasPrecision(12, 2);
            e.HasOne(x => x.Order).WithMany(o => o.Items).HasForeignKey(x => x.OrderId);
            // Removing a variant from the catalog keeps the order line and its snapshot.
            e.HasOne(x => x.Variant).WithMany().HasForeignKey(x => x.VariantId).OnDelete(DeleteBehavior.SetNull);
            e.ToTable(t =>
            {
                t.HasCheckConstraint("CK_OrderItems_Quantity", Invariant($"\"Quantity\" BETWEEN 1 AND {OrderLimits.MaxQuantity}"));
                t.HasCheckConstraint("CK_OrderItems_UnitPrice", "\"UnitPrice\" IS NULL OR \"UnitPrice\" >= 0");
                t.HasCheckConstraint("CK_OrderItems_Subtotal", "\"Subtotal\" IS NULL OR \"Subtotal\" >= 0");
            });
        });
    }

    static string OptionalPriceRule(string column) =>
        Invariant($"\"{column}\" IS NULL OR \"{column}\" BETWEEN 0 AND {CatalogLimits.MaxPrice}");

    static string EnumValues<TEnum>() where TEnum : struct, Enum =>
        string.Join(", ", Enum.GetValues<TEnum>().Select(v => Convert.ToInt32(v, CultureInfo.InvariantCulture)));
}
