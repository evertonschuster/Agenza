using System.Reflection;
using FluentValidation;
using Microsoft.Extensions.DependencyInjection;

namespace Admin.SharedKernel;

// Hand-rolled instead of MediatR - see docs/adr/0005 (licensing).
public sealed class Dispatcher : IDispatcher
{
    private readonly IServiceProvider _serviceProvider;

    public Dispatcher(IServiceProvider serviceProvider)
    {
        _serviceProvider = serviceProvider;
    }

    public async Task<Result> Send(ICommand command, CancellationToken cancellationToken = default)
    {
        var commandType = command.GetType();

        var validationError = await ValidateAsync(_serviceProvider, command, commandType, cancellationToken);
        if (validationError is { } error)
        {
            return Result.Failure(error);
        }

        var handlerType = typeof(ICommandHandler<>).MakeGenericType(commandType);
        var handler = _serviceProvider.GetRequiredService(handlerType);
        var method = handlerType.GetMethod(nameof(ICommandHandler<ICommand>.Handle))!;

        return await (Task<Result>)method.Invoke(handler, [command, cancellationToken])!;
    }

    public async Task<Result<TResponse>> Send<TResponse>(
        ICommand<TResponse> command,
        CancellationToken cancellationToken = default)
    {
        var commandType = command.GetType();

        var validationError = await ValidateAsync(_serviceProvider, command, commandType, cancellationToken);
        if (validationError is { } error)
        {
            return Result.Failure<TResponse>(error);
        }

        var handlerType = typeof(ICommandHandler<,>).MakeGenericType(commandType, typeof(TResponse));
        var handler = _serviceProvider.GetRequiredService(handlerType);
        var method = handlerType.GetMethod("Handle")!;

        return await (Task<Result<TResponse>>)method.Invoke(handler, [command, cancellationToken])!;
    }

    public async Task<Result<TResponse>> Query<TResponse>(
        IQuery<TResponse> query,
        CancellationToken cancellationToken = default)
    {
        var queryType = query.GetType();

        var validationError = await ValidateAsync(_serviceProvider, query, queryType, cancellationToken);
        if (validationError is { } error)
        {
            return Result.Failure<TResponse>(error);
        }

        var handlerType = typeof(IQueryHandler<,>).MakeGenericType(queryType, typeof(TResponse));
        var handler = _serviceProvider.GetRequiredService(handlerType);
        var method = handlerType.GetMethod("Handle")!;

        return await (Task<Result<TResponse>>)method.Invoke(handler, [query, cancellationToken])!;
    }

    private static async Task<Error?> ValidateAsync(
        IServiceProvider serviceProvider,
        object request,
        Type requestType,
        CancellationToken cancellationToken)
    {
        var validatorType = typeof(IValidator<>).MakeGenericType(requestType);
        if (serviceProvider.GetService(validatorType) is not IValidator validator)
        {
            return null;
        }

        var context = new ValidationContext<object>(request);
        var result = await validator.ValidateAsync(context, cancellationToken);

        if (result.IsValid)
        {
            return null;
        }

        var message = string.Join(" ", result.Errors.Select(failure => failure.ErrorMessage));
        return Error.Validation("Validation.Failed", message);
    }
}
