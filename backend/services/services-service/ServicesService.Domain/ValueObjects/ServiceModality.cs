namespace ServicesService.Domain.ValueObjects;

public sealed record ServiceModality
{
    public static readonly DomainError Required = new(
        "Service.ModalityRequired",
        "O serviço precisa ser atendido presencialmente, online ou nos dois formatos.");

    public static ServiceModality InPersonOnly { get; } = new(attendsInPerson: true, attendsOnline: false);

    public bool AttendsInPerson { get; }
    public bool AttendsOnline { get; }

    private ServiceModality(bool attendsInPerson, bool attendsOnline)
    {
        AttendsInPerson = attendsInPerson;
        AttendsOnline = attendsOnline;
    }

    public static DomainResult<ServiceModality> Create(bool attendsInPerson, bool attendsOnline)
    {
        if (!attendsInPerson && !attendsOnline)
        {
            return DomainResult.Failure<ServiceModality>(Required);
        }

        return DomainResult.Success(new ServiceModality(attendsInPerson, attendsOnline));
    }

    public static ServiceModality Restore(bool attendsInPerson, bool attendsOnline) =>
        new(attendsInPerson, attendsOnline);
}
