using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.Extensions.DependencyInjection;

namespace Admin.SharedKernel.AspNetCore;

public static class MvcBuilderExtensions
{
    public static IMvcBuilder AddModelStateProblemDetails(this IMvcBuilder builder)
    {
        return builder.ConfigureApiBehaviorOptions(options =>
        {
            options.InvalidModelStateResponseFactory = context =>
            {
                var bodyParameterNames = context.ActionDescriptor.Parameters
                    .Where(parameter => parameter.BindingInfo?.BindingSource == BindingSource.Body)
                    .Select(parameter => parameter.Name)
                    .ToList();

                var error = ModelStateErrorMapper.ToError(context.ModelState, bodyParameterNames);
                var problem = ApiProblemDetailsFactory.CreateValidationProblem(error, context.HttpContext);

                return new ObjectResult(problem) { StatusCode = StatusCodes.Status400BadRequest };
            };
        });
    }
}
