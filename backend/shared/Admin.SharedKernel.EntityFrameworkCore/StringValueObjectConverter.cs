using System.Linq.Expressions;
using System.Reflection;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace Admin.SharedKernel.EntityFrameworkCore;

public sealed class StringValueObjectConverter<T> : ValueConverter<T, string>
    where T : class, IStringValueObject<T>
{
    public StringValueObjectConverter()
        : base(value => value.Value, RestoreFromProvider())
    {
    }

    // An expression tree cannot call a static abstract member, so the public static Restore is bound by reflection.
    private static Expression<Func<string, T>> RestoreFromProvider()
    {
        var restore = typeof(T).GetMethod(
            nameof(IStringValueObject<T>.Restore),
            BindingFlags.Public | BindingFlags.Static,
            [typeof(string)])!;
        var value = Expression.Parameter(typeof(string), "value");

        return Expression.Lambda<Func<string, T>>(Expression.Call(restore, value), value);
    }
}
