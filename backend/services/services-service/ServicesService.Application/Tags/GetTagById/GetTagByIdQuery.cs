using Admin.SharedKernel;

namespace ServicesService.Application.Tags.GetTagById;

public sealed record GetTagByIdQuery(Guid TagId) : IQuery<TagResponse>;
