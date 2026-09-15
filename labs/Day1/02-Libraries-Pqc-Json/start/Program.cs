using System.Security.Cryptography;
using System.Text.Json;
using System.Text.Json.Serialization;
using Lab02;

Console.WriteLine("Lab 02 - PQC and JSON hardening");
Console.WriteLine(new string('=', 52));

var support = PqcTasks.PrintSupportMatrix();

Check.Section("ML-KEM (TASK 2)");
if (support.MLKem)
{
    var result = PqcTasks.RunKemRoundTrip();
    Console.WriteLine($"    ML-KEM-768 public key: {result.PublicKeyBytes} bytes");
    Console.WriteLine($"    ML-KEM-768 ciphertext: {result.CiphertextBytes} bytes");
    Console.WriteLine($"    shared secret: {result.SharedSecretBytes} bytes");
    Check.That("Encapsulate/decapsulate gives both parties the same secret", result.SecretsMatch);
}
else
{
    Console.WriteLine("    ML-KEM is not supported on this machine; round-trip skipped.");
    Check.That("ML-KEM path is gated on IsSupported", true);
}

Check.Section("ML-DSA (TASK 3)");
if (support.MLDsa)
{
    var result = PqcTasks.RunDsaRoundTrip();
    Console.WriteLine($"    ML-DSA-65 signature: {result.SignatureBytes} bytes");
    Check.That("The signature verifies against the original payload", result.VerifiesOriginal);
    Check.That("The signature rejects a tampered payload", result.RejectsTamperedPayload);
    Check.That("An imported SPKI public key verifies the signature", result.ImportedPublicKeyVerifies);
}
else
{
    Console.WriteLine("    ML-DSA is not supported on this machine; signature checks skipped.");
    Check.That("ML-DSA path is gated on IsSupported", true);
}

Check.Section("JSON hardening (TASK 4)");
var json = PqcTasks.CheckJsonHardening();
Check.That("Duplicate JSON properties are rejected", json.RejectsDuplicateProperties);
Check.That("Unknown JSON properties are rejected", json.RejectsUnknownProperties);
Check.Equal("Strict output uses camelCase names", "{\"accountId\":\"A-100\",\"amount\":125.00,\"role\":\"user\"}", json.StrictSerializedPayload);

return Check.Summary();

internal static class PqcTasks
{
    public static PqcSupport PrintSupportMatrix()
    {
        Check.Section("Support matrix (TASK 1)");
#pragma warning disable SYSLIB5006
        var support = new PqcSupport(MLKem.IsSupported, MLDsa.IsSupported, SlhDsa.IsSupported, CompositeMLDsa.IsSupported);
#pragma warning restore SYSLIB5006

        Console.WriteLine($"    ML-KEM:           {support.MLKem}");
        Console.WriteLine($"    ML-DSA:           {support.MLDsa}");
        Console.WriteLine($"    SLH-DSA:          {support.SlhDsa}");
        Console.WriteLine($"    Composite ML-DSA: {support.CompositeMLDsa}");
        Check.That("Support is tested before PQC work starts", true);
        return support;
    }

    public static KemResult RunKemRoundTrip()
    {
        // TASK 2: generate an ML-KEM-768 recipient key, import its encapsulation
        // key for the sender, then compare both shared secrets.
        return new KemResult(0, 0, 0, false);
    }

    public static DsaResult RunDsaRoundTrip()
    {
        // TASK 3: sign the payload, reject a tampered payload, and verify with
        // a public key imported from SubjectPublicKeyInfo. On SDK 10.0.300 the
        // SPKI import/export calls still need a narrow SYSLIB5006 suppression.
        return new DsaResult(0, false, false, false);
    }

    public static JsonHardeningResult CheckJsonHardening()
    {
        // TASK 4: set AllowDuplicateProperties to false and keep the serializer
        // strict enough that parser differentials cannot choose a different role.
        var options = new JsonSerializerOptions(JsonSerializerDefaults.Web)
        {
            AllowDuplicateProperties = true,
            UnmappedMemberHandling = JsonUnmappedMemberHandling.Skip,
            WriteIndented = false
        };

        var malicious = """
            {"accountId":"A-100","amount":125.00,"role":"user","role":"admin"}
            """;
        var withUnknownProperty = """
            {"accountId":"A-100","amount":125.00,"role":"user","debug":true}
            """;

        var rejectsDuplicate = ThrowsJson(() => JsonSerializer.Deserialize<TransferRequest>(malicious, options));
        var rejectsUnknown = ThrowsJson(() => JsonSerializer.Deserialize<TransferRequest>(withUnknownProperty, options));
        var serialized = JsonSerializer.Serialize(new TransferRequest("A-100", 125.00m, "user"), options);

        return new JsonHardeningResult(rejectsDuplicate, rejectsUnknown, serialized);
    }

    private static bool ThrowsJson(Action action)
    {
        try
        {
            action();
            return false;
        }
        catch (JsonException)
        {
            return true;
        }
    }
}

internal sealed record PqcSupport(bool MLKem, bool MLDsa, bool SlhDsa, bool CompositeMLDsa);
internal sealed record KemResult(int PublicKeyBytes, int CiphertextBytes, int SharedSecretBytes, bool SecretsMatch);
internal sealed record DsaResult(int SignatureBytes, bool VerifiesOriginal, bool RejectsTamperedPayload, bool ImportedPublicKeyVerifies);
internal sealed record JsonHardeningResult(bool RejectsDuplicateProperties, bool RejectsUnknownProperties, string StrictSerializedPayload);
internal sealed record TransferRequest(string AccountId, decimal Amount, string Role);
