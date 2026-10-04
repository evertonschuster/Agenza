using System.Text.Json;
using Admin.SharedKernel.AspNetCore;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging.Abstractions;

namespace Admin.SharedKernel.Tests;

public class GenericExceptionHandlerTests
{
    [Fact]
    public async Task TryHandleAsync_WritesA500ProblemDetailsResponse()
    {
        var handler = new GenericExceptionHandler(NullLogger<GenericExceptionHandler>.Instance);
        var httpContext = new DefaultHttpContext { Response = { Body = new MemoryStream() } };

        var handled = await handler.TryHandleAsync(httpContext, new InvalidOperationException("boom"), CancellationToken.None);

        handled.Should().BeTrue();
        httpContext.Response.StatusCode.Should().Be(StatusCodes.Status500InternalServerError);
    }

    [Theory]
    [InlineData(StatusCodes.Status413PayloadTooLarge, "Request.TooLarge")]
    [InlineData(StatusCodes.Status400BadRequest, "Request.Invalid")]
    public async Task TryHandleAsync_WithARequestTheServerRejected_AnswersItsStatusCode(int statusCode, string expectedCode)
    {
        var handler = new GenericExceptionHandler(NullLogger<GenericExceptionHandler>.Instance);
        var httpContext = new DefaultHttpContext { Response = { Body = new MemoryStream() } };

        var handled = await handler.TryHandleAsync(
            httpContext,
            new BadHttpRequestException("Request body too large.", statusCode),
            CancellationToken.None);

        handled.Should().BeTrue();
        httpContext.Response.StatusCode.Should().Be(statusCode);
        httpContext.Response.Body.Position = 0;
        var problem = await JsonSerializer.DeserializeAsync<JsonElement>(httpContext.Response.Body, cancellationToken: TestContext.Current.CancellationToken);
        problem.GetProperty("code").GetString().Should().Be(expectedCode);
        problem.GetProperty("status").GetInt32().Should().Be(statusCode);
    }
}
