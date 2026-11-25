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

public sealed class ClientUpdateToolTests
{
    private const string ValidCpf = "52998224725";
    private const string OtherCpf = "11144477735";
    private readonly IClientRepository _clients = Substitute.For<IClientRepository>();
    private readonly ITagRepository _tags = Substitute.For<ITagRepository>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();

    [Fact]
    public void Publica_contrato_de_edicao_com_todos_os_campos_obrigatorios_e_descritos()
    {
        using var provider = Services();
        using var scope = provider.CreateScope();
        var tool = scope.ServiceProvider.GetServices<McpServerTool>()
            .Single(tool => tool.ProtocolTool.Name == "update_client").ProtocolTool;

        tool.Title.Should().Be("Editar cliente");
        tool.Description.Should().Contain("empresa autenticada").And.Contain("get_client_by_id").And.Contain("list_clients")
            .And.Contain("substitui o cadastro inteiro").And.Contain("list_tags").And.Contain("última gravação");
        tool.Annotations!.ReadOnlyHint.Should().BeFalse();
        tool.Annotations.DestructiveHint.Should().BeTrue();
        tool.Annotations.OpenWorldHint.Should().BeFalse();
        tool.InputSchema.GetProperty("required").EnumerateArray().Select(item => item.GetString()).Should().Equal("command");
        var command = tool.InputSchema.GetProperty("properties").GetProperty("command");
        var fields = new[]
        {
            "clientId", "fullName", "birthDate", "phone", "email", "cpf", "administrativeNotes", "guardians",
            "referenceContacts", "tagIds",
        };
        command.GetProperty("properties").EnumerateObject().Select(property => property.Name).Should().BeEquivalentTo(fields);
        command.GetProperty("required").EnumerateArray().Select(item => item.GetString()).Should().BeEquivalentTo(fields);
        MissingDescriptions(command, "command").Should().BeEmpty();

        var guardian = command.GetProperty("properties").GetProperty("guardians").GetProperty("items");
        guardian.GetProperty("required").EnumerateArray().Select(item => item.GetString())
            .Should().BeEquivalentTo("name", "relationship", "phone", "cpf");
        var contact = command.GetProperty("properties").GetProperty("referenceContacts").GetProperty("items");
        contact.GetProperty("required").EnumerateArray().Select(item => item.GetString())
            .Should().BeEquivalentTo("name", "relationship", "phone", "purposes");
        tool.OutputSchema!.Value.GetProperty("properties").EnumerateObject().Select(property => property.Name).Should().BeEquivalentTo(
            "id", "fullName", "birthDate", "phone", "email", "cpf", "administrativeNotes", "status", "guardians", "referenceContacts", "tags");
    }

    [Fact]
    public async Task Edita_o_cadastro_inteiro_substituindo_responsaveis_contatos_e_etiquetas()
    {
        var client = ExistingClient();
        var newTag = Tag.Create(Guid.NewGuid(), "Recorrente", TagColor.Create("#0ea5e9").Value, null).Value;
        _tags.GetByIdsAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<CancellationToken>()).Returns(new List<Tag> { newTag });
        SaveSucceeds();

        var result = await Invoke(new
        {
            clientId = client.Id,
            fullName = "Maria S. Souza",
            birthDate = "1991-06-18",
            phone = "11911112222",
            email = "Maria.Nova@Example.com",
            cpf = "529.982.247-25",
            administrativeNotes = "Nova observação.",
            guardians = new[] { new { name = "Paulo Souza", relationship = "Pai", phone = (string?)null, cpf = (string?)null } },
            referenceContacts = new[]
            {
                new { name = "Rita Lima", relationship = "Amiga", phone = "11955554444", purposes = new[] { "operationalSupport" } },
            },
            tagIds = new[] { newTag.Id },
        });

        result.IsError.Should().BeFalse();
        var saved = result.StructuredContent!.Value;
        saved.GetProperty("id").GetGuid().Should().Be(client.Id);
        saved.GetProperty("fullName").GetString().Should().Be("Maria S. Souza");
        saved.GetProperty("birthDate").GetString().Should().Be("1991-06-18");
        saved.GetProperty("email").GetString().Should().Be("maria.nova@example.com");
        saved.GetProperty("cpf").GetString().Should().Be(ValidCpf);
        saved.GetProperty("administrativeNotes").GetString().Should().Be("Nova observação.");
        saved.GetProperty("status").GetString().Should().Be("active");
        saved.GetProperty("guardians").EnumerateArray().Select(item => item.GetProperty("name").GetString())
            .Should().Equal("Paulo Souza");
        saved.GetProperty("referenceContacts").EnumerateArray().Single().GetProperty("purposes").EnumerateArray()
            .Select(item => item.GetString()).Should().Equal("operationalSupport");
        saved.GetProperty("tags").EnumerateArray().Select(item => item.GetProperty("name").GetString()).Should().Equal("Recorrente");
        client.FullName.Value.Should().Be("Maria S. Souza");
        await _clients.Received(1).UpdateAsync(client, Arg.Any<CancellationToken>());
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Null_e_listas_vazias_esvaziam_campos_opcionais_responsaveis_contatos_e_etiquetas()
    {
        var client = ExistingClient();
        SaveSucceeds();

        var result = await Invoke(new
        {
            clientId = client.Id,
            fullName = "Maria Souza",
            birthDate = (string?)null,
            phone = (string?)null,
            email = (string?)null,
            cpf = (string?)null,
            administrativeNotes = (string?)null,
            guardians = Array.Empty<object>(),
            referenceContacts = (object?)null,
            tagIds = (object?)null,
        });

        result.IsError.Should().BeFalse();
        var saved = result.StructuredContent!.Value;
        foreach (var field in new[] { "birthDate", "phone", "email", "cpf", "administrativeNotes" })
        {
            saved.GetProperty(field).ValueKind.Should().Be(JsonValueKind.Null, field);
        }

        foreach (var list in new[] { "guardians", "referenceContacts", "tags" })
        {
            saved.GetProperty(list).GetArrayLength().Should().Be(0, list);
        }
    }

    [Fact]
    public async Task Lista_omitida_remove_os_itens_atuais_como_no_rest()
    {
        var client = ExistingClient();
        SaveSucceeds();

        var result = await Invoke(new { clientId = client.Id, fullName = "Maria Souza" });

        result.IsError.Should().BeFalse();
        var saved = result.StructuredContent!.Value;
        saved.GetProperty("guardians").GetArrayLength().Should().Be(0);
        saved.GetProperty("referenceContacts").GetArrayLength().Should().Be(0);
        saved.GetProperty("tags").GetArrayLength().Should().Be(0);
    }

    [Fact]
    public async Task Cliente_inexistente_retorna_nao_encontrado_sem_gravar()
    {
        var result = await Invoke(new { clientId = Guid.NewGuid(), fullName = "Maria Souza" });

        result.IsError.Should().BeTrue();
        result.StructuredContent.Should().BeNull();
        var error = ErrorOf(result);
        error.GetProperty("code").GetString().Should().Be("Client.NotFound");
        error.GetProperty("type").GetString().Should().Be("NotFound");
        NothingWasSaved();
    }

    [Fact]
    public async Task Cpf_de_outro_cliente_retorna_conflito_com_o_id_do_outro_cliente_e_preserva_o_cadastro()
    {
        var client = ExistingClient();
        var other = ExistingClient("Outra Maria", OtherCpf);
        _clients.FindByCpfAsync(Arg.Is<CpfNumber>(cpf => cpf.Value == OtherCpf), client.Id, Arg.Any<CancellationToken>())
            .Returns(other);

        var result = await Invoke(new { clientId = client.Id, fullName = "Maria Souza", cpf = OtherCpf });

        result.IsError.Should().BeTrue();
        var error = ErrorOf(result);
        error.GetProperty("code").GetString().Should().Be("Client.DuplicateCpf");
        var meta = error.GetProperty("fieldErrors").EnumerateObject().Single().Value.EnumerateArray().Single().GetProperty("meta");
        meta.GetProperty("clientId").GetString().Should().Be(other.Id.ToString());
        meta.GetProperty("clientName").GetString().Should().Be("Outra Maria");
        await _clients.DidNotReceive().UpdateAsync(Arg.Any<Client>(), Arg.Any<CancellationToken>());
        await _unitOfWork.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Email_de_outro_cliente_ativo_retorna_conflito_com_o_id_do_outro_cliente()
    {
        var client = ExistingClient();
        var other = ExistingClient("Outra Maria", OtherCpf);
        _clients.FindActiveByEmailAsync(Arg.Is<EmailAddress>(email => email.Value == "usado@example.com"), client.Id,
            Arg.Any<CancellationToken>()).Returns(other);

        var result = await Invoke(new { clientId = client.Id, fullName = "Maria Souza", email = "Usado@Example.com" });

        result.IsError.Should().BeTrue();
        var error = ErrorOf(result);
        error.GetProperty("code").GetString().Should().Be("Client.DuplicateEmail");
        var meta = error.GetProperty("fieldErrors").EnumerateObject().Single().Value.EnumerateArray().Single().GetProperty("meta");
        meta.GetProperty("clientId").GetString().Should().Be(other.Id.ToString());
        await _unitOfWork.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Cliente_inativo_pode_ser_editado_sem_verificar_conflito_de_email()
    {
        var client = ExistingClient();
        client.Inactivate().IsFailure.Should().BeFalse();
        SaveSucceeds();

        var result = await Invoke(new { clientId = client.Id, fullName = "Maria Souza", email = "usado@example.com" });

        result.IsError.Should().BeFalse();
        result.StructuredContent!.Value.GetProperty("status").GetString().Should().Be("inactive");
        await _clients.DidNotReceive().FindActiveByEmailAsync(Arg.Any<EmailAddress>(), Arg.Any<Guid?>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Menor_de_idade_sem_responsavel_retorna_validacao_sem_gravar()
    {
        var client = ExistingClient();
        var birthDate = DateOnly.FromDateTime(DateTime.UtcNow).AddYears(-10).ToString("yyyy-MM-dd");

        var result = await Invoke(new { clientId = client.Id, fullName = "Pedro Souza", birthDate, guardians = Array.Empty<object>() });

        result.IsError.Should().BeTrue();
        var error = ErrorOf(result);
        error.GetProperty("code").GetString().Should().Be("Validation.Failed");
        error.GetProperty("message").GetString().Should().Contain("responsável");
        NothingWasSaved();
    }

    [Fact]
    public async Task Etiqueta_inexistente_retorna_validacao_sem_gravar()
    {
        var client = ExistingClient();
        _tags.GetByIdsAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<CancellationToken>()).Returns(new List<Tag>());

        var result = await Invoke(new { clientId = client.Id, fullName = "Maria Souza", tagIds = new[] { Guid.NewGuid() } });

        result.IsError.Should().BeTrue();
        ErrorOf(result).GetProperty("code").GetString().Should().Be("Tag.NotFound");
        NothingWasSaved();
    }

    [Fact]
    public async Task Falha_ao_salvar_retorna_conflito_de_gravacao()
    {
        var client = ExistingClient();
        _unitOfWork.SaveChangesAsync(Arg.Any<CancellationToken>()).Returns(PersistenceResult.Failure<int>(
            new PersistenceError(PersistenceErrorKind.UniqueConstraintViolation, "IX_Clients_TenantId_CpfNormalized")));

        var result = await Invoke(new { clientId = client.Id, fullName = "Maria Souza" });

        result.IsError.Should().BeTrue();
        ErrorOf(result).GetProperty("code").GetString().Should().Be("Client.SaveFailed");
    }

    [Theory]
    [InlineData("""{"fullName":"Maria Souza"}""", "O id da pessoa é obrigatório.")]
    [InlineData("""{"clientId":"00000000-0000-0000-0000-000000000000","fullName":"Maria Souza"}""", "O id da pessoa é obrigatório.")]
    [InlineData("""{"clientId":"Maria","fullName":"Maria Souza"}""", "Path: $.clientId")]
    [InlineData("""{"clientId":"11111111-1111-1111-1111-111111111111"}""", "O nome completo é obrigatório.")]
    [InlineData("""{"clientId":"11111111-1111-1111-1111-111111111111","fullName":null}""", "O nome completo é obrigatório.")]
    [InlineData("""{"clientId":"11111111-1111-1111-1111-111111111111","fullName":"A"}""", "O nome completo deve ter pelo menos")]
    [InlineData("""{"clientId":"11111111-1111-1111-1111-111111111111","fullName":"Maria Souza","cpf":"123"}""", "O CPF informado é inválido.")]
    [InlineData("""{"clientId":"11111111-1111-1111-1111-111111111111","fullName":"Maria Souza","email":"maria"}""", "Informe um e-mail válido.")]
    [InlineData("""{"clientId":"11111111-1111-1111-1111-111111111111","fullName":"Maria Souza","phone":"abc"}""", "Informe um telefone válido")]
    [InlineData("""{"clientId":"11111111-1111-1111-1111-111111111111","fullName":"Maria Souza","birthDate":"2999-01-01"}""",
        "A data de nascimento deve estar no passado.")]
    [InlineData("""{"clientId":"11111111-1111-1111-1111-111111111111","fullName":"Maria Souza","guardians":[{"name":"Ana Souza","relationship":"","phone":null,"cpf":null}]}""",
        "O vínculo do responsável é obrigatório.")]
    [InlineData("""{"clientId":"11111111-1111-1111-1111-111111111111","fullName":"Maria Souza","referenceContacts":[{"name":"João Lima","relationship":"Vizinho","phone":null,"purposes":[]}]}""",
        "Informe ao menos uma finalidade")]
    [InlineData("""{"clientId":"11111111-1111-1111-1111-111111111111","fullName":"Maria Souza","referenceContacts":[{"name":null,"relationship":"Vizinho","phone":null,"purposes":["emergency"]}]}""",
        "O nome da pessoa de referência é obrigatório.")]
    [InlineData("""{"clientId":"11111111-1111-1111-1111-111111111111","fullName":"Maria Souza","referenceContacts":[{"relationship":"Vizinho","phone":null,"purposes":["emergency"]}]}""",
        "O nome da pessoa de referência é obrigatório.")]
    public async Task Entrada_invalida_retorna_validacao_sem_consultar_nem_gravar(string json, string message)
    {
        using var command = JsonDocument.Parse(json);

        var result = await Invoke(command.RootElement);

        result.IsError.Should().BeTrue();
        var error = ErrorOf(result);
        error.GetProperty("code").GetString().Should().Be("Validation.Failed");
        error.GetProperty("message").GetString().Should().Contain(message);
        await _clients.DidNotReceive().GetByIdAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>());
        NothingWasSaved();
    }

    private void SaveSucceeds() =>
        _unitOfWork.SaveChangesAsync(Arg.Any<CancellationToken>()).Returns(PersistenceResult.Success(1));

    private void NothingWasSaved()
    {
        _clients.DidNotReceive().Add(Arg.Any<Client>());
        _clients.DidNotReceive().UpdateAsync(Arg.Any<Client>(), Arg.Any<CancellationToken>());
        _unitOfWork.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    private Client ExistingClient(string name = "Maria Souza", string cpf = ValidCpf)
    {
        var data = new ClientData(
            FullName.Create(name).Value,
            null,
            null,
            null,
            CpfNumber.Create(cpf).Value,
            null,
            [new GuardianData("Ana Souza", "Mãe", null, null)],
            [new ReferenceContactData(FullName.Create("João Lima").Value, "Vizinho", null, new HashSet<ContactPurpose> { ContactPurpose.Emergency })],
            [Guid.NewGuid()]);
        var client = Client.Create(data, DateOnly.FromDateTime(DateTime.UtcNow)).Value;
        _clients.GetByIdAsync(client.Id, Arg.Any<CancellationToken>()).Returns(client);
        return client;
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
        return await McpToolCall.InvokeAsync(scope.ServiceProvider, "update_client",
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
