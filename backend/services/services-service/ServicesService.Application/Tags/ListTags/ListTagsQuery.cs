using System.ComponentModel;
using Admin.SharedKernel;

namespace ServicesService.Application.Tags.ListTags;

public sealed record ListTagsQuery(
    [property: Description("Trecho do nome da etiqueta. Ignora maiúsculas e minúsculas. Ausente, vazio ou somente espaços não aplica filtro. Limite de 254 caracteres após remover espaços nas extremidades.")]
    SearchText? Search = null) : PagedQuery, IQuery<PagedResult<TagResponse>>
{
    public TagListFilter ToFilter()
    {
        return new TagListFilter(Page, PageSize, Search?.Value);
    }
}
