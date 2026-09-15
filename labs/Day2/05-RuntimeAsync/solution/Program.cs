using Lab05;

Console.WriteLine("Lab 05 - Runtime-native async");
Console.WriteLine(new string('=', 52));

Check.Section("Captured stack trace (TASK 1-4)");
var trace = await AsyncDemo.CaptureStackTraceAsync();
Console.WriteLine(string.IsNullOrEmpty(trace) ? "    No exception was captured yet." : trace);

Check.That("The async exception propagates to the top-level catcher", trace.Contains("InvalidOperationException"));
Check.That("The deepest source method is visible", trace.Contains("PersistAsync"));
Check.That("The middle source method is visible", trace.Contains("CalculateTotalsAsync"));
Check.That("The entry source method is visible", trace.Contains("ReceiveRequestAsync"));
Check.That("The trace does not rely on an exact frame count", trace.Split(Environment.NewLine).Length >= 4);

return Check.Summary();
