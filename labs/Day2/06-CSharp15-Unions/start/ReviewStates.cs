namespace Lab06;

public closed record class ReviewState(string Code, string Label);
public sealed record class Draft() : ReviewState("draft", "Draft");
public sealed record class Submitted(DateTimeOffset SubmittedAt) : ReviewState("submitted", "Submitted");
public sealed record class Approved(string Approver) : ReviewState("approved", "Approved");
public sealed record class Rejected(string Reason) : ReviewState("rejected", "Rejected");

public static class ReviewStateFormatter
{
    // TASK 2: closed hierarchies fit related types that share members.
    // TASK 3: use those shared members in the arms instead of duplicating literals.
    public static string Describe(ReviewState state)
        => state switch
        {
            Draft draft => $"{draft.Label}: editable",
            Submitted submitted => $"{submitted.Label}: waiting since {submitted.SubmittedAt:yyyy-MM-dd}",
            Approved approved => $"{approved.Label}: {approved.Approver}",
            Rejected => "Rejected" // TODO: include the shared label and the reason, as the other cases do
        };
}

public closed record class FullyClosedRoot;
public sealed record class FullyClosedLeaf : FullyClosedRoot;
public closed record class FullyClosedMiddle : FullyClosedRoot;
public sealed record class FullyClosedGrandchild : FullyClosedMiddle;

public closed record class NonTransitiveRoot;
public sealed record class NonTransitiveLeaf : NonTransitiveRoot;
public record class NonTransitiveMiddle : NonTransitiveRoot;
public sealed record class NonTransitiveGrandchild : NonTransitiveMiddle;

public static class NonTransitiveDemo
{
    // TASK 5: `closed` is not transitive; the intermediate type must opt in too.
    public static string FullyClosedName(FullyClosedRoot value)
        => value switch
        {
            FullyClosedLeaf => "leaf",
            FullyClosedGrandchild => "grandchild"
        };

    public static string NonTransitiveName(NonTransitiveRoot value)
        => value switch
        {
            NonTransitiveLeaf => "leaf",
            NonTransitiveMiddle => "middle-or-derived"
        };
}
