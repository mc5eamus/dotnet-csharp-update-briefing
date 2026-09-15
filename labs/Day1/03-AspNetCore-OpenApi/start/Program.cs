using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Validation;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddOpenApi();
builder.Services.AddValidation();

var catalogue = new List<CatalogueItem>
{
    new(1, "Workshop mug", "Merch", 12.50m),
    new(2, ".NET notebook", "Stationery", 7.25m)
};
builder.Services.AddSingleton(catalogue);

var app = builder.Build();
app.MapOpenApi();

app.MapGet("/", () => Results.Redirect("/openapi/v1.json"));
app.MapGet("/catalogue", CatalogHandlers.List)
   .WithName("ListCatalogue")
   .WithSummary("List catalogue items.")
   .WithDescription("Returns the current in-memory catalogue.");
app.MapGet("/catalogue/{id:int}", CatalogHandlers.GetById)
   .WithName("GetCatalogueItem")
   .WithSummary("Get one catalogue item.")
   .WithDescription("Returns one item when the id exists.");

// TASK 1: add a validated POST /catalogue endpoint that accepts
// CreateCatalogueItemRequest and returns 201 Created when validation passes.

// TASK 4: add GET /catalogue/events as a short server-sent event stream.

app.Run();

/// <summary>Handlers for the in-memory catalogue API.</summary>
static class CatalogHandlers
{
    /// <summary>List catalogue items.</summary>
    /// <remarks>The list lives in memory so tomorrow's migration has no storage baggage.</remarks>
    [ProducesResponseType(typeof(CatalogueItem[]), StatusCodes.Status200OK, Description = "The current catalogue.")]
    public static Ok<CatalogueItem[]> List(List<CatalogueItem> catalogue)
        => TypedResults.Ok(catalogue.ToArray());

    /// <summary>Get a catalogue item by id.</summary>
    [ProducesResponseType(typeof(CatalogueItem), StatusCodes.Status200OK, Description = "The requested catalogue item.")]
    [ProducesResponseType(StatusCodes.Status404NotFound, Description = "No catalogue item has that id.")]
    public static Results<Ok<CatalogueItem>, NotFound> GetById(int id, List<CatalogueItem> catalogue)
    {
        var item = catalogue.FirstOrDefault(candidate => candidate.Id == id);
        return item is null ? TypedResults.NotFound() : TypedResults.Ok(item);
    }
}

/// <summary>A catalogue item returned by the API.</summary>
public sealed record CatalogueItem(int Id, string Name, string Category, decimal Price);

/// <summary>The request body used to create a catalogue item.</summary>
public sealed class CreateCatalogueItemRequest
{
    // TASK 2: document the request DTO with XML comments so OpenAPI can carry them.
    [Required]
    [StringLength(80, MinimumLength = 3)]
    public string Name { get; init; } = string.Empty;

    [Required]
    [StringLength(40, MinimumLength = 2)]
    public string Category { get; init; } = string.Empty;

    [Range(0.01, 10_000)]
    public decimal Price { get; init; }
}

// TASK 3: confirm the XML comments appear in /openapi/v1.json.

