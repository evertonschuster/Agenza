namespace ServicesService.Application.Abstractions;

public enum PersistenceErrorKind
{
    UniqueConstraintViolation,
}

// UnitOfWork logs the constraint that fired; only the older mappers branch on it, new handlers
// answer a generic <Entity>.SaveFailed.
public readonly record struct PersistenceError(PersistenceErrorKind Kind, string? ConstraintName);
