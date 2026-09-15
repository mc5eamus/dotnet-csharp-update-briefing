using System.Runtime.CompilerServices;

const int Warm = 400_000;
const int Iter = 2_000_000;

long sink = 0;
for (int i = 0; i < Warm; i++) { sink += ConstIndex(i); sink += VarIndex(i); sink += Escapes(i)[0]; }
Thread.Sleep(600);
for (int i = 0; i < Warm; i++) { sink += ConstIndex(i); sink += VarIndex(i); sink += Escapes(i)[0]; }

Console.WriteLine($"runtime {Environment.Version}");
Console.WriteLine($"  const-index, no escape : {Measure(() => ConstIndex(1)):F2} bytes/call");
Console.WriteLine($"  var-index loop         : {Measure(() => VarIndex(1)):F2} bytes/call");
Console.WriteLine($"  returned (escapes)     : {Measure(() => Escapes(1)[0]):F2} bytes/call");
Console.WriteLine($"  (sink {sink & 0xFF})");

static double Measure(Func<int> f)
{
    GC.Collect();
    GC.WaitForPendingFinalizers();
    long before = GC.GetAllocatedBytesForCurrentThread();
    long acc = 0;
    for (int i = 0; i < Iter; i++) acc += f();
    long after = GC.GetAllocatedBytesForCurrentThread();
    GC.KeepAlive(acc);
    return (after - before) / (double)Iter;
}

[MethodImpl(MethodImplOptions.NoInlining)]
static int ConstIndex(int seed)
{
    int[] a = new int[4];
    a[0] = seed; a[1] = seed + 1; a[2] = seed + 2; a[3] = seed + 3;
    return a[0] + a[1] + a[2] + a[3];
}

[MethodImpl(MethodImplOptions.NoInlining)]
static int VarIndex(int seed)
{
    int[] a = new int[4];
    a[0] = seed; a[1] = seed + 1; a[2] = seed + 2; a[3] = seed + 3;
    int s = 0;
    for (int i = 0; i < a.Length; i++) s += a[i];
    return s;
}

[MethodImpl(MethodImplOptions.NoInlining)]
static int[] Escapes(int seed)
{
    int[] a = new int[4];
    a[0] = seed; a[1] = seed + 1; a[2] = seed + 2; a[3] = seed + 3;
    return a;
}
