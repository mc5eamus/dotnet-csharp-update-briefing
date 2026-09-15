namespace Lab06;

public sealed class ReadingWindow(IEnumerable<int> readings)
{
    public List<int> Readings { get; } = [.. readings];
}

public static class ReadingWindowExtensions
{
    extension(ReadingWindow window)
    {
        // TASK 7: extension indexers let adapter-style APIs read like native collection APIs.
        public int this[Index index] => window.Readings[index];
    }
}

public static class CollectionExpressionDemo
{
    // TASK 6: collection expression arguments configure the target collection at construction.
    public static (int listCount, int listCapacity, int setCount) BuildCollections(IEnumerable<string> values)
    {
        List<string> list = [with(capacity: 4), .. values];
        HashSet<string> set = ["Hello", "HELLO"]; // TODO: pass a comparer with collection expression arguments.
        return (list.Count, list.Capacity, set.Count);
    }
}
