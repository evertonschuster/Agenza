using Admin.SharedKernel;
using Asp.Versioning;
using Microsoft.AspNetCore.Mvc;
using ServicesService.Application.Tags.CreateTag;
using ServicesService.Application.Tags.DeleteTag;
using ServicesService.Application.Tags.ListTags;
using ServicesService.Application.Tags.UpdateTag;

namespace ServicesService.Api.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/tags")]
public class TagsController : ControllerBase
{
    private readonly IDispatcher _dispatcher;

    public TagsController(IDispatcher dispatcher)
    {
        _dispatcher = dispatcher;
    }

    [HttpGet]
    public async Task<IActionResult> List(CancellationToken cancellationToken)
    {
        var result = await _dispatcher.Query(new ListTagsQuery(), cancellationToken);
        return result.ToActionResult(this, tags => Ok(tags));
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateTagCommand command, CancellationToken cancellationToken)
    {
        var result = await _dispatcher.Send(command, cancellationToken);
        return result.ToActionResult(this, tag => Created($"/api/v1/tags/{tag.Id}", tag));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, UpdateTagCommand command, CancellationToken cancellationToken)
    {
        var result = await _dispatcher.Send(command with { TagId = id }, cancellationToken);
        return result.ToActionResult(this, tag => Ok(tag));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var result = await _dispatcher.Send(new DeleteTagCommand(id), cancellationToken);
        return result.ToActionResult(this, NoContent);
    }
}
