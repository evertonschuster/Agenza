using Admin.SharedKernel;
using Microsoft.Extensions.Logging;
using ServicesService.Application.Abstractions;

namespace ServicesService.Application.Tags;

public static class TagPersistenceErrorMapper
{
    private const string NameConstraint = "IX_Tags_TenantId_NameNormalized";

    public static Error Map(PersistenceError error, string name, ILogger logger)
    {
        if (error.ConstraintName == NameConstraint)
        {
            return Error.Conflict("Tag.DuplicateName", $"Já existe uma etiqueta chamada '{name}'.");
        }

        logger.LogError(
            "Unrecognized unique constraint {ConstraintName} violated while saving a Tag",
            error.ConstraintName);
        return Error.Conflict(
            "Tag.DuplicateConflict",
            "Não foi possível salvar a etiqueta devido a um conflito de dados.");
    }
}
