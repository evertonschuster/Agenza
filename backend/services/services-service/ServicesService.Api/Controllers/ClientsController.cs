using Admin.SharedKernel;
using Admin.SharedKernel.AspNetCore;
using Asp.Versioning;
using Microsoft.AspNetCore.Mvc;
using ServicesService.Application.Clients;
using ServicesService.Application.Clients.CreateClient;
using ServicesService.Application.Clients.GetClientById;
using ServicesService.Application.Clients.UpdateClient;

namespace ServicesService.Api.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/clients")]
public class ClientsController : AgenzaControllerBase
{
    private const long MaxRequestBodyBytes = 64 * 1024;

    private readonly IDispatcher _dispatcher;

    public ClientsController(IDispatcher dispatcher)
    {
        _dispatcher = dispatcher;
    }

    [HttpPost]
    [RequestSizeLimit(MaxRequestBodyBytes)]
    [ProducesResponseType<ApiResponse<ClientResponse>>(StatusCodes.Status201Created)]
    [ProducesResponseType<ApiProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Create(CreateClientCommand command, CancellationToken cancellationToken)
    {
        var result = await _dispatcher.Send(command, cancellationToken);
        return result.ToActionResult(this, client => Created($"/api/v1/clients/{client.Id}", client));
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType<ApiResponse<ClientResponse>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(Guid id, CancellationToken cancellationToken)
    {
        var result = await _dispatcher.Query(new GetClientByIdQuery(id), cancellationToken);
        return result.ToActionResult(this, client => Ok(client));
    }

    [HttpPut("{id:guid}")]
    [RequestSizeLimit(MaxRequestBodyBytes)]
    [ProducesResponseType<ApiResponse<ClientResponse>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ApiProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Update(Guid id, UpdateClientCommand command, CancellationToken cancellationToken)
    {
        var result = await _dispatcher.Send(command with { ClientId = id }, cancellationToken);
        return result.ToActionResult(this, client => Ok(client));
    }
}
