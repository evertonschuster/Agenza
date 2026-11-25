using System.ComponentModel;
using Admin.SharedKernel;

namespace ServicesService.Application.Tags.CreateTag;

public sealed record CreateTagCommand(
    [property: Description("Nome da etiqueta, com até 40 caracteres.")]
    string Name,
    [property: TagPaletteDescription]
    string Color,
    [property: Description("Descrição opcional da etiqueta, com até 200 caracteres.")]
    string? Description = null) : ICommand<TagResponse>;

file sealed class TagPaletteDescriptionAttribute()
    : DescriptionAttribute($"Cor da etiqueta em hexadecimal. Valores da paleta: {string.Join(", ", TagColor.Palette)}.");
