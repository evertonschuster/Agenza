using System.ComponentModel;
using Admin.SharedKernel;

namespace ServicesService.Application.Tags.CreateTag;

public sealed record CreateTagCommand(
    [Description("Nome da etiqueta, com até 40 caracteres.")]
    string Name,
    [Description(
        "Cor da etiqueta em hexadecimal. Verde-azulado #0d9488, azul #0ea5e9, violeta #8b5cf6, " +
        "rosa #ec4899, vermelho #ef4444, âmbar #f59e0b, verde #22c55e e cinza #64748b.")]
    string Color,
    [Description("Descrição opcional da etiqueta, com até 200 caracteres.")]
    string? Description = null) : ICommand<TagResponse>;
