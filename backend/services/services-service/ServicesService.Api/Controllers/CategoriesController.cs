using Admin.SharedKernel;
using Admin.SharedKernel.AspNetCore;
using Asp.Versioning;
using Microsoft.AspNetCore.Mvc;
using ServicesService.Application.Categories;
using ServicesService.Application.Categories.CreateCategory;
using ServicesService.Application.Categories.DeleteCategory;
using ServicesService.Application.Categories.ListCategories;
using ServicesService.Application.Categories.UpdateCategory;

namespace ServicesService.Api.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/categories")]
public class CategoriesController : ControllerBase
{
    private readonly IDispatcher _dispatcher;

    public CategoriesController(IDispatcher dispatcher)
    {
        _dispatcher = dispatcher;
    }

    [HttpGet]
    [ProducesResponseType<IReadOnlyList<CategoryResponse>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> List([FromQuery] ListCategoriesQuery query, CancellationToken cancellationToken)
    {
        var result = await _dispatcher.Query(query, cancellationToken);
        return result.ToActionResult(this, categories => Ok(categories));
    }

    [HttpPost]
    [ProducesResponseType<CategoryResponse>(StatusCodes.Status201Created)]
    public async Task<IActionResult> Create(CreateCategoryCommand command, CancellationToken cancellationToken)
    {
        var result = await _dispatcher.Send(command, cancellationToken);
        return result.ToActionResult(this, category => Created($"/api/v1/categories/{category.Id}", category));
    }

    [HttpPut("{id:guid}")]
    [ProducesResponseType<CategoryResponse>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Update(Guid id, UpdateCategoryCommand command, CancellationToken cancellationToken)
    {
        var result = await _dispatcher.Send(command with { CategoryId = id }, cancellationToken);
        return result.ToActionResult(this, category => Ok(category));
    }

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var result = await _dispatcher.Send(new DeleteCategoryCommand(id), cancellationToken);
        return result.ToActionResult(this, NoContent);
    }
}
