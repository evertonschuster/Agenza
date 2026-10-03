# ADR 0048 — A failure the database reports reaches the user as a generic message

Status: accepted (2026-10); replaces, for new code, the per-constraint answers of the persistence error mappers in
[ADR 0014](0014-result-pattern-domain-and-persistence-no-exceptions.md)

## Context

[ADR 0014](0014-result-pattern-domain-and-persistence-no-exceptions.md) has each feature map a unique-constraint
violation, by constraint name, to an entity-specific conflict (`TagPersistenceErrorMapper` answers "Já existe uma
etiqueta chamada 'X'."), and log only the constraints it does not recognize. That ties the Application layer to index
names and gives the database's view of a failure a voice in front of the user. The specific answer already comes from
the handler's pre-check in every ordinary case; the database only rejects a write on a lost race or on data the
pre-check does not cover.

## Decision

Whatever the database rejected (which constraint, which entity, a race or not), the user gets one generic message per
entity: `409 <Entity>.SaveFailed`, "Não foi possível salvar … Tente novamente.", without field errors. The kind of
failure and the constraint name go to the log (`Warning`), not to the response. Per-field answers come only from the
handler's pre-checks, and a retry passes through them again.

Clients follows this now (`CreateClientCommandHandler`). Tags, Categories and Services drop their persistence error
mappers when they are next touched.

## Consequences

- Application code does not know index or constraint names.
- A lost race answers generically even when its cause is known; the retry gets the specific answer.
- An unrecognized database exception still propagates to `GenericExceptionHandler` and answers 500
  ([ADR 0014](0014-result-pattern-domain-and-persistence-no-exceptions.md)).
