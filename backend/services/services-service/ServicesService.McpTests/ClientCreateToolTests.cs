using System.Text.Json;
using Admin.SharedKernel;
using Admin.SharedKernel.ValueObjects;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using ModelContextProtocol.Protocol;
using ModelContextProtocol.Server;
using NSubstitute;
using ServicesService.Application;
using ServicesService.Application.Abstractions;
using ServicesService.Domain.Entities;
using ServicesService.Domain.ValueObjects;
using ServicesService.Mcp.Setup;
using ServicesService.Mcp.Tools;

namespace ServicesService.McpTests;

public sealed class ClientCreateToolTests
{
    private const string ValidCpf = "52998224725";
    private readonly IClientRepository _clients = Substitute.For<IClientRepository>();
    private readonly ITagRepository _tags = Substitute.For<ITagRepository>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();

    [Fact]
    public void Publica_contrato_de_criacao_com_so_o_nome_obrigatorio_e_todos_os_campos_descritos()
    {
        using var provider = Services();
        using var scope = provider.CreateScope();
        var tool = scope.ServiceProvider.GetServices<McpServerTool>()
            .Single(tool => tool.ProtocolTool.Name == "create_client").ProtocolTool;

        tool.Title.Should().Be("Criar cliente");
        tool.Description.Should().Contain("empresa autenticada").And.Contain("list_clients")
            .And.Contain("get_client_by_id").And.Contain("list_tags").And.Contain("não é idempotente");
        tool.Annotations!.ReadOnlyHint.Should().BeFalse();
        tool.Annotations.DestructiveHint.Should().BeFalse();
        tool.Annotations.IdempotentHint.Should().BeFalse();
        tool.Annotations.OpenWorldHint.Should().BeFalse();
        tool.InputSchema.GetProperty("required").EnumerateArray().Select(item => item.GetString()).Should().Equal("command");
        var command = tool.InputSchema.GetProperty("properties").GetProperty("command");
        command.GetProperty("properties").EnumerateObject().Select(property => property.Name).Should().BeEquivalentTo(
            "fullName", "birthDate", "phone", "email", "cpf", "administrativeNotes", "guardians", "referenceContacts", "tagIds");
        command.GetProperty("required").EnumerateArray().Select(item => item.GetString()).Should().Equal("fullName");
        MissingDescriptions(command, "command").Should().BeEmpty();

        var guardian = command.GetProperty("properties").GetProperty("guardians").GetProperty("items");
        guardian.GetProperty("required").EnumerateArray().Select(item => item.GetString()).Should().BeEquivalentTo("name", "relationship");
        var contact = command.GetProperty("properties").GetProperty("referenceContacts").GetProperty("items");
        contact.GetProperty("required").EnumerateArray().Select(item => item.GetString())
            .Should().BeEquivalentTo("name", "relationship", "phone", "purposes");
        tool.OutputSchema!.Value.GetProperty("properties").EnumerateObject().Select(property => property.Name).Should().BeEquivalentTo(
            "id", "fullName", "birthDate", "phone", "email", "cpf", "administrativeNotes", "status", "guardians", "referenceContacts", "tags");
    }

    [Fact]
    public async Task Cria_cliente_so_com_o_nome_e_retorna_o_cadastro_ativo_estruturado()
    {
        SaveSucceeds();

        var result = await Invoke(new { fullName = "  Maria Souza  " });

        result.IsError.Should().BeFalse();
        var client = result.StructuredContent!.Value;
        var id = client.GetProperty("id").GetGuid();
        client.GetProperty("fullName").GetString().Should().Be("Maria Souza");
        client.GetProperty("status").GetString().Should().Be("active");
        client.GetProperty("birthDate").ValueKind.Should().Be(JsonValueKind.Null);
        client.GetProperty("guardians").GetArrayLength().Should().Be(0);
        client.GetProperty("referenceContacts").GetArrayLength().Should().Be(0);
        client.GetProperty("tags").GetArrayLength().Should().Be(0);
        _clients.Received(1).Add(Arg.Is<Client>(entity => entity.Id == id));
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Cria_cliente_completo_normalizando_cpf_e_email_e_devolvendo_responsavel_contato_e_etiqueta()
    {
        SaveSucceeds();
        var tag = Tag.Create(Guid.NewGuid(), "VIP", TagColor.Create("#0d9488").Value, null).Value;
        _tags.GetByIdsAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<CancellationToken>())
            .Returns(new List<Tag> { tag });

        var result = await Invoke(new
        {
            fullName = "Maria Souza",
            birthDate = "1990-05-17",
            phone = "(11) 99999-8888",
            email = "  Maria@Example.COM ",
            cpf = "529.982.247-25",
            administrativeNotes = "Prefere atendimento pela manhã.",
            guardians = new[] { new { name = "Ana Souza", relationship = "Mãe", phone = "11988887777", cpf = "111.444.777-35" } },
            referenceContacts = new[]
            {
                new { name = "João Lima", relationship = "Vizinho", phone = "11977776666", purposes = new[] { "emergency", "dailyCommunication" } },
            },
            tagIds = new[] { tag.Id },
        });

        result.IsError.Should().BeFalse();
        var client = result.StructuredContent!.Value;
        client.GetProperty("birthDate").GetString().Should().Be("1990-05-17");
        client.GetProperty("phone").GetString().Should().Be("(11) 99999-8888");
        client.GetProperty("email").GetString().Should().Be("maria@example.com");
        client.GetProperty("cpf").GetString().Should().Be(ValidCpf);
        client.GetProperty("administrativeNotes").GetString().Should().Be("Prefere atendimento pela manhã.");
        var guardian = client.GetProperty("guardians").EnumerateArray().Single();
        guardian.GetProperty("name").GetString().Should().Be("Ana Souza");
        guardian.GetProperty("cpf").GetString().Should().Be("11144477735");
        var contact = client.GetProperty("referenceContacts").EnumerateArray().Single();
        contact.GetProperty("name").GetString().Should().Be("João Lima");
        contact.GetProperty("purposes").EnumerateArray().Select(purpose => purpose.GetString())
            .Should().Equal("emergency", "dailyCommunication");
        client.GetProperty("tags").EnumerateArray().Single().GetProperty("id").GetGuid().Should().Be(tag.Id);
        _clients.Received(1).Add(Arg.Any<Client>());
    }

    [Fact]
    public async Task Cpf_ja_cadastrado_retorna_conflito_com_o_id_do_cliente_existente_sem_gravar()
    {
        var existing = ExistingClient("Maria Antiga");
        _clients.FindByCpfAsync(Arg.Is<CpfNumber>(cpf => cpf.Value == ValidCpf), null, Arg.Any<CancellationToken>())
            .Returns(existing);

        var result = await Invoke(new { fullName = "Maria Souza", cpf = "529.982.247-25" });

        result.IsError.Should().BeTrue();
        result.StructuredContent.Should().BeNull();
        var error = ErrorOf(result);
        error.GetProperty("code").GetString().Should().Be("Client.DuplicateCpf");
        error.GetProperty("type").GetString().Should().Be("Conflict");
        var meta = error.GetProperty("fieldErrors").EnumerateObject().Single().Value.EnumerateArray().Single().GetProperty("meta");
        meta.GetProperty("clientId").GetString().Should().Be(existing.Id.ToString());
        meta.GetProperty("clientName").GetString().Should().Be("Maria Antiga");
        NothingWasSaved();
    }

    [Fact]
    public async Task Email_ja_usado_por_cliente_ativo_retorna_conflito_com_o_id_do_cliente_existente_sem_gravar()
    {
        var existing = ExistingClient("Maria Antiga");
        _clients.FindActiveByEmailAsync(Arg.Is<EmailAddress>(email => email.Value == "maria@example.com"), null,
            Arg.Any<CancellationToken>()).Returns(existing);

        var result = await Invoke(new { fullName = "Maria Souza", email = "Maria@Example.com" });

        result.IsError.Should().BeTrue();
        var error = ErrorOf(result);
        error.GetProperty("code").GetString().Should().Be("Client.DuplicateEmail");
        var meta = error.GetProperty("fieldErrors").EnumerateObject().Single().Value.EnumerateArray().Single().GetProperty("meta");
        meta.GetProperty("clientId").GetString().Should().Be(existing.Id.ToString());
        NothingWasSaved();
    }

    [Fact]
    public async Task Menor_de_idade_sem_responsavel_retorna_validacao_sem_gravar()
    {
        var birthDate = DateOnly.FromDateTime(DateTime.UtcNow).AddYears(-10).ToString("yyyy-MM-dd");

        var result = await Invoke(new { fullName = "Pedro Souza", birthDate });

        result.IsError.Should().BeTrue();
        var error = ErrorOf(result);
        error.GetProperty("code").GetString().Should().Be("Validation.Failed");
        error.GetProperty("message").GetString().Should().Contain("responsável");
        NothingWasSaved();
    }

    [Fact]
    public async Task Etiqueta_inexistente_retorna_validacao_sem_gravar()
    {
        _tags.GetByIdsAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<CancellationToken>()).Returns(new List<Tag>());

        var result = await Invoke(new { fullName = "Maria Souza", tagIds = new[] { Guid.NewGuid() } });

        result.IsError.Should().BeTrue();
        var error = ErrorOf(result);
        error.GetProperty("code").GetString().Should().Be("Tag.NotFound");
        error.GetProperty("message").GetString().Should().Contain("etiquetas informadas não foram encontradas");
        NothingWasSaved();
    }

    [Fact]
    public async Task Falha_ao_salvar_retorna_conflito_de_gravacao()
    {
        _unitOfWork.SaveChangesAsync(Arg.Any<CancellationToken>()).Returns(PersistenceResult.Failure<int>(
            new PersistenceError(PersistenceErrorKind.UniqueConstraintViolation, "IX_Clients_TenantId_CpfNormalized")));

        var result = await Invoke(new { fullName = "Maria Souza" });

        result.IsError.Should().BeTrue();
        ErrorOf(result).GetProperty("code").GetString().Should().Be("Client.SaveFailed");
    }

    [Theory]
    [InlineData("""{"fullName":"A"}""", "O nome completo deve ter pelo menos")]
    [InlineData("""{"fullName":"Maria Souza","cpf":"123"}""", "O CPF informado é inválido.")]
    [InlineData("""{"fullName":"Maria Souza","email":"maria"}""", "Informe um e-mail válido.")]
    [InlineData("""{"fullName":"Maria Souza","phone":"abc"}""", "Informe um telefone válido")]
    [InlineData("""{"fullName":"Maria Souza","birthDate":"2999-01-01"}""", "A data de nascimento deve estar no passado.")]
    [InlineData("""{"fullName":"Maria Souza","birthDate":"17/05/1990"}""", "Path: $.birthDate")]
    [InlineData("""{"fullName":"Maria Souza","cpf":123}""", "command.cpf")]
    [InlineData("""{"fullName":"Maria Souza","guardians":[{"name":"Ana Souza"}]}""", "O vínculo do responsável é obrigatório.")]
    [InlineData("""{"fullName":"Maria Souza","referenceContacts":[{"name":"João Lima","relationship":"Vizinho","phone":null,"purposes":[]}]}""",
        "Informe ao menos uma finalidade")]
    [InlineData("""{"fullName":"Maria Souza","referenceContacts":[{"name":null,"relationship":"Vizinho","phone":null,"purposes":["emergency"]}]}""",
        "O nome da pessoa de referência é obrigatório.")]
    [InlineData("""{"fullName":"Maria Souza","referenceContacts":[{"relationship":"Vizinho","phone":null,"purposes":["emergency"]}]}""",
        "O nome da pessoa de referência é obrigatório.")]
    public async Task Valores_invalidos_retornam_validacao_sem_consultar_nem_gravar(string json, string message)
    {
        using var command = JsonDocument.Parse(json);

        var result = await Invoke(command.RootElement);

        result.IsError.Should().BeTrue();
        var error = ErrorOf(result);
        error.GetProperty("code").GetString().Should().Be("Validation.Failed");
        error.GetProperty("message").GetString().Should().Contain(message);
        NothingWasSaved();
    }

    [Theory]
    [InlineData("{}")]
    [InlineData("""{"fullName":null}""")]
    [InlineData("""{"fullName":"   "}""")]
    public async Task Nome_ausente_nulo_ou_em_branco_retorna_validacao_sem_gravar(string json)
    {
        using var command = JsonDocument.Parse(json);

        var result = await Invoke(command.RootElement);

        result.IsError.Should().BeTrue();
        ErrorOf(result).GetProperty("code").GetString().Should().Be("Validation.Failed");
        NothingWasSaved();
    }

    private void SaveSucceeds() =>
        _unitOfWork.SaveChangesAsync(Arg.Any<CancellationToken>()).Returns(PersistenceResult.Success(1));

    private void NothingWasSaved()
    {
        _clients.DidNotReceive().Add(Arg.Any<Client>());
        _unitOfWork.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    private static Client ExistingClient(string name)
    {
        var data = new ClientData(FullName.Create(name).Value, null, null, null, CpfNumber.Create(ValidCpf).Value, null, [], [], []);
        return Client.Create(data, DateOnly.FromDateTime(DateTime.UtcNow)).Value;
    }

    private static IEnumerable<string> MissingDescriptions(JsonElement schema, string path)
    {
        if (schema.TryGetProperty("items", out var items))
        {
            foreach (var missing in MissingDescriptions(items, path + "[]"))
            {
                yield return missing;
            }
        }

        if (!schema.TryGetProperty("properties", out var properties))
        {
            yield break;
        }

        foreach (var property in properties.EnumerateObject())
        {
            var fullPath = $"{path}.{property.Name}";
            if (!property.Value.TryGetProperty("description", out var description) || string.IsNullOrWhiteSpace(description.GetString()))
            {
                yield return fullPath;
            }

            foreach (var missing in MissingDescriptions(property.Value, fullPath))
            {
                yield return missing;
            }
        }
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
        return await McpToolCall.InvokeAsync(scope.ServiceProvider, "create_client",
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
