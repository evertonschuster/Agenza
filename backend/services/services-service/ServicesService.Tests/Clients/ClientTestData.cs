using ServicesService.Domain.Entities;
using ServicesService.Domain.ValueObjects;

namespace ServicesService.Tests.Clients;

internal static class ClientTestData
{
    public static readonly DateOnly Today = new(2026, 10, 2);

    public const string ValidCpf = "529.982.247-25";
    public const string ValidCpfDigits = "52998224725";
    public const string OtherValidCpf = "123.456.789-09";

    public static FullName Name(string value = "Maria Souza")
    {
        return FullName.Create(value).Value;
    }

    public static CpfNumber Cpf(string value = ValidCpf)
    {
        return CpfNumber.Create(value).Value!;
    }

    public static EmailAddress Email(string value = "maria@example.com")
    {
        return EmailAddress.Create(value).Value!;
    }

    public static PhoneNumber Phone(string value = "(11) 99999-0000")
    {
        return PhoneNumber.Create(value).Value!;
    }

    public static ClientGuardian Guardian(string name = "Ana Souza", string relationship = "Mãe") =>
        ClientGuardian.Create(Guid.NewGuid(), name, relationship, null, null).Value;

    public static ClientReferenceContact ReferenceContact(params string[] purposes) =>
        ClientReferenceContact.Create(
            Guid.NewGuid(),
            "Carlos Lima",
            "Tio",
            null,
            purposes.Length == 0 ? ["emergency"] : purposes).Value;

    public static Client ExistingClient()
    {
        return Client.Create(Guid.NewGuid(), Name("Paula Rocha"), null, null, null, Cpf(), null, Today, [], []).Value;
    }
}

internal sealed class FixedTimeProvider(DateTimeOffset utcNow) : TimeProvider
{
    public override DateTimeOffset GetUtcNow() => utcNow;
}
