namespace Admin.Identity.Client;

[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public sealed class IgnoreTenantAttribute : Attribute
{
}
