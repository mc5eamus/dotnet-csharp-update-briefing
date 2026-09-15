namespace Lab01;

/// <summary>
/// A minor-unit money type. Written in pre-C# 14 style.
///
/// TASK 5: give this type an in-place compound assignment operator so that
/// `total += item` mutates instead of allocating a new value each time.
/// </summary>
public struct Money
{
    // TASK 1: this backing field can go away once Amount uses `field`.
    private long _minorUnits;

    public Money(long minorUnits) => _minorUnits = minorUnits;

    public long Amount
    {
        get { return _minorUnits; }
        set
        {
            if (value < 0)
            {
                throw new ArgumentOutOfRangeException(nameof(value), "Money cannot be negative.");
            }

            _minorUnits = value;
        }
    }

    public static Money Zero => new Money(0);

    // C# 13 could only synthesise `+=` from this. Every `+=` therefore produced
    // a brand new Money and copied it back.
    public static Money operator +(Money left, Money right)
        => new Money(left._minorUnits + right._minorUnits);

    public override string ToString()
        => (_minorUnits / 100m).ToString("0.00");
}
