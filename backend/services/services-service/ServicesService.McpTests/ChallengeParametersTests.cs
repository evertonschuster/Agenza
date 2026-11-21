using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using ServicesService.Mcp.Setup;

namespace ServicesService.McpTests;

public sealed class ChallengeParametersTests
{
    private const string Challenge = "Bearer resource_metadata=\"https://mcp.test/.well-known/oauth-protected-resource/mcp\"";

    [Fact]
    public async Task Sem_credencial_o_desafio_informa_o_escopo_sem_erro()
    {
        var headers = await RunAsync(authorization: null, status: 401, challenge: Challenge);

        headers.Should().Be(Challenge + ", scope=\"services-mcp\"");
    }

    [Fact]
    public async Task Com_token_recusado_o_desafio_informa_invalid_token_e_o_escopo()
    {
        var headers = await RunAsync(authorization: "Bearer abc", status: 401, challenge: Challenge);

        headers.Should().Be(Challenge + ", error=\"invalid_token\", scope=\"services-mcp\"");
    }

    [Fact]
    public async Task Resposta_que_nao_e_401_nao_muda()
    {
        var headers = await RunAsync(authorization: "Bearer abc", status: 200, challenge: Challenge);

        headers.Should().Be(Challenge);
    }

    [Fact]
    public async Task Desafio_que_ja_tem_escopo_nao_e_duplicado()
    {
        var existing = Challenge + ", scope=\"x\"";

        var headers = await RunAsync(authorization: null, status: 401, challenge: existing);

        headers.Should().Be(existing);
    }

    private static async Task<string> RunAsync(string? authorization, int status, string challenge)
    {
        var app = new ApplicationBuilder(new ServiceCollection().BuildServiceProvider());
        app.UseMcpChallengeParameters("services-mcp");
        app.Run(context =>
        {
            context.Response.StatusCode = status;
            context.Response.Headers.WWWAuthenticate = challenge;
            return context.Response.StartAsync();
        });

        var context = new DefaultHttpContext();
        if (authorization is not null)
        {
            context.Request.Headers.Authorization = authorization;
        }

        var feature = new TestResponseFeature();
        context.Features.Set<Microsoft.AspNetCore.Http.Features.IHttpResponseFeature>(feature);
        await app.Build()(context);
        await feature.FireOnStartingAsync();

        return context.Response.Headers.WWWAuthenticate.ToString();
    }

    private sealed class TestResponseFeature : Microsoft.AspNetCore.Http.Features.HttpResponseFeature
    {
        private readonly List<(Func<object, Task> Callback, object State)> _onStarting = [];

        public override void OnStarting(Func<object, Task> callback, object state) => _onStarting.Add((callback, state));

        public async Task FireOnStartingAsync()
        {
            for (var i = _onStarting.Count - 1; i >= 0; i--)
            {
                await _onStarting[i].Callback(_onStarting[i].State);
            }
        }
    }
}
