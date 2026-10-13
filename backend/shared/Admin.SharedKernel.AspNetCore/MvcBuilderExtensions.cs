using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;

namespace Admin.SharedKernel.AspNetCore;

public static class MvcBuilderExtensions
{
    public static IMvcBuilder AddWireFormat(this IMvcBuilder builder)
    {
        builder.Services.AddOptions<JsonOptions>()
            .Configure<TimeProvider>((options, timeProvider) =>
                options.JsonSerializerOptions
                    .AddValueObjectConverters(timeProvider)
                    .AddEnumNameConverter());

        builder.Services.ConfigureHttpJsonOptions(options => options.SerializerOptions.AddEnumNameConverter());

        builder.AddMvcOptions(options =>
        {
            options.ModelBinderProviders.Insert(0, new StringValueObjectModelBinderProvider());
            options.ModelBinderProviders.Insert(1, new EnumNameModelBinderProvider());
        });

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
