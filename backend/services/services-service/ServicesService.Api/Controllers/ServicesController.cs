using Admin.SharedKernel;
using Admin.SharedKernel.AspNetCore;
using Asp.Versioning;
using Microsoft.AspNetCore.Mvc;
using ServicesService.Application.Services;
using ServicesService.Application.Services.CreateService;
using ServicesService.Application.Services.DeactivateService;
using ServicesService.Application.Services.DeleteService;
using ServicesService.Application.Services.GetServiceById;
using ServicesService.Application.Services.ListServices;
using ServicesService.Application.Services.ReactivateService;
using ServicesService.Application.Services.UpdateService;

namespace ServicesService.Api.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/services")]
public class ServicesController : AgenzaControllerBase
{
    private const long MaxRequestBodyBytes = 64 * 1024;

    private readonly IDispatcher _dispatcher;

    public ServicesController(IDispatcher dispatcher)
    {
        _dispatcher = dispatcher;
    }

    [HttpGet]
    [ProducesResponseType<ApiResponse<PagedResult<ServiceResponse>>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> List([FromQuery] ListServicesQuery query, CancellationToken cancellationToken)
    {
        var result = await _dispatcher.Query(query, cancellationToken);
        return result.ToActionResult(this, services => Ok(services));
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType<ApiResponse<ServiceResponse>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(Guid id, CancellationToken cancellationToken)
    {
        var result = await _dispatcher.Query(new GetServiceByIdQuery(id), cancellationToken);
        return result.ToActionResult(this, service => Ok(service));
    }

    [HttpPost]
    [RequestSizeLimit(MaxRequestBodyBytes)]
    [ProducesResponseType<ApiResponse<ServiceResponse>>(StatusCodes.Status201Created)]
    [ProducesResponseType<ApiProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ApiProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Create(CreateServiceCommand command, CancellationToken cancellationToken)
    {
        var result = await _dispatcher.Send(command, cancellationToken);
        return result.ToActionResult(this, service => Created($"/api/v1/services/{service.Id}", service));
    }

    [HttpPut("{id:guid}")]
    [RequestSizeLimit(MaxRequestBodyBytes)]
    [ProducesResponseType<ApiResponse<ServiceResponse>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ApiProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Update(Guid id, UpdateServiceCommand command, CancellationToken cancellationToken)
    {
        var result = await _dispatcher.Send(command with { ServiceId = id }, cancellationToken);
        return result.ToActionResult(this, service => Ok(service));
    }

    [HttpPost("{id:guid}/deactivate")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ApiProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ApiProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Deactivate(Guid id, CancellationToken cancellationToken)
    {
        var result = await _dispatcher.Send(new DeactivateServiceCommand(id), cancellationToken);
        return result.ToActionResult(this, NoContent);
    }

    [HttpPost("{id:guid}/reactivate")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ApiProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ApiProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Reactivate(Guid id, CancellationToken cancellationToken)
    {
        var result = await _dispatcher.Send(new ReactivateServiceCommand(id), cancellationToken);
        return result.ToActionResult(this, NoContent);
    }

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ApiProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ApiProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var result = await _dispatcher.Send(new DeleteServiceCommand(id), cancellationToken);
        return result.ToActionResult(this, NoContent);
    }
}
