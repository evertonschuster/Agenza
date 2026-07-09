namespace ServicesService.Application.Exceptions;

/// <summary>
/// The requested tag does not exist within the caller's tenant - also
/// raised when the tag exists under a DIFFERENT tenant, so cross-tenant
/// probing is indistinguishable from a missing record (maps to 404).
/// </summary>
public class TagNotFoundException : Exception
{
    public TagNotFoundException(Guid tagId)
        : base($"Tag '{tagId}' was not found.")
    {
    }
}
