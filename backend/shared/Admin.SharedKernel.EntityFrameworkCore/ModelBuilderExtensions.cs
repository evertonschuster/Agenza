using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;

namespace Admin.SharedKernel.EntityFrameworkCore;

public static class ModelBuilderExtensions
{
    private const string DeletedAtPropertyName = "DeletedAt";
    private const string TenantIdPropertyName = "TenantId";

    public static void ApplyAuditableConventions(
        this ModelBuilder modelBuilder,
        Type baseEntityType,
        Type? tenantOwnedType = null,
        Guid? currentTenantId = null)
    {
        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            if (!baseEntityType.IsAssignableFrom(entityType.ClrType))
            {
                continue;
            }

            var isTenantOwned = tenantOwnedType?.IsAssignableFrom(entityType.ClrType) ?? false;
            var entityBuilder = modelBuilder.Entity(entityType.ClrType);

            entityBuilder.HasQueryFilter(BuildFilter(entityType.ClrType, isTenantOwned, currentTenantId));
            entityBuilder.HasIndex(DeletedAtPropertyName);

            if (isTenantOwned)
            {
                entityBuilder.HasIndex(TenantIdPropertyName);
            }
        }
    }

    private static LambdaExpression BuildFilter(Type entityType, bool isTenantOwned, Guid? currentTenantId)
    {
        var parameter = Expression.Parameter(entityType, "entity");
        var deletedAt = Expression.Property(parameter, DeletedAtPropertyName);
        Expression predicate = Expression.Equal(deletedAt, Expression.Constant(null, typeof(DateTimeOffset?)));

        if (isTenantOwned)
        {
            // No tenant in context (background work, M2M) falls back to
            // Guid.Empty, which no real tenant-owned row ever has - fail
            // closed to an empty result set rather than every tenant's data.
            var tenantId = Expression.Property(parameter, TenantIdPropertyName);
            var expected = Expression.Constant(currentTenantId ?? Guid.Empty, typeof(Guid));
            predicate = Expression.AndAlso(predicate, Expression.Equal(tenantId, expected));
        }

        return Expression.Lambda(predicate, parameter);
    }
}
