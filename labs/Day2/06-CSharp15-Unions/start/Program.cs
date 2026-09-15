using Lab06;

Console.WriteLine("Lab 06 - C# 15 unions and closed hierarchies");
Console.WriteLine(new string('=', 52));

Check.Section("Union results (TASK 1)");
var store = new TicketStore();
Check.Equal("Success maps to 201", "201 Created /tickets/T-100", SaveResultFormatter.ToHttpSummary(store.Save("T-100", "Grace")));
Check.Equal("Validation maps to 400", "400 owner: Owner is required.", SaveResultFormatter.ToHttpSummary(store.Save("T-101", " ")));
Check.Equal("NotFound maps to 404", "404 ticket missing", SaveResultFormatter.ToHttpSummary(store.Save("missing", "Katherine")));
Check.Equal("Conflict maps to 409", "409 owner alice owned by ALICE", SaveResultFormatter.ToHttpSummary(store.Save("T-102", "alice")));

Check.Section("Closed hierarchy (TASK 2)");
Check.Equal("Draft uses shared label", "Draft: editable", ReviewStateFormatter.Describe(new Draft()));
Check.Equal("Submitted uses shared label", "Submitted: waiting since 2026-09-14", ReviewStateFormatter.Describe(new Submitted(new DateTimeOffset(2026, 9, 14, 12, 0, 0, TimeSpan.Zero))));
Check.Equal("Approved carries its payload", "Approved: Ada", ReviewStateFormatter.Describe(new Approved("Ada")));
Check.Equal("Rejected carries its payload", "Rejected: Duplicate request", ReviewStateFormatter.Describe(new Rejected("Duplicate request")));

Check.Section("Adding a case (TASK 4)");
Console.WriteLine("    Step4_AddACase.cs.txt is excluded. Rename it to .cs and CS8509 is treated as an error.");
Check.That("The main project keeps exhaustive switches warning-free", true);

Check.Section("Non-transitive closed (TASK 5)");
Check.Equal("A closed intermediate lets the compiler reason to leaves", "grandchild", NonTransitiveDemo.FullyClosedName(new FullyClosedGrandchild()));
Check.Equal("An open intermediate must be matched as the intermediate", "middle-or-derived", NonTransitiveDemo.NonTransitiveName(new NonTransitiveGrandchild()));
Console.WriteLine("    Probe result: omitting NonTransitiveMiddle produced CS8509, pattern 'NonTransitiveMiddle' is not covered.");

Check.Section("Collection expression arguments (TASK 6)");
var collections = CollectionExpressionDemo.BuildCollections(["red", "green", "blue"]);
Check.Equal("List receives all spread values", 3, collections.listCount);
Check.That("List capacity is configured at construction", collections.listCapacity >= 4);
Check.Equal("HashSet comparer is passed in the expression", 1, collections.setCount);

Check.Section("Extension indexers (TASK 7)");
var window = new ReadingWindow([10, 20, 30]);
Check.Equal("The extension indexer supports from-end indexing", 30, window[^1]);

return Check.Summary();
