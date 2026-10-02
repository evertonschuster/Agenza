using ServicesService.Domain.Entities;

namespace ServicesService.Tests.Clients;

internal static class ClientTestData
{
    public static readonly DateOnly Today = new(2026, 10, 2);

    public const string ValidCpf = "529.982.247-25";
    public const string ValidCpfDigits = "52998224725";
    public const string OtherValidCpf = "123.456.789-09";

    public static ClientGuardian Guardian(string name = "Ana Souza", string relationship = "Mãe") =>
        ClientGuardian.Create(Guid.NewGuid(), name, relationship, null, null).Value;

    public static ClientReferenceContact ReferenceContact(params string[] purposes) =>
        ClientReferenceContact.Create(
            Guid.NewGuid(),
            "Carlos Lima",
            "Tio",
            null,
            purposes.Length == 0 ? ["emergency"] : purposes).Value;
}

internal sealed class FixedTimeProvider(DateTimeOffset utcNow) : TimeProvider
{
    public override DateTimeOffset GetUtcNow() => utcNow;
}
