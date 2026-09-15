using Lab01;

Console.WriteLine("Lab 01 - C# 14 in anger (solution)");
Console.WriteLine(new string('=', 52));

// ---------------------------------------------------------------------------
// Identical assertions to the start project. The only differences are the call
// sites that became properties, which is the point: behaviour is unchanged.
// ---------------------------------------------------------------------------

Check.Section("Properties (TASK 1 - the field keyword)");

var line = new OrderLine { Sku = "  abc-123  ", Quantity = 0, UnitPrice = new Money(2500) };
Check.Equal("Sku is trimmed and upper-cased", "ABC-123", line.Sku);
Check.Equal("Quantity below 1 is clamped to 1", 1, line.Quantity);
Check.Equal("LineTotal multiplies unit price by quantity", 2500L, line.LineTotal.Amount);

var order = new Order { Reference = "   ", Note = "   " };
Check.Equal("Blank reference falls back", "UNREFERENCED", order.Reference);
Check.That("Blank note normalises to null", order.Note is null);

order.Reference = "  SO-4471 ";
order.Note = "  leave at reception  ";
Check.Equal("Reference is trimmed", "SO-4471", order.Reference);
Check.Equal("Note is trimmed", "leave at reception", order.Note);

Check.Section("Helpers (TASK 2/3 - extension members)");

// These read as state now, not as calls.
Check.That("A new order is empty", order.IsEmpty);

order.Lines.Add(line);
order.Lines.Add(new OrderLine { Sku = "xyz-9", Quantity = 3, UnitPrice = new Money(1000) });

Check.That("An order with lines is not empty", !order.IsEmpty);
Check.Equal("ItemCount sums quantities", 4, order.ItemCount);
Check.Equal("Total sums line totals", 5500L, order.Total.Amount);
Check.That("An undispatched order reports so", !order.IsDispatched);
Check.Equal("Describe formats the order", "SO-4471: 4 item(s), 55.00", order.Describe());

order.DispatchedOn = DateTimeOffset.UtcNow;
Check.That("A dispatched order reports so", order.IsDispatched);

// TASK 3: the static extension member.
Check.That("Order.Empty returns an empty order", Order.Empty.IsEmpty);

Check.Section("Null-conditional assignment (TASK 4)");

var withOrder = new Customer { Name = "Ada", CurrentOrder = new Order() };
var withoutOrder = new Customer { Name = "Grace" };

SetReference(withOrder, "SO-1");
SetReference(withoutOrder, "SO-2");

Check.Equal("Reference is set when the order exists", "SO-1", withOrder.CurrentOrder!.Reference);
Check.That("Nothing blows up when the order is null", withoutOrder.CurrentOrder is null);

SetNote(withOrder, "  ring the bell  ");
SetNote(withoutOrder, "ignored");

Check.Equal("Note is set when the order exists", "ring the bell", withOrder.CurrentOrder!.Note);

var presentLine = new OrderLine { Sku = "q-1", Quantity = 2, UnitPrice = new Money(100) };
OrderLine? absentLine = null;

AddQuantity(presentLine, 3);
AddQuantity(absentLine, 3);

Check.Equal("Quantity accumulates through the null-conditional target", 5, presentLine.Quantity);

Check.Section("Money (TASK 5 - compound assignment)");

var running = Money.Zero;
running += new Money(1000);
running += new Money(250);
Check.Equal("+= accumulates", 1250L, running.Amount);

// ---------------------------------------------------------------------------
// The field trap. This is a demonstration, not a task - read the output.
// ---------------------------------------------------------------------------

Check.Section("The field trap (TASK 6 - read, don't fix)");

var counter = new DispatchCounter();
counter.Count = 5;
counter.Reset();

Console.WriteLine($"    After Count = 5 then Reset():  Count = {counter.Count}, " +
                  $"member 'field' = {counter.MemberValue}");
Console.WriteLine("    Under C# 13 both were 0. Under C# 14 the property and the");
Console.WriteLine("    member named 'field' are now different storage.");

Check.That("C# 14 binds `field` in an accessor to the backing field", counter.Count == 5);
Check.Equal("Reset() wrote to the member instead", 0, counter.MemberValue);

return Check.Summary();

// TASK 4: all three of these lost their null check. The assignment simply does
// not happen when the target is null, and the right-hand side is not evaluated.
static void SetReference(Customer customer, string reference)
    => customer.CurrentOrder?.Reference = reference;

static void SetNote(Customer customer, string note)
    => customer.CurrentOrder?.Note = note;

static void AddQuantity(OrderLine? line, int extra)
    => line?.Quantity += extra;
