// TASK 1: retargeted to net11.0 and restored with the user-local SDK.
// TASK 2: compare the generated .NET 10 and .NET 11 OpenAPI documents, not just release notes.
// TASK 5: verify.ps1 checks both OpenAPI documents and the live SSE endpoint.

using System.ComponentModel.DataAnnotations;
using System.Runtime.CompilerServices;
using System.Text.Json;
using Microsoft.OpenApi;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Validation;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddOpenApi();
// TASK 3: the compatibility document proves the actual pinning API and output.
builder.Services.AddOpenApi("v1-compat", options =>
{
    options.OpenApiVersion = OpenApiSpecVersion.OpenApi3_1;
});
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
app.MapPost("/catalogue", CatalogHandlers.Create)
   .WithName("CreateCatalogueItem")
   .WithSummary("Create a catalogue item.")
   .WithDescription("Creates one in-memory item after Minimal API validation accepts the request body.");
app.MapGet("/catalogue/events", CatalogHandlers.Events)
   .WithName("CatalogueEvents")
   .WithSummary("Stream catalogue events.")
   .WithDescription("Sends a short server-sent event stream for command-line verification.");

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

    /// <summary>Create a catalogue item.</summary>
    /// <remarks>Validation comes from Microsoft.Extensions.Validation and the data annotations on the request DTO.</remarks>
    [ProducesResponseType(typeof(CatalogueItem), StatusCodes.Status201Created, Description = "The item was created.")]
    [ProducesResponseType(StatusCodes.Status400BadRequest, Description = "The request body failed validation.")]
    public static Created<CatalogueItem> Create(CreateCatalogueItemRequest request, List<CatalogueItem> catalogue)
    {
        var nextId = catalogue.Count == 0 ? 1 : catalogue.Max(item => item.Id) + 1;
        var item = new CatalogueItem(nextId, request.Name.Trim(), request.Category.Trim(), request.Price);
        catalogue.Add(item);
        return TypedResults.Created($"/catalogue/{item.Id}", item);
    }

    /// <summary>Stream catalogue events.</summary>
    [ProducesResponseType(StatusCodes.Status200OK, Description = "A short text/event-stream response.")]
    public static ServerSentEventsResult<string> Events()
        // TASK 4: typed SSE results advertise text/event-stream in the OpenAPI document.
        => TypedResults.ServerSentEvents(EventMessages(), eventType: "catalogue");

    private static async IAsyncEnumerable<string> EventMessages([EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        for (var index = 1; index <= 3; index++)
        {
            yield return JsonSerializer.Serialize(new { message = "catalogue heartbeat", index });
            await Task.Delay(100, cancellationToken);
        }
    }
}

/// <summary>A catalogue item returned by the API.</summary>
public sealed record CatalogueItem(int Id, string Name, string Category, decimal Price);

/// <summary>The request body used to create a catalogue item.</summary>
public sealed class CreateCatalogueItemRequest
{
    /// <summary>The display name. Short names make poor catalogue entries.</summary>
    [Required]
    [StringLength(80, MinimumLength = 3)]
    public string Name { get; init; } = string.Empty;

    /// <summary>The small category label shown in the workshop UI.</summary>
    [Required]
    [StringLength(40, MinimumLength = 2)]
    public string Category { get; init; } = string.Empty;

    /// <summary>The price in euros. Zero is a discount, not a catalogue item.</summary>
    [Range(0.01, 10_000)]
    public decimal Price { get; init; }
}

