using ServicesService.Domain.Entities;
using ServicesService.Domain.ValueObjects;

namespace ServicesService.Tests.Services;

internal static class ServiceTestData
{
    public static ServiceDuration Duration(
        int duration = 30,
        int preparation = 0,
        int cleanup = 0,
        int? min = 15,
        int? max = 60)
    {
        return ServiceDuration.Create(duration, preparation, cleanup, min, max).Value;
    }

    public static Money Price(decimal value = 45.50m)
    {
        return Money.Create(value).Value!;
    }

    public static Percentage Discount(decimal value = 10m)
    {
        return Percentage.Create(value).Value!;
    }

    public static Service NewService(
        string name = "Haircut",
        Guid? categoryId = null,
        int code = 1,
        IReadOnlyCollection<Guid>? tagIds = null,
        PricingType pricingType = PricingType.Fixed,
        decimal? price = 45.50m)
    {
        Money? money = null;
        if (price is { } amount)
        {
            money = Price(amount);
        }

        return Service.Create(
            Guid.NewGuid(),
            name,
            categoryId,
            null,
            null,
            Duration(),
            pricingType,
            money,
            Discount(),
            tagIds ?? [],
            code).Value;
    }

    public static Tag NewTag(string name = "VIP", string color = "#0d9488")
    {
        return Tag.Create(Guid.NewGuid(), name, TagColor.Create(color).Value, null).Value;
    }

    public static Category NewCategory(string name = "Hair")
    {
        return Category.Create(Guid.NewGuid(), name).Value;
    }
}
