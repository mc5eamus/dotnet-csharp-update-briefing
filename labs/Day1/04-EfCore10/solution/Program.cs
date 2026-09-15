using Lab04;
using Microsoft.EntityFrameworkCore;

Console.WriteLine("Lab 04 - EF Core 10");
Console.WriteLine(new string('=', 52));

var databasePath = Path.Combine(AppContext.BaseDirectory, "lab04-solution.db");
if (File.Exists(databasePath))
{
    File.Delete(databasePath);
}

await using var db = new OrdersContext(databasePath);
await db.Database.EnsureDeletedAsync();
await db.Database.EnsureCreatedAsync();
await SeedAsync(db);

Check.Section("Complex types (TASK 1)");
var city = await Queries.LoadShippingCityAsync(db, "SO-100");
Check.Equal("Shipping address is stored as a complex value", "Leiden", city);

Check.Section("Named query filters (TASK 2)");
Check.Equal("Default filters show one live workshop order", 1, await Queries.CountVisibleOrdersAsync(db));
Check.Equal("Disabling only the archive filter keeps the tenant filter", 2, await Queries.CountIncludingArchivedForTenantAsync(db));

Check.Section("ExecuteUpdateAsync (TASK 3)");
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
            entity.HasQueryFilter("TenantFilter", order => order.TenantId == "WORKSHOP");
            entity.HasQueryFilter("ArchivedFilter", order => !order.IsArchived);
        });
    }
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

    public static Task<int> MarkReadyAsync(OrdersContext db)
        => db.Orders
             .Where(order => order.Status == "Pending")
             .ExecuteUpdateAsync(setters =>
             {
                 setters.SetProperty(order => order.Status, "Ready");
             });

    public static async Task<string?> StatusAsync(OrdersContext db, string reference)
        => (await db.Orders.AsNoTracking().FirstOrDefaultAsync(order => order.Reference == reference))?.Status;
}
