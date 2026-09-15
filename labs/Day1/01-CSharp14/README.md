# Lab 01 &middot; C# 14 in anger

**Day 1 &middot; Module 2** &middot; ~35 minutes

## Goal

Take a small order-processing model written in C# 13 style and modernise it with
C# 14. Every task is a change you would actually make in production code, and a
test asserts that behaviour is unchanged afterwards.

The last task is different: it is a trap that will bite you during your own
upgrade, and you are asked to observe it rather than fix it.

## Run it

```bash
cd labs/Day1/01-CSharp14/start
dotnet run
```

You should see 21 passing checks before you change anything. The starting code
already works &mdash; you are refactoring, not repairing. Re-run after each task;
if a check fails, your change altered behaviour.

## Tasks

### TASK 1 &mdash; the `field` keyword

Files: `Money.cs`, `Order.cs`

Every property with validation currently declares its own backing field. Remove
those fields and use the `field` keyword inside the accessor instead.

Look for the pattern: a `private` field used by exactly one property and nothing
else.

### TASK 2 &mdash; convert helpers to an `extension` block

File: `OrderHelpers.cs`

`OrderHelpers` is a classic static class of `this`-parameter extension methods.
Convert it to a C# 14 `extension(Order order)` block.

While you are there, decide which members should become extension
**properties** rather than methods. Convert at least two. The rule of thumb:
*takes no arguments and reads like state* &rarr; property.

> This changes call sites. `order.IsEmpty()` becomes `order.IsEmpty`. The
> compiler will point at every one.

### TASK 3 &mdash; a static extension member

File: `OrderHelpers.cs`

Add `Order.Empty`, which returns a new empty order. It hangs off the *type*, not
an instance, so it needs its own block with an unnamed receiver:

```csharp
extension(Order)          // no parameter name
{
    public static Order Empty => new Order();
}
```

Then uncomment the `Order.Empty` check in `Program.cs`.

### TASK 4 &mdash; null-conditional assignment

File: `Program.cs`

Three helper methods at the bottom of the file guard an assignment with an
`if (… is not null)`. C# 14 lets the null-conditional operator appear on the
left of an assignment, so all three collapse to one line.

One of them is a *compound* assignment. That works too &mdash; and the
right-hand side is not evaluated when the target is null.

### TASK 5 &mdash; a user-defined compound assignment operator

File: `Money.cs`

`Money` defines `operator +`, so `total += item` already compiles &mdash; the
compiler synthesises it as `total = total + item`, constructing and copying a
new value each time. Give `Money` an in-place `+=` instead.

The shape is easy to get wrong. It is an **instance** member, it takes only the
right-hand operand, and it returns `void`:

```csharp
public void operator +=(Money right) => Amount += right.Amount;
```

Not `static`. No left-hand parameter. If you write the static form you get
**CS1020: Overloadable binary operator expected**.

### TASK 6 &mdash; the `field` trap (read, do not fix)

File: `DispatchCounter.cs`

This type has a property with an accessor *and* a member genuinely named
`field`. Run the project and read the output.

Under C# 13 these were the same storage. Under C# 14 they are not: inside an
accessor, `field` now binds to the compiler-generated backing field, so
`Reset()` silently writes to the wrong place. This compiles, and it compiles
with a warning you can easily miss.

Leave it broken. It is the exhibit for the upgrade-risk discussion that follows.

## Hints

<details>
<summary>TASK 1 &mdash; what happens to the initialiser?</summary>

A property using `field` can still have an initialiser:

```csharp
public string Sku
{
    get;
    set => field = value?.Trim().ToUpperInvariant() ?? string.Empty;
} = string.Empty;
```

The `= string.Empty` goes after the closing brace, and it initialises the
backing field directly &mdash; the setter does not run.
</details>

<details>
<summary>TASK 2 &mdash; do I repeat `this`?</summary>

No. That is the point. The receiver is declared once on the block:

```csharp
extension(Order order)
{
    public bool IsEmpty => order.Lines.Count == 0;
    public string Describe() => $"{order.Reference}: …";
}
```

Inside the block, `order` is just in scope.
</details>

<details>
<summary>TASK 4 &mdash; what does the syntax look like?</summary>

```csharp
customer.CurrentOrder?.Reference = reference;
line?.Quantity += extra;
```

No `if`, no temporary. Expression-bodied methods work fine.
</details>

## What good looks like

- `dotnet run` prints **22 passed, 0 failed** (21 before TASK 3 is uncommented).
- No `private` backing field remains in `Money.cs` or `Order.cs`.
- `OrderHelpers` contains no `this` parameters.
- No `if (… is not null)` remains around a bare assignment in `Program.cs`.
- `DispatchCounter.cs` is **unchanged** and the build still reports 2 CS9258
  warnings.

> Warnings only appear on a fresh build. MSBuild does not replay them for an
> up-to-date project, so use `dotnet build --no-incremental` if you want to see
> them again.

## Solution

`solution/` contains the finished version. Run it the same way:

```bash
cd labs/Day1/01-CSharp14/solution
dotnet run
```

Diff it against your own work &mdash; particularly `OrderHelpers.cs`, where the
choice of *property vs method* is a judgement call and the solution explains
its reasoning in comments.
