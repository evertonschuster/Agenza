using System.Reflection;
using Microsoft.AspNetCore.Authorization;
using ModelContextProtocol.Server;
using ServicesService.Mcp.Tools;

namespace ServicesService.McpTests;

public sealed class ToolAuthorizationTests
{
    public static TheoryData<Type> ToolTypes() => new(typeof(HelloWorldTools).Assembly.GetTypes()
        .Where(type => type.GetCustomAttribute<McpServerToolTypeAttribute>() is not null));

    [Theory]
    [MemberData(nameof(ToolTypes))]
    public void Toda_ferramenta_exige_usuario_autenticado_como_a_API(Type toolType)
    {
        var tools = toolType.GetMethods().Where(method => method.GetCustomAttribute<McpServerToolAttribute>() is not null);

        toolType.GetCustomAttribute<AuthorizeAttribute>().Should().NotBeNull();
        toolType.GetCustomAttribute<AllowAnonymousAttribute>().Should().BeNull();
        tools.Should().NotBeEmpty()
            .And.AllSatisfy(tool => tool.GetCustomAttribute<AllowAnonymousAttribute>().Should().BeNull());
    }
}
