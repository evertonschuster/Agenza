using Admin.SharedKernel;

namespace ServicesService.Application.Tags.DeleteTag;

public sealed record DeleteTagCommand(Guid TagId) : ICommand;
