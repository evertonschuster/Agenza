using Admin.Identity.Client;
using Admin.SharedKernel;
using Admin.SharedKernel.AspNetCore;
using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using ServicesService.Api.Setup;
using ServicesService.Application;
using ServicesService.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults();

builder.Services.AddControllers(options =>
{
    // A verified X-Tenant-Id header is required unless [IgnoreTenant].
    options.Filters.Add<TenantHeaderFilter>();
});
builder.Services.AddOpenApi();

builder.Services.AddExceptionHandler<GenericExceptionHandler>();
builder.Services.AddProblemDetails();
builder.Services.AddAuthorizationProblemDetails();

builder.Services
    .AddApiVersioning(options =>
    {
        options.DefaultApiVersion = new ApiVersion(1, 0);
        options.AssumeDefaultVersionWhenUnspecified = true;
        options.ReportApiVersions = true;
    })
    .AddMvc();

builder.Services.AddIdentityServiceAuthentication(builder.Configuration, audience: "services-api");
builder.Services.AddAuthorization(options =>
{
    // Endpoint-level fallback keeps the API fail-closed while allowing the
    // authorization middleware to return the shared problem contract.
    options.FallbackPolicy = new AuthorizationPolicyBuilder()
        .RequireAuthenticatedUser()
        .Build();
});

builder.Services.AddSharedKernel();
builder.Services.AddServicesApplication();
builder.Services.AddServicesInfrastructure(builder.Configuration);
builder.Services.AddHostedService<DatabaseMigrator>();

var spaOrigin = builder.Configuration["Cors:SpaOrigin"] ?? "http://localhost:5173";
builder.Services.AddCors(options =>
{
    options.AddPolicy("spa", policy => policy
        .WithOrigins(spaOrigin)
        .AllowAnyHeader()
        .AllowAnyMethod());
});

var app = builder.Build();

app.UseExceptionHandler();

if (app.Environment.IsDevelopment())
{
    // The generated contract is a development/CI artifact, not tenant-owned
    // business data. Keep it readable without a bearer token so the contract
    // drift gate can regenerate types from the running service.
    app.MapOpenApi().AllowAnonymous();
}

app.UseHttpsRedirection();

app.UseCors("spa");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapDefaultEndpoints();

app.Run();

public partial class Program;
