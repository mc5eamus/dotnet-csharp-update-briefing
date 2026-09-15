namespace Lab01;

/// <summary>
/// TASK 6 (the one nobody spots).
///
/// This type compiled and behaved one way under C# 13 and behaves differently
/// under C# 14, without anyone editing it. Run the program and read the
/// "The field trap" section before you try to explain why.
/// </summary>
public sealed class DispatchCounter
{
    // A member that happens to be named `field`. Legal in every version of C#.
    private int field;

    public int Count
    {
        // Inside a property accessor, C# 14 binds `field` to the compiler's
        // backing field for this property - NOT to the member declared above.
        get => field;
        set => field = value;
    }

    /// <summary>
    /// Outside an accessor, `field` still means the member. So this method and
    /// the property above no longer touch the same storage.
    /// </summary>
    public void Reset() => field = 0;

    /// <summary>The value of the member named <c>field</c>, read unambiguously.</summary>
    public int MemberValue => this.field;
}
