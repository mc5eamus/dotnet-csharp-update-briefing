using Lab07;
using System.Text.Json;

Console.WriteLine("Lab 07 - .NET 11 libraries");
Console.WriteLine(new string('=', 52));

Check.Section("System.Text.Json and C# unions (TASK 1)");
try
{
    var (json, item) = UnionJsonDemo.RoundTrip(new CatalogBook("978-0135957059", "CLR via C#"));
    Console.WriteLine($"    {json}");
    Check.Equal("Union serializes as the active case shape", """{"Isbn":"978-0135957059","Title":"CLR via C#"}""", json);
    Check.Equal("Union deserializes back to the right case", "book 978-0135957059: CLR via C#", UnionJsonDemo.Describe(item));
}
catch (JsonException ex)
{
    Console.WriteLine($"    {ex.GetType().Name}: {ex.Message}");
    Check.That("Union deserializes back to the right case", false);
}

Check.Section("The trap: writing works, reading does not (read the output)");

var plainJson = UnionJsonDemo.SerializeWithoutClassifier(new CatalogBook("978-0135957059", "CLR via C#"));
Console.WriteLine($"    Serialized with DEFAULT options: {plainJson}");
Check.That("A union serializes fine with default options - and emits no discriminator",
    plainJson == """{"Isbn":"978-0135957059","Title":"CLR via C#"}""");

var readError = UnionJsonDemo.TryDeserializeWithoutClassifier(plainJson);
Console.WriteLine($"    Reading it back:  {Trim(readError)}");
Check.That("...but the very same string will not deserialize without a classifier",
    readError is not null && readError.Contains("ambiguous"));

var shapeError = UnionJsonDemo.AmbiguousShapeError();
Console.WriteLine($"    Same-shape cases: {Trim(shapeError)}");
Check.That("The classifier refuses same-shape cases up front instead of guessing",
    shapeError is not null && shapeError.Contains("never be selected uniquely"));

Check.Section("LINQ FullJoin (TASK 2)");
var raw = FullJoinDemo.RawJoin();
Console.WriteLine($"    Raw:      {raw}");
Check.Equal("Unmatched int sides surface as zero", "1/0, 2/0, 3/3, 0/4", raw);
var ambiguous = FullJoinDemo.AmbiguousZeroJoin();
Console.WriteLine($"    Ambiguous: {ambiguous}");
Check.That("A real zero and a missing left side both print as 0", ambiguous.Contains("0/0") && ambiguous.Contains("0/2"));
var nullable = FullJoinDemo.NullableJoin();
Console.WriteLine($"    Nullable: {nullable}");
Check.Equal("Nullable projection makes missing sides explicit", "1/<none>, 2/<none>, 3/3, <none>/4", nullable);

Check.Section("JSON naming (TASK 3)");
var named = NamingPolicyDemo.SerializeAttendee();
Console.WriteLine($"    {named}");
Check.Equal("PascalCase applies to normal members and JsonPropertyName wins", """{"FirstName":"Ada","surname":"Lovelace"}""", named);

static string Trim(string? message)
{
    if (message is null) return "(no error)";
    var end = message.IndexOf(". ", StringComparison.Ordinal);
    return end < 0 ? message : message[..(end + 1)];
}

return Check.Summary();
