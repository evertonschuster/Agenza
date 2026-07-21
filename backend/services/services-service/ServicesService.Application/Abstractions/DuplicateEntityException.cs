namespace ServicesService.Application.Abstractions;

// Thrown by IUnitOfWork.SaveChangesAsync when a unique-constraint violation
// reaches the database - the last line of defense against a race between two
// concurrent requests that both passed the application-level NameExistsAsync
// check before either committed (docs/adr/0012). Infrastructure translates the
// provider-specific exception (Npgsql unique_violation) into this
// provider-agnostic type so Application/handlers never reference Npgsql.
public sealed class DuplicateEntityException : Exception
{
    // The Postgres constraint/index name that actually fired (e.g.
    // "IX_Services_TenantId_NameNormalized" vs "IX_Services_TenantId_Code") -
    // callers use this to report the right conflict instead of assuming every
    // 23505 on a table means a duplicate name (docs/adr/0012).
    public string? ConstraintName { get; }

    public DuplicateEntityException(Exception innerException, string? constraintName)
        : base("A unique constraint was violated.", innerException)
    {
        ConstraintName = constraintName;
    }
}
