namespace Admin.SharedKernel;

/// <summary>
/// Resolves and invokes the ICommandHandler/IQueryHandler registered for
/// a given command/query's concrete type, running FluentValidation first
/// when a validator is registered for that type (see Dispatcher). This is
/// the one generic seam a controller depends on instead of every
/// concrete handler interface.
/// </summary>
public interface IDispatcher
{
    Task<Result> Send(ICommand command, CancellationToken cancellationToken = default);

    Task<Result<TResponse>> Send<TResponse>(ICommand<TResponse> command, CancellationToken cancellationToken = default);

    Task<Result<TResponse>> Query<TResponse>(IQuery<TResponse> query, CancellationToken cancellationToken = default);
}
