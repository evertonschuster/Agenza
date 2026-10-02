using Admin.SharedKernel;
using ServicesService.Application.Abstractions;

namespace ServicesService.Application.Clients;

public static class ClientConflicts
{
    public const string DuplicateCpfCode = "Client.DuplicateCpf";
    public const string DuplicateEmailCode = "Client.DuplicateEmail";
    public const string CpfField = "Cpf";
    public const string EmailField = "Email";
    public const string ExistingClientIdKey = "clientId";

    // A deleted client cannot be opened, so only a live match carries the id the UI links to.
    public static FieldError DuplicateCpf(ClientCpfMatch? match) =>
        match is { IsDeleted: true }
            ? new FieldError(DuplicateCpfCode, "Este CPF pertence a um cadastro excluído e não pode ser usado em um novo cadastro.")
            : new FieldError(
                DuplicateCpfCode,
                "Já existe uma pessoa cadastrada com este CPF.",
                match is null
                    ? null
                    : new Dictionary<string, string> { [ExistingClientIdKey] = match.ClientId.ToString() });

    public static FieldError DuplicateEmail() =>
        new(DuplicateEmailCode, "Já existe uma pessoa ativa cadastrada com este e-mail.");

    public static Error ToError(IReadOnlyDictionary<string, IReadOnlyList<FieldError>> fieldErrors)
    {
        var first = fieldErrors.Values.First()[0];
        return new Error(first.Code, first.Message, ErrorType.Conflict, fieldErrors);
    }
}
