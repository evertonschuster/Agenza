# admin-frontend — instruções para agentes

Complementa o [AGENTS.md da raiz](../../AGENTS.md), que vale primeiro. Aqui só o que é específico
deste app.

> Aponta, não copia. Versões vêm do `package.json` e do lockfile; a arquitetura e o histórico de
> decisões vêm de [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md), que é a leitura obrigatória antes de
> qualquer mudança estrutural. **§6 é a contraparte honesta**: o que é provisório, o que foi
> deliberadamente deixado de fora e o que ainda não existe.

## Antes de tocar no código

1. [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — a forma e o porquê. §5 é o log de decisões,
   incluindo o que foi **tentado e revertido**.
2. [`.specify/memory/constitution.md`](.specify/memory/constitution.md) — os princípios inegociáveis
   e as decisões explicitamente diferidas.
3. As ADRs `docs/adr/00XX-admin-frontend-*.md` na raiz do monorepo.

## Forma

Feature-Sliced Design. `app/` é o composition root, `features/<slice>/{model,api,ui}/` são as fatias
verticais com `index.ts` como **única** superfície pública, `shared/` é transversal e sem regra de
negócio.

**A direção de dependência é mecanicamente imposta**, não apenas pretendida: três blocos de
`no-restricted-imports` em `eslint.config.js` garantem `app → features → shared`. `shared/` não pode
importar `features/` nem `app/`; `features/` não pode importar `app/`; ninguém importa
`@/features/*/*` passando por cima do barril.

> Pegadinha do flat config, já anotada no próprio `eslint.config.js`: um bloco posterior
> **substitui** `no-restricted-imports` em vez de mesclar. Cada bloco reafirma todos os padrões que
> precisa manter.

`entities/` e um `pages/` de topo **não existem de propósito** — nada é compartilhado entre features
ainda. Crie-os quando uma segunda feature precisar da mesma entidade, não antes.

## Regras que quebram build ou review

**Páginas são cascas.** `<Page>.tsx` não tem `useState`, `useEffect` nem `useRef` próprios; toda a
lógica mora no hook **daquela** página (`use<Page>.ts`). Hooks não são compartilhados entre páginas —
a única exceção é um acessor puro de contexto como `useAuth`.

**`loader` e `action` moram em `ui/pages/<Page>/route.ts`** e são reexportados pelo barril, para que
`app/routes.tsx` os importe via `@/features/<slice>` e a direção continue `app → features`.

**`servicesApi` nunca rejeita.** Devolve `ApiResult<T>`. Um repositório não faz tratamento de erro e
uma página não tem `try/catch`. A conversão para rejeição acontece num lugar só — `shared/api/unwrap.ts`
— e **apenas** na fronteira de `loader`/`queryFn`. Em `action` e mutação o `Result` passa direto: um
400 de validação é fluxo esperado, não tela de erro.

**Nunca interprete mensagem livre do backend.** Ramifique em `result.error.code` e leia
`result.error.errors` para erros por campo.

**Tokens semânticos, nunca classes de paleta crua.** `bg-background`, `text-muted-foreground`,
`border-border`. Cor crua quebra a portabilidade entre temas.

**Todo controle interativo precisa de nome acessível.** Ícone decorativo leva `aria-hidden`. Prefira o
comportamento do primitivo a um handler de tecla próprio.

## Portões de CI

Todos precisam passar; nenhum é opcional. `tsc --noEmit` · ESLint · Prettier `--check` ·
Vitest com limiares de cobertura reais · `generate:api-types:check` (regenera os tipos do OpenAPI e
falha em drift) · Playwright contra o stack Aspire real, com login semeado e sem mocks.

Dois atritos previsíveis, ambos esperados e não eventuais:

- **`exactOptionalPropertyTypes`** — componentes gerados por CLI repassam props por spread e
  frequentemente exigem `X | undefined` explícito.
- **Lockfile** — ao adicionar ou atualizar dependência, regere o `package-lock.json` num container
  Linux (`npm install --package-lock-only --ignore-scripts`). Regerado no Windows, `npm ci` quebra no
  CI por causa dos bindings nativos do `@tailwindcss/oxide`.

## Ambiente

Não roda fora do Aspire sem as seis variáveis `VITE_*` — `shared/env.ts` falha rápido de propósito.
Ver [README.md](README.md) para a preparação de ambiente.

## Skills deste app

| Skill | Quando |
| --- | --- |
| `agenza-frontend-slice` | construir ou alterar uma fatia de feature |
| `agenza-ui-primitive` | adicionar ou alterar algo em `shared/ui/` |
| `agenza-a11y-review` | revisar uma tela nova |
| `agenza-api-contract` | mexer em tipos gerados, envelope ou contrato de erro |
| `agenza-testing` | escrever testes ou destravar o gate de cobertura |
| `agenza-ptbr-copy` | escrever texto visível ou formatar número, data e moeda |
| `agenza-tenant-isolation` | revisar qualquer coisa que toque tenant |
