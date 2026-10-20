using Admin.SharedKernel;

namespace ServicesService.Application.Tags.ListTags;

public sealed record ListTagsQuery(SearchText? Search = null) : IQuery<IReadOnlyList<TagResponse>>;
