namespace Lab01;

/// <summary>
/// TASK 2 (done): the static helper class is now a C# 14 <c>extension</c> block.
/// TASK 3 (done): <c>Order.Empty</c> is a static extension property.
///
/// The receiver is declared once, at the top of the block, instead of being
/// repeated as a <c>this</c> parameter on every member. That is what makes
/// extension *properties* possible at all -- there is no parameter list to
/// hang <c>this</c> off.
/// </summary>
public static class OrderHelpers
{
    extension(Order order)
    {
        /// <summary>
        /// Takes no arguments and reads like state, so it is a property.
        /// That is the signal to look for when deciding what to convert.
        /// </summary>
        public bool IsEmpty => order.Lines.Count == 0;

        public bool IsDispatched => order.DispatchedOn.HasValue;

        public int ItemCount
        {
            get
            {
                var count = 0;
                foreach (var line in order.Lines)
                {
                    count += line.Quantity;
                }

                return count;
            }
        }

        public Money Total
        {
            get
            {
                var total = Money.Zero;
                foreach (var line in order.Lines)
                {
                    total += line.LineTotal;
                }

                return total;
            }
        }

        /// <summary>
        /// Stays a method: it formats something rather than exposing state, and
        /// a reader expects a method to do work.
        /// </summary>
        public string Describe()
            => $"{order.Reference}: {order.ItemCount} item(s), {order.Total}";
    }

    extension(Order)
    {
        /// <summary>
        /// TASK 3: a *static* extension member. It hangs off the type rather
        /// than an instance, so it is written on an unnamed receiver.
        /// </summary>
        public static Order Empty => new Order();
    }
}
