namespace ServicesService.Domain.ValueObjects;

public sealed record ServiceModality : IObjectValueObject<ServiceModality, ServiceModalityInput>
{
    public const string BothRequired = "Informe se o serviço atende presencialmente e se atende online.";
    public const string Required = "O serviço precisa ser atendido presencialmente, online ou nos dois formatos.";

    public static ServiceModality InPersonOnly { get; } = new(attendsInPerson: true, attendsOnline: false);

    public bool AttendsInPerson { get; }
    public bool AttendsOnline { get; }

    private ServiceModality(bool attendsInPerson, bool attendsOnline)
    {
        AttendsInPerson = attendsInPerson;
        AttendsOnline = attendsOnline;
    }

    public static ParseResult<ServiceModality> Create(ServiceModalityInput input)
    {
        if (input.AttendsInPerson is not { } attendsInPerson || input.AttendsOnline is not { } attendsOnline)
        {
            return ParseResult<ServiceModality>.Failure(BothRequired);
        }

        return Create(attendsInPerson, attendsOnline);
    }

    public static ParseResult<ServiceModality> Create(bool attendsInPerson, bool attendsOnline)
    {
        if (!attendsInPerson && !attendsOnline)
        {
            return ParseResult<ServiceModality>.Failure(Required);
        }

        return ParseResult<ServiceModality>.Success(new ServiceModality(attendsInPerson, attendsOnline));
    }

    public static ServiceModalityInput ToInput(ServiceModality value) =>
        new(value.AttendsInPerson, value.AttendsOnline);

    public static ServiceModality Restore(bool attendsInPerson, bool attendsOnline) =>
        new(attendsInPerson, attendsOnline);
}
