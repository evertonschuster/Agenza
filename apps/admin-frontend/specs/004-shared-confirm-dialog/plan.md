# Implementation Plan: Diálogo de Confirmação Reutilizável

**Branch**: `004-shared-confirm-dialog` | **Date**: 2026-09-14 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-shared-confirm-dialog/spec.md`

## Summary

Extrai o diálogo de confirmação hoje embutido em
`src/features/tags/ui/pages/TagsPage/DeleteTagDialog.tsx` para um primitivo apresentacional em
`src/shared/ui/confirm-dialog.tsx` — configurável (título, descrição, rótulo e ícone do botão,
título/mensagem do estado bloqueado), mas sem lógica de rede embutida: ele recebe estado já derivado
(`isSubmitting`, uma falha classificada como bloqueante ou passageira) em vez de chamar
`useFetcher` internamente, porque a tipagem de `useFetcher<typeof action>()` do React Router é por
rota e não pode ser genérica dentro de um componente compartilhado (research.md Decision 1). A
classificação de falha (rede/sessão/servidor = passageira; qualquer outra = bloqueante) — já genérica
hoje, apesar de morar dentro de `DeleteTagDialog.tsx` — migra para uma função pura em
`shared/api/servicesFacade.ts`, ao lado dos sentinels que ela já lê. `DeleteTagDialog.tsx` continua
existindo, mas encolhe para um adaptador fino: liga `useFetcher<typeof tagsAction>()` + a classificação
compartilhada à configuração específica de Etiquetas. Nenhuma segunda rotina é construída (spec
FR-007); nenhuma dependência nova entra.

## Technical Context

**Language/Version**: TypeScript ~6.0.3, modo `strict` (constitution Princípio I). React ^19.2.7.

**Primary Dependencies**: Nenhuma nova. Reaproveita `@base-ui/react` ^1.8.0 (via
`shared/ui/dialog.tsx`, já usado por `DeleteTagDialog`/`TagFormDialog`), `lucide-react` ^1.41.0 (tipo
`LucideIcon`, já convenção em `app/shell/navigation.ts` e `app/pages/ComingSoon.tsx` para props de
ícone configurável) e `react-router` ^8.3.0 (o `useFetcher<typeof tagsAction>()` existente,
inalterado).

**Storage**: N/A — sem estado persistido; o componente é controlado inteiramente por props.

**Testing**: Vitest + React Testing Library. `shared/ui/confirm-dialog.test.tsx` novo, cobrindo os
três estados observáveis diretamente por props (sem fetcher/rede) — exercita o componente por
configuração, prova a US2 sem precisar de uma segunda rotina real. `DeleteTagDialog.test.tsx` (já
existe, 5 casos) é adaptado, não reescrito: mesmos cenários, agora sobre um componente mais fino por
baixo. `servicesFacade.test.ts` ganha os casos da função de classificação extraída.

**Target Platform**: Browser SPA, inalterado.

**Project Type**: Frontend único dentro do monorepo; este plano cobre só `apps/admin-frontend`.

**Performance Goals**: N/A — sem meta nova; é um diálogo, não uma tela com dado em volume.

**Constraints**: Direção de dependência FSD (`app → features → shared`), imposta por
`eslint.config.js` — `confirm-dialog.tsx` fica em `shared/ui/` e **não** pode importar nada de
`features/tags/` (constitution + `AGENTS.md`; ver NFR-002 da spec). Textos visíveis em pt-BR (spec
FR-010). Cobertura real obrigatória para o novo arquivo — **não** entra em `coverage.exclude` (spec
NFR-003, research.md Decision 4).

**Scale/Scope**: Um primitivo novo (`confirm-dialog.tsx`), uma função pura extraída
(`servicesFacade.ts`), um consumidor migrado (`DeleteTagDialog.tsx`). Nenhuma rota, nenhuma tela,
nenhum dado novo.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Status | Notas |
|---|---|---|
| I. Strict TypeScript | PASS | Sem `any`; `confirmIcon: LucideIcon` reaproveita um tipo já convencionado no repo, não um novo padrão. |
| II. Multi-Tenant Safety Enforced Server-Side | PASS | Nenhum código novo lê ou grava tenant; o componente não sabe o que está confirmando. |
| III. Authentication via identity-service (Fixed Ports) | PASS | Não tocado. |
| IV. Generated OpenAPI Client Only | PASS | Nenhuma chamada de API nova; `DeleteTagDialog` continua usando o mesmo `tagsAction`/`servicesApi` de hoje. |
| V. CI Quality Gates Are Non-Negotiable From Scaffold | PASS | Reforçado, não apenas mantido: NFR-003 exige cobertura real para o novo arquivo em vez da isenção que outros primitivos de `shared/ui` recebem. |
| VI. No Frontend Docker | PASS | Não tocado. |

Nenhuma violação. Complexity Tracking não é necessário.

*Re-checked pós-Phase 1: `contracts/confirm-dialog-contract.md` (um contrato de props, sem entidade de
dados — por isso não há `data-model.md`, mesmo critério de `specs/002-ui-foundation`) não introduz
nada além do que esta tabela já cobre. Continua tudo PASS.*

## Project Structure

### Documentation (this feature)

```text
specs/004-shared-confirm-dialog/
├── plan.md                              # This file (/speckit-plan command output)
├── research.md                          # Phase 0 output (/speckit-plan command)
├── quickstart.md                        # Phase 1 output (/speckit-plan command)
├── contracts/
│   └── confirm-dialog-contract.md       # Phase 1 output (/speckit-plan command) — contrato de UI, não de API
├── checklists/requirements.md
└── tasks.md                             # Phase 2 output (/speckit-tasks command — NOT created by /speckit-plan)
```

Sem `data-model.md`: a feature não introduz nenhuma entidade de dados (mesmo critério já usado em
`specs/002-ui-foundation`, também uma feature de infraestrutura de UI). O que existe em vez disso é um
contrato de props — cabe em `contracts/`, não numa entidade.

### Source Code (repository root)

```text
apps/admin-frontend/src/
├── shared/
│   ├── ui/
│   │   ├── confirm-dialog.tsx           # NOVO — primitivo apresentacional (research.md Decision 1)
│   │   └── confirm-dialog.test.tsx      # NOVO — cobre os 3 estados por configuração (spec NFR-003)
│   └── api/
│       ├── servicesFacade.ts            # + função pura de classificação (research.md Decision 2)
│       └── servicesFacade.test.ts       # + casos da classificação extraída
└── features/
    └── tags/
        └── ui/pages/TagsPage/
            ├── DeleteTagDialog.tsx      # ENCOLHE — adaptador fino sobre confirm-dialog.tsx
            └── DeleteTagDialog.test.tsx # ADAPTADO — mesmos 5 cenários, não reescritos
```

`vitest.config.ts` **não** ganha uma nova entrada em `coverage.exclude` para `confirm-dialog.tsx`
(spec NFR-003) — é a ausência de uma mudança, não uma mudança, mas vale registrar para quem for
revisar o diff não adicionar por reflexo, copiando os vizinhos (`dialog.tsx`, `sheet.tsx`, `toast.tsx`)
que estão na lista por um motivo que não se aplica aqui (research.md Decision 4).

**Structure Decision**: Um primitivo apresentacional novo em `shared/ui/`, uma função pura extraída
para `shared/api/servicesFacade.ts` (fica ao lado dos sentinels `NETWORK_PROBLEM`/`SESSION_PROBLEM`/
`SERVER_PROBLEM` que ela lê, em vez de um arquivo novo só para ~5 linhas), e um consumidor existente
adaptado. Nada novo em `features/tags/` além do próprio `DeleteTagDialog.tsx` ficar mais fino — a
direção de dependência (`shared/` nunca importa `features/`) continua intacta (NFR-002). Nenhum
`pages/` de topo nem `entities/` — não se aplicam a este tipo de mudança.

## Complexity Tracking

Não aplicável — nenhuma violação da Constitution Check.
