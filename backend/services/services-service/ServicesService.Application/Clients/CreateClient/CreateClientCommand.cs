using System.ComponentModel;
using Admin.SharedKernel;

namespace ServicesService.Application.Clients.CreateClient;

public sealed record CreateClientCommand(
    [property: Description("Nome completo do cliente, de 2 a 150 caracteres.")]
    FullName FullName,
    [property: Description("Data de nascimento no formato AAAA-MM-DD, no passado e com até 120 anos. Menores de 18 anos exigem ao menos um responsável. Omita se não souber.")]
    BirthDate? BirthDate = null,
    [property: Description("Telefone com até 20 caracteres, só dígitos, espaços, +, parênteses e hífen, com ao menos um dígito. Omita se não houver.")]
    PhoneNumber? Phone = null,
    [property: Description("E-mail com até 254 caracteres. Não pode já estar em uso por outro cliente ativo. Omita se não houver.")]
    EmailAddress? Email = null,
    [property: Description("CPF com 11 dígitos válidos, com ou sem pontos e hífen. Não pode já estar cadastrado. Omita se não houver.")]
    CpfNumber? Cpf = null,
    [property: Description("Observações administrativas internas, com até 500 caracteres. Omita se não houver.")]
    AdministrativeNotes? AdministrativeNotes = null,
    [property: Description("Responsáveis pelo cliente, até 10. Obrigatório ao menos um para menores de 18 anos. Omita se não houver.")]
    IReadOnlyList<GuardianInput>? Guardians = null,
    [property: Description("Pessoas de referência do cliente, até 10, cada uma com ao menos uma finalidade. Omita se não houver.")]
    IReadOnlyList<ReferenceContactInput>? ReferenceContacts = null,
    [property: Description("IDs das etiquetas do cliente, até 20 e sem repetição. Omita se não houver.")]
    IReadOnlyList<Guid>? TagIds = null) : ICommand<ClientResponse>;

public sealed record GuardianInput(
    [property: Description("Nome do responsável, de 2 a 150 caracteres.")]
    string Name,
    [property: Description("Vínculo do responsável com o cliente, como mãe, pai ou tutor, com até 60 caracteres.")]
    string Relationship,
    [property: Description("Telefone do responsável, no mesmo formato do telefone do cliente. Omita se não houver.")]
    PhoneNumber? Phone = null,
    [property: Description("CPF do responsável, no mesmo formato do CPF do cliente. Omita se não houver.")]
    CpfNumber? Cpf = null);

public sealed record ReferenceContactInput(
    [property: Description("Nome da pessoa de referência, de 2 a 150 caracteres.")]
    FullName Name,
    [property: Description("Vínculo da pessoa de referência com o cliente, com até 60 caracteres.")]
    string Relationship,
    [property: Description("Finalidades do contato, ao menos uma: emergency (emergência), operationalSupport (apoio operacional) ou dailyCommunication (comunicação diária).")]
    IReadOnlyList<ContactPurpose>? Purposes,
    [property: Description("Telefone da pessoa de referência, no mesmo formato do telefone do cliente. Omita se não houver.")]
    PhoneNumber? Phone = null);
