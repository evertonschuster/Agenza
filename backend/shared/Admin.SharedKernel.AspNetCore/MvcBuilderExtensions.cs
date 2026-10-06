using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;

namespace Admin.SharedKernel.AspNetCore;

public static class MvcBuilderExtensions
{
    public static IMvcBuilder AddValueObjectJson(this IMvcBuilder builder)
    {
        builder.Services.AddOptions<JsonOptions>()
            .Configure<TimeProvider>((options, timeProvider) =>
                options.JsonSerializerOptions.AddValueObjectConverters(timeProvider));

        return builder;
    }

    public static IMvcBuilder AddModelStateProblemDetails(this IMvcBuilder builder)
    {
        return builder.ConfigureApiBehaviorOptions(options =>
        {
            options.InvalidModelStateResponseFactory = context =>
            {
                var error = ModelStateErrorMapper.ToError(context.ModelState);
                var problem = ApiProblemDetailsFactory.CreateValidationProblem(error, context.HttpContext);

                return new ObjectResult(problem) { StatusCode = StatusCodes.Status400BadRequest };
            };
        });
    }
}
