using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;

namespace Admin.SharedKernel.EntityFrameworkCore;

/// <summary>
/// Applies BaseEntity's soft-delete query filter and a DeletedAt index to
/// every entity type assignable to <paramref name="baseEntityType"/> -
/// so a new entity gets both for free just by inheriting BaseEntity, no
/// per-configuration HasQueryFilter/HasIndex boilerplate (docs/adr/0006).
///
/// Takes the concrete BaseEntity type as a runtime <see cref="Type"/>
/// instead of a generic parameter because each service owns its own copy
/// of BaseEntity (Domain has zero project references, backend/CLAUDE.md)
/// - this stays framework-only, with no reference back to any service's
/// Domain. Relies on the type having a `DeletedAt` property of type
/// `DateTimeOffset?`, which is BaseEntity's contract in every service.
/// </summary>
public static class ModelBuilderExtensions
{
    private const string DeletedAtPropertyName = "DeletedAt";

    public static void ApplyAuditableConventions(this ModelBuilder modelBuilder, Type baseEntityType)
    {
        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            if (!baseEntityType.IsAssignableFrom(entityType.ClrType))
            {
                continue;
            }

            var entityBuilder = modelBuilder.Entity(entityType.ClrType);
            entityBuilder.HasQueryFilter(BuildSoftDeleteFilter(entityType.ClrType));
            entityBuilder.HasIndex(DeletedAtPropertyName);
        }
    }

    private static LambdaExpression BuildSoftDeleteFilter(Type entityType)
    {
        var parameter = Expression.Parameter(entityType, "entity");
        var deletedAt = Expression.Property(parameter, DeletedAtPropertyName);
        var isNull = Expression.Equal(deletedAt, Expression.Constant(null, typeof(DateTimeOffset?)));
        return Expression.Lambda(isNull, parameter);
    }
}
