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

public class StringValueObjectModelBinderTests
{
    private static readonly EmptyModelMetadataProvider MetadataProvider = new();

    private static IModelBinderProvider Provider()
    {
        var services = new ServiceCollection();
        services.AddSingleton(TimeProvider.System);
        services.AddControllers().AddWireFormat();
        var options = services.BuildServiceProvider().GetRequiredService<IOptions<MvcOptions>>().Value;

        return options.ModelBinderProviders[0];
    }

    private static IModelBinder? BinderFor(Type type, BindingSource? source)
    {
        var context = new ProviderContext(MetadataProvider.GetMetadataForType(type), new BindingInfo { BindingSource = source });

        return Provider().GetBinder(context);
    }

    private static async Task<ModelBindingContext> Bind<T>(string? value, bool present = true)
    {
        var binder = BinderFor(typeof(T), BindingSource.Query)!;
        var values = present
            ? new Dictionary<string, StringValues> { ["q"] = value }
            : new Dictionary<string, StringValues>();
        var valueProvider = new QueryStringValueProvider(BindingSource.Query, new QueryCollection(values), CultureInfo.InvariantCulture);
        var actionContext = new ActionContext(new DefaultHttpContext(), new RouteData(), new ActionDescriptor());
        var bindingContext = DefaultModelBindingContext.CreateBindingContext(
            actionContext,
            valueProvider,
            MetadataProvider.GetMetadataForType(typeof(T)),
            new BindingInfo { BindingSource = BindingSource.Query },
            "q");

        await binder.BindModelAsync(bindingContext);

        return bindingContext;
    }

    [Fact]
    public void AddWireFormat_PutsTheValueObjectBinderBeforeEveryDefaultOne()
    {
        Provider().GetType().Name.Should().Be("StringValueObjectModelBinderProvider");
    }

    [Theory]
    [InlineData(typeof(SearchText))]
    [InlineData(typeof(RequiredName))]
    public void Provider_BindsAStringValueObjectThatDeclaresTheConverterFromTheQueryTheRouteOrAProperty(Type valueObject)
    {
        BinderFor(valueObject, BindingSource.Query).Should().NotBeNull();
        BinderFor(valueObject, BindingSource.Path).Should().NotBeNull();
        BinderFor(valueObject, null).Should().NotBeNull();
    }

    [Theory]
    [InlineData(typeof(CpfNumber))]
    [InlineData(typeof(EmailAddress))]
    [InlineData(typeof(FullName))]
    [InlineData(typeof(PhoneNumber))]
    [InlineData(typeof(AdministrativeNotes))]
    public void Provider_NeverBindsPersonalDataFromAUrl(Type valueObject)
    {
        BinderFor(valueObject, BindingSource.Query).Should().BeNull();
        BinderFor(valueObject, BindingSource.Path).Should().BeNull();
    }

    [Theory]
    [InlineData(typeof(string))]
    [InlineData(typeof(int))]
    [InlineData(typeof(Guid))]
    [InlineData(typeof(DateOnly))]
    [InlineData(typeof(BirthDate))]
    [InlineData(typeof(Level))]
    public void Provider_LeavesEveryOtherTypeToTheFramework(Type type)
    {
        BinderFor(type, BindingSource.Query).Should().BeNull();
    }

    [Fact]
    public void Provider_LeavesABodyParameterToTheJsonConverters()
    {
        BinderFor(typeof(SearchText), BindingSource.Body).Should().BeNull();
    }

    [Theory]
    [InlineData("maria", "maria")]
    [InlineData("  Maria SILVA ", "maria silva")]
    public async Task Binder_BindsTheNormalizedValue(string raw, string expected)
    {
        var context = await Bind<SearchText>(raw);

        context.Result.IsModelSet.Should().BeTrue();
        ((SearchText)context.Result.Model!).Value.Should().Be(expected);
        context.ModelState.ErrorCount.Should().Be(0);
    }

    [Fact]
    public async Task Binder_UsesTheRulesOfTheValueObject()
    {
        var context = await Bind<RequiredName>("  Maria ");

        ((RequiredName)context.Result.Model!).Value.Should().Be("Maria");
    }

    [Fact]
    public async Task Binder_WithoutTheParameter_BindsNothing()
    {
        var context = await Bind<SearchText>(null, present: false);

        context.Result.IsModelSet.Should().BeFalse();
        context.ModelState.ErrorCount.Should().Be(0);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public async Task Binder_WithABlankValue_BindsNullBecauseBlankIsAbsent(string raw)
    {
        var context = await Bind<SearchText>(raw);

        context.Result.IsModelSet.Should().BeTrue();
        context.Result.Model.Should().BeNull();
        context.ModelState.ErrorCount.Should().Be(0);
    }

    [Fact]
    public async Task Binder_WithABlankValueOfATypeThatRequiresOne_FailsWithItsMessage()
    {
        var context = await Bind<RequiredName>("  ");

        context.Result.IsModelSet.Should().BeFalse();
        context.ModelState["q"]!.Errors.Should().ContainSingle().Which.ErrorMessage.Should().Be("O nome é obrigatório.");
    }

    [Fact]
    public async Task Binder_WithAnInvalidValue_AddsTheMessageOfTheValueObjectUnderTheParameter()
    {
        var context = await Bind<SearchText>(new string('a', SearchText.MaxLength + 1));

        context.Result.IsModelSet.Should().BeFalse();
        context.ModelState["q"]!.Errors.Should().ContainSingle()
            .Which.ErrorMessage.Should().Be("A busca deve ter no máximo 254 caracteres.");
    }

    [Fact]
    public async Task Binder_NeverEchoesTheInvalidValueInTheError()
    {
        var context = await Bind<RequiredName>("secret-value");

        var message = context.ModelState["q"]!.Errors.Single().ErrorMessage;

        message.Should().Be("O nome deve ter no máximo 5 caracteres.");
        message.Should().NotContain("secret");
    }

    [Fact]
    public async Task Binder_AnswersTheCanonicalShapeThroughTheErrorMapper()
    {
        var context = await Bind<SearchText>(new string('a', SearchText.MaxLength + 1));

        var error = ModelStateErrorMapper.ToError(context.ModelState);

        error.FieldErrors!["q"].Should().ContainSingle()
            .Which.Should().Be(new FieldError("Validation.Failed", "A busca deve ter no máximo 254 caracteres."));
    }

    private enum Level
    {
        Low,
        High,
    }

    private sealed class ProviderContext(ModelMetadata metadata, BindingInfo bindingInfo) : ModelBinderProviderContext
    {
        public override BindingInfo BindingInfo => bindingInfo;

        public override ModelMetadata Metadata => metadata;

        public override IModelMetadataProvider MetadataProvider => new EmptyModelMetadataProvider();

        public override IModelBinder CreateBinder(ModelMetadata metadata) => throw new NotSupportedException();
    }
}
