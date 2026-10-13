using Admin.SharedKernel.AspNetCore;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Abstractions;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Primitives;
using System.Globalization;

namespace Admin.SharedKernel.Tests;

public class PagedQueryTests
{
    public sealed record ThingsQuery(string? Term = null, bool Archived = false) : PagedQuery;

    private static async Task<(ThingsQuery? Model, ModelStateDictionary State)> Bind(Dictionary<string, StringValues> values)
    {
        var services = new ServiceCollection();
        services.AddSingleton(TimeProvider.System);
        services.AddLogging();
        services.AddControllers().AddWireFormat();
        var provider = services.BuildServiceProvider();

        var metadata = provider.GetRequiredService<IModelMetadataProvider>().GetMetadataForType(typeof(ThingsQuery));
        var parameter = new ParameterDescriptor
        {
            Name = "query",
            ParameterType = typeof(ThingsQuery),
            BindingInfo = new BindingInfo { BindingSource = BindingSource.Query },
        };
        var binder = provider.GetRequiredService<IModelBinderFactory>().CreateBinder(
            new ModelBinderFactoryContext { Metadata = metadata, BindingInfo = parameter.BindingInfo, CacheToken = parameter });
        var actionContext = new ActionContext(
            new DefaultHttpContext { RequestServices = provider },
            new RouteData(),
            new ActionDescriptor());
        var valueProvider = new QueryStringValueProvider(BindingSource.Query, new QueryCollection(new Dictionary<string, StringValues>(values, StringComparer.OrdinalIgnoreCase)), CultureInfo.InvariantCulture);

        var result = await provider.GetRequiredService<ParameterBinder>()
            .BindModelAsync(actionContext, binder, valueProvider, parameter, metadata, value: null);

        return (result.Model as ThingsQuery, actionContext.ModelState);
    }

    [Fact]
    public void ANewQuery_AsksForTheFirstPageWithTheDefaultSize()
    {
        var query = new ThingsQuery();

        query.Page.Should().Be(PageRequest.FirstPage);
        query.PageSize.Should().Be(PageRequest.DefaultPageSize);
    }

    [Fact]
    public void ThePageAndTheSize_AreSetWithAnInitializerAndAreNotGuarded()
    {
        var query = new ThingsQuery("x") { Page = 0, PageSize = -5 };

        query.Page.Should().Be(0);
        query.PageSize.Should().Be(-5);
        query.Term.Should().Be("x");
    }

    [Fact]
    public void TwoQueriesWithTheSamePageAndMembers_AreEqual()
    {
        new ThingsQuery("x") { Page = 2 }.Should().Be(new ThingsQuery("x") { Page = 2 });
        new ThingsQuery("x") { Page = 2 }.Should().NotBe(new ThingsQuery("x") { Page = 3 });
        new ThingsQuery("x") { Page = 2 }.Should().NotBe(new ThingsQuery("y") { Page = 2 });
    }

    [Fact]
    public async Task TheMvcBinder_ReadsTheInheritedPageAndSizeAndTheOwnMembersFromTheQueryString()
    {
        var (model, state) = await Bind(new Dictionary<string, StringValues>
        {
            ["page"] = "3",
            ["pageSize"] = "50",
            ["term"] = "maria",
            ["archived"] = "true",
        });

        state.ErrorCount.Should().Be(0);
        model.Should().NotBeNull();
        model!.Page.Should().Be(3);
        model.PageSize.Should().Be(50);
        model.Term.Should().Be("maria");
        model.Archived.Should().BeTrue();
    }

    [Fact]
    public async Task TheMvcBinder_KeepsTheDefaultsWhenThePageIsNotInTheQueryString()
    {
        var (model, state) = await Bind(new Dictionary<string, StringValues> { ["term"] = "maria" });

        state.ErrorCount.Should().Be(0);
        model!.Page.Should().Be(PageRequest.FirstPage);
        model.PageSize.Should().Be(PageRequest.DefaultPageSize);
        model.Term.Should().Be("maria");
    }

    [Fact]
    public async Task TheMvcBinder_ReadsTheNamesWhateverTheirCase()
    {
        var (model, _) = await Bind(new Dictionary<string, StringValues> { ["PAGE"] = "4", ["Pagesize"] = "10" });

        model!.Page.Should().Be(4);
        model.PageSize.Should().Be(10);
    }

    [Fact]
    public async Task TheMvcBinder_ReportsAPageThatIsNotANumberUnderThePageKey()
    {
        var (_, state) = await Bind(new Dictionary<string, StringValues> { ["page"] = "abc" });

        state.Keys.Should().Contain(key => key.EndsWith("Page", StringComparison.OrdinalIgnoreCase));
    }
}
