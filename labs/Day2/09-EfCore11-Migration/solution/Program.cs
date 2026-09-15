// TASK 1: retargeted to net11.0 and restored with the EF Core RC package that is actually on the feed.
// TASK 2: apply migrations to a real SQLite database before seeding.
// TASK 3: verify EF Core 11 complex-property model configuration and MaxByAsync translation.
// TASK 4: all migration checks use the same zero-dependency Check harness.

using Lab04;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

Console.WriteLine("Lab 09 - EF Core 11 migration");
Console.WriteLine(new string('=', 52));

var databasePath = Path.Combine(AppContext.BaseDirectory, "lab09-solution.db");
if (File.Exists(databasePath))
{
    File.Delete(databasePath);
}

await using var db = new OrdersContext(databasePath);
await db.Database.EnsureDeletedAsync();
await db.Database.MigrateAsync();
await SeedAsync(db);

Check.Section("Migrated model (TASK 2)");
var city = await Queries.LoadShippingCityAsync(db, "SO-100");
Check.Equal("Shipping address still round-trips after migration", "Leiden", city);
Check.That("The migration created the Orders table", await Queries.TableExistsAsync(db, "Orders"));

Check.Section("Named filters still behave (TASK 2)");
Check.Equal("Default filters show one live workshop order", 1, await Queries.CountVisibleOrdersAsync(db));
Check.Equal("Disabling only the archive filter keeps the tenant filter", 2, await Queries.CountIncludingArchivedForTenantAsync(db));

Check.Section("EF Core 11 checks (TASK 3)");
Check.That("Complex scalar property index was created", await Queries.IndexExistsAsync(db, "IX_Orders_ShippingCity"));
Check.Equal("MaxByAsync translated through the filtered DbSet", "SO-100", await Queries.MaxVisibleReferenceAsync(db));

Check.Section("ExecuteUpdateAsync still behaves (TASK 4)");
var updated = await Queries.MarkReadyAsync(db);
Check.Equal("One pending visible order was updated", 1, updated);
Check.Equal("The pending order is now ready", "Ready", await Queries.StatusAsync(db, "SO-100"));

return Check.Summary();

static async Task SeedAsync(OrdersContext db)
{
    db.Orders.AddRange(
        new Order
        {
            Reference = "SO-100",
            TenantId = "WORKSHOP",
            Status = "Pending",
            ShippingAddress = new Address("Stationsplein 1", "Leiden", "NL")
        },
        new Order
        {
            Reference = "SO-101",
            TenantId = "WORKSHOP",
            Status = "Archived",
            IsArchived = true,
            ShippingAddress = new Address("Dam 1", "Amsterdam", "NL")
        },
        new Order
        {
            Reference = "SO-200",
            TenantId = "OTHER",
            Status = "Pending",
            ShippingAddress = new Address("Markt 1", "Delft", "NL")
        });

    await db.SaveChangesAsync();
}


public sealed class OrdersContext(string databasePath) : DbContext
{
    public DbSet<Order> Orders => Set<Order>();

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
        => optionsBuilder.UseSqlite($"Data Source={databasePath}");

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Order>(entity =>
        {
            entity.HasKey(order => order.Id);
            entity.HasIndex(order => order.Reference).IsUnique();
            entity.ComplexProperty(order => order.ShippingAddress);
            // TASK 3: EF Core 11 allows indexing scalar members inside non-collection complex types.
            entity.HasIndex(order => order.ShippingAddress.City).HasDatabaseName("IX_Orders_ShippingCity");
            entity.HasQueryFilter("TenantFilter", order => order.TenantId == "WORKSHOP");
            entity.HasQueryFilter("ArchivedFilter", order => !order.IsArchived);
        });
    }
}


public sealed class DesignTimeOrdersContextFactory : IDesignTimeDbContextFactory<OrdersContext>
{
    public OrdersContext CreateDbContext(string[] args)
        => new(Path.Combine(AppContext.BaseDirectory, "lab09-design.db"));
}
public sealed class Order
{
    public int Id { get; set; }
    public string Reference { get; set; } = string.Empty;
    public string TenantId { get; set; } = "WORKSHOP";
    public bool IsArchived { get; set; }
    public string Status { get; set; } = "Pending";
    public Address ShippingAddress { get; set; }
}

public readonly record struct Address(string Line1, string City, string Country);

public static class Queries
{
    public static async Task<string?> LoadShippingCityAsync(OrdersContext db, string reference)
    {
        var order = await db.Orders.FirstOrDefaultAsync(candidate => candidate.Reference == reference);
        return order?.ShippingAddress.City;
    }

    public static Task<int> CountVisibleOrdersAsync(OrdersContext db)
        => db.Orders.CountAsync();

    public static Task<int> CountIncludingArchivedForTenantAsync(OrdersContext db)
        => db.Orders.IgnoreQueryFilters(["ArchivedFilter"]).CountAsync();

    public static async Task<string?> MaxVisibleReferenceAsync(OrdersContext db)
        => (await db.Orders.MaxByAsync(order => order.Reference))?.Reference;

    public static Task<int> MarkReadyAsync(OrdersContext db)
        => db.Orders
             .Where(order => order.Status == "Pending")
             .ExecuteUpdateAsync(setters =>
             {
                 setters.SetProperty(order => order.Status, "Ready");
             });

    public static async Task<string?> StatusAsync(OrdersContext db, string reference)
        => (await db.Orders.AsNoTracking().FirstOrDefaultAsync(order => order.Reference == reference))?.Status;

    public static async Task<bool> TableExistsAsync(OrdersContext db, string tableName)
        => await db.Database.SqlQueryRaw<int>("SELECT COUNT(*) AS Value FROM sqlite_master WHERE type = 'table' AND name = {0}", tableName).SingleAsync() == 1;

    public static async Task<bool> IndexExistsAsync(OrdersContext db, string indexName)
        => await db.Database.SqlQueryRaw<int>("SELECT COUNT(*) AS Value FROM sqlite_master WHERE type = 'index' AND name = {0}", indexName).SingleAsync() == 1;
}