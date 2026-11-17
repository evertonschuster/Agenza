# ADR 0002 — Topologia de serviços e dados

Status: aceita (2026-11-15).

## Decisão

- **Serviços agregados por contexto.** Cada serviço é um pequeno monólito de um contexto de
  negócio: `identity-service` cuida de autenticação, tenants e usuários; `services-service` é o
  modelo de contexto de negócio com dados por tenant; `assistant-service` (Python) é a IA. Uma
  capacidade nova que cabe num contexto existente é uma pasta nesse serviço. Separar um contexto
  exige divergência real de escala, dono ou release, e é uma ADR.
- **Um PostgreSQL, um schema por serviço.** Cada serviço tem seu schema, seu histórico de
  migrations dentro dele e sua role sem privilégio de superusuário; `PUBLIC` não cria nem usa
  esses schemas. Serviços conversam por HTTP com token, nunca pelas tabelas uns dos outros.
- **Código compartilhado é infraestrutura.** `backend/shared/` não guarda regra de negócio. A
  exceção é `Admin.SharedKernel.ValueObjects`: formatos iguais em todo serviço (CPF, nome, telefone,
  e-mail, data de nascimento), sem contexto de negócio.
- **Provedor OIDC próprio.** `identity-service` é a autoridade, com OpenIddict e ASP.NET Identity:
  Authorization Code + PKCE para o SPA e client credentials com escopos por audiência para M2M. O
  access token é um JWT assinado e não criptografado, para que qualquer stack o valide pelo JWKS.
- **Aspire é o único orquestrador**, local e no job de contrato do CI. O AppHost sobe PostgreSQL
  (volume `agenza-postgres-data`, porta 5432), os serviços e o frontend. Não há Docker no frontend
  nem um segundo grafo de orquestração.

Detalhes de forma: [backend/docs/ARCHITECTURE.md](../../backend/docs/ARCHITECTURE.md) §1.

## Por quê

Um dono solo não sustenta a operação de microserviços finos. Schemas e roles por serviço mantêm a
posse dos dados verificável pelo banco sem multiplicar instâncias.

## Rejeitado

- **Microserviços finos por capacidade.** Custo de operação e de contrato sem ganho de escala.
- **Uma cópia por serviço dos value objects sem contexto.** Repetiria o algoritmo de dígito
  verificador e a integração com o wire em cada serviço.
- **Um pacote NuGet para esses value objects.** Uma solução só, sem feed: uma `ProjectReference`
  muda junto com quem a consome.
- **Mover `DomainResult` para o projeto compartilhado.** O Domain passaria a depender de mais do que
  formatos; ele continua duplicado por serviço.
