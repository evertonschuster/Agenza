using System.ComponentModel;
using Admin.SharedKernel;

namespace ServicesService.Application.Clients.UpdateClient;

public sealed record UpdateClientCommand(
    [property: Description("ID do cliente a editar, em formato UUID. Use o valor do campo id retornado por list_clients ou get_client_by_id.")]
    Guid ClientId,
    [property: Description("Nome completo final do cliente, de 2 a 150 caracteres.")]
    FullName FullName,
    [property: Description("Data de nascimento final no formato AAAA-MM-DD, no passado e com até 120 anos. Menores de 18 anos exigem ao menos um responsável. Envie null para ficar sem data.")]
    BirthDate? BirthDate,
    [property: Description("Telefone final com até 20 caracteres, só dígitos, espaços, +, parênteses e hífen, com ao menos um dígito. Envie null para ficar sem telefone.")]
    PhoneNumber? Phone,
    [property: Description("E-mail final com até 254 caracteres. Não pode já estar em uso por outro cliente ativo. Envie null para ficar sem e-mail.")]
    EmailAddress? Email,
    [property: Description("CPF final com 11 dígitos válidos, com ou sem pontos e hífen. Não pode já estar cadastrado em outro cliente. Envie null para ficar sem CPF.")]
    CpfNumber? Cpf,
    [property: Description("Observações administrativas internas finais, com até 500 caracteres. Envie null para ficar sem observações.")]
    AdministrativeNotes? AdministrativeNotes,
    [property: Description("Lista final de responsáveis, até 10. Substitui a lista atual: envie todos os que devem permanecer. Envie null ou lista vazia para remover todos. Obrigatório ao menos um para menores de 18 anos.")]
    IReadOnlyList<UpdateGuardianInput>? Guardians,
    [property: Description("Lista final de pessoas de referência, até 10, cada uma com ao menos uma finalidade. Substitui a lista atual: envie todas as que devem permanecer. Envie null ou lista vazia para remover todas.")]
    IReadOnlyList<UpdateReferenceContactInput>? ReferenceContacts,
    [property: Description("Lista final de IDs de etiquetas, até 20 e sem repetição. Substitui a lista atual: envie todas as que devem permanecer. Use os IDs retornados por list_tags. Envie null ou lista vazia para remover todas.")]
    IReadOnlyList<Guid>? TagIds) : ICommand<ClientResponse>;

public sealed record UpdateGuardianInput(
    [property: Description("Nome do responsável, de 2 a 150 caracteres.")]
    string Name,
    [property: Description("Vínculo do responsável com o cliente, como mãe, pai ou tutor, com até 60 caracteres.")]
    string Relationship,
    [property: Description("Telefone do responsável, no mesmo formato do telefone do cliente. Envie null se não houver.")]
    PhoneNumber? Phone,
    [property: Description("CPF do responsável, no mesmo formato do CPF do cliente. Envie null se não houver.")]
    CpfNumber? Cpf);

public sealed record UpdateReferenceContactInput(
    [property: Description("Nome da pessoa de referência, de 2 a 150 caracteres.")]
    FullName Name,
    [property: Description("Vínculo da pessoa de referência com o cliente, com até 60 caracteres.")]
    string Relationship,
    [property: Description("Telefone da pessoa de referência, no mesmo formato do telefone do cliente. Envie null se não houver.")]
    PhoneNumber? Phone,
    [property: Description("Finalidades do contato, ao menos uma: emergency (emergência), operationalSupport (apoio operacional) ou dailyCommunication (comunicação diária).")]
    IReadOnlyList<ContactPurpose>? Purposes);
