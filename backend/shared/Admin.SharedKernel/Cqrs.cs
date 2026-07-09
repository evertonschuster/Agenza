namespace Admin.SharedKernel;

/// <summary>
/// CQRS markers and handler contracts. A command mutates state and
/// returns Result (no data) or Result&lt;TResponse&gt; (e.g. the created
/// resource); a query reads state and returns Result&lt;TResponse&gt;.
/// Kept separate from IQuery even though the handler shape is identical,
/// so a feature's intent (write vs read) is visible at the type level -
/// the point of CQRS here, not a full read/write model split.
/// </summary>
public interface ICommand
{
}

public interface ICommand<TResponse>
{
}

public interface IQuery<TResponse>
{
}

public interface ICommandHandler<in TCommand>
    where TCommand : ICommand
{
    Task<Result> Handle(TCommand command, CancellationToken cancellationToken);
}

public interface ICommandHandler<in TCommand, TResponse>
    where TCommand : ICommand<TResponse>
{
    Task<Result<TResponse>> Handle(TCommand command, CancellationToken cancellationToken);
}

public interface IQueryHandler<in TQuery, TResponse>
    where TQuery : IQuery<TResponse>
{
    Task<Result<TResponse>> Handle(TQuery query, CancellationToken cancellationToken);
}
