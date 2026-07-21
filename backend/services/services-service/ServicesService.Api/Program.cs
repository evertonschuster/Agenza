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
    // Fail-closed: auth required unless [AllowAnonymous]; a verified X-Tenant-Id header required unless [IgnoreTenant].
    options.Filters.Add(new AuthorizeFilter());
    options.Filters.Add<TenantHeaderFilter>();
});
builder.Services.AddOpenApi();

builder.Services.AddExceptionHandler<GenericExceptionHandler>();
builder.Services.AddProblemDetails();

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
    app.MapOpenApi();
}

app.UseHttpsRedirection();

app.UseCors("spa");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapDefaultEndpoints();

app.Run();

// Exposes Program to WebApplicationFactory<Program> in ServicesService.IntegrationTests.
public partial class Program;
