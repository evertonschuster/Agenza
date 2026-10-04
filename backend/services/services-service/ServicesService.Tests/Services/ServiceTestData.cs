using ServicesService.Domain.Entities;
using ServicesService.Domain.ValueObjects;

namespace ServicesService.Tests.Services;

internal static class ServiceTestData
{
    public static DurationRange Duration(int min = 15, int duration = 30, int max = 60)
    {
        return DurationRange.Create(min, duration, max).Value;
    }

    public static Money Price(decimal value = 45.50m)
    {
        return Money.Create(value).Value;
    }

    public static Percentage Discount(decimal value = 10m)
    {
        return Percentage.Create(value).Value;
    }

    public static Service NewService(
        string name = "Haircut",
        Guid? categoryId = null,
        int code = 1,
        IReadOnlyCollection<Guid>? tagIds = null)
    {
        return Service.Create(
            Guid.NewGuid(),
            name,
            null,
            Duration(),
            Price(),
            Discount(),
            categoryId,
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
