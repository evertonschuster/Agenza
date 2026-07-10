using System.Linq.Expressions;
using System.Reflection;
using Microsoft.EntityFrameworkCore;

namespace Admin.SharedKernel.EntityFrameworkCore;

public static class ModelBuilderExtensions
{
    private const string DeletedAtPropertyName = "DeletedAt";
    private const string TenantIdPropertyName = "TenantId";
    private const string CurrentTenantIdPropertyName = "CurrentTenantId";

    public static void ApplyAuditableConventions(
        this ModelBuilder modelBuilder,
        DbContext dbContext,
        Type baseEntityType,
        Type? tenantOwnedType = null)
    {
        PropertyInfo? currentTenantIdProperty = null;
        if (tenantOwnedType is not null)
        {
            currentTenantIdProperty = dbContext.GetType().GetProperty(CurrentTenantIdPropertyName)
                ?? throw new InvalidOperationException(
                    $"{dbContext.GetType().Name} must expose a public '{CurrentTenantIdPropertyName}' property to scope {tenantOwnedType.Name} entities.");
        }

        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            if (!baseEntityType.IsAssignableFrom(entityType.ClrType))
            {
                continue;
            }

            var isTenantOwned = tenantOwnedType?.IsAssignableFrom(entityType.ClrType) ?? false;
            var entityBuilder = modelBuilder.Entity(entityType.ClrType);

            entityBuilder.HasQueryFilter(
                BuildFilter(dbContext, entityType.ClrType, isTenantOwned ? currentTenantIdProperty : null));
            entityBuilder.HasIndex(DeletedAtPropertyName);

            if (isTenantOwned)
            {
                entityBuilder.HasIndex(TenantIdPropertyName);
            }
        }
    }

    private static LambdaExpression BuildFilter(DbContext dbContext, Type entityType, PropertyInfo? currentTenantIdProperty)
    {
        var parameter = Expression.Parameter(entityType, "entity");
        var deletedAt = Expression.Property(parameter, DeletedAtPropertyName);
        Expression predicate = Expression.Equal(deletedAt, Expression.Constant(null, typeof(DateTimeOffset?)));

        if (currentTenantIdProperty is not null)
        {
            // Must reference the live DbContext instance, not a snapshotted
            // value: EF Core caches the compiled model per DbContext type,
            // so a plain Guid constant here would get baked in once and
            // reused by every request. A `this`-instance property access
            // is the one thing EF re-evaluates against the actual context
            // executing each query.
            var contextConstant = Expression.Constant(dbContext, dbContext.GetType());
            var currentTenantId = Expression.Property(contextConstant, currentTenantIdProperty);
            var tenantId = Expression.Property(parameter, TenantIdPropertyName);
            predicate = Expression.AndAlso(predicate, Expression.Equal(tenantId, currentTenantId));
        }

        return Expression.Lambda(predicate, parameter);
    }
}
