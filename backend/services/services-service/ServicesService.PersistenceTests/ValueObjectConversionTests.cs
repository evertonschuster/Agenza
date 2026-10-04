using Microsoft.EntityFrameworkCore;
using ServicesService.Domain.Entities;
using ServicesService.Domain.ValueObjects;
using ServicesService.Infrastructure.Persistence;

namespace ServicesService.PersistenceTests;

public class ValueObjectConversionTests
{
    [Theory]
    [InlineData(typeof(Client), nameof(Client.FullName), "A")]
    [InlineData(typeof(Client), nameof(Client.Phone), "ramal 21")]
    [InlineData(typeof(Client), nameof(Client.Email), "maria@localhost")]
    [InlineData(typeof(Client), nameof(Client.Cpf), "00000000000")]
    [InlineData(typeof(Client), nameof(Client.AdministrativeNotes), "  Prefere contato pela tarde.  ")]
    [InlineData(typeof(ClientGuardian), nameof(ClientGuardian.Phone), "ramal 21")]
    [InlineData(typeof(ClientGuardian), nameof(ClientGuardian.Cpf), "00000000000")]
    [InlineData(typeof(ClientReferenceContact), nameof(ClientReferenceContact.Phone), "ramal 21")]
    [InlineData(typeof(Tag), nameof(Tag.Color), "#123456")]
    public void ReadingAStoredValue_RestoresItWithoutTodaysRules(Type entityType, string propertyName, string storedValue)
    {
        var options = new DbContextOptionsBuilder<ServicesDataContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        using var context = new ServicesDataContext(options);
        var converter = context.Model.FindEntityType(entityType)!.FindProperty(propertyName)!.GetValueConverter()!;

        var restored = converter.ConvertFromProvider(storedValue);

        restored.Should().BeEquivalentTo(new { Value = storedValue });
    }

    [Fact]
    public void ReadingAStoredPriceAndDiscount_RestoresThemWithoutTodaysRules()
    {
        var options = new DbContextOptionsBuilder<ServicesDataContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        using var context = new ServicesDataContext(options);
        var services = context.Model.FindEntityType(typeof(Service))!;

        services.FindProperty(nameof(Service.Price))!.GetValueConverter()!
            .ConvertFromProvider(-1m).Should().Be(Money.Restore(-1m));
        services.FindProperty(nameof(Service.MaxDiscountPercentage))!.GetValueConverter()!
            .ConvertFromProvider(150m).Should().Be(Percentage.Restore(150m));
    }

    [Fact]
    public void ReadingStoredPurposes_RestoresThemWithoutTodaysRules()
    {
        var options = new DbContextOptionsBuilder<ServicesDataContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        using var context = new ServicesDataContext(options);
        var converter = context.Model
            .FindEntityType(typeof(ClientReferenceContact))!
            .FindProperty(nameof(ClientReferenceContact.Purposes))!
            .GetValueConverter()!;

        converter.ConvertFromProvider(0).Should().Be(ContactPurposes.Restore(ContactPurpose.None));
    }
}
