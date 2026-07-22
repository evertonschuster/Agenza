FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY ["Directory.Packages.props", "."]
COPY ["services/identity-service/IdentityService.Api/IdentityService.Api.csproj", "services/identity-service/IdentityService.Api/"]
COPY ["services/identity-service/IdentityService.Application/IdentityService.Application.csproj", "services/identity-service/IdentityService.Application/"]
COPY ["services/identity-service/IdentityService.Domain/IdentityService.Domain.csproj", "services/identity-service/IdentityService.Domain/"]
COPY ["services/identity-service/IdentityService.Infrastructure/IdentityService.Infrastructure.csproj", "services/identity-service/IdentityService.Infrastructure/"]
RUN dotnet restore "services/identity-service/IdentityService.Api/IdentityService.Api.csproj"
COPY . .
WORKDIR "/src/services/identity-service/IdentityService.Api"
RUN dotnet build "IdentityService.Api.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "IdentityService.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
USER $APP_UID
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "IdentityService.Api.dll"]
