using ServicesService.Application.Clients;

namespace ServicesService.Api.Setup;

public static class ClientEnumJsonExtensions
{
    public static IMvcBuilder AddClientEnumJson(this IMvcBuilder builder)
    {
        builder.AddJsonOptions(options => options.JsonSerializerOptions.AddClientEnumConverters());
        builder.Services.ConfigureHttpJsonOptions(options => options.SerializerOptions.AddClientEnumConverters());

        return builder;
    }
}
