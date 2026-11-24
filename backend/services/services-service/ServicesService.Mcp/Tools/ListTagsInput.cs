using System.ComponentModel;
using Admin.SharedKernel;

namespace ServicesService.Mcp.Tools;

public sealed record ListTagsInput(
    [property: Description("Trecho do nome da etiqueta. Ignora maiúsculas e minúsculas. Ausente, vazio ou somente espaços não aplica filtro. Limite de 254 caracteres após remover espaços nas extremidades.")]
    string? Search = null,
    [property: Description("Página dos resultados, começando em 1. Padrão: 1.")]
    int Page = PageRequest.FirstPage,
    [property: Description("Quantidade de itens por página, entre 1 e 100. Padrão: 20.")]
    int PageSize = PageRequest.DefaultPageSize);
