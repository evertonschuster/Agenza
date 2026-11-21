using System.Reflection;
using System.Text.Json;
using Admin.SharedKernel;
using Admin.SharedKernel.ValueObjects;
using Microsoft.AspNetCore.Authorization;
using ModelContextProtocol.Protocol;
using ModelContextProtocol.Server;
using ServicesService.Application.Tags;
using ServicesService.Application.Tags.ListTags;
using ServicesService.Mcp.Tools;
using Result = Admin.SharedKernel.Result;

namespace ServicesService.McpTests;

public sealed class TagToolsTests
{
    private readonly IDispatcher _dispatcher = Substitute.For<IDispatcher>();

    [Fact]
    public async Task Listar_etiquetas_repassa_busca_e_paginacao_ao_caso_de_uso()
    {
        ListTagsQuery? sent = null;
        _dispatcher.Query(Arg.Do<ListTagsQuery>(query => sent = query), Arg.Any<CancellationToken>())
            .Returns(Result.Success(Page()));

        await new TagTools(_dispatcher).ListTags("  VIP ", page: 2, pageSize: 5, TestContext.Current.CancellationToken);

        sent.Should().Be(new ListTagsQuery(SearchText.Create("vip").Value) { Page = 2, PageSize = 5 });
    }

    [Fact]
    public async Task Listar_etiquetas_sem_busca_nao_filtra_pelo_nome()
    {
        ListTagsQuery? sent = null;
        _dispatcher.Query(Arg.Do<ListTagsQuery>(query => sent = query), Arg.Any<CancellationToken>())
            .Returns(Result.Success(Page()));

        await new TagTools(_dispatcher).ListTags(search: "", cancellationToken: TestContext.Current.CancellationToken);

        sent!.Search.Should().BeNull();
    }

    [Fact]
    public async Task Listar_etiquetas_devolve_a_pagina_como_conteudo_estruturado()
    {
        var tag = new TagResponse(Guid.NewGuid(), "VIP", "#FF0000", null);
        _dispatcher.Query(Arg.Any<ListTagsQuery>(), Arg.Any<CancellationToken>())
            .Returns(Result.Success(Page(tag)));

        var result = await new TagTools(_dispatcher).ListTags(cancellationToken: TestContext.Current.CancellationToken);

        result.IsError.Should().NotBe(true);
        var structured = JsonSerializer.SerializeToElement(result.StructuredContent);
        structured.GetProperty("totalCount").GetInt32().Should().Be(1);
        structured.GetProperty("items")[0].GetProperty("name").GetString().Should().Be("VIP");
        result.Content.OfType<TextContentBlock>().Single().Text.Should().Contain("\"items\"");
    }

    [Fact]
    public async Task Falha_do_caso_de_uso_vira_erro_da_ferramenta_com_codigo_e_campos()
    {
        var error = Error.Validation("Validation.Failed", "A página informada é inválida.",
            new Dictionary<string, IReadOnlyList<FieldError>>
            {
                ["page"] = [new FieldError("Page.Invalid", "A página deve ser maior ou igual a 1.")],
            });
        _dispatcher.Query(Arg.Any<ListTagsQuery>(), Arg.Any<CancellationToken>())
            .Returns(Result.Failure<PagedResult<TagResponse>>(error));

        var result = await new TagTools(_dispatcher).ListTags(page: 0, cancellationToken: TestContext.Current.CancellationToken);

        result.IsError.Should().BeTrue();
        result.StructuredContent.Should().BeNull();
        result.Content.OfType<TextContentBlock>().Single().Text.Should().Be(
            "A página informada é inválida. (Validation.Failed)\npage: A página deve ser maior ou igual a 1. (Page.Invalid)");
    }

    [Fact]
    public async Task Busca_invalida_e_recusada_sem_chamar_o_caso_de_uso()
    {
        var result = await new TagTools(_dispatcher).ListTags(new string('a', SearchText.MaxLength + 1),
            cancellationToken: TestContext.Current.CancellationToken);

        result.IsError.Should().BeTrue();
        result.Content.OfType<TextContentBlock>().Single().Text.Should().StartWith("A busca deve ter no máximo");
        await _dispatcher.DidNotReceiveWithAnyArgs().Query(Arg.Any<ListTagsQuery>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public void Ferramenta_exige_usuario_autenticado_e_se_declara_somente_leitura()
    {
        typeof(TagTools).GetCustomAttribute<AuthorizeAttribute>().Should().NotBeNull();
        var tool = typeof(TagTools).GetMethod(nameof(TagTools.ListTags))!.GetCustomAttribute<McpServerToolAttribute>()!;
        tool.Name.Should().Be("agenza_list_tags");
        tool.ReadOnly.Should().BeTrue();
        tool.Destructive.Should().BeFalse();
    }

    private static PagedResult<TagResponse> Page(params TagResponse[] tags) =>
        new(tags, tags.Length, PageRequest.FirstPage, PageRequest.DefaultPageSize);
}
