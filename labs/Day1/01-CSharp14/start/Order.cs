namespace Lab01;

public sealed class OrderLine
{
    // TASK 1: replace these backing fields with the `field` keyword.
    private string _sku = string.Empty;
    private int _quantity;

    public string Sku
    {
        get { return _sku; }
        set { _sku = value?.Trim().ToUpperInvariant() ?? string.Empty; }
    }

    public int Quantity
    {
        get { return _quantity; }
        set { _quantity = value < 1 ? 1 : value; }
    }

    public Money UnitPrice { get; set; }

    public Money LineTotal => new Money(UnitPrice.Amount * Quantity);
}

public sealed class Order
{
    private string _reference = string.Empty;
    private string? _note;

    public string Reference
    {
        get { return _reference; }
        set { _reference = string.IsNullOrWhiteSpace(value) ? "UNREFERENCED" : value.Trim(); }
    }

    /// <summary>Free-text note. Empty input is normalised to null.</summary>
    public string? Note
    {
        get { return _note; }
        set { _note = string.IsNullOrWhiteSpace(value) ? null : value.Trim(); }
    }

    public List<OrderLine> Lines { get; } = new List<OrderLine>();

    public DateTimeOffset? DispatchedOn { get; set; }
}

public sealed class Customer
{
    public string Name { get; set; } = string.Empty;

    /// <summary>The order currently being assembled, if any.</summary>
    public Order? CurrentOrder { get; set; }
}
