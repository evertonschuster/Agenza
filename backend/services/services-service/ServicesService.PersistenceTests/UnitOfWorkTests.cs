using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Logging;
using Npgsql;
using ServicesService.Application.Abstractions;
using ServicesService.Infrastructure.Persistence;

namespace ServicesService.PersistenceTests;

public class UnitOfWorkTests
{
    private static ServicesDataContext CreateContext(params IInterceptor[] interceptors)
    {
        var tenantProvider = Substitute.For<ICurrentTenantProvider>();
        tenantProvider.TenantId.Returns(Guid.NewGuid());

        var options = new DbContextOptionsBuilder<ServicesDataContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .AddInterceptors(interceptors)
            .Options;

        return new ServicesDataContext(options, tenantProvider);
    }

    private static DbUpdateException PostgresFailure(string sqlState, string? constraintName)
    {
        var postgresException = new PostgresException(
            "rejected",
            "ERROR",
            "ERROR",
            sqlState,
            constraintName: constraintName);

        return new DbUpdateException("rejected", postgresException);
    }

    [Fact]
    public async Task SaveChanges_WhenTheDatabaseRejectsAUniqueValue_ReturnsTheFailureAndLogsItAsAWarning()
    {
        var logger = new CapturingLogger();
        await using var context = CreateContext(new FailingSaveInterceptor(PostgresFailure("23505", "IX_Clients_TenantId_Email")));
        var unitOfWork = new UnitOfWork(context, logger);

        var result = await unitOfWork.SaveChangesAsync(CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Kind.Should().Be(PersistenceErrorKind.UniqueConstraintViolation);
        result.Error.ConstraintName.Should().Be("IX_Clients_TenantId_Email");
        var entry = logger.Entries.Should().ContainSingle().Subject;
        entry.Level.Should().Be(LogLevel.Warning);
        entry.Message.Should().Contain("UniqueConstraintViolation").And.Contain("IX_Clients_TenantId_Email");
    }

    [Fact]
    public async Task SaveChanges_WhenItSucceeds_LogsNothing()
    {
        var logger = new CapturingLogger();
        await using var context = CreateContext();
        var unitOfWork = new UnitOfWork(context, logger);

        var result = await unitOfWork.SaveChangesAsync(CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        logger.Entries.Should().BeEmpty();
    }

    [Fact]
    public async Task SaveChanges_WhenTheFailureIsNotAUniqueViolation_LetsItPropagateWithoutLogging()
    {
        var logger = new CapturingLogger();
        await using var context = CreateContext(new FailingSaveInterceptor(PostgresFailure("23503", "FK_Anything")));
        var unitOfWork = new UnitOfWork(context, logger);

        var act = async () => await unitOfWork.SaveChangesAsync(CancellationToken.None);

        await act.Should().ThrowAsync<DbUpdateException>();
        logger.Entries.Should().BeEmpty();
    }

    private sealed class FailingSaveInterceptor(Exception exception) : SaveChangesInterceptor
    {
        public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
            DbContextEventData eventData,
            InterceptionResult<int> result,
            CancellationToken cancellationToken = default)
        {
            throw exception;
        }
    }

    private sealed class CapturingLogger : ILogger<UnitOfWork>
    {
        public List<(LogLevel Level, string Message)> Entries { get; } = [];

        public IDisposable? BeginScope<TState>(TState state)
            where TState : notnull
        {
            return null;
        }

        public bool IsEnabled(LogLevel logLevel)
        {
            return true;
        }

        public void Log<TState>(
            LogLevel logLevel,
            EventId eventId,
            TState state,
            Exception? exception,
            Func<TState, Exception?, string> formatter)
        {
            Entries.Add((logLevel, formatter(state, exception)));
        }
    }
}
