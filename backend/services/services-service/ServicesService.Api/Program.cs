using Admin.Identity.Client;
using Admin.SharedKernel;
using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc.Authorization;
using ServicesService.Api.Setup;
using ServicesService.Application;
using ServicesService.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults();

builder.Services.AddControllers(options =>
{
    // Secure by default: every endpoint requires a valid access token from
    // identity-service unless explicitly marked [AllowAnonymous].
    options.Filters.Add(new AuthorizeFilter());
});
builder.Services.AddOpenApi();

builder.Services
    .AddApiVersioning(options =>
    {
        options.DefaultApiVersion = new ApiVersion(1, 0);
        options.AssumeDefaultVersionWhenUnspecified = true;
        options.ReportApiVersions = true;
    })
    .AddMvc();

builder.Services.AddIdentityServiceAuthentication(builder.Configuration, audience: "services-api");

builder.Services.AddSharedKernel();
builder.Services.AddServicesApplication();
builder.Services.AddServicesInfrastructure(builder.Configuration);
builder.Services.AddHostedService<DatabaseMigrator>();

// The SPA calls this API straight from the browser, so its origin must be
// allowed - same policy shape as identity-service's.
var spaOrigin = builder.Configuration["Cors:SpaOrigin"] ?? "http://localhost:5173";
builder.Services.AddCors(options =>
{
    options.AddPolicy("spa", policy => policy
        .WithOrigins(spaOrigin)
        .AllowAnyHeader()
        .AllowAnyMethod());
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

app.UseCors("spa");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapDefaultEndpoints();

app.Run();

// Exposes the implicit Program class of this top-level-statements file to
// WebApplicationFactory<Program> in ServicesService.IntegrationTests.
public partial class Program;
