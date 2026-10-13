using Admin.SharedKernel.AspNetCore;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Abstractions;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Primitives;
using System.Globalization;

namespace Admin.SharedKernel.Tests;

public class EnumNameModelBinderTests
{
    public enum Situation
    {
        Active = 1,
        Inactive = 2,
        All = 3,
    }

    public enum Stage
    {
        NotStarted = 1,
        InProgress = 2,
    }

    public sealed record SituationQuery(Situation? Status = Situation.Active, Stage Phase = Stage.NotStarted);

    private const string InvalidSituation = "O valor informado deve ser active, inactive ou all.";

    private static readonly EmptyModelMetadataProvider MetadataProvider = new();

    private static IList<IModelBinderProvider> Providers()
    {
        var services = new ServiceCollection();
        services.AddSingleton(TimeProvider.System);
        services.AddControllers().AddWireJson();

        return services.BuildServiceProvider().GetRequiredService<IOptions<MvcOptions>>().Value.ModelBinderProviders;
    }

    private static IModelBinder? BinderFor(Type type, BindingSource? source)
    {
        var context = new ProviderContext(MetadataProvider.GetMetadataForType(type), new BindingInfo { BindingSource = source });

        return Providers()[1].GetBinder(context);
    }

    private static async Task<ModelBindingContext> Bind<T>(string? value, bool present = true)
    {
        var binder = BinderFor(typeof(T), BindingSource.Query)!;
        var values = present
            ? new Dictionary<string, StringValues> { ["status"] = value }
            : new Dictionary<string, StringValues>();
        var valueProvider = new QueryStringValueProvider(BindingSource.Query, new QueryCollection(values), CultureInfo.InvariantCulture);
        var actionContext = new ActionContext(new DefaultHttpContext(), new RouteData(), new ActionDescriptor());
        var bindingContext = DefaultModelBindingContext.CreateBindingContext(
            actionContext,
            valueProvider,
            MetadataProvider.GetMetadataForType(typeof(T)),
            new BindingInfo { BindingSource = BindingSource.Query },
            "status");

        await binder.BindModelAsync(bindingContext);

        return bindingContext;
    }

    private static async Task<(SituationQuery? Model, ModelStateDictionary State)> BindQuery(Dictionary<string, StringValues> values)
    {
        var services = new ServiceCollection();
        services.AddSingleton(TimeProvider.System);
        services.AddLogging();
        services.AddControllers().AddWireJson();
        var provider = services.BuildServiceProvider();

        var metadata = provider.GetRequiredService<IModelMetadataProvider>().GetMetadataForType(typeof(SituationQuery));
        var parameter = new ParameterDescriptor
        {
            Name = "query",
            ParameterType = typeof(SituationQuery),
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

        return (result.Model as SituationQuery, actionContext.ModelState);
    }

    [Fact]
    public void AddWireJson_PutsTheEnumBinderBeforeTheFrameworkOnes()
    {
        var names = Providers().Select(provider => provider.GetType().Name).ToList();

        names[1].Should().Be("EnumNameModelBinderProvider");
        names.IndexOf("EnumTypeModelBinderProvider").Should().BeGreaterThan(1);
        names.IndexOf("SimpleTypeModelBinderProvider").Should().BeGreaterThan(1);
    }

    [Theory]
    [InlineData(typeof(Situation))]
    [InlineData(typeof(Situation?))]
    public void Provider_BindsAnEnumFromTheQueryTheRouteOrAProperty(Type enumType)
    {
        BinderFor(enumType, BindingSource.Query).Should().NotBeNull();
        BinderFor(enumType, BindingSource.Path).Should().NotBeNull();
        BinderFor(enumType, null).Should().NotBeNull();
    }

    [Fact]
    public void Provider_LeavesABodyParameterToTheJsonConverters()
    {
        BinderFor(typeof(Situation), BindingSource.Body).Should().BeNull();
    }

    [Theory]
    [InlineData(typeof(string))]
    [InlineData(typeof(int))]
    [InlineData(typeof(Guid))]
    [InlineData(typeof(SearchText))]
    public void Provider_LeavesEveryOtherTypeToTheOtherBinders(Type type)
    {
        BinderFor(type, BindingSource.Query).Should().BeNull();
    }

    [Theory]
    [InlineData("active", Situation.Active)]
    [InlineData("ACTIVE", Situation.Active)]
    [InlineData("Inactive", Situation.Inactive)]
    [InlineData("  all ", Situation.All)]
    public async Task Binder_BindsOneNameInAnyCase(string raw, Situation expected)
    {
        var context = await Bind<Situation?>(raw);

        context.Result.IsModelSet.Should().BeTrue();
        context.Result.Model.Should().Be(expected);
        context.ModelState.ErrorCount.Should().Be(0);
    }

    [Theory]
    [InlineData("inProgress")]
    [InlineData("InProgress")]
    [InlineData("INPROGRESS")]
    public async Task Binder_BindsTheCamelCaseNameOfTheWireAndThePascalCaseNameOfTheCode(string raw)
    {
        var context = await Bind<Stage>(raw);

        context.Result.Model.Should().Be(Stage.InProgress);
    }

    [Theory]
    [InlineData("1")]
    [InlineData("3")]
    [InlineData("0")]
    [InlineData("-1")]
    public async Task Binder_RefusesANumber_EvenOneOfAMember(string raw)
    {
        var context = await Bind<Situation?>(raw);

        context.Result.IsModelSet.Should().BeFalse();
        context.ModelState["status"]!.Errors.Should().ContainSingle().Which.ErrorMessage.Should().Be(InvalidSituation);
    }

    [Theory]
    [InlineData("active,inactive")]
    [InlineData("active, inactive")]
    [InlineData("inactive,all")]
    public async Task Binder_RefusesSeveralNames_EvenWhenTheFrameworkWouldJoinThemIntoAMember(string raw)
    {
        var context = await Bind<Situation?>(raw);

        context.Result.IsModelSet.Should().BeFalse();
        context.ModelState["status"]!.Errors.Should().ContainSingle().Which.ErrorMessage.Should().Be(InvalidSituation);
    }

    [Fact]
    public async Task Binder_RefusesAnUnknownName_WithoutEchoingIt()
    {
        var context = await Bind<Situation?>("secret-value");

        var message = context.ModelState["status"]!.Errors.Single().ErrorMessage;

        message.Should().Be(InvalidSituation);
        message.Should().NotContain("secret");
    }

    [Fact]
    public async Task Binder_NamesTheChoicesOfAnEnumWithTwoMembers()
    {
        var context = await Bind<Stage>("done");

        context.ModelState["status"]!.Errors.Single().ErrorMessage
            .Should().Be("O valor informado deve ser notStarted ou inProgress.");
    }

    [Fact]
    public async Task Binder_WithoutTheParameter_BindsNothing()
    {
        var context = await Bind<Situation?>(null, present: false);

        context.Result.IsModelSet.Should().BeFalse();
        context.ModelState.ErrorCount.Should().Be(0);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public async Task Binder_WithABlankValueForANullableEnum_BindsNull(string raw)
    {
        var context = await Bind<Situation?>(raw);

        context.Result.IsModelSet.Should().BeTrue();
        context.Result.Model.Should().BeNull();
        context.ModelState.ErrorCount.Should().Be(0);
    }

    [Fact]
    public async Task Binder_WithABlankValueForAnEnumThatIsNotNullable_Fails()
    {
        var context = await Bind<Situation>("  ");

        context.Result.IsModelSet.Should().BeFalse();
        context.ModelState["status"]!.Errors.Should().ContainSingle().Which.ErrorMessage.Should().Be(InvalidSituation);
    }

    [Fact]
    public async Task TheMvcBinder_ReadsTheEnumsOfAQueryByName()
    {
        var (model, state) = await BindQuery(new Dictionary<string, StringValues> { ["status"] = "ALL", ["phase"] = "inProgress" });

        state.ErrorCount.Should().Be(0);
        model!.Status.Should().Be(Situation.All);
        model.Phase.Should().Be(Stage.InProgress);
    }

    [Fact]
    public async Task TheMvcBinder_KeepsTheDefaultsWhenTheEnumsAreNotInTheQueryString()
    {
        var (model, state) = await BindQuery(new Dictionary<string, StringValues>());

        state.ErrorCount.Should().Be(0);
        model!.Status.Should().Be(Situation.Active);
        model.Phase.Should().Be(Stage.NotStarted);
    }

    [Theory]
    [InlineData("active,inactive")]
    [InlineData("3")]
    public async Task TheMvcBinder_AnswersTheCanonicalShapeUnderTheParameter(string raw)
    {
        var (_, state) = await BindQuery(new Dictionary<string, StringValues> { ["status"] = raw });

        var error = ModelStateErrorMapper.ToError(state);

        error.FieldErrors!.Should().ContainKey("Status")
            .WhoseValue.Should().ContainSingle()
            .Which.Should().Be(new FieldError("Validation.Failed", InvalidSituation));
    }

    private sealed class ProviderContext(ModelMetadata metadata, BindingInfo bindingInfo) : ModelBinderProviderContext
    {
        public override BindingInfo BindingInfo => bindingInfo;

        public override ModelMetadata Metadata => metadata;

        public override IModelMetadataProvider MetadataProvider => new EmptyModelMetadataProvider();

        public override IModelBinder CreateBinder(ModelMetadata metadata) => throw new NotSupportedException();
    }
}
