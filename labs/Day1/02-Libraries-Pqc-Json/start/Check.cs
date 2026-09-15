namespace Lab02;

/// <summary>
/// A deliberately tiny assertion harness. The labs avoid NuGet packages where
/// they can, so a lab always restores instantly and works on a locked-down or
/// offline machine.
/// </summary>
public static class Check
{
    private static int _passed;
    private static int _failed;

    public static void That(string description, bool condition)
    {
        if (condition)
        {
            _passed++;
            Console.ForegroundColor = ConsoleColor.Green;
            Console.Write("  PASS  ");
            Console.ResetColor();
            Console.WriteLine(description);
        }
        else
        {
            _failed++;
            Console.ForegroundColor = ConsoleColor.Red;
            Console.Write("  FAIL  ");
            Console.ResetColor();
            Console.WriteLine(description);
        }
    }

    public static void Equal<T>(string description, T expected, T actual)
    {
        var ok = EqualityComparer<T>.Default.Equals(expected, actual);
        That(ok ? description : $"{description}  (expected {expected}, got {actual})", ok);
    }

    public static void Section(string title)
    {
        Console.WriteLine();
        Console.ForegroundColor = ConsoleColor.Cyan;
        Console.WriteLine(title);
        Console.ResetColor();
    }

    /// <summary>Returns the process exit code: 0 when everything passed.</summary>
    public static int Summary()
    {
        Console.WriteLine();
        Console.WriteLine(new string('-', 52));
        Console.WriteLine($"  {_passed} passed, {_failed} failed");
        if (_failed == 0)
        {
            Console.ForegroundColor = ConsoleColor.Green;
            Console.WriteLine("  All checks passed.");
        }
        else
        {
            Console.ForegroundColor = ConsoleColor.Red;
            Console.WriteLine("  Keep going - some checks are still failing.");
        }
        Console.ResetColor();
        return _failed == 0 ? 0 : 1;
    }
}

