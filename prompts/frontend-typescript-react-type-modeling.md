# Revisão e refatoração de TypeScript no frontend React

## Prompt para o agente

Você vai revisar e, somente onde houver ganho concreto de segurança,
refatorar o uso de TypeScript no frontend React do Agenza.

O objetivo não é aumentar a quantidade de anotações, introduzir
`React.FC` ou criar tipos sofisticados sem necessidade. O objetivo é fazer
o compilador impedir estados inválidos, reduzir coerções e garantir que
dados externos sejam validados antes de serem tratados como confiáveis.

Trabalhe no snapshot atual do repositório. A auditoria que originou esta
tarefa foi feita sobre o commit `6f3b51c`, mas não presuma que o `HEAD`
continua igual: confira `git status`, `git log -1` e o código antes de
qualquer alteração.

Não faça commit, push, PR ou deploy. Não altere nem apague mudanças que já
estejam no worktree. Não use comandos destrutivos de Git.

---

## 1. Resultado esperado

Ao final:

1. o pipeline de geração/verificação dos tipos OpenAPI deve usar o caminho
   feature-based atual e passar;
2. estados mutuamente exclusivos devem ser representados por uniões
   discriminadas quando isso elimina combinações inválidas reais;
3. componentes não devem receber combinações incoerentes de props;
4. `unknown` deve permanecer nas fronteiras de erro, não chegar até JSX
   para ser interpretado ou exibido;
5. os componentes devem receber modelos de apresentação já seguros;
6. arrays e modelos somente de leitura devem ser tipados como `readonly`
   quando o consumidor não tem autorização para mutá-los;
7. respostas HTTP não devem ganhar uma falsa garantia de tipo apenas
   porque o chamador escolheu um parâmetro genérico;
8. React Hook Form e Zod devem continuar preservando corretamente a
   diferença entre input e output transformado;
9. nenhuma mudança de UI, fluxo de negócio, API pública, autenticação ou
   tenant isolation deve ser introduzida silenciosamente;
10. build, lint, testes, cobertura e governança devem passar.

Faça tipos representarem invariantes que realmente existem. Não transforme
cada booleano em uma máquina de estados e não crie abstrações genéricas
sem um erro concreto que elas resolvam.

---

## 2. Escopo

Escopo principal:

```text
apps/admin-frontend/src/app/
apps/admin-frontend/src/features/auth/
apps/admin-frontend/src/features/catalog/
apps/admin-frontend/src/shared/
apps/admin-frontend/scripts/
apps/admin-frontend/package.json
apps/admin-frontend/.prettierignore
apps/admin-frontend/eslint.config.js
agent-skills/agenza-api-contract-review/
agent-skills/agenza-frontend-feature/
prompts/frontend-feature-template.md
scripts/architecture_guard.py
scripts/tests/
```

Arquivos espelhados em `.agents/skills/` e `.claude/skills/` nunca devem
ser editados diretamente. Edite a fonte canônica em `agent-skills/` e
execute `python scripts/sync_agent_skills.py`.

Fora de escopo sem autorização adicional:

- mudar endpoints, DTOs ou validações do backend;
- mudar regras de negócio;
- trocar React Hook Form, Zod, shadcn/ui ou `useAsync` por outra biblioteca;
- criar um estado global com Redux/Zustand;
- criar `GenericCrudPage`;
- introduzir branded IDs em todo o sistema;
- reescrever componentes shadcn em `src/components/ui/`;
- alterar layout, textos ou design apenas por preferência;
- fazer uma migração ampla sem testes em fases pequenas.

---

## 3. Leitura obrigatória

Leia completamente, antes de editar:

1. `AGENTS.md`;
2. `apps/admin-frontend/AGENTS.md`;
3. `agent-skills/agenza-frontend-feature/SKILL.md`;
4. `agent-skills/agenza-api-contract-review/SKILL.md`;
5. `agent-skills/agenza-rule-persistence/SKILL.md`;
6. `apps/admin-frontend/docs/adr/009-feature-based-modularization.md`;
7. `apps/admin-frontend/docs/API.md`;
8. `apps/admin-frontend/docs/DECISIONS.md`;
9. `apps/admin-frontend/docs/STATUS.md`;
10. `apps/admin-frontend/tsconfig.app.json`;
11. `apps/admin-frontend/eslint.config.js`.

Skills obrigatórias:

- `agenza-frontend-feature`;
- `agenza-api-contract-review`;
- `agenza-rule-persistence`, caso uma nova regra durável seja formalizada.

Não copie cegamente exemplos de tutoriais. O repositório usa React 19,
TypeScript strict, `exactOptionalPropertyTypes`,
`noUncheckedIndexedAccess`, `erasableSyntaxOnly`, React Hook Form e Zod.

---

## 4. Primeiro: produza um baseline verificável

Antes das mudanças:

1. registre `git status --short`;
2. confirme as versões instaladas;
3. execute:

```bash
npm run format:check --workspace=apps/admin-frontend
npm run lint --workspace=apps/admin-frontend
npm run build --workspace=apps/admin-frontend
npm run test:coverage --workspace=apps/admin-frontend
npm run generate:api-types:check --workspace=apps/admin-frontend
python scripts/sync_agent_skills.py --check
python scripts/check_agent_governance.py
python scripts/architecture_guard.py
```

Registre falhas preexistentes separadamente. Não “corrija” uma falha
reduzindo cobertura, desligando regras ou adicionando casts.

Estado já observado na auditoria:

- format, lint e build passam;
- não há `any` explícito no código de produção;
- não há non-null assertions;
- o gate `generate:api-types:check` falha com `ENOENT` porque ainda tenta
  ler `src/infrastructure/generated/services-api.d.ts`;
- o arquivo real está em
  `src/features/catalog/infrastructure/generated/services-api.d.ts`.

Reproduza isso; não confie apenas neste texto.

---

## 5. Corrigir primeiro o caminho dos tipos OpenAPI

A reorganização do ADR 009 moveu o arquivo gerado, mas nem todos os
consumidores foram atualizados.

Audite e corrija, no mínimo:

- `apps/admin-frontend/package.json`;
- `apps/admin-frontend/scripts/checkGeneratedApiTypes.mjs`;
- `apps/admin-frontend/.prettierignore`;
- `agent-skills/agenza-api-contract-review/SKILL.md`;
- `prompts/frontend-feature-template.md`;
- comentários atuais em mappers e workflow;
- documentação normativa que ainda ensine o caminho antigo.

Use como fonte atual:

```text
apps/admin-frontend/src/features/catalog/infrastructure/generated/services-api.d.ts
```

Depois:

1. execute a geração;
2. confirme que não foi criada uma segunda árvore
   `src/infrastructure/generated/`;
3. execute o check contra o OpenAPI vivo;
4. não edite manualmente o `.d.ts`;
5. sincronize as skills;
6. adicione ou ajuste teste de regressão para que o caminho não volte a
   divergir silenciosamente.

Documentos históricos podem mencionar o caminho antigo como parte de um
relato passado. Diferencie história de documentação normativa: atualize
instruções atuais, não reescreva história sem necessidade.

Não altere o contrato do backend para fazer esse gate passar.

### 5.1 Tipar os request bodies contra o contrato gerado

Os métodos de update já constroem corpos explícitos usando
`Update*Command`, mas os métodos de criação enviam o input da aplicação
diretamente.

Audite:

- `ApiTagRepository.create`;
- `ApiCategoryRepository.create`;
- `ApiServiceRepository.create`.

O OpenAPI exige alguns campos nullable como propriedades obrigatórias no
JSON. O tipo da aplicação pode usar propriedades opcionais, mas a
infraestrutura precisa normalizar ausência para `null` antes de enviar.

Construa cada corpo explicitamente e valide-o sem widening:

```typescript
type CreateServiceRequestBody = components["schemas"]["CreateServiceCommand"];

const body = {
  name: input.name,
  description: input.description ?? null,
  durationMinutes: input.durationMinutes,
  minDurationMinutes: input.minDurationMinutes,
  maxDurationMinutes: input.maxDurationMinutes,
  price: input.price,
  maxDiscountPercentage: input.maxDiscountPercentage,
  categoryId: input.categoryId ?? null,
  tagIds: input.tagIds ?? null,
} satisfies CreateServiceRequestBody;
```

Use o contrato real para Tag e Category; não copie o exemplo sem conferir
os tipos gerados.

Requisitos:

- o tipo OpenAPI permanece em infrastructure;
- application/domain não importam `components`;
- todos os campos obrigatórios do wire body ficam visíveis;
- propriedades opcionais da aplicação são normalizadas conscientemente;
- testes MSW validam o JSON realmente enviado;
- create e update seguem a mesma disciplina;
- não use cast para fazer um objeto incompatível “caber” no contrato.

---

## 6. Não “corrigir” componentes com `React.FC`

As seguintes decisões atuais são válidas e devem ser preservadas:

- `function Component(props: Props): JSX.Element` é um componente
  corretamente tipado;
- não usar `React.FC` não é uma deficiência;
- handlers inline devem aproveitar contextual typing;
- `children: ReactNode` explícito é adequado quando children é obrigatório;
- `ComponentProps`/`ComponentPropsWithoutRef` são adequados para wrappers;
- `forwardRef` em `TextField`/`TextAreaField` funciona e não deve ser
  removido apenas porque React 19 também aceita `ref` como prop;
- `ref` como prop nos selects genéricos é válido;
- `useForm<ServiceFormInput, unknown, ServiceFormValues>` deve continuar
  distinguindo entrada textual de saída transformada pelo Zod.

Não:

- converta componentes em massa para `React.FC`;
- anote manualmente todos os eventos;
- adicione tipos de retorno a cada callback inline;
- troque `ReactNode` por `PropsWithChildren` sem motivo;
- crie interfaces que apenas repetem tipos já disponíveis;
- altere shadcn apenas para satisfazer preferência de estilo.

---

## 7. Modelar autenticação como estado válido por construção

O contrato atual separa:

```typescript
status: "loading" | "authenticated" | "unauthenticated";
tenantContext: TenantContext | null;
```

Isso permite combinações que não existem no produto.

Refatore para uma união discriminada equivalente a:

```typescript
type AuthSessionState =
  | { status: "loading"; tenantContext: null }
  | { status: "unauthenticated"; tenantContext: null }
  | { status: "authenticated"; tenantContext: TenantContext };
```

As ações de autenticação podem ser intersectadas ou agrupadas em um modelo
separado, desde que a leitura pelo consumidor preserve o narrowing.

Avalie também um hook estrito para a árvore protegida, por exemplo
`useAuthenticatedTenant()`, que:

- falhe explicitamente se usado fora do estado autenticado;
- retorne `TenantContext`, nunca `TenantContext | null`;
- elimine fallbacks silenciosos como um nome de empresa genérico dentro de
  uma rota que deveria estar autenticada;
- não crie uma segunda fonte de estado;
- continue lendo o mesmo `AuthProvider`.

Atualize testes para provar:

- loading nunca carrega tenant;
- unauthenticated nunca carrega tenant;
- authenticated sempre carrega tenant;
- componentes protegidos não precisam simular combinações impossíveis;
- uma troca de tenant continua desmontando o conteúdo tenant-scoped.

Não enfraqueça `ProtectedRoute`, `TenantBoundary` ou o isolamento de tenant.

---

## 8. Modelar estados assíncronos sem permitir combinações incoerentes

Hoje `status`, `data` e `error` são propriedades independentes. O código
precisa suportar “last known good data” após falha de refresh, portanto uma
união ingênua que proíba dados no estado de erro estará errada.

Desenhe primeiro a tabela de estados reais:

| Estado          | dados     | erro     | significado                   |
| --------------- | --------- | -------- | ----------------------------- |
| idle            | ausentes  | ausente  | ainda não executado           |
| loading inicial | ausentes  | ausente  | primeira carga                |
| refreshing      | presentes | ausente  | recarregando dados conhecidos |
| success         | presentes | ausente  | carga concluída               |
| initial error   | ausentes  | presente | nada para mostrar             |
| refresh error   | presentes | presente | mantém last known good        |

Implemente uma união discriminada somente depois de validar essa tabela
contra os testes atuais de `useAsync`.

Requisitos:

- uma variante deve carregar apenas os campos válidos para ela;
- o componente deve fazer narrowing pelo discriminante;
- não duplique a mesma união literal em 12 arquivos;
- preserve proteção contra resposta fora de ordem, unmount e troca de
  tenant;
- preserve `mutate` e a garantia de que uma criação bem-sucedida não
  dependa do refetch;
- não exponha `unknown` diretamente ao JSX.

`unknown` é correto dentro de `catch` e dentro do mecanismo genérico. Na
fronteira do hook/controller, converta-o para um contrato de apresentação,
por exemplo:

```typescript
interface UiError {
  message: string;
  retryable: boolean;
}
```

ou use `AppError` diretamente quando essa for a dependência arquitetural
correta.

Componentes como `CollectionFeedback` e `ServicesList` não devem decidir
como interpretar uma exceção arbitrária nem renderizar `Error.message` de
um erro inesperado. Eles devem receber mensagem curada e retryability já
determinadas.

Não faça sniffing de texto de erro.

---

## 9. Tornar estados de editor e dialog impossíveis de montar errado

Substitua sentinelas como:

```typescript
type DialogTarget<T> = "new" | T;
```

por uma união que não colida com valores legítimos de `T`:

```typescript
type DialogTarget<T> = { kind: "create" } | { kind: "edit"; item: T };
```

Revise:

- `useDialogTarget`;
- `useServiceEditor`;
- `servicePresentationModels`;
- `TagEditorDialog`;
- `CategoryEditorDialog`;
- `ServiceDialog`;
- dialogs de exclusão.

Não deixe `isOpen`, `displayTarget`, `code`, `title`, `submitLabel` e
`initialValues` formarem combinações independentes que o produto nunca
produz.

Exemplo de direção:

```typescript
type EditorViewModel =
  | { state: "closed" }
  | {
      state: "creating";
      title: string;
      submitLabel: string;
      initialValues: FormValues;
      // demais campos obrigatórios desta variante
    }
  | {
      state: "editing";
      item: Item;
      title: string;
      submitLabel: string;
      initialValues: FormValues;
      // demais campos obrigatórios desta variante
    };
```

Não copie esse exemplo literalmente se não representar a animação de
fechamento atual. O código mantém `displayTarget` durante o fade-out; essa
necessidade real precisa continuar representada sem diálogo vazio ou
flicker.

Coloque formas compartilhadas entre hooks e componentes em módulos
feature-local neutros. O hook não deve importar `Props` do componente, e o
componente não deve importar tipos internos do hook.

---

## 10. Contratos de props compostos

Corrija props opcionais que somente fazem sentido em conjunto.

Exemplo atual:

```typescript
secondaryActionLabel?: string
onSecondaryAction?: () => void
```

Prefira:

```typescript
secondaryAction?: {
  label: string
  onAction: () => void
}
```

ou uma união equivalente. Um label sem callback e um callback sem label
não devem compilar.

Revise também os selects criáveis. Hoje `status`, `error` e `onRetry`
podem ser combinados de forma incoerente.

Crie um contrato neutro compartilhado entre single e multi select:

```typescript
type SelectLoadState =
  | { status: "loading" }
  | { status: "error"; message: string; onRetry?: () => void }
  | { status: "success" };
```

Adapte o desenho ao comportamento real. Não force `onRetry` se existir um
erro legitimamente não retryable.

Evite que `servicePresentationModels` importe um tipo de status declarado
dentro de um componente específico.

---

## 11. Wrappers de campos devem controlar sua própria acessibilidade

Revise `TextField` e `TextAreaField`.

O consumidor não deve conseguir contradizer `error` fornecendo:

```tsx
aria-invalid={false}
aria-describedby="outro-id"
```

Use `ComponentPropsWithoutRef` e `Omit` para retirar props que o wrapper
controla, incluindo quando aplicável:

- `children`;
- `id`;
- `aria-invalid`;
- `aria-describedby`.

Reintroduza `id` como obrigatório no contrato do wrapper.

Garanta que a ordem dos spreads não permita sobrescrever atributos
calculados internamente.

Para contador de textarea, represente a dependência real entre
`showCount`, `maxLength` e `currentLength`. Não permita `showCount: true`
sem um limite utilizável se o componente não sabe renderizar esse caso.

Preserve o ref para o elemento DOM real e prove com teste que
`react-hook-form` consegue usar `setFocus`.

---

## 12. Imutabilidade e arrays somente de leitura

Props, view models, facades e entidades que apenas expõem coleções para
leitura devem preferir:

```typescript
readonly Item[]
```

Revise especialmente:

- `items`, `values`, `tags`, `categories`, `services`;
- `PagedServices.services`;
- inputs com `tagIds`;
- `NAV_ITEMS`;
- view models de tabelas e selects.

Não use `readonly` onde uma API realmente precisa mutar a coleção.

No domínio, verifique `Service.tags` e `TagSummary`:

- o array já é copiado, mas os objetos internos continuam compartilhados;
- os campos de `TagSummary` devem ser somente de leitura;
- a entidade não deve mudar se o chamador alterar posteriormente o objeto
  usado para criá-la;
- adicione teste de regressão para mutação do array e para mutação de um
  elemento do array.

Use `satisfies` em configurações constantes quando ele preservar literais
e validar a forma sem widening desnecessário. Não faça substituição em
massa apenas para “usar mais TypeScript”.

---

## 13. Remover falsa segurança na fronteira HTTP

O contrato atual permite:

```typescript
httpClient.get<QualquerTipo>(path);
```

e a implementação faz cast do resultado de `response.json()` para `T`.
Um parâmetro genérico não valida JSON em runtime.

Escolha uma estratégia única, simples e testável:

### Opção A

O `HttpClient` retorna `unknown`; cada repository/mapper decodifica e
valida o payload antes de construir entidades.

### Opção B

O `HttpClient` recebe um decoder:

```typescript
get<T>(path: string, decode: (payload: unknown) => T): Promise<T>
```

### Opção C

Outra abordagem equivalente já sustentada pelo código/ADRs.

Critérios:

- não use `as T` para transformar JSON desconhecido em contrato confiável;
- não duplique manualmente tipos já gerados pelo OpenAPI;
- tipos gerados continuam descrevendo o contrato estático;
- o ponto que recebe JSON continua fazendo validação runtime;
- payload malformado deve produzir um erro interno curado, nunca um
  `TypeError` acidental como `undefined.trim is not a function`;
- `204` não deve depender de `undefined as T`;
- mantenha métodos que retornam `void` corretamente separados ou
  sobrecarregados;
- adicione testes para corpo ausente, propriedade ausente, tipo numérico
  inesperado e envelope paginado inválido.

Se essa escolha mudar o port compartilhado `HttpClient`, documente a razão
no ADR apropriado. Não mude o backend nem o wire contract.

---

## 14. Form errors sem casts espalhados

Os três casts:

```typescript
field as TagFormField;
field as CategoryFormField;
field as ServiceFormField;
```

existem porque `Object.entries()` perde a chave genérica de
`Partial<Record<TField, string>>`.

Não crie uma proibição global de `as`.

Avalie uma destas soluções:

- helper compartilhado e pequeno para entries tipadas;
- representar field errors como uma lista readonly de
  `{ field: TField; message: string }`;
- outra forma que preserve o campo genérico e a ordem do primeiro erro.

Escolha somente se reduzir os três casts sem criar uma abstração mais
complexa que o problema.

Mantenha:

- `setError` corretamente tipado;
- `setFocus` no primeiro campo;
- erros globais separados;
- mapeamento por código/campo estruturado;
- nenhuma análise de mensagem livre.

---

## 15. Testes de tipo e comportamento

Testes devem provar invariantes, não detalhes de implementação.

Adicione testes para:

1. narrowing dos estados de auth;
2. estados async inicial, refreshing, success, initial error e refresh error;
3. editor fechado/create/edit sem combinações inválidas;
4. props opcionais compostas;
5. select loading/error/success;
6. atributos ARIA dos wrappers não sobrescrevíveis;
7. focus de campos controlados;
8. payload HTTP malformado;
9. imutabilidade profunda suficiente de `Service.tags`;
10. geração/check do OpenAPI no caminho novo.

Use `expectTypeOf` quando uma garantia for exclusivamente de tipo.
Testes negativos com `@ts-expect-error` só são aceitáveis se tiverem
descrição clara, forem estáveis e agregarem uma garantia que
`expectTypeOf` não expresse melhor.

Não:

- teste nomes de funções internas;
- congele a implementação de hooks;
- use snapshots gigantes;
- remova testes existentes;
- use `as unknown as` para montar fixtures;
- reduza cobertura.

---

## 16. Execução em fases

Não faça uma alteração gigante.

Ordem recomendada:

1. corrigir pipeline/caminho OpenAPI e persistência documental;
2. tipar os request bodies contra os tipos OpenAPI;
3. autenticação discriminada;
4. estado async e normalização de erro;
5. target/editor/dialog;
6. contratos dos selects e ações opcionais;
7. wrappers de campos;
8. readonly/imutabilidade;
9. fronteira HTTP com validação runtime;
10. limpeza dos casts de formulário, somente se continuar simples;
11. documentação, skills e guards.

Depois de cada fase:

```bash
npm run format:check --workspace=apps/admin-frontend
npm run lint --workspace=apps/admin-frontend
npm run build --workspace=apps/admin-frontend
npm run test --workspace=apps/admin-frontend
```

Se uma fase quebrar, corrija-a antes de começar a próxima.

---

## 17. Política de comentários

Não explique a refatoração em JSDocs.

Comentários:

- zero por padrão;
- no máximo uma ou duas linhas para um “porquê” não evidente;
- não narram uma união discriminada que o próprio tipo já expressa;
- não registram “antes/depois”;
- não deixam TODOs especulativos;
- não duplicam ADRs;
- não explicam sintaxe de TypeScript ou React.

Se o tipo precisa de um parágrafo para ser entendido, simplifique o tipo.

---

## 18. Critérios de aceite

A tarefa só pode ser considerada concluída quando:

- [ ] o check OpenAPI lê o arquivo no caminho feature-based;
- [ ] a geração não recria `src/infrastructure/generated`;
- [ ] skill canônica, templates e documentação normativa ensinam o caminho atual;
- [ ] corpos de create/update são verificados contra os tipos OpenAPI gerados;
- [ ] campos nullable obrigatórios no JSON são enviados explicitamente;
- [ ] auth não representa authenticated com tenant nulo;
- [ ] componentes protegidos conseguem trabalhar com tenant não anulável;
- [ ] async state preserva last known good sem combinações incoerentes;
- [ ] `unknown` não chega a componentes para decidir mensagem;
- [ ] nenhum erro inesperado tem `.message` cru renderizado;
- [ ] editor/dialog usa discriminantes em vez de sentinela `'new' | T`;
- [ ] ações opcionais dependentes são agrupadas;
- [ ] select em estado de erro exige mensagem coerente;
- [ ] wrappers impedem override de ARIA que eles próprios controlam;
- [ ] coleções de leitura são `readonly` onde apropriado;
- [ ] `Service.tags` não pode ser alterado indiretamente pelo input original;
- [ ] JSON externo não vira `T` confiável por um cast genérico;
- [ ] não existe `undefined as T` para resposta 204;
- [ ] os casts de fields foram reduzidos apenas se a solução ficou mais simples;
- [ ] não foi introduzido `React.FC` em massa;
- [ ] não foi introduzido `any`, non-null assertion ou `as unknown as`;
- [ ] não foi desabilitada regra de lint;
- [ ] não foi reduzida cobertura;
- [ ] comportamento, UI, API e tenant isolation foram preservados;
- [ ] não foram adicionados comentários narrativos.

---

## 19. Validação final obrigatória

Execute:

```bash
python scripts/sync_agent_skills.py --check
python scripts/check_agent_governance.py
python scripts/architecture_guard.py

npm run format:check --workspace=apps/admin-frontend
npm run lint --workspace=apps/admin-frontend
npm run build --workspace=apps/admin-frontend
npm run test:coverage --workspace=apps/admin-frontend
npm run generate:api-types:check --workspace=apps/admin-frontend
```

Também execute `git diff --check`.

Não declare sucesso com qualquer gate vermelho. Se o OpenAPI vivo não
estiver acessível, informe exatamente essa limitação; não simule um passe.

---

## 20. Relatório final

Entregue:

1. diagnóstico inicial em poucas linhas;
2. tabela `problema | arquivo | risco | solução`;
3. tipos/invariantes introduzidos;
4. casts eliminados e casts mantidos com justificativa;
5. fronteiras em que `unknown` foi normalizado;
6. estratégia usada para validar JSON;
7. arquivos de governança/documentação atualizados;
8. testes adicionados;
9. comandos executados e resultado real;
10. riscos ou trabalho que permaneceu;
11. confirmação explícita de que não houve commit, push, PR ou deploy.

Não entregue apenas “melhorei a tipagem”. Mostre quais estados inválidos
deixaram de compilar e quais payloads externos passaram a ser rejeitados
de forma controlada.
