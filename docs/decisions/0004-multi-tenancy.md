# ADR 0004 — Multi-tenancy

Status: aceita (2026-11-15).

## Decisão

- **O tenant vem só da claim do token validado.** O header `X-Tenant-Id` é conveniência de
  roteamento: o `TenantHeaderFilter` recusa header ausente, malformado ou diferente da claim antes
  da action. `[IgnoreTenant]` exige justificativa explícita e não é política de acesso anônimo.
  Nenhum command, query, DTO ou repositório de negócio aceita tenant escolhido pelo cliente.
- **Atribuição no save.** Entidades `TenantOwnedEntity` recebem o tenant atual pelo interceptor ao
  serem adicionadas; sem tenant disponível o save falha. Um tenant já atribuído não é trocado.
- **Dois filtros nomeados em toda consulta:** `SoftDelete` e `Tenant`, aplicados pela convenção do
  `DbContext`. Nenhum repositório os ignora; ler linhas excluídas exige um helper próprio que
  preserve o tenant.
- **O banco garante as relações.** Toda raiz tenant-owned expõe a chave candidata `(TenantId, Id)`,
  e relações entre entidades tenant-owned usam FK composta com o tenant. Uma FK só por `Id` entre
  elas é um defeito.
- **As claims mantêm o nome do token** (`MapInboundClaims = false`): `tenant_id` é o tenant e `sub`
  é quem fica nas colunas de auditoria.
- **Frontend:** o header vem do token da sessão, nunca de URL, query ou valor avulso em
  `localStorage`. O cliente HTTP falha fechado sem token ou tenant.
- **Serviços de IA:** um endpoint tenant-owned exige JWT com `tenant_id` e o mesmo valor no header,
  validados por uma única dependência `TenantContext`.

Prova automatizada: testes de persistência para filtros e atribuição, e smokes reais no Aspire
([ADR 0007](0007-testing-and-verification.md)). Checklist de revisão: skill
[agenza-tenant-isolation](../../.claude/skills/agenza-tenant-isolation/SKILL.md).

## Por quê

O tenant é a fronteira de segurança de um SaaS multi-tenant; ela precisa valer no servidor e no
banco, não depender de cada handler lembrar.

## Rejeitado

- **Garantir relações só na aplicação, com FKs por `Id`.** Bastava enquanto toda escrita passava
  pelo EF; foi substituído por FKs compostas para que nenhum caminho de escrita crie uma relação
  entre tenants.
- **Um filtro único combinando exclusão e tenant.** Ignorar o soft delete desligaria o tenant junto.
- **O accessor ler dois nomes de claim**, ou manter o mapeamento e remover só `sub`: cada claim
  nova seria renomeada sem aviso.
- **Tenant em rota ou query.**
