using Admin.SharedKernel;
using Asp.Versioning;
using Microsoft.AspNetCore.Mvc;
using ServicesService.Application.ServiceOfferings.CreateServiceOffering;
using ServicesService.Application.ServiceOfferings.DeleteServiceOffering;
using ServicesService.Application.ServiceOfferings.ListServiceOfferings;
using ServicesService.Application.ServiceOfferings.UpdateServiceOffering;

namespace ServicesService.Api.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/service-offerings")]
public class ServiceOfferingsController : ControllerBase
{
    private readonly IDispatcher _dispatcher;

    public ServiceOfferingsController(IDispatcher dispatcher)
    {
        _dispatcher = dispatcher;
    }

    [HttpGet]
    public async Task<IActionResult> List(CancellationToken cancellationToken)
    {
        var result = await _dispatcher.Query(new ListServiceOfferingsQuery(), cancellationToken);
        return result.ToActionResult(this, serviceOfferings => Ok(serviceOfferings));
    }

    [HttpPost]
    public async Task<IActionResult> Create(
        CreateServiceOfferingCommand command,
        CancellationToken cancellationToken)
    {
        var result = await _dispatcher.Send(command, cancellationToken);
        return result.ToActionResult(
            this, serviceOffering => Created($"/api/v1/service-offerings/{serviceOffering.Id}", serviceOffering));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(
        Guid id,
        UpdateServiceOfferingCommand command,
        CancellationToken cancellationToken)
    {
        var result = await _dispatcher.Send(command with { ServiceOfferingId = id }, cancellationToken);
        return result.ToActionResult(this, serviceOffering => Ok(serviceOffering));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var result = await _dispatcher.Send(new DeleteServiceOfferingCommand(id), cancellationToken);
        return result.ToActionResult(this, NoContent);
    }
}
