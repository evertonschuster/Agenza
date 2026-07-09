using Admin.Identity.Client;
using Microsoft.AspNetCore.Mvc;
using ServicesService.Application.Exceptions;
using ServicesService.Application.UseCases.CreateTag;
using ServicesService.Application.UseCases.DeleteTag;
using ServicesService.Application.UseCases.ListTags;
using ServicesService.Application.UseCases.UpdateTag;
using ServicesService.Domain.Exceptions;

namespace ServicesService.Api.Controllers;

/// <summary>
/// The /api/tags contract from the frontend's docs/API.md. Authentication
/// comes from the global AuthorizeFilter (Program.cs); the tenant comes
/// exclusively from the authenticated principal's tenant_id claim via
/// ITenantAccessor - never from the request payload.
/// </summary>
[ApiController]
[Route("api/tags")]
public class TagsController : ControllerBase
{
    private readonly ITenantAccessor _tenantAccessor;
    private readonly ListTagsUseCase _listTags;
    private readonly CreateTagUseCase _createTag;
    private readonly UpdateTagUseCase _updateTag;
    private readonly DeleteTagUseCase _deleteTag;

    public TagsController(
        ITenantAccessor tenantAccessor,
        ListTagsUseCase listTags,
        CreateTagUseCase createTag,
        UpdateTagUseCase updateTag,
        DeleteTagUseCase deleteTag)
    {
        _tenantAccessor = tenantAccessor;
        _listTags = listTags;
        _createTag = createTag;
        _updateTag = updateTag;
        _deleteTag = deleteTag;
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

        var tags = await _listTags.ExecuteAsync(new ListTagsRequest(tenantId), cancellationToken);
        return Ok(tags);
    }

    [HttpPost]
    public async Task<IActionResult> Create(TagBody body, CancellationToken cancellationToken)
    {
        if (!_tenantAccessor.TryGetTenantId(out var tenantId))
        {
            return Forbid();
        }

        try
        {
            var created = await _createTag.ExecuteAsync(
                new CreateTagRequest(tenantId, body.Name, body.Color, body.Description),
                cancellationToken);

            return Created($"/api/tags/{created.Id}", created);
        }
        catch (InvalidTagException exception)
        {
            return Problem(title: exception.Message, statusCode: StatusCodes.Status400BadRequest);
        }
        catch (DuplicateTagNameException exception)
        {
            return Problem(title: exception.Message, statusCode: StatusCodes.Status409Conflict);
        }
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, TagBody body, CancellationToken cancellationToken)
    {
        if (!_tenantAccessor.TryGetTenantId(out var tenantId))
        {
            return Forbid();
        }

        try
        {
            var updated = await _updateTag.ExecuteAsync(
                new UpdateTagRequest(tenantId, id, body.Name, body.Color, body.Description),
                cancellationToken);

            return Ok(updated);
        }
        catch (TagNotFoundException exception)
        {
            return Problem(title: exception.Message, statusCode: StatusCodes.Status404NotFound);
        }
        catch (InvalidTagException exception)
        {
            return Problem(title: exception.Message, statusCode: StatusCodes.Status400BadRequest);
        }
        catch (DuplicateTagNameException exception)
        {
            return Problem(title: exception.Message, statusCode: StatusCodes.Status409Conflict);
        }
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        if (!_tenantAccessor.TryGetTenantId(out var tenantId))
        {
            return Forbid();
        }

        try
        {
            await _deleteTag.ExecuteAsync(new DeleteTagRequest(tenantId, id), cancellationToken);
            return NoContent();
        }
        catch (TagNotFoundException exception)
        {
            return Problem(title: exception.Message, statusCode: StatusCodes.Status404NotFound);
        }
    }
}
