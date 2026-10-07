using Admin.Identity.Client;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Infrastructure;
using ServicesService.Application.Abstractions;
using ServicesService.Infrastructure.Persistence;
using ServicesService.Infrastructure.Persistence.Interceptors;
using ServicesService.Infrastructure.Repositories;

namespace ServicesService.PersistenceTests;

public class ClientPersistenceTests
{
    private const string CpfDigits = "52998224725";
    private static readonly DateOnly Today = new(2026, 10, 2);

    private static ServicesDataContext CreateContext(string databaseName, Guid tenantId)
    {
        var tenantProvider = Substitute.For<ICurrentTenantProvider>();
        tenantProvider.TryGetTenantId(out Arg.Any<Guid>()).Returns(callInfo =>
        {
            callInfo[0] = tenantId;
            return true;
        });
        tenantProvider.TenantId.Returns(tenantId);

        var currentUserAccessor = Substitute.For<ICurrentUserAccessor>();
        currentUserAccessor.UserId.Returns((Guid?)Guid.NewGuid());
        var interceptor = new AuditableEntitySaveChangesInterceptor(currentUserAccessor, tenantProvider, TimeProvider.System);

        var options = new DbContextOptionsBuilder<ServicesDataContext>()
            .UseInMemoryDatabase(databaseName)
            .UseQueryTrackingBehavior(QueryTrackingBehavior.NoTracking)
            .AddInterceptors(interceptor)
            .Options;

        return new ServicesDataContext(options, tenantProvider);
    }

    private static Client NewClient(
        string fullName = "Maria Souza",
        string? cpf = null,
        string? email = null,
        DateOnly? birthDate = null,
        IReadOnlyCollection<GuardianData>? guardians = null,
        IReadOnlyCollection<ReferenceContactData>? referenceContacts = null) =>
        Client.Create(
            Guid.NewGuid(),
            FullName.Create(fullName).Value,
            birthDate is null ? null : BirthDate.Create(birthDate.Value, Today).Value,
            null,
            email is null ? null : EmailAddress.Create(email).Value,
            cpf is null ? null : CpfNumber.Create(cpf).Value,
            null,
            Today,
            guardians ?? [],
            referenceContacts ?? []).Value;

    private static GuardianData Guardian()
    {
        return new GuardianData("Ana Souza", "Mãe", null, null);
    }

    private static ReferenceContactData ReferenceContact()
    {
        return new ReferenceContactData(FullName.Create("Carlos Lima").Value, "Tio", null, new HashSet<ContactPurpose> { ContactPurpose.Emergency });
    }

    private static CpfNumber Cpf(string digits)
    {
        return CpfNumber.Create(digits).Value;
    }

    private static EmailAddress Email(string address)
    {
        return EmailAddress.Create(address).Value;
    }

    private static async Task Save(ServicesDataContext context, Client client)
    {
        context.Clients.Add(client);
        await context.SaveChangesAsync();
    }

    private static async Task SetStatus(string databaseName, Guid tenantId, Guid clientId, ClientStatus status)
    {
        await using var context = CreateContext(databaseName, tenantId);
        var tracked = await context.Clients.AsTracking().SingleAsync(c => c.Id == clientId);
        context.Entry(tracked).Property(c => c.Status).CurrentValue = status;
        await context.SaveChangesAsync();
    }

    private static async Task SoftDelete(string databaseName, Guid tenantId, Guid clientId)
    {
        await using var context = CreateContext(databaseName, tenantId);
        var tracked = await context.Clients.AsTracking().SingleAsync(c => c.Id == clientId);
        context.Clients.Remove(tracked);
        await context.SaveChangesAsync();
    }

    [Fact]
    public async Task SaveChanges_WithAClientAndItsContacts_AssignsTheCurrentTenantToEveryRow()
    {
        var databaseName = Guid.NewGuid().ToString();
        var tenantId = Guid.NewGuid();
        var client = NewClient(
            birthDate: new DateOnly(2015, 3, 10),
            guardians: [Guardian()],
            referenceContacts: [ReferenceContact()]);

        await using (var context = CreateContext(databaseName, tenantId))
        {
            await Save(context, client);
        }

        client.TenantId.Should().Be(tenantId);
        client.Guardians.Should().ContainSingle().Which.TenantId.Should().Be(tenantId);
        client.ReferenceContacts.Should().ContainSingle().Which.TenantId.Should().Be(tenantId);
        client.CreatedAt.Should().NotBe(default);

        await using (var context = CreateContext(databaseName, tenantId))
        {
            var loaded = await context.Clients
                .Include(c => c.Guardians)
                .Include(c => c.ReferenceContacts)
                .SingleAsync(TestContext.Current.CancellationToken);

            loaded.Status.Should().Be(ClientStatus.Active);
            loaded.TenantId.Should().Be(tenantId);
            loaded.Guardians.Should().ContainSingle().Which.ClientId.Should().Be(client.Id);
            loaded.ReferenceContacts.Should().ContainSingle().Which.Purposes.Should().BeEquivalentTo([ContactPurpose.Emergency]);
        }
    }

    [Fact]
    public async Task SaveChanges_WithoutATenant_RejectsTheWholeGraph()
    {
        var tenantProvider = Substitute.For<ICurrentTenantProvider>();
        tenantProvider.TryGetTenantId(out Arg.Any<Guid>()).Returns(false);
        var currentUserAccessor = Substitute.For<ICurrentUserAccessor>();
        var options = new DbContextOptionsBuilder<ServicesDataContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .AddInterceptors(new AuditableEntitySaveChangesInterceptor(currentUserAccessor, tenantProvider, TimeProvider.System))
            .Options;
        await using var context = new ServicesDataContext(options, tenantProvider);
        context.Clients.Add(NewClient(guardians: [Guardian()]));

        var act = async () => await context.SaveChangesAsync();

        await act.Should().ThrowAsync<InvalidOperationException>();
    }

    [Fact]
    public async Task Clients_AreInvisibleToAnotherTenantTogetherWithTheirContacts()
    {
        var databaseName = Guid.NewGuid().ToString();
        var tenantA = Guid.NewGuid();
        var tenantB = Guid.NewGuid();
        var client = NewClient(guardians: [Guardian()], referenceContacts: [ReferenceContact()]);

        await using (var context = CreateContext(databaseName, tenantA))
        {
            await Save(context, client);
        }

        await using (var context = CreateContext(databaseName, tenantB))
        {
            await Save(context, NewClient("João Pereira"));
        }

        await using (var context = CreateContext(databaseName, tenantB))
        {
            (await context.Clients.Select(c => c.FullName).ToListAsync(TestContext.Current.CancellationToken)).Should().Equal(FullName.Create("João Pereira").Value);
            (await context.Clients.AnyAsync(c => c.Id == client.Id, TestContext.Current.CancellationToken)).Should().BeFalse();
            (await context.Set<ClientGuardian>().AnyAsync(TestContext.Current.CancellationToken)).Should().BeFalse();
            (await context.Set<ClientReferenceContact>().AnyAsync(TestContext.Current.CancellationToken)).Should().BeFalse();
        }

        await using (var context = CreateContext(databaseName, tenantA))
        {
            (await context.Clients.Select(c => c.FullName).ToListAsync(TestContext.Current.CancellationToken)).Should().Equal(FullName.Create("Maria Souza").Value);
            (await context.Set<ClientGuardian>().CountAsync(TestContext.Current.CancellationToken)).Should().Be(1);
            (await context.Set<ClientReferenceContact>().CountAsync(TestContext.Current.CancellationToken)).Should().Be(1);
        }
    }

    [Fact]
    public async Task FindByCpf_MatchesALiveClientOfTheSameTenant()
    {
        var databaseName = Guid.NewGuid().ToString();
        var tenantId = Guid.NewGuid();
        var client = NewClient(cpf: CpfDigits);
        await using (var context = CreateContext(databaseName, tenantId))
        {
            await Save(context, client);
        }

        await using (var context = CreateContext(databaseName, tenantId))
        {
            var match = await new ClientRepository(context).FindByCpfAsync(Cpf(CpfDigits), null, CancellationToken.None);

            match!.Id.Should().Be(client.Id);
        }
    }

    [Fact]
    public async Task FindByCpf_StillMatchesAnInactiveClient()
    {
        var databaseName = Guid.NewGuid().ToString();
        var tenantId = Guid.NewGuid();
        var client = NewClient(cpf: CpfDigits);
        await using (var context = CreateContext(databaseName, tenantId))
        {
            await Save(context, client);
        }

        await SetStatus(databaseName, tenantId, client.Id, ClientStatus.Inactive);

        await using (var context = CreateContext(databaseName, tenantId))
        {
            var match = await new ClientRepository(context).FindByCpfAsync(Cpf(CpfDigits), null, CancellationToken.None);

            match!.Id.Should().Be(client.Id);
        }
    }

    [Fact]
    public async Task FindByCpf_IgnoresASoftDeletedClient()
    {
        var databaseName = Guid.NewGuid().ToString();
        var tenantId = Guid.NewGuid();
        var client = NewClient(cpf: CpfDigits);
        await using (var context = CreateContext(databaseName, tenantId))
        {
            await Save(context, client);
        }

        await SoftDelete(databaseName, tenantId, client.Id);

        await using (var context = CreateContext(databaseName, tenantId))
        {
            (await context.Clients.IgnoreQueryFilters().AnyAsync(c => c.Id == client.Id, TestContext.Current.CancellationToken))
                .Should().BeTrue("the row is soft-deleted, not removed");
            (await new ClientRepository(context).FindByCpfAsync(Cpf(CpfDigits), null, CancellationToken.None))
                .Should().BeNull();
        }
    }

    [Fact]
    public async Task FindByCpf_NeverMatchesAnotherTenantsClient()
    {
        var databaseName = Guid.NewGuid().ToString();
        var tenantA = Guid.NewGuid();
        var tenantB = Guid.NewGuid();
        await using (var context = CreateContext(databaseName, tenantA))
        {
            await Save(context, NewClient(cpf: CpfDigits));
        }

        await using (var context = CreateContext(databaseName, tenantB))
        {
            (await context.Clients.IgnoreQueryFilters().CountAsync(c => c.Cpf == Cpf(CpfDigits), TestContext.Current.CancellationToken))
                .Should().Be(1, "the row exists, so only the tenant filter keeps it out");
            (await new ClientRepository(context).FindByCpfAsync(Cpf(CpfDigits), null, CancellationToken.None))
                .Should().BeNull();
        }
    }

    [Fact]
    public async Task FindByCpf_WithNoTenantInContext_MatchesNothing()
    {
        var databaseName = Guid.NewGuid().ToString();
        var tenantId = Guid.NewGuid();
        await using (var context = CreateContext(databaseName, tenantId))
        {
            await Save(context, NewClient(cpf: CpfDigits));
        }

        var tenantProvider = Substitute.For<ICurrentTenantProvider>();
        tenantProvider.TryGetTenantId(out Arg.Any<Guid>()).Returns(false);
        var options = new DbContextOptionsBuilder<ServicesDataContext>().UseInMemoryDatabase(databaseName).Options;
        await using var tenantlessContext = new ServicesDataContext(options, tenantProvider);

        var match = await new ClientRepository(tenantlessContext).FindByCpfAsync(Cpf(CpfDigits), null, CancellationToken.None);

        match.Should().BeNull();
    }

    [Fact]
    public async Task FindActiveByEmail_OnlyMatchesLiveActiveClientsOfTheSameTenant()
    {
        var databaseName = Guid.NewGuid().ToString();
        var tenantA = Guid.NewGuid();
        var tenantB = Guid.NewGuid();
        var active = NewClient("Maria Souza", email: "maria@example.com");
        var inactive = NewClient("João Pereira", email: "joao@example.com");
        var deleted = NewClient("Pedro Alves", email: "pedro@example.com");
        await using (var context = CreateContext(databaseName, tenantA))
        {
            await Save(context, active);
            await Save(context, inactive);
            await Save(context, deleted);
        }

        await SetStatus(databaseName, tenantA, inactive.Id, ClientStatus.Inactive);
        await SoftDelete(databaseName, tenantA, deleted.Id);

        await using (var context = CreateContext(databaseName, tenantA))
        {
            var repository = new ClientRepository(context);

            (await repository.FindActiveByEmailAsync(Email("maria@example.com"), null, CancellationToken.None))!.Id.Should().Be(active.Id);
            (await repository.FindActiveByEmailAsync(Email("joao@example.com"), null, CancellationToken.None)).Should().BeNull();
            (await repository.FindActiveByEmailAsync(Email("pedro@example.com"), null, CancellationToken.None)).Should().BeNull();
            (await repository.FindActiveByEmailAsync(Email("outro@example.com"), null, CancellationToken.None)).Should().BeNull();
        }

        await using (var context = CreateContext(databaseName, tenantB))
        {
            (await new ClientRepository(context).FindActiveByEmailAsync(Email("maria@example.com"), null, CancellationToken.None))
                .Should().BeNull();
        }
    }

    [Fact]
    public async Task FindByCpf_ExcludesTheGivenClient()
    {
        var databaseName = Guid.NewGuid().ToString();
        var tenantId = Guid.NewGuid();
        var client = NewClient(cpf: CpfDigits);
        await using (var context = CreateContext(databaseName, tenantId))
        {
            await Save(context, client);
        }

        await using (var context = CreateContext(databaseName, tenantId))
        {
            var repository = new ClientRepository(context);

            (await repository.FindByCpfAsync(Cpf(CpfDigits), client.Id, CancellationToken.None)).Should().BeNull();
            (await repository.FindByCpfAsync(Cpf(CpfDigits), Guid.NewGuid(), CancellationToken.None))!.Id.Should().Be(client.Id);
        }
    }

    [Fact]
    public async Task FindActiveByEmail_ExcludesTheGivenClient()
    {
        var databaseName = Guid.NewGuid().ToString();
        var tenantId = Guid.NewGuid();
        var client = NewClient(email: "maria@example.com");
        await using (var context = CreateContext(databaseName, tenantId))
        {
            await Save(context, client);
        }

        await using (var context = CreateContext(databaseName, tenantId))
        {
            var repository = new ClientRepository(context);

            (await repository.FindActiveByEmailAsync(Email("maria@example.com"), client.Id, CancellationToken.None)).Should().BeNull();
            (await repository.FindActiveByEmailAsync(Email("maria@example.com"), Guid.NewGuid(), CancellationToken.None))!.Id
                .Should().Be(client.Id);
        }
    }

    [Fact]
    public async Task GetById_LoadsWithoutTracking()
    {
        var databaseName = Guid.NewGuid().ToString();
        var tenantId = Guid.NewGuid();
        var client = NewClient(guardians: [Guardian(), Guardian()], referenceContacts: [ReferenceContact()]);
        await using (var context = CreateContext(databaseName, tenantId))
        {
            await Save(context, client);
        }

        await using (var context = CreateContext(databaseName, tenantId))
        {
            var loaded = await new ClientRepository(context).GetByIdAsync(client.Id, CancellationToken.None);

            loaded.Should().NotBeNull();
            loaded!.Guardians.Should().HaveCount(2);
            loaded.ReferenceContacts.Should().ContainSingle();
            context.Entry(loaded!).State.Should().Be(EntityState.Detached);
            context.ChangeTracker.Entries().Should().BeEmpty();
        }
    }

    [Fact]
    public async Task QueriesNeverReturnAnotherTenantsOrADeletedClient()
    {
        var databaseName = Guid.NewGuid().ToString();
        var tenantA = Guid.NewGuid();
        var tenantB = Guid.NewGuid();
        var client = NewClient(guardians: [Guardian()]);
        var deleted = NewClient("Pedro Alves", guardians: [Guardian()]);
        await using (var context = CreateContext(databaseName, tenantA))
        {
            await Save(context, client);
            await Save(context, deleted);
        }

        await SoftDelete(databaseName, tenantA, deleted.Id);

        await using (var context = CreateContext(databaseName, tenantB))
        {
            (await context.Clients.SingleOrDefaultAsync(c => c.Id == client.Id, TestContext.Current.CancellationToken)).Should().BeNull();
        }

        await using (var context = CreateContext(databaseName, tenantA))
        {
            (await context.Clients.SingleOrDefaultAsync(c => c.Id == deleted.Id, TestContext.Current.CancellationToken)).Should().BeNull();
            (await context.Clients.SingleOrDefaultAsync(c => c.Id == client.Id, TestContext.Current.CancellationToken)).Should().NotBeNull();
        }
    }

    [Fact]
    public async Task Update_ReplacesEveryContactInOneSave_AndSoftDeletesThePreviousOnes()
    {
        var databaseName = Guid.NewGuid().ToString();
        var tenantId = Guid.NewGuid();
        var client = NewClient(
            guardians: [Guardian(), new GuardianData("Bia Souza", "Tia", null, null)],
            referenceContacts: [ReferenceContact(), ReferenceContact()]);
        await using (var context = CreateContext(databaseName, tenantId))
        {
            await Save(context, client);
        }

        var previousGuardianIds = client.Guardians.Select(guardian => guardian.Id).ToArray();
        var previousReferenceContactIds = client.ReferenceContacts.Select(contact => contact.Id).ToArray();

        await using (var context = CreateContext(databaseName, tenantId))
        {
            var repository = new ClientRepository(context);
            var loaded = (await repository.GetByIdAsync(client.Id, CancellationToken.None))!;

            var result = loaded.Update(
                FullName.Create("Maria Souza Lima").Value,
                null,
                null,
                null,
                null,
                null,
                Today,
                [
                    new GuardianData("Ana Lima", "Mãe", null, null),
                    new GuardianData("Cris Souza", "Prima", null, null),
                ],
                [ReferenceContact()]);
            result.IsSuccess.Should().BeTrue();
            await repository.UpdateAsync(loaded, TestContext.Current.CancellationToken);
            await context.SaveChangesAsync(TestContext.Current.CancellationToken);
        }

        await using (var context = CreateContext(databaseName, tenantId))
        {
            var loaded = await context.Clients
                .Include(c => c.Guardians)
                .Include(c => c.ReferenceContacts)
                .SingleAsync(c => c.Id == client.Id, TestContext.Current.CancellationToken);

            loaded.FullName.Value.Should().Be("Maria Souza Lima");
            loaded.Guardians.Select(guardian => guardian.Name).Should().BeEquivalentTo("Ana Lima", "Cris Souza");
            loaded.Guardians.Should().NotContain(guardian => previousGuardianIds.Contains(guardian.Id));
            loaded.Guardians.Should().OnlyContain(guardian => guardian.TenantId == tenantId && guardian.ClientId == client.Id);
            loaded.ReferenceContacts.Should().NotContain(contact => previousReferenceContactIds.Contains(contact.Id));

            var removedGuardians = await context.Set<ClientGuardian>().IgnoreQueryFilters()
                .Where(guardian => previousGuardianIds.Contains(guardian.Id))
                .ToListAsync(TestContext.Current.CancellationToken);
            removedGuardians.Should().OnlyContain(guardian => guardian.DeletedAt != null);
            var removedReferenceContacts = await context.Set<ClientReferenceContact>().IgnoreQueryFilters()
                .Where(contact => previousReferenceContactIds.Contains(contact.Id))
                .ToListAsync(TestContext.Current.CancellationToken);
            removedReferenceContacts.Should().OnlyContain(contact => contact.DeletedAt != null);
        }
    }

    [Fact]
    public void Model_BacksCpfAndEmailUniquenessWithFilteredUniqueIndexes()
    {
        using var context = CreateContext(Guid.NewGuid().ToString(), Guid.NewGuid());
        var clients = context.GetService<IDesignTimeModel>().Model.FindEntityType(typeof(Client))!;

        var cpfIndex = clients.GetIndexes().Single(index => index.GetDatabaseName() == "IX_Clients_TenantId_Cpf");
        cpfIndex.IsUnique.Should().BeTrue();
        cpfIndex.Properties.Select(property => property.Name).Should().Equal("TenantId", "Cpf");
        cpfIndex.GetFilter().Should().Be("\"Cpf\" IS NOT NULL AND \"DeletedAt\" IS NULL");

        var emailIndex = clients.GetIndexes().Single(index => index.GetDatabaseName() == "IX_Clients_TenantId_Email");
        emailIndex.IsUnique.Should().BeTrue();
        emailIndex.Properties.Select(property => property.Name).Should().Equal("TenantId", "Email");
        emailIndex.GetFilter().Should().Contain("\"Status\" = 'Active'").And.Contain("\"DeletedAt\" IS NULL");
    }

    [Fact]
    public void Model_StatusCheckListsEveryClientStatus()
    {
        using var context = CreateContext(Guid.NewGuid().ToString(), Guid.NewGuid());
        var clients = context.GetService<IDesignTimeModel>().Model.FindEntityType(typeof(Client))!;

        var statusCheck = clients.GetCheckConstraints().Single(check => check.Name == "CK_Clients_Status");

        statusCheck.Sql.Should().Be("\"Status\" IN ('Active', 'Inactive')");
    }

    [Fact]
    public void Model_LeavesTheContactIdsToTheRootSoANewContactIsInsertedNotUpdated()
    {
        using var context = CreateContext(Guid.NewGuid().ToString(), Guid.NewGuid());
        var model = context.GetService<IDesignTimeModel>().Model;

        foreach (var contactType in new[] { typeof(ClientGuardian), typeof(ClientReferenceContact) })
        {
            model.FindEntityType(contactType)!.FindProperty(nameof(ClientContact.Id))!.ValueGenerated
                .Should().Be(ValueGenerated.Never);
        }
    }

    [Fact]
    public void Model_ConnectsContactsToTheirClientThroughTheTenantScopedKey()
    {
        using var context = CreateContext(Guid.NewGuid().ToString(), Guid.NewGuid());
        var model = context.GetService<IDesignTimeModel>().Model;

        foreach (var contactType in new[] { typeof(ClientGuardian), typeof(ClientReferenceContact) })
        {
            var foreignKey = model.FindEntityType(contactType)!.GetForeignKeys().Single();

            foreignKey.PrincipalEntityType.ClrType.Should().Be(typeof(Client));
            foreignKey.Properties.Select(property => property.Name).Should().Equal("TenantId", "ClientId");
            foreignKey.PrincipalKey.Properties.Select(property => property.Name).Should().Equal("TenantId", "Id");
        }
    }
}
