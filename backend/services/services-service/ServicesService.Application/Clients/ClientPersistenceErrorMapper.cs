using Admin.SharedKernel;
using Microsoft.Extensions.Logging;
using ServicesService.Application.Abstractions;

namespace ServicesService.Application.Clients;

public static class ClientPersistenceErrorMapper
{
    public const string CpfConstraint = "IX_Clients_TenantId_Cpf";
    public const string EmailConstraint = "IX_Clients_TenantId_Email";

    public static Error Map(PersistenceError error, ILogger logger)
    {
        switch (error.ConstraintName)
        {
            case CpfConstraint:
                return ClientConflicts.Cpf(null);
            case EmailConstraint:
                return ClientConflicts.Email();
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
