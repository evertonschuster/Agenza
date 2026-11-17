# ADR 0007 — Testes e verificação

## Decisão

- **Ferramentas gratuitas:**
  - xUnit v3 em VSTest, AwesomeAssertions, NSubstitute e coverlet no .NET;
  - Vitest com cobertura v8, Testing Library e Playwright no frontend;
  - pytest, pytest-cov e Ruff no Python;
  - ESLint e Prettier no TypeScript.
- **Cobertura com limiar.** Linhas de Domain e Application têm gate no `Directory.Build.props`; o
  frontend tem limiares no `vitest.config.ts`. Cobertura não prova que toda regra foi testada.
- **O backend não tem camada de integração in-process.** Nada de Testcontainers nem
  `WebApplicationFactory`. `PersistenceTests` com EF InMemory existem só para provar atribuição de
  tenant, filtros, conversões e a cobertura de vínculos na exclusão de etiquetas
  ([ADR 0014](0014-tag-deletion-relationship-coverage.md)).
- **A prova real roda no stack Aspire**, no job de contrato do CI:
  - migrations aplicadas do zero e o fluxo OIDC;
  - isolamento HTTP entre dois donos reais (GET, PUT e DELETE de outro tenant);
  - as FKs de tenant de `ClientTags` recusadas pelo PostgreSQL;
  - drift dos tipos gerados do frontend.
- **Testes são escolhidos pelo comportamento e pelo risco**, incluindo caminhos de recusa. Uma
  mudança só de documentação confere referências, formatação e diff.
- Uma propriedade do PostgreSQL fora do alcance dos smokes é verificada à mão num banco descartável,
  e o que rodou fica registrado no PR.

## Rejeitado

- **Projetos de integração com PostgreSQL em container no CI.** Subiam de cinco a sete containers em
  paralelo e foram removidos em vez de estabilizados.
- **Uma camada dedicada de testes de runtime** com Testcontainers e host in-process. Foi criada e
  removida: o job do Aspire prova as mesmas fronteiras com o stack real.
- **FluentAssertions 8 ou posterior**, por licença.
