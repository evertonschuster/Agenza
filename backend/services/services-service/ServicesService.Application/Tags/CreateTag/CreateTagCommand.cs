using System.ComponentModel;
using Admin.SharedKernel;

namespace ServicesService.Application.Tags.CreateTag;

public sealed record CreateTagCommand(
    [Description("Nome da etiqueta, com até 40 caracteres.")]
    string Name,
    [Description("Cor da etiqueta em hexadecimal. Use uma cor da paleta do Agenza.")]
    string Color,
    [Description("Descrição opcional da etiqueta, com até 200 caracteres.")]
    string? Description = null) : ICommand<TagResponse>;
