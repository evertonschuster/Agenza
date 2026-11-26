using ServicesService.Infrastructure.Repositories;

namespace ServicesService.PersistenceTests;

public class ServiceStatusPersistenceTests
{
    private static async Task<Guid> SaveNewService(string databaseName, Guid tenantId)
    {
        var service = Service.Create(
            Guid.NewGuid(), "Limpeza", null, DurationRange.Create(15, 30, 60).Value, 120m, 10m, null, 1).Value;

        await using var context = PersistenceContext.Create(databaseName, tenantId);
        new ServiceRepository(context).Add(service);
        await context.SaveChangesAsync(TestContext.Current.CancellationToken);

        return service.Id;
    }

    private static async Task<ServiceStatus> StatusOf(string databaseName, Guid tenantId, Guid serviceId)
    {
        await using var context = PersistenceContext.Create(databaseName, tenantId);
        var service = await new ServiceRepository(context).GetByIdAsync(serviceId, CancellationToken.None);

        return service!.Status;
    }

    [Fact]
    public async Task Add_GravaOServicoComoDisponivel()
    {
        var databaseName = Guid.NewGuid().ToString();
        var tenantId = Guid.NewGuid();

        var serviceId = await SaveNewService(databaseName, tenantId);

        (await StatusOf(databaseName, tenantId, serviceId)).Should().Be(ServiceStatus.Active);
    }

    [Fact]
    public async Task UpdateAsync_PersisteAInativacaoEAReativacao()
    {
        var databaseName = Guid.NewGuid().ToString();
        var tenantId = Guid.NewGuid();
        var serviceId = await SaveNewService(databaseName, tenantId);

        await ChangeStatus(databaseName, tenantId, serviceId, service => service.Inactivate());
        (await StatusOf(databaseName, tenantId, serviceId)).Should().Be(ServiceStatus.Inactive);

        await ChangeStatus(databaseName, tenantId, serviceId, service => service.Reactivate());
        (await StatusOf(databaseName, tenantId, serviceId)).Should().Be(ServiceStatus.Active);
    }

    [Fact]
    public async Task GetByIdAsync_TrazACategoriaDoServico()
    {
        var databaseName = Guid.NewGuid().ToString();
        var tenantId = Guid.NewGuid();
        var category = Category.Create(Guid.NewGuid(), "Odontologia").Value;
        var service = Service.Create(
            Guid.NewGuid(), "Limpeza", null, DurationRange.Create(15, 30, 60).Value, 120m, 10m, category.Id, 1).Value;

        await using (var context = PersistenceContext.Create(databaseName, tenantId))
        {
            new CategoryRepository(context).Add(category);
            new ServiceRepository(context).Add(service);
            await context.SaveChangesAsync(TestContext.Current.CancellationToken);
        }

        await using var readContext = PersistenceContext.Create(databaseName, tenantId);
        var loaded = await new ServiceRepository(readContext).GetByIdAsync(service.Id, CancellationToken.None);

        loaded!.Category.Should().NotBeNull();
        loaded.Category!.Name.Should().Be("Odontologia");
    }

    [Fact]
    public async Task GetByIdAsync_SemCategoria_DevolveCategoriaNula()
    {
        var databaseName = Guid.NewGuid().ToString();
        var tenantId = Guid.NewGuid();
        var serviceId = await SaveNewService(databaseName, tenantId);

        await using var context = PersistenceContext.Create(databaseName, tenantId);
        var loaded = await new ServiceRepository(context).GetByIdAsync(serviceId, CancellationToken.None);

        loaded!.Category.Should().BeNull();
    }

    private static async Task ChangeStatus(
        string databaseName,
        Guid tenantId,
        Guid serviceId,
        Func<Service, DomainResult> transition)
    {
        await using var context = PersistenceContext.Create(databaseName, tenantId);
        var services = new ServiceRepository(context);
        var service = (await services.GetByIdAsync(serviceId, CancellationToken.None))!;

        transition(service).IsSuccess.Should().BeTrue();
        await services.UpdateAsync(service, CancellationToken.None);
        await context.SaveChangesAsync(TestContext.Current.CancellationToken);
    }
}
