namespace Lab01;

/// <summary>
/// A minor-unit money type, now in C# 14 style.
///
/// TASK 1 (done): <c>Amount</c> uses the <c>field</c> keyword, so the explicit
/// backing field is gone but the validation in the setter is unchanged.
/// TASK 5 (done): a user-defined compound assignment operator.
/// </summary>
public struct Money
{
    public Money(long minorUnits) => Amount = minorUnits;

    public long Amount
    {
        get;
        set
        {
            if (value < 0)
            {
                throw new ArgumentOutOfRangeException(nameof(value), "Money cannot be negative.");
            }

            field = value;
        }
    }

    public static Money Zero => new Money(0);

    public static Money operator +(Money left, Money right)
        => new Money(left.Amount + right.Amount);

    /// <summary>
    /// C# 14 lets a type define <c>+=</c> directly, as an <em>instance</em>
    /// member. Note the shape: no <c>static</c>, no left-hand parameter, and it
    /// returns <c>void</c> because it mutates the receiver in place instead of
    /// constructing and copying a new value on every accumulation.
    /// </summary>
    public void operator +=(Money right)
        => Amount += right.Amount;

    public override string ToString()
        => (Amount / 100m).ToString("0.00");
}
