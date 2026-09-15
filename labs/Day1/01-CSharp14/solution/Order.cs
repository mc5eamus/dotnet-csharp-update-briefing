namespace Lab01;

/// <summary>
/// TASK 1 (done): every property below keeps its validation but loses its
/// hand-written backing field. Note that <c>field</c> is only a keyword inside
/// an accessor -- see <see cref="DispatchCounter"/> for what that costs you.
/// </summary>
public sealed class OrderLine
{
    public string Sku
    {
        get;
        set => field = value?.Trim().ToUpperInvariant() ?? string.Empty;
    } = string.Empty;

    public int Quantity
    {
        get;
        set => field = value < 1 ? 1 : value;
    }

    public Money UnitPrice { get; set; }

    public Money LineTotal => new Money(UnitPrice.Amount * Quantity);
}

public sealed class Order
{
    public string Reference
    {
        get;
        set => field = string.IsNullOrWhiteSpace(value) ? "UNREFERENCED" : value.Trim();
    } = string.Empty;

    /// <summary>Free-text note. Empty input is normalised to null.</summary>
    public string? Note
    {
        get;
        set => field = string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }

    public List<OrderLine> Lines { get; } = [];

    public DateTimeOffset? DispatchedOn { get; set; }
}

public sealed class Customer
{
    public string Name { get; set; } = string.Empty;

    /// <summary>The order currently being assembled, if any.</summary>
    public Order? CurrentOrder { get; set; }
}
