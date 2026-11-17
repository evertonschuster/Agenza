# ADR 0011 — Logging

Status: aceita (2026-11-15).

## Decisão

- **Serilog é o pipeline de todo host .NET**, dono de `backend/shared/Admin.Logging`. Os serviços o
  recebem por `AddServiceDefaults()`, e o AppHost o referencia direto; nenhum outro projeto.
- Um serviço novo recebe tudo sem uma linha no `Program.cs`:
  - um formato de console (`[HH:mm:ss LVL] Categoria: mensagem`);
  - níveis padrão que silenciam ruído de EF e HttpClient;
  - uma linha por requisição;
  - exportação OTLP.
- **O código escreve contra `ILogger<T>`**, com template de placeholders nomeados. Domain e
  Application não referenciam Serilog, e ninguém chama o `Log` estático.
- **Nível por host** em `Serilog:MinimumLevel`; mensagens ruidosas filtradas por texto em
  `Serilog:Filter`. `Logging:LogLevel` é ignorado.
- **Mensagens levam códigos, ids e nomes de constraint**, não a entrada do usuário. Quando precisam
  levá-la, removem caracteres de controle antes (CWE-117).

## Por quê

O provedor padrão escrevia duas linhas por evento, blocos de SQL em `Information` e nada para uma
requisição normal, e o AppHost logava diferente dos serviços.
