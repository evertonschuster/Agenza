using System.ComponentModel;

namespace Admin.SharedKernel;

public abstract record PagedQuery
{
    [Description("Página dos resultados, começando em 1. Padrão: 1.")]
    [DefaultValue(PageRequest.FirstPage)]
    public int Page { get; init; } = PageRequest.FirstPage;

    [Description("Quantidade de itens por página, entre 1 e 100. Padrão: 20.")]
    [DefaultValue(PageRequest.DefaultPageSize)]
    public int PageSize { get; init; } = PageRequest.DefaultPageSize;
}
