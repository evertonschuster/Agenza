using System.Text.Json;
using Admin.SharedKernel;
using Admin.SharedKernel.ValueObjects;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using ModelContextProtocol.Protocol;
using ModelContextProtocol.Server;
using NSubstitute;
using ServicesService.Application;
using ServicesService.Application.Abstractions;
using ServicesService.Domain.Entities;
using ServicesService.Mcp.Setup;
using ServicesService.Mcp.Tools;

namespace ServicesService.McpTests;

public sealed class ClientReactivateToolTests
{
    private const string Cpf = "52998224725";
    private const string OtherCpf = "11144477735";
    private readonly IClientRepository _clients = Substitute.For<IClientRepository>();
    private readonly ITagRepository _tags = Substitute.For<ITagRepository>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();

    [Fact]
    public void Publica_contrato_nao_destrutivo_e_idempotente_com_id_obrigatorio_e_descrito()
    {
        using var provider = Services();
        using var scope = provider.CreateScope();
        var tool = scope.ServiceProvider.GetServices<McpServerTool>()
            .Single(tool => tool.ProtocolTool.Name == "reactivate_client");
        var contract = tool.ProtocolTool;

        contract.Title.Should().Be("Reativar cliente");
        contract.Description.Should().Contain("empresa autenticada").And.Contain("list_clients").And.Contain("update_client")
            .And.Contain("Client.DuplicateCpf").And.Contain("Client.DuplicateEmail").And.Contain("já está ativo");
        contract.Annotations!.ReadOnlyHint.Should().BeFalse();
        contract.Annotations.DestructiveHint.Should().BeFalse();
        contract.Annotations.IdempotentHint.Should().BeTrue();
        contract.Annotations.OpenWorldHint.Should().BeFalse();
        tool.Metadata.OfType<AuthorizeAttribute>().Should().ContainSingle();
        contract.InputSchema.GetProperty("required").EnumerateArray().Select(item => item.GetString()).Should().Equal("command");
        var command = contract.InputSchema.GetProperty("properties").GetProperty("command");
        command.GetProperty("required").EnumerateArray().Select(item => item.GetString()).Should().Equal("clientId");
        var fields = command.GetProperty("properties");
        fields.EnumerateObject().Select(property => property.Name).Should().Equal("clientId");
        var id = fields.GetProperty("clientId");
        id.GetProperty("type").GetString().Should().Be("string");
        id.GetProperty("format").GetString().Should().Be("uuid");
        id.GetProperty("description").GetString().Should().Contain("ID do cliente").And.Contain("list_clients");
        contract.OutputSchema!.Value.GetProperty("properties").EnumerateObject().Select(property => property.Name).Should().BeEquivalentTo(
            "id", "fullName", "birthDate", "phone", "email", "cpf", "administrativeNotes", "status", "guardians", "referenceContacts", "tags");
    }

    [Fact]
    public async Task Reativa_cliente_inativo_retorna_o_cadastro_ativo_e_grava_uma_vez()
    {
        var client = InactiveClient();
        SaveSucceeds();

        var result = await Invoke(new { clientId = client.Id });

        result.IsError.Should().BeFalse();
        var saved = result.StructuredContent!.Value;
        saved.GetProperty("id").GetGuid().Should().Be(client.Id);
        saved.GetProperty("status").GetString().Should().Be("active");
        client.Status.Should().Be(ClientStatus.Active);
        await _clients.Received(1).FindByCpfAsync(Arg.Is<CpfNumber>(cpf => cpf.Value == Cpf), client.Id, Arg.Any<CancellationToken>());
        await _clients.Received(1).FindActiveByEmailAsync(
            Arg.Is<EmailAddress>(email => email.Value == "maria@example.com"), client.Id, Arg.Any<CancellationToken>());
        await _clients.Received(1).UpdateAsync(client, Arg.Any<CancellationToken>());
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Cliente_ja_ativo_retorna_sucesso_com_o_cadastro_atual_sem_verificar_conflitos_nem_gravar()
    {
        var client = InactiveClient();
        client.Reactivate().IsFailure.Should().BeFalse();

        var result = await Invoke(new { clientId = client.Id });

        result.IsError.Should().BeFalse();
        result.StructuredContent!.Value.GetProperty("status").GetString().Should().Be("active");
        await _clients.DidNotReceive().FindByCpfAsync(Arg.Any<CpfNumber>(), Arg.Any<Guid?>(), Arg.Any<CancellationToken>());
        await _clients.DidNotReceive().FindActiveByEmailAsync(Arg.Any<EmailAddress>(), Arg.Any<Guid?>(), Arg.Any<CancellationToken>());
        await _clients.DidNotReceive().UpdateAsync(Arg.Any<Client>(), Arg.Any<CancellationToken>());
        await _unitOfWork.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Cpf_usado_por_outra_pessoa_recusa_a_reativacao_com_o_id_da_outra_pessoa_e_mantem_o_cliente_inativo()
    {
        var client = InactiveClient();
        var other = InactiveClient("Outra Maria", OtherCpf, null);
        _clients.FindByCpfAsync(Arg.Is<CpfNumber>(cpf => cpf.Value == Cpf), client.Id, Arg.Any<CancellationToken>()).Returns(other);

        var result = await Invoke(new { clientId = client.Id });

        result.IsError.Should().BeTrue();
        result.StructuredContent.Should().BeNull();
        var error = ErrorOf(result);
        error.GetProperty("code").GetString().Should().Be("Client.DuplicateCpf");
        error.GetProperty("type").GetString().Should().Be("Conflict");
        error.GetProperty("message").GetString().Should().Contain("Não é possível reativar");
        var meta = error.GetProperty("fieldErrors").EnumerateObject().Single().Value.EnumerateArray().Single().GetProperty("meta");
        meta.GetProperty("clientId").GetString().Should().Be(other.Id.ToString());
        meta.GetProperty("clientName").GetString().Should().Be("Outra Maria");
        client.Status.Should().Be(ClientStatus.Inactive);
        await _unitOfWork.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Email_usado_por_outra_pessoa_ativa_recusa_a_reativacao_com_o_id_da_outra_pessoa_e_mantem_o_cliente_inativo()
    {
        var client = InactiveClient();
        var other = InactiveClient("Outra Maria", OtherCpf, "maria@example.com");
        _clients.FindActiveByEmailAsync(Arg.Is<EmailAddress>(email => email.Value == "maria@example.com"), client.Id,
            Arg.Any<CancellationToken>()).Returns(other);

        var result = await Invoke(new { clientId = client.Id });

        result.IsError.Should().BeTrue();
        var error = ErrorOf(result);
        error.GetProperty("code").GetString().Should().Be("Client.DuplicateEmail");
        var meta = error.GetProperty("fieldErrors").EnumerateObject().Single().Value.EnumerateArray().Single().GetProperty("meta");
        meta.GetProperty("clientId").GetString().Should().Be(other.Id.ToString());
        client.Status.Should().Be(ClientStatus.Inactive);
        await _clients.DidNotReceive().UpdateAsync(Arg.Any<Client>(), Arg.Any<CancellationToken>());
        await _unitOfWork.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Cliente_inexistente_retorna_nao_encontrado_sem_gravar()
    {
        var result = await Invoke(new { clientId = Guid.NewGuid() });

        result.IsError.Should().BeTrue();
        var error = ErrorOf(result);
        error.GetProperty("code").GetString().Should().Be("Client.NotFound");
        error.GetProperty("type").GetString().Should().Be("NotFound");
        await _unitOfWork.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Falha_ao_salvar_retorna_conflito_de_gravacao()
    {
        var client = InactiveClient();
        _unitOfWork.SaveChangesAsync(Arg.Any<CancellationToken>()).Returns(PersistenceResult.Failure<int>(
            new PersistenceError(PersistenceErrorKind.UniqueConstraintViolation, "IX_Clients_TenantId_CpfNormalized")));

        var result = await Invoke(new { clientId = client.Id });

        result.IsError.Should().BeTrue();
        ErrorOf(result).GetProperty("code").GetString().Should().Be("Client.SaveFailed");
    }

    [Theory]
    [InlineData("{}", "O id da pessoa é obrigatório.")]
    [InlineData("""{"clientId":"00000000-0000-0000-0000-000000000000"}""", "O id da pessoa é obrigatório.")]
    [InlineData("""{"clientId":"Maria"}""", "Path: $.clientId")]
    [InlineData("""{"clientId":123}""", "command.clientId: esperado texto, recebeu número.")]
    public async Task Id_ausente_ou_invalido_retorna_validacao_sem_consultar_nem_gravar(string json, string message)
    {
        using var command = JsonDocument.Parse(json);

        var result = await Invoke(command.RootElement);

        result.IsError.Should().BeTrue();
        var error = ErrorOf(result);
        error.GetProperty("code").GetString().Should().Be("Validation.Failed");
        error.GetProperty("message").GetString().Should().Contain(message);
        await _clients.DidNotReceive().GetByIdAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>());
        await _unitOfWork.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    private void SaveSucceeds() =>
        _unitOfWork.SaveChangesAsync(Arg.Any<CancellationToken>()).Returns(PersistenceResult.Success(1));

    private Client InactiveClient(string name = "Maria Souza", string cpf = Cpf, string? email = "maria@example.com")
    {
        var data = new ClientData(
            FullName.Create(name).Value,
            null,
            null,
            email is null ? null : EmailAddress.Create(email).Value,
            CpfNumber.Create(cpf).Value,
            null,
            [],
            [],
            []);
        var client = Client.Create(data, DateOnly.FromDateTime(DateTime.UtcNow)).Value;
        client.Inactivate().IsFailure.Should().BeFalse();
        _clients.GetByIdAsync(client.Id, Arg.Any<CancellationToken>()).Returns(client);
        _tags.GetByIdsAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<CancellationToken>()).Returns(new List<Tag>());
        return client;
    }

    private static JsonElement ErrorOf(CallToolResult result)
    {
        var document = JsonDocument.Parse(result.Content.OfType<TextContentBlock>().Single().Text);
        return document.RootElement.GetProperty("error").Clone();
    }

    private async Task<CallToolResult> Invoke(object command)
    {
        using var provider = Services();
        using var scope = provider.CreateScope();
        var argument = JsonSerializer.SerializeToElement(command, JsonSerializerOptions.Web);
        return await McpToolCall.InvokeAsync(scope.ServiceProvider, "reactivate_client",
            new Dictionary<string, object?> { ["command"] = argument }, TestContext.Current.CancellationToken);
    }

    private ServiceProvider Services()
    {
        var services = new ServiceCollection().AddLogging();
        services.AddSharedKernel();
        services.AddServicesApplication();
        services.AddAuthorization();
        services.AddSingleton(TimeProvider.System);
        services.AddSingleton(_clients);
        services.AddSingleton(_tags);
        services.AddSingleton(_unitOfWork);
        var jsonOptions = services.AddMcpValueObjectInputs(TimeProvider.System);
        services.AddMcpServer().WithToolExceptionHandling().WithTools<ClientsTools>(jsonOptions);
        var provider = services.BuildServiceProvider(new ServiceProviderOptions { ValidateScopes = true });
        _ = provider.GetRequiredService<IOptions<McpServerOptions>>().Value;
        return provider;
    }
}
