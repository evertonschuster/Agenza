using ServicesService.Domain.Entities;
using ServicesService.Domain.ValueObjects;

namespace ServicesService.PersistenceTests;

internal static class ServiceFixtures
{
    public static Service NewService(
        string name = "Haircut",
        Guid? categoryId = null,
        IReadOnlyCollection<Guid>? tagIds = null,
        PricingType pricingType = PricingType.Fixed,
        decimal? price = 45.50m)
    {
        Money? money = null;
        if (price is { } amount)
        {
            money = Money.Create(amount).Value;
        }

        return Service.Create(
            Guid.NewGuid(),
            name,
            categoryId,
            null,
            null,
            ServiceDuration.Create(30, 0, 0, 15, 60).Value,
            pricingType,
            money,
            Percentage.Create(10m).Value,
            tagIds ?? [],
            1).Value;
    }

    public static void ReplaceTags(Service service, params Guid[] tagIds)
    {
        var result = service.Update(
            service.Name,
            service.CategoryId,
            service.InternalDescription,
            service.ClientDescription,
            ServiceDuration.Create(
                service.DurationMinutes,
                service.PreparationMinutes,
                service.CleanupMinutes,
                service.MinDurationMinutes,
                service.MaxDurationMinutes).Value,
            service.PricingType,
            service.Price,
            service.MaxDiscountPercentage,
            tagIds);

        if (result.IsFailure)
        {
            throw new InvalidOperationException(result.Error.Code);
        }
    }
}
