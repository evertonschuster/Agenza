namespace ServicesService.Application.Abstractions;

// Thrown by IUnitOfWork.SaveChangesAsync when a unique-constraint violation
// reaches the database - the last line of defense against a race between two
// concurrent requests that both passed the application-level NameExistsAsync
// check before either committed (docs/adr/0013). Infrastructure translates the
// provider-specific exception (Npgsql unique_violation) into this
// provider-agnostic type so Application/handlers never reference Npgsql.
public sealed class DuplicateEntityException : Exception
{
    public DuplicateEntityException(Exception innerException)
        : base("A unique constraint was violated.", innerException)
    {
    }
}
