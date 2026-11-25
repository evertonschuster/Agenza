using System.ComponentModel;
using Admin.SharedKernel;

namespace ServicesService.Application.Tags.UpdateTag;

public sealed record UpdateTagCommand(
    [Description("ID da etiqueta em formato UUID. Use o valor do campo id da etiqueta.")]
    Guid TagId,
    [Description("Nome final da etiqueta, com até 40 caracteres.")]
    string Name,
    [Description(
        "Cor final da etiqueta em hexadecimal. Verde-azulado #0d9488, azul #0ea5e9, violeta #8b5cf6, " +
        "rosa #ec4899, vermelho #ef4444, âmbar #f59e0b, verde #22c55e e cinza #64748b.")]
    string Color,
    [Description(
        "Descrição final da etiqueta, com até 200 caracteres. Envie o texto atual para manter a descrição ou null para removê-la.")]
    string? Description) : ICommand<TagResponse>;
