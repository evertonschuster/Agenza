using System.Text.Json;
using Admin.SharedKernel;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using ModelContextProtocol.Protocol;
using ModelContextProtocol.Server;
using NSubstitute;
using ServicesService.Application;
using ServicesService.Application.Abstractions;
using ServicesService.Mcp.Setup;
using ServicesService.Mcp.Tools;

namespace ServicesService.McpTests;

internal static class ClientToolAssertions
{
    public static JsonElement ErrorOf(CallToolResult result)
    {
        var document = JsonDocument.Parse(result.Content.OfType<TextContentBlock>().Single().Text);
        return document.RootElement.GetProperty("error").Clone();
    }

    public static IEnumerable<string> MissingDescriptions(JsonElement schema, string path)
    {
        if (schema.TryGetProperty("items", out var items))
        {
            foreach (var missing in MissingDescriptions(items, path + "[]"))
            {
                yield return missing;
            }
        }

        if (!schema.TryGetProperty("properties", out var properties))
        {
            yield break;
        }

        foreach (var property in properties.EnumerateObject())
        {
            var fullPath = $"{path}.{property.Name}";
            if (!property.Value.TryGetProperty("description", out var description) || string.IsNullOrWhiteSpace(description.GetString()))
            {
                yield return fullPath;
            }

            foreach (var missing in MissingDescriptions(property.Value, fullPath))
            {
                yield return missing;
            }
        }
    }
}

public abstract class ClientCommandToolTestBase(string toolName)
{
    protected IClientRepository Clients { get; } = Substitute.For<IClientRepository>();

    protected ITagRepository Tags { get; } = Substitute.For<ITagRepository>();

    protected IAppointmentRepository Appointments { get; } = Substitute.For<IAppointmentRepository>();

    protected IUnitOfWork UnitOfWork { get; } = Substitute.For<IUnitOfWork>();

    protected void SaveSucceeds() =>
        UnitOfWork.SaveChangesAsync(Arg.Any<CancellationToken>()).Returns(PersistenceResult.Success(1));

    protected async Task<CallToolResult> Invoke(object command)
    {
        using var provider = Services();
        using var scope = provider.CreateScope();
        var argument = JsonSerializer.SerializeToElement(command, JsonSerializerOptions.Web);
        return await McpToolCall.InvokeAsync(scope.ServiceProvider, toolName,
            new Dictionary<string, object?> { ["command"] = argument }, TestContext.Current.CancellationToken);
    }

    protected ServiceProvider Services()
    {
        var services = new ServiceCollection().AddLogging();
        services.AddSharedKernel();
        services.AddServicesApplication();
        services.AddAuthorization();
        services.AddSingleton(TimeProvider.System);
        services.AddSingleton(Clients);
        services.AddSingleton(Tags);
        services.AddSingleton(Appointments);
        services.AddSingleton(UnitOfWork);
        var jsonOptions = services.AddMcpValueObjectInputs(TimeProvider.System);
        services.AddMcpServer().WithToolExceptionHandling().WithTools<ClientsTools>(jsonOptions);
        var provider = services.BuildServiceProvider(new ServiceProviderOptions { ValidateScopes = true });
        _ = provider.GetRequiredService<IOptions<McpServerOptions>>().Value;
        return provider;
    }
}
