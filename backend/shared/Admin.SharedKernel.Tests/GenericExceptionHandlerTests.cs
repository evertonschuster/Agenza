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
}
