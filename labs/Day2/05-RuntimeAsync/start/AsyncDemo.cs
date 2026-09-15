namespace Lab05;

public static class AsyncDemo
{
    public static async Task<string> CaptureStackTraceAsync()
    {
        try
        {
            await ReceiveRequestAsync("SO-1107");
            return string.Empty;
        }
        catch (InvalidOperationException ex)
        {
            return ex.ToString();
        }
    }

    // TASK 1: keep the calls genuinely asynchronous so the runtime has async frames to rebuild.
    private static async Task ReceiveRequestAsync(string orderId)
    {
        await Task.Yield();
        await LoadOrderAsync(orderId);
    }

    // TASK 2: preserve source-shaped method names through a chain deeper than a single await.
    private static async Task LoadOrderAsync(string orderId)
    {
        await Task.Delay(1);
        await CalculateTotalsAsync(orderId);
    }

    // TASK 3: mix Task.Yield with real awaits; either one alone makes a less useful comparison.
    private static async Task CalculateTotalsAsync(string orderId)
    {
        await Task.Yield();
        await WriteAuditRecordAsync(orderId);
    }

    // TASK 4: let the exception propagate naturally. Re-throwing would create a different lesson.
    private static async Task WriteAuditRecordAsync(string orderId)
    {
        await Task.Delay(1);
        await PersistAsync(orderId);
    }

    private static async Task PersistAsync(string orderId)
    {
        await Task.Yield();
        // TODO: throw InvalidOperationException with the order id so the stack trace can be inspected.
    }
}
