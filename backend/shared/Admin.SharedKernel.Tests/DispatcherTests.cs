using FluentValidation;
using Microsoft.Extensions.DependencyInjection;

namespace Admin.SharedKernel.Tests;

public class DispatcherTests
{
    private sealed record Ping(string Message) : ICommand<string>;

    private sealed class PingHandler : ICommandHandler<Ping, string>
    {
        public Task<Result<string>> Handle(Ping command, CancellationToken cancellationToken) =>
            Task.FromResult(Result.Success($"pong: {command.Message}"));
    }

    private sealed class PingValidator : AbstractValidator<Ping>
    {
        public PingValidator()
        {
            RuleFor(p => p.Message).NotEmpty().WithErrorCode("Ping.MessageRequired");
        }
    }

    private sealed record Register(string Name, string Email) : ICommand;

    private sealed class RegisterHandler : ICommandHandler<Register>
    {
        public Task<Result> Handle(Register command, CancellationToken cancellationToken) =>
            Task.FromResult(Result.Success());
    }

    private sealed class RegisterValidator : AbstractValidator<Register>
    {
        public RegisterValidator()
        {
            RuleFor(r => r.Name).NotEmpty().WithErrorCode("Register.NameRequired");
            RuleFor(r => r.Email).NotEmpty().WithErrorCode("Register.EmailRequired");
        }
    }

    private sealed record CountTenants(Guid TenantId) : IQuery<int>;

    private sealed class CountTenantsHandler : IQueryHandler<CountTenants, int>
    {
        public Task<Result<int>> Handle(CountTenants query, CancellationToken cancellationToken) =>
            Task.FromResult(Result.Success(1));
    }

    private sealed record Archive(Guid Id) : ICommand;

    private sealed class ArchiveHandler : ICommandHandler<Archive>
    {
        public Task<Result> Handle(Archive command, CancellationToken cancellationToken) =>
            Task.FromResult(Result.Success());
    }

    private static IDispatcher BuildDispatcher(Action<IServiceCollection>? configure = null)
    {
        var services = new ServiceCollection();
        services.AddScoped<ICommandHandler<Ping, string>, PingHandler>();
        services.AddScoped<IQueryHandler<CountTenants, int>, CountTenantsHandler>();
        services.AddScoped<ICommandHandler<Archive>, ArchiveHandler>();
        configure?.Invoke(services);

        return new Dispatcher(services.BuildServiceProvider());
    }

    [Fact]
    public async Task Send_Generic_ResolvesAndInvokesTheRegisteredHandler()
    {
        var dispatcher = BuildDispatcher();

        var result = await dispatcher.Send(new Ping("hi"));

        result.IsSuccess.Should().BeTrue();
        result.Value.Should().Be("pong: hi");
    }

    [Fact]
    public async Task Send_NonGeneric_ResolvesAndInvokesTheRegisteredHandler()
    {
        var dispatcher = BuildDispatcher();

        var result = await dispatcher.Send(new Archive(Guid.NewGuid()));

        result.IsSuccess.Should().BeTrue();
    }

    [Fact]
    public async Task Query_ResolvesAndInvokesTheRegisteredHandler()
    {
        var dispatcher = BuildDispatcher();

        var result = await dispatcher.Query(new CountTenants(Guid.NewGuid()));

        result.IsSuccess.Should().BeTrue();
        result.Value.Should().Be(1);
    }

    [Fact]
    public async Task Send_WithARegisteredValidator_RunsItBeforeTheHandler()
    {
        var dispatcher = BuildDispatcher(services => services.AddScoped<IValidator<Ping>, PingValidator>());

        var result = await dispatcher.Send(new Ping(""));

        result.IsFailure.Should().BeTrue();
        result.Error.Type.Should().Be(ErrorType.Validation);
    }

    [Fact]
    public async Task Send_WithARegisteredValidator_AndValidCommand_StillInvokesTheHandler()
    {
        var dispatcher = BuildDispatcher(services => services.AddScoped<IValidator<Ping>, PingValidator>());

        var result = await dispatcher.Send(new Ping("hi"));

        result.IsSuccess.Should().BeTrue();
        result.Value.Should().Be("pong: hi");
    }

    [Fact]
    public async Task Send_WithAFailingValidator_GroupsFieldErrorsByPropertyName()
    {
        var dispatcher = BuildDispatcher(services =>
        {
            services.AddScoped<ICommandHandler<Register>, RegisterHandler>();
            services.AddScoped<IValidator<Register>, RegisterValidator>();
        });

        var result = await dispatcher.Send(new Register("", ""));

        result.IsFailure.Should().BeTrue();
        result.Error.FieldErrors.Should().NotBeNull();
        result.Error.FieldErrors!.Should().ContainKey(nameof(Register.Name))
            .WhoseValue.Should().ContainSingle(e => e.Code == "Register.NameRequired");
        result.Error.FieldErrors!.Should().ContainKey(nameof(Register.Email))
            .WhoseValue.Should().ContainSingle(e => e.Code == "Register.EmailRequired");
    }
}
