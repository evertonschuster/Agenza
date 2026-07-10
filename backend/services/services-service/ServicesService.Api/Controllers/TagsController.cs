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
/// comes from the global AuthorizeFilter, the tenant from the global
/// TenantHeaderFilter (Program.cs) - both run before any action here, so
/// ITenantAccessor.TenantId is always safe to read. Every action just
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
        var result = await _dispatcher.Query(new ListTagsQuery(_tenantAccessor.TenantId), cancellationToken);
        return result.ToActionResult(this, tags => Ok(tags));
    }

    [HttpPost]
    public async Task<IActionResult> Create(TagBody body, CancellationToken cancellationToken)
    {
        var command = new CreateTagCommand(_tenantAccessor.TenantId, body.Name, body.Color, body.Description);
        var result = await _dispatcher.Send(command, cancellationToken);

        return result.ToActionResult(this, tag => Created($"/api/v1/tags/{tag.Id}", tag));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, TagBody body, CancellationToken cancellationToken)
    {
        var command = new UpdateTagCommand(_tenantAccessor.TenantId, id, body.Name, body.Color, body.Description);
        var result = await _dispatcher.Send(command, cancellationToken);

        return result.ToActionResult(this, tag => Ok(tag));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var result = await _dispatcher.Send(new DeleteTagCommand(_tenantAccessor.TenantId, id), cancellationToken);
        return result.ToActionResult(this, NoContent);
    }
}
