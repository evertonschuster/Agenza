# ADR 0014 — Verificar vínculos locais na exclusão de etiquetas

Status: aceita (2026-11-17).

## Contexto

Uma etiqueta em uso não pode ser excluída. A verificação explícita de pessoas e serviços pode ser
esquecida quando uma nova relação com etiqueta for adicionada ao modelo.

## Decisão

O teste de persistência compara as chaves estrangeiras que apontam para `Tag` no modelo EF com um
inventário de cenários executáveis. Cada cenário cria a relação, invoca o handler de exclusão e
verifica que o tenant dono recebe `Tag.InUse` sem salvar. O inventário inclui a relação de pessoas
e a tabela de junção de serviços. Um teste negativo comprova a detecção de uma relação omitida.

O inventário é código de teste, não uma fonte de regras de domínio. Uma relação nova exige seu
cenário e a implementação da verificação de negócio correspondente. O handler e o contrato HTTP
existentes permanecem inalterados.

## Limites

A verificação cobre relações diretas do modelo EF; referências externas, dados em JSON e relações em
outros serviços precisam de proteção própria. EF InMemory não comprova restrições PostgreSQL nem
segurança sob concorrência. A corrida entre associação e exclusão lógica permanece fora desta decisão.

## Rejeitado

- **Somente um checklist:** não detecta automaticamente uma relação local esquecida.
- **Registro de provedores em produção:** o registro também pode ser esquecido; os dois vínculos
  atuais não justificam essa abstração.
- **Descoberta de regras por metadados em runtime:** o esquema não determina quais registros bloqueiam
  a exclusão nem quais nomes são apropriados para exibição.
