using Admin.SharedKernel;
using Admin.SharedKernel.AspNetCore;
using Asp.Versioning;
using Microsoft.AspNetCore.Mvc;
using ServicesService.Application.Clients;
using ServicesService.Application.Clients.CreateClient;

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
}
