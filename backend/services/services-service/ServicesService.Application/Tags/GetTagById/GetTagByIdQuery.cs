using System.ComponentModel;
using Admin.SharedKernel;

namespace ServicesService.Application.Tags.GetTagById;

public sealed record GetTagByIdQuery(
    [Description("ID da etiqueta em formato UUID. Use o valor do campo id da etiqueta.")]
    Guid TagId) : IQuery<TagResponse>;
