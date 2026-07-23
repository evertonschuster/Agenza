# Refatoração do frontend — comentários, componentização e organização

Use este prompt para orientar um agente de programação a continuar a
refatoração arquitetural do frontend do Agenza.

## Prompt para o agente

Você é o agente principal responsável por continuar e concluir a refatoração
arquitetural do frontend do Agenza.

Repositório:

`D:\Agenza`

Frontend principal:

`D:\Agenza\apps\admin-frontend`

Esta é uma tarefa de **implementação**, não apenas de análise. Inspecione,
planeje, refatore, teste, atualize documentação e valide todos os gates. Não
encerre após apresentar um plano.

## 1. Objetivo

Refatorar e reorganizar o frontend para:

- Reduzir comentários excessivos, redundantes, históricos ou incorretos.
- Simplificar código que atualmente depende de grandes blocos de comentários.
- Separar responsabilidades reais entre páginas, hooks e componentes React.
- Eliminar god hooks, prop drilling excessivo e ciclos de tipos.
- Decompor Serviços, Tags e Categorias sem criar um CRUD genérico.
- Reorganizar fisicamente a aplicação conforme o ADR 009.
- Corrigir instruções e skills que ainda ensinam a arquitetura antiga.
- Preservar autenticação, isolamento de tenant, acessibilidade e comportamento
  atual.
- Manter ou melhorar build, testes e cobertura.

Não implemente a feature Clientes nesta tarefa. `ClientsPage` ainda é um stub.
Primeiro deixe a arquitetura preparada para que Clientes nasça no padrão
correto.

## 2. Estado atual importante

O worktree possui aproximadamente 128 entradas modificadas, removidas ou não
rastreadas, pertencentes ao trabalho anterior do usuário.

Regras obrigatórias:

- Não use `git reset`, `git checkout --`, `git clean`, stash automático ou
  qualquer comando destrutivo.
- Não descarte mudanças existentes.
- Não reverta arquivos apenas porque não estão no HEAD.
- Não faça commit, push, PR ou deploy.
- Diferencie o código anterior, a refatoração já presente e suas novas
  alterações.
- Mantenha o trabalho atual funcional durante toda a refatoração.

Baseline verificado anteriormente:

- Governance checks: passaram.
- Architecture guard: passou.
- Prettier: passou.
- ESLint com `--max-warnings=0`: passou.
- Build: passou.
- Vitest: 428/428 testes passaram.
- Cobertura:
  - lines: 91,03%
  - statements: 90,83%
  - branches: 85,58%
  - functions: 84,83%

A versão local observada era Node 22.18.0, mas o projeto exige Node 22.22.1.
Use a versão declarada em `.nvmrc` antes de considerar os resultados finais
oficiais.

## 3. Leitura obrigatória

Leia integralmente antes de editar:

1. `D:\Agenza\AGENTS.md`
2. `D:\Agenza\apps\admin-frontend\AGENTS.md`
3. `D:\Agenza\apps\admin-frontend\docs\STATUS.md`
4. `D:\Agenza\apps\admin-frontend\docs\DECISIONS.md`
5. `D:\Agenza\apps\admin-frontend\docs\API.md`
6. ADRs 006, 007, 008, 009 e 010 do frontend.
7. Skills:
   - `agenza-architecture-review`
   - `agenza-frontend-feature`
   - `agenza-rule-persistence`
   - `agenza-tenant-isolation-review`
   - `agenza-api-contract-review`, se algum contrato for tocado
8. `apps/admin-frontend/.skills/admin-tdd-conventions/SKILL.md`
9. Configurações de ESLint, Vitest, TypeScript, Vite e Playwright.
10. Testes relacionados a cada arquivo antes de refatorá-lo.

A skill `agenza-frontend-feature` está semanticamente desatualizada em alguns
pontos. Onde ela conflitar com AGENTS e ADRs 006–010, considere os ADRs e as
regras mais recentes como fonte de verdade. Corrija a skill nesta mesma
tarefa.

## 4. Modo de trabalho

Antes de editar:

1. Verifique `git status`.
2. Registre o baseline.
3. Mapeie imports e dependências dos arquivos que serão movidos.
4. Crie um plano por fases.
5. Adicione ou ajuste testes antes de mudanças de concorrência, sessão ou
   tenant.

Trabalhe incrementalmente.

Após cada fase relevante:

- Rode os testes diretamente afetados.
- Rode TypeScript/build quando imports ou tipos mudarem.
- Não acumule várias fases quebradas.
- Não esconda falhas com casts, `any`, `eslint-disable`, aumento global de
  timeout ou redução de cobertura.

Use subagentes para inspeções independentes se isso ajudar, mas evite edições
concorrentes nos mesmos arquivos.

## 5. Política de comentários

O padrão desejado é não comentar quando nomes, tipos e estrutura já explicam
o código.

Um comentário local só deve permanecer quando explicar um motivo não óbvio,
como:

- Segurança ou isolamento de tenant.
- Concorrência e prevenção de race condition.
- Comportamento peculiar do React, Radix, React Hook Form, Zod ou browser.
- Uma supressão de lint realmente inevitável.
- Restrição de contrato que não pode ser expressa por tipo ou nome.

Regras:

- Comentários normalmente devem ter uma a três linhas.
- Não crie JSDoc para apenas descrever uma interface, classe, hook, prop,
  retorno ou método claramente nomeado.
- Não narre o que a próxima linha faz.
- Não mantenha história da refatoração no código.
- Não escreva “bug que isso substitui”, “implementação futura”, “placeholder”
  ou decisões provisórias dentro de código final.
- Não replique texto de ADR, AGENTS, API.md ou skills.
- Quando o racional já estiver em ADR, preserve no máximo uma referência
  curta se o comportamento local for surpreendente.
- Não mencione fixtures ou estratégia de testes em comentários de produção.
- Se um mecanismo precisa de um parágrafo para ser entendido, primeiro tente
  simplificar o mecanismo, seus nomes e seus tipos.
- Não adicione um gate cego por quantidade de comentários. Qualidade de
  comentário é semântica.

### 5.1 Comentários incorretos que devem ser corrigidos

Revise obrigatoriamente:

- `presentation/components/ErrorBoundary.tsx`
  - Não afirmar que captura erros ocorridos antes de `render`.
  - Não afirmar que o log ocorre apenas em dev se `console.error` roda em
    produção.
- `application/use-cases/auth/HandleAuthCallback.ts`
  - Remover a afirmação de que a infraestrutura real ainda não existe.
- `infrastructure/auth/OidcAuthRepository.ts`
  - Não afirmar que é o único arquivo que importa `oidc-client-ts`.
- `infrastructure/http/ApiError.ts`
  - Corrigir a afirmação de que representa qualquer non-2xx.
- `presentation/hooks/useAsync.ts`
  - Remover referências a features inexistentes ou consumidores antigos.
  - Não afirmar garantias absolutas sobre o scheduler de passive effects sem
    mecanismo comprovável.

### 5.2 Comentários que devem sair do código

Reduza os blocos que repetem:

- ADR 006 em AuthProvider, useAuth e TenantBoundary.
- ADR 007 em AppError, error mapping e ErrorBoundary.
- ADR 008 em container, main e AppProviders.
- ADR 010 nos três Api repositories.
- Estratégia de fake em interfaces de produção.
- Explicações óbvias dos métodos de AuthRepository.
- JSDocs introdutórios de entidades, use cases, ports e fake repositories.
- Comentários repetidos de generation/reset em Tags, Categories e Services.

### 5.3 Comentários que devem permanecer curtos

Preserve, de maneira concisa:

- Verificação server-side do `X-Tenant-Id`.
- Diferença entre timeout e falha de rede.
- Defensive copy de arrays externos.
- Peculiaridades relevantes de coerção do Zod.
- Motivo para preservar `displayTarget` durante a animação.
- Forward de `ref` para `setFocus`.
- Motivo para recarregar a página diante de chunk obsoleto.
- Justificativas locais para supressões de lint inevitáveis.

Faça uma limpeza global de comentários somente depois de simplificar os
arquivos principais, para evitar retrabalho.

## 6. Corrigir o snapshot de autenticação

A refatoração anterior não concluiu o snapshot atômico da sessão.

Atualmente `createAppContainer()` fornece ao HTTP client callbacks separados
para:

- Obter access token.
- Obter tenant id.

Isso pode chamar `authRepository.getCurrentSession()` duas vezes na mesma
requisição e combinar dados de snapshots diferentes durante uma transição de
sessão.

Refatore para uma única leitura por request, com um contrato equivalente a:

```ts
interface RequestSession {
  accessToken: string
  tenantId: string | null
}

type GetRequestSession = () => Promise<RequestSession | null>
```

O nome e a localização exatos devem respeitar as camadas finais.

Critérios:

- Uma chamada ao HTTP client lê a sessão uma vez.
- Token e tenant vêm do mesmo snapshot.
- Ausência de sessão invalida a autenticação.
- 401 continua notificando o `SessionEventBus`.
- Infrastructure não importa React.
- Presentation não conhece detalhes de OIDC.
- Testes comprovam uma única leitura e consistência do snapshot.
- Nenhum contrato público backend deve ser alterado.

## 7. Simplificar useAsync

`useAsync.ts` possui cerca de 189 linhas, sendo aproximadamente 89 de
comentários. Não resolva isso apenas apagando comentários.

O hook deve continuar garantindo:

- Nenhuma atualização após unmount.
- Somente a leitura mais recente pode publicar resultado.
- Mudança de `resetKey` não exibe dados da chave anterior.
- Mutação iniciada numa geração antiga não altera a geração atual.
- Refetch de uma sessão antiga não repopula a atual.
- Uma mutação confirmada não depende do sucesso do refetch posterior.
- Invalidação autoritativa de sessão continua funcionando.

Simplifique a modelagem para que essas garantias estejam expressas no estado e
nos tipos.

Prefira:

- Estado associado explicitamente à sua chave/generation.
- Um reducer ou estado estruturado quando isso reduzir refs independentes.
- Derivar o estado visível pela correspondência entre `state.key` e
  `resetKey`.
- IDs/generations com semântica única e nomes explícitos.
- Testes de deferred promises que provem cada race.

Evite:

- Afirmações frágeis sobre ordem de passive effects.
- Atualização de estado durante render se houver alternativa simples.
- Vários refs cuja relação só possa ser compreendida por um longo comentário.
- Supressões de lint espalhadas.
- Novas abstrações de server-state ou bibliotecas globais sem ADR.

Use obrigatoriamente a skill `agenza-tenant-isolation-review` nessa parte.

Não encerre essa fase enquanto os testes de troca de tenant, mutação pendente,
refetch antigo e unmount estiverem verdes.

## 8. Decompor Serviços por responsabilidade

`ServicesPage.tsx` com aproximadamente 33 linhas está adequado. Mantenha-o
como shell de composição.

O problema está em:

- `useServicesController.ts`: aproximadamente 253 linhas e múltiplas máquinas
  de estado.
- `ServiceForm.tsx`: aproximadamente 339 linhas e 18 props.
- `ServiceDialog.tsx`: aproximadamente 153 linhas e 22 props.
- `ServicesTable.tsx`: aproximadamente 191 linhas.
- `ServicesPage.test.tsx`: aproximadamente 792 linhas.

### 8.1 Controller

Divida as responsabilidades em hooks feature-local, por exemplo:

```text
useServicesPage.ts
useServiceFilters.ts
useServiceEditor.ts
useServiceDeletion.ts
servicePresentationModels.ts
```

Responsabilidades esperadas:

- `useServiceFilters`: entrada de pesquisa, debounce, categoria, tag e reset
  de página.
- `useServiceEditor`: target, display target, dirty state, submit, erros,
  descarte e foco.
- `useServiceDeletion`: target, progresso, erro, confirmação e cancelamento.
- `useServicesPage`: compõe dados e view models; não reimplementa todas as
  máquinas internamente.

Não substitua um god hook por outro hook com nome diferente.

Elimine o ciclo de tipos atual:

- Controller não deve importar Props de componentes.
- Componente não deve importar tipos internos do controller.
- Coloque tipos compartilhados de apresentação em um módulo neutro
  feature-local.
- Dependências devem apontar em uma única direção.

### 8.2 ServiceForm

Use `FormProvider` e `useFormContext` para dividir o formulário por grupos
reais:

```text
ServiceForm/
  ServiceForm.tsx
  ServiceBasicFields.tsx
  ServiceDurationFields.tsx
  ServiceCommercialFields.tsx
  ServiceCategoryField.tsx
  ServiceTagsField.tsx
  serviceForm.schema.ts
  serviceForm.types.ts
```

Possíveis responsabilidades:

- `ServiceForm`: cria o RHF, aplica erros globais, coordena submit e ações.
- `ServiceBasicFields`: nome e descrição.
- `ServiceDurationFields`: duração mínima, padrão e máxima.
- `ServiceCommercialFields`: preço e desconto.
- `ServiceCategoryField`: categoria e criação inline.
- `ServiceTagsField`: tags e criação inline.

Não extraia cada `TextField` individualmente.

A divisão deve reduzir props e deixar cada seção testável. Não troque 18 props
por prop drilling entre seis componentes.

### 8.3 Lista e tabela

Separe:

```text
ServicesList.tsx
ServicesTable.tsx
ServiceTableRow.tsx
ServicesPagination.tsx
```

- `ServicesList` decide loading, erro, empty e last-known-good.
- `ServicesTable` renderiza cabeçalho e corpo.
- `ServiceTableRow` renderiza uma entidade e suas ações.
- `ServicesPagination` cuida exclusivamente de paginação.

Remova o wrapper duplicado de `overflow-x-auto` se `Table` já o fornece.

### 8.4 Dialog

Reduza a superfície de `ServiceDialog`.

Não mantenha 22 props independentes. Prefira modelos coesos e tipados, como:

- `editor`
- `options`
- `discardConfirmation`

Não use um objeto genérico sem semântica apenas para esconder a contagem de
props.

## 9. Refatorar Tags e Categorias

As páginas continuam monolíticas e duplicadas:

- `TagsPage.tsx`: aproximadamente 313 linhas.
- `CategoriesPage.tsx`: aproximadamente 295 linhas.

Crie componentes feature-local:

```text
tags/
  TagsPage.tsx
  useTagsPage.ts
  TagsTable.tsx
  TagEditorDialog.tsx
  TagDeleteDialog.tsx

categories/
  CategoriesPage.tsx
  useCategoriesPage.ts
  CategoriesTable.tsx
  CategoryEditorDialog.tsx
  CategoryDeleteDialog.tsx
```

Compartilhe somente comportamentos comprovadamente idênticos:

- `useDialogTarget<T>`
- `useDeleteConfirmation<T>`
- `DeleteConfirmationDialog`
- Um `CollectionFeedback`, somente se
  loading/error/empty/last-known-good forem realmente iguais

Não crie:

- `GenericCrudPage`
- `GenericEntityForm`
- Controller CRUD universal
- Configuração declarativa gigante
- Abstração baseada apenas em Tags e Categorias “parecerem semelhantes”

As regras, textos, tabelas e formulários continuam específicos.

## 10. Selects criáveis

`CreatableSingleSelect` e `CreatableMultiSelect` possuem repetição em:

- Popover.
- Modo lista/criação.
- Loading.
- Erro/retry.
- Command list.
- Ação de criar.

Não os funda em um mega componente com muitas condicionais e `multiple`.

Extraia somente uma parte interna compartilhada, se a igualdade for real,
como:

```text
CreatableSelectPanel<T>
```

Mantenha separados:

- Trigger.
- Semântica de seleção.
- Renderização dos selecionados.
- Comportamento de fechar/manter aberto.
- Remoção de chips no multi-select.

Se a extração aumentar a complexidade ou o número de parâmetros, mantenha a
duplicação menor e documente a decisão.

## 11. Testes devem acompanhar as novas fronteiras

Não delete cenários ou reduza cobertura.

Reorganize os testes:

```text
useServiceFilters.test.tsx
useServiceEditor.test.tsx
useServiceDeletion.test.tsx
ServiceForm.schema.test.ts
ServiceForm.test.tsx
ServicesList.test.tsx
ServicesTable.test.tsx
ServiceDialog.test.tsx
ServicesPage.test.tsx
```

Regras:

- `ServicesPage.test.tsx` deve preservar apenas os fluxos integrados
  essenciais.
- Testes de transição pertencem aos hooks responsáveis.
- Testes de validação pura pertencem ao schema.
- Testes de foco, acessibilidade, dirty state e criação inline pertencem ao
  form/dialog.
- Testes de loading/error/empty/paginação pertencem à lista/tabela.
- Renomeie o atual `ServiceForm.test.tsx` para
  `ServiceForm.schema.test.ts` se ele continuar testando apenas o schema.
- Preserve as assertions comportamentais existentes, movendo-as para os
  arquivos corretos.
- Não aumente globalmente timeouts.

Aplique o mesmo princípio aos testes de Tags e Categorias.

## 12. Executar a modularização física do ADR 009

O ADR 009 está `Proposed` porque a movimentação foi adiada na refatoração
anterior. Esta tarefa autoriza sua execução física.

Faça incrementalmente:

1. Mova `auth`.
2. Atualize imports.
3. Rode build e testes relacionados.
4. Mova `catalog`.
5. Atualize imports.
6. Rode build e testes relacionados.
7. Mova `app`.
8. Mova itens realmente compartilhados para `shared`.
9. Adicione APIs públicas e guards.
10. Rode a suíte completa.

Estrutura-alvo:

```text
src/
  app/
    main.tsx
    App.tsx
    router/
    providers/
    composition/

  features/
    auth/
      domain/
      application/
      infrastructure/
      presentation/
      index.ts

    catalog/
      domain/
      application/
      infrastructure/
      presentation/
        tags/
        categories/
        services/
      index.ts

  shared/
    domain/
    application/
    infrastructure/
      http/
    presentation/
      components/
      hooks/
      providers/
      ui/
```

Regras:

- `domain` não depende de camada externa.
- `application` depende de domínio.
- `infrastructure` implementa ports da aplicação.
- `presentation` depende de aplicação/domínio, nunca infraestrutura.
- `app/composition` conhece as implementações concretas.
- Cada feature expõe API pública em `index.ts`.
- Imports externos não atravessam a API pública para acessar internals.
- Não crie barrel files que gerem ciclos ou exportem tudo
  indiscriminadamente.
- `shared` não recebe código de negócio.
- Tags, Categories e Services permanecem juntas em `catalog`.
- Componentes específicos permanecem dentro da feature.
- Código shadcn gerado não deve ser alterado apenas para acomodar a
  movimentação.

Atualize o ADR 009 para `Accepted` somente quando a movimentação estiver
realmente concluída e validada.

Se algum trecho do ADR se mostrar inadequado diante do código real, ajuste o
ADR com justificativa. Não abandone a movimentação apenas por ela ser extensa.

## 13. Corrigir AGENTS, skills e documentação

Use `agenza-rule-persistence`.

### 13.1 Comentários

Adicione ao AGENTS do frontend e à skill canônica:

- O padrão é código sem comentário.
- Comentário explica somente um motivo não óbvio.
- Comentário normalmente tem uma a três linhas.
- JSDoc não repete tipos, nomes ou retornos.
- História e racional arquitetural pertencem aos ADRs.
- Se um bloco grande for necessário, primeiro revisar o design.
- Segurança e concorrência ficam documentadas junto ao mecanismo que as
  aplica.

Não crie limite rígido de quantidade de comentários.

### 13.2 Componentização

Atualize as regras para declarar:

- Page é shell de composição.
- Hook controlador também segue responsabilidade única.
- Um componente pode ser extraído no primeiro uso e continuar feature-local.
- A regra da segunda utilização vale para promoção a `shared`, não para criar
  outro arquivo.
- `TagsPage` é referência de comportamento e design, não de anatomia.
- Vários workflows, vários dialogs, clusters distintos de estado, muitos
  passthrough props, ciclo de tipos ou teste de página excessivo são gatilhos
  de decomposição.
- Não existe hard cap de linhas.
- `GenericCrudPage` continua proibido.

### 13.3 Atualizar skill antiga

A skill `agent-skills/agenza-frontend-feature/SKILL.md` ainda ensina partes
obsoletas:

- Estrutura horizontal.
- `ApiError` chegando aos forms.
- Container antigo.
- TagsPage como arquivo a ser copiado.
- Caminhos antigos.
- Ausência de AuthProvider, SessionEventBus, TenantBoundary e AppError.

Atualize-a para a arquitetura final baseada em:

- `app`
- `features/auth`
- `features/catalog`
- `shared`
- Facades `{ auth, catalog }`
- `AppError`
- AuthProvider
- SessionEventBus
- TenantBoundary
- Snapshot atômico de request
- APIs públicas de feature
- Componentes feature-local

Edite a fonte `agent-skills/`, depois sincronize pelos scripts oficiais.

### 13.4 Documentação stale

Revise e corrija:

- `apps/admin-frontend/docs/API.md`
- `apps/admin-frontend/docs/DECISIONS.md`
- `apps/admin-frontend/docs/STATUS.md`
- ADRs 006–010
- `apps/admin-frontend/AGENTS.md`
- `CLAUDE.md` relacionados
- Architecture guard
- Testes do architecture guard

Problemas conhecidos:

- Documentos ainda dizem que `ApiError` chega à apresentação.
- Há texto dizendo que `AppProviders` constrói o container.
- STATUS ainda descreve handlers REST como stub.
- Clientes aparece bloqueado por `HttpClient`, embora ele exista.
- `mapApiErrorToForm` pode precisar de um nome coerente com `AppError`.
- Caminhos ficarão obsoletos após ADR 009.

Atualize os guards para fiscalizar:

- Dependências entre layers dentro das features.
- `presentation → infrastructure`.
- Acesso externo a internals das features.
- Construção de repositories concretos fora do composition root.
- Estrutura antiga sendo reintroduzida.

Não tente automatizar julgamento de tamanho de componentes ou qualidade
semântica de comentários com um threshold cego.

## 14. O que não deve ser alterado sem nova autorização

Não mude:

- Contratos públicos de API.
- Regras de negócio.
- DTOs backend.
- Autorização ou claims.
- Migrations.
- Banco de dados.
- Infraestrutura de produção.
- Texto ou comportamento funcional sem teste que comprove a intenção.

Não implemente Clientes, Appointments ou outras features novas.

Não introduza Redux, Zustand ou nova biblioteca de estado.

Não introduza outro design system.

## 15. Validação obrigatória

Use Node 22.22.1 ou a versão exata de `.nvmrc`.

Após mudanças intermediárias, rode testes direcionados.

No final:

```bash
python scripts/sync_agent_skills.py --check
python scripts/check_agent_governance.py
python scripts/architecture_guard.py

npm run format:check --workspace=apps/admin-frontend
npm run lint --workspace=apps/admin-frontend
npm run build --workspace=apps/admin-frontend
npm run test:coverage --workspace=apps/admin-frontend
npm run test:e2e --workspace=apps/admin-frontend

git diff --check
```

Se scripts ou guards Python forem alterados, execute também seus testes.

Critérios:

- Zero warnings no lint.
- Nenhum teste removido ou pulado.
- Nenhum threshold reduzido.
- Cobertura não pode regredir materialmente em relação ao baseline.
- Nenhum `any`, `@ts-ignore` ou cast inseguro introduzido.
- Sem imports proibidos.
- Sem dependências circulares novas.
- Todos os textos de UI permanecem em pt-BR.
- Acessibilidade e dark mode preservados.
- Nenhum dado de tenant anterior é exibido depois de mudança de sessão.
- Playwright continua usando apenas mecanismos de teste, sem bypass de
  produção.

Não declare conclusão se algum gate obrigatório estiver vermelho.

## 16. Critérios de aceite arquitetural

A tarefa estará concluída quando:

- Comentários falsos ou obsoletos forem removidos.
- Comentários restantes forem curtos e justificarem somente decisões não
  óbvias.
- `useAsync` estiver mais simples e continuar protegido por testes de
  concorrência.
- Uma requisição HTTP ler token e tenant do mesmo snapshot.
- `ServicesPage` continuar sendo shell de composição.
- Não existir god hook concentrando todos os workflows de Serviços.
- `ServiceForm` estiver dividido por grupos de negócio.
- `ServiceDialog` não tiver uma interface com dezenas de props independentes.
- Lista, tabela, linha e paginação tiverem responsabilidades claras.
- Tags e Categorias não concentrarem toda a máquina CRUD em uma página.
- Não existir `GenericCrudPage`.
- Selects compartilharem apenas a parte realmente idêntica.
- Testes refletirem os novos limites.
- O ciclo de tipos entre controller e dialog for eliminado.
- `src/app`, `src/features` e `src/shared` existirem conforme ADR 009.
- Auth e Catalog possuírem APIs públicas.
- Architecture guard fiscalizar a nova estrutura.
- AGENTS, skills, docs e ADRs ensinarem a arquitetura final.
- Todos os gates estiverem verdes.

## 17. Relatório final

Ao terminar, entregue:

- Resumo das mudanças por fase.
- Antes/depois da organização de pastas.
- Componentes e hooks extraídos.
- Comentários removidos, encurtados ou movidos para ADR.
- Explicação da simplificação de `useAsync`.
- Evidência do snapshot atômico da sessão.
- Testes reorganizados e adicionados.
- Resultado exato de todos os gates.
- Cobertura final.
- Resultado do E2E.
- Arquivos/documentos de governança atualizados.
- Riscos ou itens não concluídos.
- Confirmação de que nenhuma alteração preexistente foi descartada.

Comece agora verificando o worktree e usando o baseline atual. Apresente um
plano curto e continue imediatamente para a implementação.
