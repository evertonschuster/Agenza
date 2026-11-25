using System.Text.Json;
using Admin.SharedKernel;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using ModelContextProtocol.Protocol;
using ModelContextProtocol.Server;
using ServicesService.Application;
using ServicesService.Application.Clients;
using ServicesService.Application.Clients.GetClientById;
using ServicesService.Application.Tags;
using ServicesService.Domain.Entities;
using ServicesService.Mcp.Setup;
using ServicesService.Mcp.Tools;
using static ServicesService.McpTests.ClientToolAssertions;
using Result = Admin.SharedKernel.Result;

namespace ServicesService.McpTests;

public sealed class ClientByIdToolTests
{
    [Fact]
    public async Task Consulta_encaminha_o_id_e_retorna_o_cadastro_completo_estruturado()
    {
        var client = new ClientResponse(
            Guid.NewGuid(),
            "Maria Souza",
            new DateOnly(1990, 5, 17),
            "11999998888",
            "maria@example.com",
            "52998224725",
            "Prefere atendimento pela manhã.",
            ClientStatus.Active,
            [new GuardianResponse(Guid.NewGuid(), "Ana Souza", "Mãe", "11988887777", "11144477735")],
            [new ReferenceContactResponse(Guid.NewGuid(), "João Lima", "Vizinho", "11977776666",
                [ContactPurpose.Emergency, ContactPurpose.DailyCommunication])],
            [new TagSummary(Guid.NewGuid(), "VIP", "#0d9488")]);
        var handler = new RecordingHandler(Result.Success(client));
        using var provider = Services(handler);
        using var scope = provider.CreateScope();

        var result = await Invoke(scope.ServiceProvider, new { clientId = client.Id }, TestContext.Current.CancellationToken);

        result.IsError.Should().BeFalse();
        handler.Query.Should().Be(new GetClientByIdQuery(client.Id));
        handler.CancellationToken.CanBeCanceled.Should().BeTrue();
        var content = result.StructuredContent!.Value;
        content.GetProperty("id").GetGuid().Should().Be(client.Id);
        content.GetProperty("fullName").GetString().Should().Be("Maria Souza");
        content.GetProperty("administrativeNotes").GetString().Should().Be("Prefere atendimento pela manhã.");
        content.GetProperty("status").GetString().Should().Be("active");
        var guardian = content.GetProperty("guardians").EnumerateArray().Single();
        guardian.GetProperty("name").GetString().Should().Be("Ana Souza");
        guardian.GetProperty("cpf").GetString().Should().Be("11144477735");
        var contact = content.GetProperty("referenceContacts").EnumerateArray().Single();
        contact.GetProperty("name").GetString().Should().Be("João Lima");
        contact.GetProperty("purposes").EnumerateArray().Select(purpose => purpose.GetString())
            .Should().Equal("emergency", "dailyCommunication");
        content.GetProperty("tags").EnumerateArray().Single().GetProperty("name").GetString().Should().Be("VIP");
    }

    [Fact]
    public async Task Cliente_inexistente_retorna_o_codigo_de_nao_encontrado_sem_conteudo_estruturado()
    {
        var handler = new RecordingHandler(Result.Failure<ClientResponse>(
            Error.NotFound("Client.NotFound", "A pessoa não foi encontrada.")));
        using var provider = Services(handler);
        using var scope = provider.CreateScope();

        var result = await Invoke(scope.ServiceProvider, new { clientId = Guid.NewGuid() }, TestContext.Current.CancellationToken);

        result.IsError.Should().BeTrue();
        result.StructuredContent.Should().BeNull();
        var error = ErrorOf(result);
        error.GetProperty("code").GetString().Should().Be("Client.NotFound");
        error.GetProperty("type").GetString().Should().Be("NotFound");
    }

    [Theory]
    [InlineData(null, "Informe os parâmetros da consulta.")]
    [InlineData("{}", "O id da pessoa é obrigatório.")]
    [InlineData("""{"clientId":"00000000-0000-0000-0000-000000000000"}""", "O id da pessoa é obrigatório.")]
    [InlineData("""{"clientId":"Maria"}""", "Path: $.clientId")]
    [InlineData("""{"clientId":123}""", "query.clientId: esperado texto, recebeu número.")]
    public async Task Id_ausente_ou_invalido_retorna_validacao_sem_consultar(string? json, string message)
    {
        var handler = new RecordingHandler(Result.Failure<ClientResponse>(
            Error.NotFound("Client.NotFound", "A pessoa não foi encontrada.")));
        using var provider = Services(handler);
        using var scope = provider.CreateScope();
        using var query = json is null ? null : JsonDocument.Parse(json);

        var result = await Invoke(scope.ServiceProvider, query?.RootElement, TestContext.Current.CancellationToken);

        result.IsError.Should().BeTrue();
        var error = ErrorOf(result);
        error.GetProperty("code").GetString().Should().Be("Validation.Failed");
        error.GetProperty("message").GetString().Should().Contain(message);
        handler.Query.Should().BeNull();
    }

    [Fact]
    public void Ferramenta_publica_uuid_obrigatorio_somente_leitura_e_orienta_a_busca_pela_listagem()
    {
        using var provider = Services(new RecordingHandler(Result.Failure<ClientResponse>(
            Error.NotFound("Client.NotFound", "A pessoa não foi encontrada."))));
        using var scope = provider.CreateScope();
        var tool = scope.ServiceProvider.GetServices<McpServerTool>()
            .Single(tool => tool.ProtocolTool.Name == "get_client_by_id");
        var contract = tool.ProtocolTool;

        contract.Title.Should().Be("Consultar cliente por ID");
        contract.Description.Should().Contain("empresa autenticada").And.Contain("list_clients");
        MissingDescriptions(contract.InputSchema, "input").Should().BeEmpty();
        contract.Annotations!.ReadOnlyHint.Should().BeTrue();
        contract.Annotations.DestructiveHint.Should().BeFalse();
        contract.Annotations.OpenWorldHint.Should().BeFalse();
        tool.Metadata.OfType<AuthorizeAttribute>().Should().ContainSingle();
        contract.InputSchema.GetProperty("required").EnumerateArray().Select(item => item.GetString()).Should().Equal("query");
        var query = contract.InputSchema.GetProperty("properties").GetProperty("query");
        query.GetProperty("required").EnumerateArray().Select(item => item.GetString()).Should().Equal("clientId");
        var fields = query.GetProperty("properties");
        fields.EnumerateObject().Select(property => property.Name).Should().Equal("clientId");
        var id = fields.GetProperty("clientId");
        id.GetProperty("type").GetString().Should().Be("string");
        id.GetProperty("format").GetString().Should().Be("uuid");
        id.GetProperty("description").GetString().Should().Contain("ID do cliente");
        contract.OutputSchema!.Value.GetProperty("properties").EnumerateObject().Select(property => property.Name)
            .Should().BeEquivalentTo("id", "fullName", "birthDate", "phone", "email", "cpf", "administrativeNotes",
                "status", "guardians", "referenceContacts", "tags");
    }


    private static ServiceProvider Services(RecordingHandler handler)
    {
        var services = new ServiceCollection().AddLogging();
        services.AddSharedKernel();
        services.AddServicesApplication();
        services.AddAuthorization();
        var jsonOptions = services.AddMcpValueObjectInputs(TimeProvider.System);
        services.AddMcpServer().WithToolExceptionHandling().WithTools<ClientsTools>(jsonOptions);
        services.AddScoped<IQueryHandler<GetClientByIdQuery, ClientResponse>>(_ => handler);
        var provider = services.BuildServiceProvider(new ServiceProviderOptions { ValidateScopes = true });
        _ = provider.GetRequiredService<IOptions<McpServerOptions>>().Value;
        return provider;
    }

    private static Task<CallToolResult> Invoke(IServiceProvider services, object? query, CancellationToken cancellationToken) =>
        McpToolCall.InvokeAsync(services, "get_client_by_id", new Dictionary<string, object?> { ["query"] = query }, cancellationToken);

    private sealed class RecordingHandler(Result<ClientResponse> outcome) : IQueryHandler<GetClientByIdQuery, ClientResponse>
    {
        public GetClientByIdQuery? Query { get; private set; }

        public CancellationToken CancellationToken { get; private set; }

        public Task<Result<ClientResponse>> Handle(GetClientByIdQuery query, CancellationToken cancellationToken)
        {
            Query = query;
            CancellationToken = cancellationToken;
            return Task.FromResult(outcome);
        }
    }
}
