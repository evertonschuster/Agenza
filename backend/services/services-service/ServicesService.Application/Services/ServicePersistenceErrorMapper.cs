using Admin.SharedKernel;
using Microsoft.Extensions.Logging;
using ServicesService.Application.Abstractions;

namespace ServicesService.Application.Services;

public static class ServicePersistenceErrorMapper
{
    private const string NameConstraint = "IX_Services_TenantId_NameNormalized";
    private const string CodeConstraint = "IX_Services_TenantId_Code";

    public static Error Map(PersistenceError error, string name, ILogger logger)
    {
        switch (error.ConstraintName)
        {
            case NameConstraint:
                return Error.Conflict("Service.DuplicateName", $"Já existe um serviço chamado '{name}'.");
            case CodeConstraint:
                return Error.Conflict(
                    "Service.DuplicateCode",
                    "O código gerado para o serviço já está em uso. Tente novamente.");
            default:
                logger.LogError(
                    "Unrecognized unique constraint {ConstraintName} violated while saving a Service",
                    error.ConstraintName);
                return Error.Conflict(
                    "Service.DuplicateConflict",
                    "Não foi possível salvar o serviço devido a um conflito de dados.");
        }
    }
}
