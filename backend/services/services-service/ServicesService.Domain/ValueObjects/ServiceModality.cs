namespace ServicesService.Domain.ValueObjects;

public sealed record ServiceModality : IObjectValueObject<ServiceModality>
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

    public static ParseResult<ServiceModality> Create(bool? attendsInPerson, bool? attendsOnline)
    {
        if (attendsInPerson is not { } inPerson || attendsOnline is not { } online)
        {
            return ParseResult<ServiceModality>.Failure(BothRequired);
        }

        if (!inPerson && !online)
        {
            return ParseResult<ServiceModality>.Failure(Required);
        }

        return ParseResult<ServiceModality>.Success(new ServiceModality(inPerson, online));
    }
}
