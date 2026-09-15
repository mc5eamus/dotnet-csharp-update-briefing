namespace Lab07;

public static class FullJoinDemo
{
    // TASK 2: unmatched value-type rows arrive as default(T), which is 0 for int.
    public static string RawJoin()
    {
        var left = new[] { 1, 2, 3 };
        var right = new[] { 3, 4 };
        return string.Join(", ", left.FullJoin(right, x => x, y => y, (leftValue, rightValue) => $"{leftValue}/{rightValue}"));
    }

    public static string AmbiguousZeroJoin()
    {
        var left = new[] { 0, 1 };
        var right = new[] { 0, 2 };
        return string.Join(", ", left.FullJoin(right, x => x, y => y, (leftValue, rightValue) => $"{leftValue}/{rightValue}"));
    }

    public static string NullableJoin()
    {
        var left = new[] { 1, 2, 3 }.Select(static value => (int?)value);
        var right = new[] { 3, 4 }.Select(static value => (int?)value);
        return string.Join(", ", left.FullJoin(
            right,
            leftValue => leftValue,
            rightValue => rightValue,
            (leftValue, rightValue) => $"{Format(leftValue)}/{Format(rightValue)}"));
    }

    private static string Format(int? value) => value?.ToString() ?? "<none>";
}
