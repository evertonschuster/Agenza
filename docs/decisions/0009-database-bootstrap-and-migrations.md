# ADR 0009 — Banco: bootstrap e migrations

## Decisão

- **Migrations e seed automáticos são opt-in.** Ficam desligados na configuração base e ligados só
  em `appsettings.Development.json` ou por override explícito
  (`DatabaseBootstrap:RunOnStartup`). Com o bootstrap ligado, cada serviço aplica suas migrations e o
  `identity-service` roda seu seed idempotente de desenvolvimento.
- **No máximo uma instância com bootstrap por serviço.** Bootstraps concorrentes não são suportados,
  e não há lock.
- **Cada serviço tem `__EFMigrationsHistory` no próprio schema.**
- **Migrations são aditivas e nunca editadas depois de commitadas.** Cada mudança gera uma migration
  com o nome dela, criada com o `dotnet ef` fixado no repositório. Uma migration que apaga ou
  reescreve dados é revisada sozinha.
- As migrations foram recriadas como um único `InitialCreate` por contexto antes do primeiro deploy.
  Um novo reset só se justifica antes de um deploy, e é uma ADR.

Comandos: [backend/docs/ARCHITECTURE.md](../../backend/docs/ARCHITECTURE.md) §5.

## Rejeitado

- **Um advisory lock do PostgreSQL serializando o bootstrap.** Foi criado e removido: a topologia
  suportada já tem um único bootstrap por serviço.
- **Um histórico de migrations comum no schema `public`.** Misturaria a posse dos schemas.
