using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using System.Linq.Expressions;
using System.Reflection;

namespace Admin.SharedKernel.EntityFrameworkCore;

public sealed class DateValueObjectConverter<T> : ValueConverter<T, DateOnly>
    where T : class, IDateValueObject<T>
{
    // Reutiliza as expressões por tipo T, evitando reflexão a cada instância.
    // Reduz o custo de construção; a conversão dos valores permanece igual.
    private static readonly Expression<Func<T, DateOnly>> ToProvider = value => value.Value;
    private static readonly Expression<Func<DateOnly, T>> FromProvider = RestoreFromProvider();

    public DateValueObjectConverter() : base(ToProvider, FromProvider)
    {
    }

    // Árvores de expressão não podem chamar diretamente membros static abstract.
    private static Expression<Func<DateOnly, T>> RestoreFromProvider()
    {
        var restore = typeof(T)
            .GetMethod(nameof(IDateValueObject<>.Restore), BindingFlags.Public | BindingFlags.Static, [typeof(DateOnly)])!;

        var value = Expression.Parameter(typeof(DateOnly), "value");

        return Expression.Lambda<Func<DateOnly, T>>(Expression.Call(restore, value), value);
    }
}
