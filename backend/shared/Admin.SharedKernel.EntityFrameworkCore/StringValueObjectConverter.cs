using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using System.Linq.Expressions;
using System.Reflection;

namespace Admin.SharedKernel.EntityFrameworkCore;

public sealed class StringValueObjectConverter<T> : ValueConverter<T, string>
    where T : class, IStringValueObject<T>
{
    // Reutiliza as expressões e executa a reflexão apenas uma vez por tipo T.
    // Reduz o custo de criação do conversor, não o custo de cada conversão.
    private static readonly Expression<Func<T, string>> ToProvider = value => value.Value;

    private static readonly Expression<Func<string, T>> FromProvider = RestoreFromProvider();

    public StringValueObjectConverter() : base(ToProvider, FromProvider)
    {
    }

    // Árvores de expressão não podem chamar diretamente membros static abstract.
    private static Expression<Func<string, T>> RestoreFromProvider()
    {
        var restore = typeof(T)
            .GetMethod(nameof(IStringValueObject<>.Restore), BindingFlags.Public | BindingFlags.Static, [typeof(string)])!;

        var value = Expression.Parameter(typeof(string), "value");

        return Expression.Lambda<Func<string, T>>(
            Expression.Call(restore, value),
            value);
    }
}
