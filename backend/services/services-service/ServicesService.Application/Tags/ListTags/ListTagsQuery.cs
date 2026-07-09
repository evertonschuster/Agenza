using Admin.SharedKernel;

namespace ServicesService.Application.Tags.ListTags;

public sealed record ListTagsQuery(Guid TenantId) : IQuery<IReadOnlyList<TagResponse>>;
