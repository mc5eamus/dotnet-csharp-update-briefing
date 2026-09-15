namespace Lab06;

public sealed record Success(int Id, string Location);
public sealed record ValidationFailed(string Field, string Reason);
public sealed record NotFound(string Resource, string Key);
public sealed record Conflict(string Resource, string Key, string CurrentOwner);

public union SaveResult(Success, ValidationFailed, NotFound, Conflict);

public sealed class TicketStore
{
    private readonly HashSet<string> _owners = new(StringComparer.OrdinalIgnoreCase) { "ALICE" };

    public SaveResult Save(string id, string owner)
    {
        if (string.IsNullOrWhiteSpace(owner))
        {
            return new ValidationFailed(nameof(owner), "Owner is required.");
        }

        if (id == "missing")
        {
            return new NotFound("ticket", id);
        }

        if (!_owners.Add(owner.Trim().ToUpperInvariant()))
        {
            return new Conflict("owner", owner, owner.Trim().ToUpperInvariant());
        }

        return new Success(42, $"/tickets/{id}");
    }
}

public static class SaveResultFormatter
{
    // TASK 1: switch over every union case. Do not add a default arm.
    public static string ToHttpSummary(SaveResult result)
        => result switch
        {
            Success success => $"201 Created {success.Location}",
            ValidationFailed failed => $"400 {failed.Field}: {failed.Reason}",
            NotFound notFound => $"404 {notFound.Resource} {notFound.Key}",
            Conflict conflict => $"409 {conflict.Resource} {conflict.Key} owned by {conflict.CurrentOwner}"
        };
}
