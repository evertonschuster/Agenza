using Admin.SharedKernel;
using Microsoft.Extensions.Logging;
using ServicesService.Application.Abstractions;

namespace ServicesService.Application.Clients;

public static class ClientPersistenceErrorMapper
{
    public const string CpfConstraint = "IX_Clients_TenantId_Cpf";
    public const string EmailConstraint = "IX_Clients_TenantId_Email";

    public static Error Map(PersistenceError error, ClientCpfMatch? cpfMatch, ILogger logger)
    {
        switch (error.ConstraintName)
        {
            case CpfConstraint:
                return ClientConflicts.ToError(new Dictionary<string, IReadOnlyList<FieldError>>
                {
                    [ClientConflicts.CpfField] = [ClientConflicts.DuplicateCpf(cpfMatch)],
                });
            case EmailConstraint:
                return ClientConflicts.ToError(new Dictionary<string, IReadOnlyList<FieldError>>
                {
                    [ClientConflicts.EmailField] = [ClientConflicts.DuplicateEmail()],
                });
            default:
                logger.LogError(
                    "Unrecognized unique constraint {ConstraintName} violated while saving a Client",
                    error.ConstraintName);
                return Error.Conflict(
                    "Client.DuplicateConflict",
                    "Não foi possível salvar a pessoa devido a um conflito de dados.");
        }
    }
}
