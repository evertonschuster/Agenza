namespace ServicesService.Application.Abstractions;

public enum PersistenceErrorKind
{
    UniqueConstraintViolation,
}

// UnitOfWork logs the constraint that fired. Only the older persistence-error mappers
// branch on it (backend/docs/ARCHITECTURE.md §10); new handlers answer a generic
// <Entity>.SaveFailed (docs/decisions/0003).
public readonly record struct PersistenceError(PersistenceErrorKind Kind, string? ConstraintName);
