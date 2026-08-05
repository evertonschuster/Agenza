namespace ServicesService.Application.Abstractions;

public enum PersistenceErrorKind
{
    UniqueConstraintViolation,
}

// The Postgres constraint/index name that actually fired (e.g.
// "IX_Services_TenantId_NameNormalized" vs "IX_Services_TenantId_Code") -
// callers use this to report the right conflict instead of assuming every
// unique violation on a table means a duplicate name.
public readonly record struct PersistenceError(PersistenceErrorKind Kind, string? ConstraintName);
