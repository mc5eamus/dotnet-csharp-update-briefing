using System.Text.Json;
using System.Text.Json.Serialization;

namespace Lab07;

public sealed record CatalogBook(string Isbn, string Title);
public sealed record CatalogMagazine(string Issn, string Title);
public union CatalogItem(CatalogBook, CatalogMagazine);

// For the ambiguity demo below: two cases carrying exactly the same fields.
public sealed record Circle(string Colour, double Radius);
public sealed record Square(string Colour, double Radius);
public union Shape(Circle, Square);

public static class UnionJsonDemo
{
    // TASK 1: structural classification is needed for round-tripping C# unions through JSON.
    public static JsonSerializerOptions CreateOptions()
    {
        var options = new JsonSerializerOptions { WriteIndented = false };
        // TODO: add JsonUnionTypeStructuralClassifier so deserialization can choose a union case.
        return options;
    }

    public static (string json, CatalogItem item) RoundTrip(CatalogItem item)
    {
        var options = CreateOptions();
        var json = JsonSerializer.Serialize(item, options);
        var roundTripped = JsonSerializer.Deserialize<CatalogItem>(json, options);
        return (json, roundTripped);
    }

    // ---------------------------------------------------------------------
    // The following two are demonstrations, not tasks. Do not change them --
    // they exist so you can see *how* this fails, which is the whole point.
    // ---------------------------------------------------------------------

    /// <summary>
    /// Writing a union with default options succeeds, and emits the active
    /// case's own shape with no discriminator. This is the trap: the write
    /// side gives you no warning at all.
    /// </summary>
    public static string SerializeWithoutClassifier(CatalogItem item)
        => JsonSerializer.Serialize(item, new JsonSerializerOptions());

    /// <summary>
    /// Reading the very same string back fails. Returns the exception message,
    /// or null if it unexpectedly succeeded.
    /// </summary>
    public static string? TryDeserializeWithoutClassifier(string json)
    {
        try
        {
            JsonSerializer.Deserialize<CatalogItem>(json, new JsonSerializerOptions());
            return null;
        }
        catch (JsonException ex)
        {
            return ex.Message;
        }
    }

    /// <summary>
    /// The classifier infers the case from the object's *shape*, so it cannot
    /// support two cases that carry the same fields. It refuses up front rather
    /// than guessing -- and it refuses when the contract is built, which is on
    /// the first serialize, not on some later read.
    /// </summary>
    public static string? AmbiguousShapeError()
    {
        var options = new JsonSerializerOptions();
        options.TypeClassifiers.Add(new JsonUnionTypeStructuralClassifier());

        try
        {
            JsonSerializer.Serialize<Shape>(new Circle("red", 1.0), options);
            return null;
        }
        catch (NotSupportedException ex)
        {
            return ex.Message;
        }
    }

    public static string Describe(CatalogItem item)
        => item switch
        {
            CatalogBook book => $"book {book.Isbn}: {book.Title}",
            CatalogMagazine magazine => $"magazine {magazine.Issn}: {magazine.Title}"
        };
}
