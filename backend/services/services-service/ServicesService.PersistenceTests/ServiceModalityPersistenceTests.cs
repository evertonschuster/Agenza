using ServicesService.Infrastructure.Repositories;

namespace ServicesService.PersistenceTests;

public class ServiceModalityPersistenceTests
{
    private static Service NewService(ServiceModality? modality = null) =>
        Service.Create(
            Guid.NewGuid(), "Terapia", null, DurationRange.Create(15, 30, 60).Value, 150m, 0m, null, 1, modality ?? ServiceModality.InPersonOnly).Value;

    private static async Task<Guid> Save(string databaseName, Guid tenantId, Service service)
    {
        await using var context = PersistenceContext.Create(databaseName, tenantId);
        new ServiceRepository(context).Add(service);
        await context.SaveChangesAsync(TestContext.Current.CancellationToken);

        return service.Id;
    }

    private static async Task<(bool InPerson, bool Online)> ModalityOf(string databaseName, Guid tenantId, Guid serviceId)
    {
        await using var context = PersistenceContext.Create(databaseName, tenantId);
        var service = await new ServiceRepository(context).GetByIdAsync(serviceId, CancellationToken.None);

        return (service!.Modality.AttendsInPerson, service.Modality.AttendsOnline);
    }

    [Fact]
    public async Task Add_ComModalidadePresencial_GravaOServicoComoSomentePresencial()
    {
        var databaseName = Guid.NewGuid().ToString();
        var tenantId = Guid.NewGuid();

        var serviceId = await Save(databaseName, tenantId, NewService());

        (await ModalityOf(databaseName, tenantId, serviceId)).Should().Be((true, false));
    }

    [Fact]
    public async Task Add_ComModalidadeOnline_GravaEDevolveAModalidade()
    {
        var databaseName = Guid.NewGuid().ToString();
        var tenantId = Guid.NewGuid();
        var modality = ServiceModality.Create(attendsInPerson: false, attendsOnline: true).Value;

        var serviceId = await Save(databaseName, tenantId, NewService(modality));

        (await ModalityOf(databaseName, tenantId, serviceId)).Should().Be((false, true));
    }

    [Fact]
    public async Task UpdateAsync_PersisteATrocaDeModalidade()
    {
        var databaseName = Guid.NewGuid().ToString();
        var tenantId = Guid.NewGuid();
        var serviceId = await Save(databaseName, tenantId, NewService());

        await using (var context = PersistenceContext.Create(databaseName, tenantId))
        {
            var repository = new ServiceRepository(context);
            var service = (await repository.GetByIdAsync(serviceId, CancellationToken.None))!;
            service.Update(
                "Terapia", null, DurationRange.Create(15, 30, 60).Value, 150m, 0m, null,
                ServiceModality.Create(attendsInPerson: true, attendsOnline: true).Value).IsSuccess.Should().BeTrue();
            await repository.UpdateAsync(service, CancellationToken.None);
            await context.SaveChangesAsync(TestContext.Current.CancellationToken);
        }

        (await ModalityOf(databaseName, tenantId, serviceId)).Should().Be((true, true));
    }
}
