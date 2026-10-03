using System.Linq.Expressions;
using System.Reflection;
using Microsoft.EntityFrameworkCore;

namespace Admin.SharedKernel.EntityFrameworkCore;

public static class ModelBuilderExtensions
{
    internal const string SoftDeleteFilter = "SoftDelete";
    internal const string TenantFilter = "Tenant";

    private const string DeletedAtPropertyName = "DeletedAt";
    private const string TenantIdPropertyName = "TenantId";
    private const string CurrentTenantIdPropertyName = "CurrentTenantId";

    public static void ApplyAuditableConventions(
        this ModelBuilder modelBuilder,
        DbContext dbContext,
        Type baseEntityType,
        Type? tenantOwnedType = null)
    {
        foreach (var entityType in EntityTypesAssignableTo(modelBuilder, baseEntityType))
        {
            var entityBuilder = modelBuilder.Entity(entityType);
            entityBuilder.HasQueryFilter(SoftDeleteFilter, BuildSoftDeleteFilter(entityType));
            entityBuilder.HasIndex(DeletedAtPropertyName);
        }

        if (tenantOwnedType is null)
        {
            return;
        }

        var currentTenantIdProperty = dbContext.GetType().GetProperty(CurrentTenantIdPropertyName)
            ?? throw new InvalidOperationException(
                $"{dbContext.GetType().Name} must expose a public '{CurrentTenantIdPropertyName}' property to scope {tenantOwnedType.Name} entities.");

        foreach (var entityType in EntityTypesAssignableTo(modelBuilder, baseEntityType, tenantOwnedType))
        {
            var entityBuilder = modelBuilder.Entity(entityType);
            entityBuilder.HasQueryFilter(TenantFilter, BuildTenantFilter(dbContext, entityType, currentTenantIdProperty));
            entityBuilder.HasIndex(TenantIdPropertyName);
        }
    }

    private static List<Type> EntityTypesAssignableTo(ModelBuilder modelBuilder, params Type[] types)
    {
        return modelBuilder.Model.GetEntityTypes()
            .Select(entityType => entityType.ClrType)
            .Where(clrType => types.All(type => type.IsAssignableFrom(clrType)))
            .ToList();
    }

    private static LambdaExpression BuildSoftDeleteFilter(Type entityType)
    {
        var parameter = Expression.Parameter(entityType, "entity");
        var deletedAt = Expression.Property(parameter, DeletedAtPropertyName);

        return Expression.Lambda(Expression.Equal(deletedAt, Expression.Constant(null, typeof(DateTimeOffset?))), parameter);
    }

    private static LambdaExpression BuildTenantFilter(DbContext dbContext, Type entityType, PropertyInfo currentTenantIdProperty)
    {
        // Must reference the live DbContext instance, not a snapshotted
        // value: EF Core caches the compiled model per DbContext type,
        // so a plain Guid constant here would get baked in once and
        // reused by every request. A `this`-instance property access
        // is the one thing EF re-evaluates against the actual context
        // executing each query.
        var parameter = Expression.Parameter(entityType, "entity");
        var contextConstant = Expression.Constant(dbContext, dbContext.GetType());
        var currentTenantId = Expression.Property(contextConstant, currentTenantIdProperty);
        var tenantId = Expression.Property(parameter, TenantIdPropertyName);

        return Expression.Lambda(Expression.Equal(tenantId, currentTenantId), parameter);
    }
}
