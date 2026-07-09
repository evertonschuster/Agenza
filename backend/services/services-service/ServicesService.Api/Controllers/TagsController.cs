using Admin.Identity.Client;
using Admin.SharedKernel;
using Asp.Versioning;
using Microsoft.AspNetCore.Mvc;
using ServicesService.Application.Tags;
using ServicesService.Application.Tags.CreateTag;
using ServicesService.Application.Tags.DeleteTag;
using ServicesService.Application.Tags.ListTags;
using ServicesService.Application.Tags.UpdateTag;

namespace ServicesService.Api.Controllers;

/// <summary>
/// The /api/tags contract from the frontend's docs/API.md. Authentication
/// comes from the global AuthorizeFilter (Program.cs); the tenant comes
/// exclusively from the authenticated principal's tenant_id claim via
/// ITenantAccessor - never from the request payload. Every action just
/// builds a command/query and dispatches it - validation, business
/// rules, and persistence all live in the Application layer's Tags
/// vertical slices.
/// </summary>
[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/tags")]
public class TagsController : ControllerBase
{
    private readonly ITenantAccessor _tenantAccessor;
    private readonly IDispatcher _dispatcher;

    public TagsController(ITenantAccessor tenantAccessor, IDispatcher dispatcher)
    {
        _tenantAccessor = tenantAccessor;
        _dispatcher = dispatcher;
    }

    public record TagBody(string Name, string Color, string? Description);

    [HttpGet]
    public async Task<IActionResult> List(CancellationToken cancellationToken)
    {
        if (!_tenantAccessor.TryGetTenantId(out var tenantId))
        {
            // Authenticated but not tenant-bound (e.g. an M2M token) -
            // this endpoint only makes sense for a tenant principal.
            return Forbid();
        }

        var result = await _dispatcher.Query(new ListTagsQuery(tenantId), cancellationToken);
        return result.ToActionResult(this, tags => Ok(tags));
    }

    [HttpPost]
    public async Task<IActionResult> Create(TagBody body, CancellationToken cancellationToken)
    {
        if (!_tenantAccessor.TryGetTenantId(out var tenantId))
        {
            return Forbid();
        }

        var command = new CreateTagCommand(tenantId, body.Name, body.Color, body.Description);
        var result = await _dispatcher.Send(command, cancellationToken);

        return result.ToActionResult(this, tag => Created($"/api/v1/tags/{tag.Id}", tag));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, TagBody body, CancellationToken cancellationToken)
    {
        if (!_tenantAccessor.TryGetTenantId(out var tenantId))
        {
            return Forbid();
        }

        var command = new UpdateTagCommand(tenantId, id, body.Name, body.Color, body.Description);
        var result = await _dispatcher.Send(command, cancellationToken);

        return result.ToActionResult(this, tag => Ok(tag));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        if (!_tenantAccessor.TryGetTenantId(out var tenantId))
        {
            return Forbid();
        }

        var result = await _dispatcher.Send(new DeleteTagCommand(tenantId, id), cancellationToken);
        return result.ToActionResult(this, NoContent);
    }
}
