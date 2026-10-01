using AccFenix.Api.Domain;
using Microsoft.EntityFrameworkCore;

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
            e.Property(x => x.Sku).HasMaxLength(120);
            e.Property(x => x.CombinationKey).HasMaxLength(200);
            e.HasIndex(x => x.Sku).IsUnique();
            e.HasIndex(x => new { x.ProductId, x.CombinationKey }).IsUnique();
            e.HasOne(x => x.Product).WithMany(p => p.Variants).HasForeignKey(x => x.ProductId);
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
            e.HasIndex(x => x.Email).IsUnique();
        });
    }
}
