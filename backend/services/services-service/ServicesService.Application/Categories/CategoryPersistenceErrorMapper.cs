using Admin.SharedKernel;
using Microsoft.Extensions.Logging;
using ServicesService.Application.Abstractions;

namespace ServicesService.Application.Categories;

public static class CategoryPersistenceErrorMapper
{
    private const string NameConstraint = "IX_Categories_TenantId_NameNormalized";

    public static Error Map(PersistenceError error, string name, ILogger logger)
    {
        if (error.ConstraintName == NameConstraint)
        {
            return Error.Conflict("Category.DuplicateName", $"Já existe uma categoria chamada '{name}'.");
        }

        logger.LogError(
            "Unrecognized unique constraint {ConstraintName} violated while saving a Category",
            error.ConstraintName);
        return Error.Conflict(
            "Category.DuplicateConflict",
            "Não foi possível salvar a categoria devido a um conflito de dados.");
    }
}
