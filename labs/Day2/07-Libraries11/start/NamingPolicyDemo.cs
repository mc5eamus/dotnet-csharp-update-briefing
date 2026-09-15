using System.Text.Json;
using System.Text.Json.Serialization;

namespace Lab07;

public sealed record Attendee(string firstName, [property: JsonPropertyName("surname")] string lastName);

public static class NamingPolicyDemo
{
    // TASK 3: PascalCase is global; JsonPropertyName still wins for a specific member.
    public static string SerializeAttendee()
    {
        var options = new JsonSerializerOptions
        {
            // TODO: use JsonNamingPolicy.PascalCase.
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        };
        return JsonSerializer.Serialize(new Attendee("Ada", "Lovelace"), options);
    }
}
