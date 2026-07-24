using Admin.SharedKernel;
using Admin.SharedKernel.AspNetCore;
using Asp.Versioning;
using Microsoft.AspNetCore.Mvc;
using ServicesService.Application.Services;
using ServicesService.Application.Services.CreateService;
using ServicesService.Application.Services.DeleteService;
using ServicesService.Application.Services.ListServices;
using ServicesService.Application.Services.UpdateService;

namespace ServicesService.Api.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/services")]
public class ServicesController : ControllerBase
{
    private readonly IDispatcher _dispatcher;

    public ServicesController(IDispatcher dispatcher)
    {
        _dispatcher = dispatcher;
    }

    [HttpGet]
    [ProducesResponseType<PagedResult<ServiceResponse>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> List([FromQuery] ListServicesQuery query, CancellationToken cancellationToken)
    {
        var result = await _dispatcher.Query(query, cancellationToken);
        return result.ToActionResult(this, services => Ok(services));
    }

    [HttpPost]
    [ProducesResponseType<ServiceResponse>(StatusCodes.Status201Created)]
    public async Task<IActionResult> Create(CreateServiceCommand command, CancellationToken cancellationToken)
    {
        var result = await _dispatcher.Send(command, cancellationToken);
        return result.ToActionResult(this, service => Created($"/api/v1/services/{service.Id}", service));
    }

    [HttpPut("{id:guid}")]
    [ProducesResponseType<ServiceResponse>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Update(Guid id, UpdateServiceCommand command, CancellationToken cancellationToken)
    {
        var result = await _dispatcher.Send(command with { ServiceId = id }, cancellationToken);
        return result.ToActionResult(this, service => Ok(service));
    }

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var result = await _dispatcher.Send(new DeleteServiceCommand(id), cancellationToken);
        return result.ToActionResult(this, NoContent);
    }
}
