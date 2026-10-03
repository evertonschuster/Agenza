using Admin.SharedKernel;
using ServicesService.Domain.Entities;

namespace ServicesService.Application.Clients;

public static class ClientConflicts
{
    public const string DuplicateCpfCode = "Client.DuplicateCpf";
    public const string DuplicateEmailCode = "Client.DuplicateEmail";
    public const string CpfField = "Cpf";
    public const string EmailField = "Email";
    public const string ExistingClientIdKey = "clientId";

    public static Error? From(Client? clientWithSameCpf, Client? activeClientWithSameEmail)
    {
        var fieldErrors = new Dictionary<string, IReadOnlyList<FieldError>>();

        if (clientWithSameCpf is not null)
        {
            fieldErrors[CpfField] = [DuplicateCpf(clientWithSameCpf)];
        }

        if (activeClientWithSameEmail is not null)
        {
            fieldErrors[EmailField] = [DuplicateEmail()];
        }

        return fieldErrors.Count == 0 ? null : ToError(fieldErrors);
    }

    public static Error Cpf(Client? clientWithSameCpf)
    {
        return ToError(new() { [CpfField] = [DuplicateCpf(clientWithSameCpf)] });
    }

    public static Error Email()
    {
        return ToError(new() { [EmailField] = [DuplicateEmail()] });
    }

    // A deleted client cannot be opened, so only a live match carries the id the UI links to.
    private static FieldError DuplicateCpf(Client? clientWithSameCpf)
    {
        if (clientWithSameCpf is not null
            && (clientWithSameCpf.IsDeleted || clientWithSameCpf.Status == ClientStatus.Deleted))
        {
            return new FieldError(
                DuplicateCpfCode,
                "Este CPF pertence a um cadastro excluído e não pode ser usado em um novo cadastro.");
        }

        const string message = "Já existe uma pessoa cadastrada com este CPF.";
        if (clientWithSameCpf is null)
        {
            return new FieldError(DuplicateCpfCode, message);
        }

        return new FieldError(
            DuplicateCpfCode,
            message,
            new Dictionary<string, string> { [ExistingClientIdKey] = clientWithSameCpf.Id.ToString() });
    }

    private static FieldError DuplicateEmail()
    {
        return new FieldError(DuplicateEmailCode, "Já existe uma pessoa ativa cadastrada com este e-mail.");
    }

    private static Error ToError(Dictionary<string, IReadOnlyList<FieldError>> fieldErrors)
    {
        var first = fieldErrors.Values.First()[0];
        return new Error(first.Code, first.Message, ErrorType.Conflict, fieldErrors);
    }
}
