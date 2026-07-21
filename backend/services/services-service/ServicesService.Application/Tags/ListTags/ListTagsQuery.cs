using Admin.SharedKernel;

namespace ServicesService.Application.Tags.ListTags;

public sealed record ListTagsQuery(string? Search = null) : IQuery<IReadOnlyList<TagResponse>>;
