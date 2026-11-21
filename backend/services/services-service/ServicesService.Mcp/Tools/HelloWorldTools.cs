using System.ComponentModel;
using ModelContextProtocol.Server;

namespace ServicesService.Mcp.Tools;

[McpServerToolType]
public sealed class HelloWorldTools
{
    [McpServerTool(Name = "hello_world"), Description("Testa a conexão com o MCP do Agenza retornando uma saudação estática.")]
    public static string HelloWorld() => "Olá! O MCP do Agenza está funcionando.";
}
