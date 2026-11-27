using System.Net;
using Microsoft.AspNetCore.HttpOverrides;

namespace IdentityService.Api.Setup;

public static class ReverseProxyExtensions
{
    public static IServiceCollection AddIdentityReverseProxy(this IServiceCollection services)
    {
        return services.Configure<ForwardedHeadersOptions>(options =>
        {
            options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
            options.ForwardLimit = 1;
            options.KnownIPNetworks.Clear();
            options.KnownProxies.Clear();
            options.KnownProxies.Add(IPAddress.Loopback);
            options.KnownProxies.Add(IPAddress.IPv6Loopback);
        });
    }
}
