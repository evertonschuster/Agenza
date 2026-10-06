using System.Linq.Expressions;
using System.Reflection;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace Admin.SharedKernel.EntityFrameworkCore;

public sealed class DateValueObjectConverter<T> : ValueConverter<T, DateOnly>
    where T : class, IDateValueObject<T>
{
    public DateValueObjectConverter()
        : base(value => value.Value, RestoreFromProvider())
    {
    }

    // An expression tree cannot call a static abstract member, so the public static Restore is bound by reflection.
    private static Expression<Func<DateOnly, T>> RestoreFromProvider()
    {
        var restore = typeof(T).GetMethod(
            nameof(IDateValueObject<T>.Restore),
            BindingFlags.Public | BindingFlags.Static,
            [typeof(DateOnly)])!;
        var value = Expression.Parameter(typeof(DateOnly), "value");

        return Expression.Lambda<Func<DateOnly, T>>(Expression.Call(restore, value), value);
    }
}
