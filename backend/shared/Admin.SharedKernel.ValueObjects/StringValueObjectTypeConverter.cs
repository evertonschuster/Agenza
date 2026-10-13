using System.ComponentModel;
using System.Globalization;

namespace Admin.SharedKernel.ValueObjects;

public sealed class StringValueObjectTypeConverter<T> : TypeConverter
    where T : class, IStringValueObject<T>
{
    public override bool CanConvertFrom(ITypeDescriptorContext? context, Type sourceType)
    {
        if (sourceType == typeof(string))
        {
            return true;
        }

        return base.CanConvertFrom(context, sourceType);
    }

    public override object? ConvertFrom(ITypeDescriptorContext? context, CultureInfo? culture, object value)
    {
        if (value is not string raw)
        {
            return base.ConvertFrom(context, culture, value);
        }

        if (string.IsNullOrWhiteSpace(raw) && T.BlankIsAbsent)
        {
            return null;
        }

        var result = T.Create(raw);
        if (result.IsFailure)
        {
            throw new FormatException(result.Error);
        }

        return result.Value;
    }
}
