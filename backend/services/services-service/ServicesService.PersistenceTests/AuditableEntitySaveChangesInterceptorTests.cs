using System.Security.Claims;
using Admin.Identity.Client;
using Admin.SharedKernel;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using ServicesService.Application.Abstractions;
using ServicesService.Infrastructure.Persistence;
using ServicesService.Infrastructure.Persistence.Interceptors;
using ServicesService.Infrastructure.Security;

namespace ServicesService.PersistenceTests;

public class AuditableEntitySaveChangesInterceptorTests
{
    private static ServicesDataContext CreateContext(string databaseName, ICurrentTenantProvider currentTenantProvider,
        ICurrentUserAccessor? currentUserAccessor = null)
    {
        if (currentUserAccessor is null)
        {
            currentUserAccessor = Substitute.For<ICurrentUserAccessor>();
            currentUserAccessor.UserId.Returns((Guid?)Guid.NewGuid());
        }
        var interceptor = new AuditableEntitySaveChangesInterceptor(
            currentUserAccessor, currentTenantProvider, TimeProvider.System);

        var options = new DbContextOptionsBuilder<ServicesDataContext>()
            .UseInMemoryDatabase(databaseName)
            .AddInterceptors(interceptor)
            .Options;

        return new ServicesDataContext(options, currentTenantProvider);
    }

    private static ICurrentTenantProvider TenantProvider(Guid tenantId)
    {
        var provider = Substitute.For<ICurrentTenantProvider>();
        provider.TryGetTenantId(out Arg.Any<Guid>()).Returns(callInfo =>
        {
            callInfo[0] = tenantId;
            return true;
        });
        provider.TenantId.Returns(tenantId);
        return provider;
    }

    private static Service ValidService() =>
        Service.Create(
            Guid.NewGuid(), "Haircut", null, DurationRange.Create(15, 30, 60).Value, 45.50m, 10m, null, 1).Value;

    [Fact]
    public async Task SaveChangesAsync_WithNewTenantOwnedEntity_AssignsTheCurrentTenant()
    {
        var tenantId = Guid.NewGuid();
        await using var context = CreateContext(Guid.NewGuid().ToString(), TenantProvider(tenantId));
        var service = ValidService();

        context.Services.Add(service);
        await context.SaveChangesAsync(TestContext.Current.CancellationToken);

        service.TenantId.Should().Be(tenantId);
    }

    [Fact]
    public async Task SaveChangesAsync_WithNoTenantAvailable_ThrowsAndDoesNotPersist()
    {
        var provider = Substitute.For<ICurrentTenantProvider>();
        provider.TryGetTenantId(out Arg.Any<Guid>()).Returns(false);
        await using var context = CreateContext(Guid.NewGuid().ToString(), provider);
        context.Services.Add(ValidService());

        var act = async () => await context.SaveChangesAsync();

        await act.Should().ThrowAsync<InvalidOperationException>();
    }

    [Fact]
    public async Task SaveChangesAsync_WithNewEntity_StampsCreatedAtAndCreatedBy()
    {
        await using var context = CreateContext(Guid.NewGuid().ToString(), TenantProvider(Guid.NewGuid()));
        var service = ValidService();

        context.Services.Add(service);
        await context.SaveChangesAsync(TestContext.Current.CancellationToken);

        service.CreatedAt.Should().NotBe(default);
        service.CreatedBy.Should().NotBeNull();
    }

    [Fact]
    public async Task Gravacao_de_etiqueta_usa_empresa_e_autor_das_claims_do_usuario()
    {
        var tenantId = Guid.NewGuid();
        var otherTenantId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var httpContext = new DefaultHttpContext
        {
            User = new ClaimsPrincipal(new ClaimsIdentity(
                [new Claim("tenant_id", tenantId.ToString()), new Claim("sub", userId.ToString())], "Bearer")),
        };
        httpContext.Request.Headers["X-Tenant-Id"] = otherTenantId.ToString();
        var http = Substitute.For<IHttpContextAccessor>();
        http.HttpContext.Returns(httpContext);
        var tenantProvider = new CurrentTenantProvider(new HttpContextTenantAccessor(http));
        var databaseName = Guid.NewGuid().ToString();
        var cancellationToken = TestContext.Current.CancellationToken;
        await using var context = CreateContext(databaseName, tenantProvider, new HttpContextCurrentUserAccessor(http));
        var tag = Tag.Create(Guid.NewGuid(), "VIP", TagColor.Create("#0d9488").Value, null).Value;

        context.Tags.Add(tag);
        await context.SaveChangesAsync(cancellationToken);
        context.ChangeTracker.Clear();

        var saved = await context.Tags.SingleAsync(cancellationToken);
        saved.TenantId.Should().Be(tenantId);
        saved.CreatedBy.Should().Be(userId);
        await using var otherContext = CreateContext(databaseName, TenantProvider(otherTenantId));
        (await otherContext.Tags.AnyAsync(cancellationToken)).Should().BeFalse();
    }

    [Fact]
    public async Task Remove_ThenSaveChangesAsync_SoftDeletesInsteadOfRemovingTheRow()
    {
        var tenantId = Guid.NewGuid();
        var databaseName = Guid.NewGuid().ToString();
        var service = ValidService();

        await using (var context = CreateContext(databaseName, TenantProvider(tenantId)))
        {
            context.Services.Add(service);
            await context.SaveChangesAsync(TestContext.Current.CancellationToken);
        }

        await using (var context = CreateContext(databaseName, TenantProvider(tenantId)))
        {
            var tracked = await context.Services.SingleAsync(s => s.Id == service.Id, TestContext.Current.CancellationToken);
            context.Services.Remove(tracked);
            await context.SaveChangesAsync(TestContext.Current.CancellationToken);
        }

        await using (var context = CreateContext(databaseName, TenantProvider(tenantId)))
        {
            (await context.Services.IgnoreQueryFilters().SingleAsync(s => s.Id == service.Id, TestContext.Current.CancellationToken)).IsDeleted.Should().BeTrue();
            (await context.Services.AnyAsync(s => s.Id == service.Id, TestContext.Current.CancellationToken)).Should().BeFalse();
        }
    }
}
