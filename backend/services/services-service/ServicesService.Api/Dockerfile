FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY ["Directory.Packages.props", "."]
COPY ["services/services-service/ServicesService.Api/ServicesService.Api.csproj", "services/services-service/ServicesService.Api/"]
COPY ["services/services-service/ServicesService.Application/ServicesService.Application.csproj", "services/services-service/ServicesService.Application/"]
COPY ["services/services-service/ServicesService.Domain/ServicesService.Domain.csproj", "services/services-service/ServicesService.Domain/"]
COPY ["services/services-service/ServicesService.Infrastructure/ServicesService.Infrastructure.csproj", "services/services-service/ServicesService.Infrastructure/"]
COPY ["shared/Admin.Identity.Client/Admin.Identity.Client.csproj", "shared/Admin.Identity.Client/"]
RUN dotnet restore "services/services-service/ServicesService.Api/ServicesService.Api.csproj"
COPY . .
WORKDIR "/src/services/services-service/ServicesService.Api"
RUN dotnet build "ServicesService.Api.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "ServicesService.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
USER $APP_UID
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "ServicesService.Api.dll"]
