namespace Lab01;

/// <summary>
/// The kind of static helper class that exists in every codebase.
///
/// TASK 2: convert this into a C# 14 `extension` block. At least two of these
///         should become extension *properties* rather than methods - they take
///         no arguments and read like state, which is exactly the signal.
/// TASK 3: add a static extension member that returns an empty order.
/// </summary>
public static class OrderHelpers
{
    public static bool IsEmpty(this Order order)
        => order.Lines.Count == 0;

    public static Money Total(this Order order)
    {
        var total = Money.Zero;
        foreach (var line in order.Lines)
        {
            total = total + line.LineTotal;
        }

        return total;
    }

    public static int ItemCount(this Order order)
    {
        var count = 0;
        foreach (var line in order.Lines)
        {
            count += line.Quantity;
        }

        return count;
    }

    public static bool IsDispatched(this Order order)
        => order.DispatchedOn.HasValue;

    public static string Describe(this Order order)
        => $"{order.Reference}: {order.ItemCount()} item(s), {order.Total()}";
}
