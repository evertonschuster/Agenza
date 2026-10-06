using Admin.SharedKernel.ValueObjects;
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
    public void ReadingAStoredBirthDate_RestoresItWithoutTodaysRules()
    {
        var options = new DbContextOptionsBuilder<ServicesDataContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        using var context = new ServicesDataContext(options);
        var converter = context.Model.FindEntityType(typeof(Client))!.FindProperty(nameof(Client.BirthDate))!.GetValueConverter()!;
        var storedLongAgo = new DateOnly(1890, 1, 1);

        converter.ConvertFromProvider(storedLongAgo).Should().Be(BirthDate.Restore(storedLongAgo));
        converter.ConvertToProvider(BirthDate.Restore(storedLongAgo)).Should().Be(storedLongAgo);
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
