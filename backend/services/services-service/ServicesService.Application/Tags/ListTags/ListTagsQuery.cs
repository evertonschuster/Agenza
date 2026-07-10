using Admin.SharedKernel;

namespace ServicesService.Application.Tags.ListTags;

public sealed record ListTagsQuery : IQuery<IReadOnlyList<TagResponse>>;
