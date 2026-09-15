# Lab 02 - PQC and JSON hardening

## Goal
Use the .NET 10 post-quantum cryptography APIs safely, then harden JSON parsing so a hostile payload cannot rely on parser differences.

## Estimated time
30 minutes.

## Prerequisites
.NET SDK 10.0.300 or later. No NuGet packages are used.

## How to run

```powershell
cd start
dotnet run
```

The start project compiles and runs. Some checks fail until you complete the tasks.

## Tasks
1. Print the support matrix for ML-KEM, ML-DSA, SLH-DSA, and Composite ML-DSA. Keep SLH-DSA and Composite ML-DSA inside the `SYSLIB5006` pragma.
2. Generate an ML-KEM-768 recipient key, encapsulate a secret with the public key, decapsulate it, and compare the two shared secrets.
3. Sign data with ML-DSA-65, verify it, verify that a tampered payload fails, and verify through an imported SubjectPublicKeyInfo public key.
4. Configure `System.Text.Json` with `AllowDuplicateProperties = false` and strict unmapped-member handling. The duplicated `role` field is not a typo; it is the attack.
5. Print the measured public-key, ciphertext, shared-secret, and signature sizes.

## Hints
- Key encapsulation is not encryption. ML-KEM agrees a shared secret; it does not decrypt application data.
- Every PQC operation is behind `IsSupported`. A missing algorithm is a clean skip, not a crash.
- Use `CryptographicOperations.FixedTimeEquals` for secret comparisons.
- On SDK 10.0.300, the ML-DSA SPKI import/export helpers still emit `SYSLIB5006`. Keep that suppression narrow.

## What good looks like
The solution prints a support matrix, ML-KEM sizes around 1184/1088/32 bytes on this machine, an ML-DSA-65 signature around 3309 bytes, and ends with:

```text
  All checks passed.
```

See `solution/` for the completed version.
