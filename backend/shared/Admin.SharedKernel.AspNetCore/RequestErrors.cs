namespace Admin.SharedKernel.AspNetCore;

public static class RequestErrors
{
    public static readonly FieldError Invalid = new("Request.Invalid", "Não foi possível ler os dados enviados.");

    public static readonly FieldError InvalidValue = new("Request.InvalidValue", "O valor informado é inválido.");

    public static readonly FieldError FieldRequired = new("Request.FieldRequired", "Este campo é obrigatório.");
}
