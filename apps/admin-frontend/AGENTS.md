# admin-frontend — instructions for agents

Complements the [root AGENTS](../../AGENTS.md). Versions come from the pins and the lockfile;
implementation and gates come from the code and the configuration.

## Lookup by task

Open only what the change needs:

| Change                                        | Reference                                                                                       |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Layer boundaries, pages or lists              | [Architecture §1](docs/ARCHITECTURE.md#1-shape)                                                 |
| HTTP consumption, errors or generated types   | [Architecture §2](docs/ARCHITECTURE.md#2-talking-to-the-backend) and the contract code it names |
| Authentication and tenant                     | [Architecture §3](docs/ARCHITECTURE.md#3-auth--tenancy)                                         |
| Feature planning                              | [Root workflow](../../AGENTS.md#workflow)                                                       |
| Why something is so, what was already refused | [decisions/frontend.md](../../docs/decisions/frontend.md)                                       |
| Environment, commands or dependencies         | [README](README.md), including the [lockfile](README.md#lockfile)                               |

## Frontend invariants

- Strict TypeScript: do not weaken the [tsconfig](tsconfig.json) or introduce an implicit `any`.
- `app → features → widgets → shared`; outside consumers reach a feature through its barrel. The
  [ESLint](eslint.config.js) rule checks the direction between layers and that public boundary.
- Pages compose and render the UI; state, effects and handlers live in the page's hook. Generic
  reuse lives in shared/widgets according to its responsibility.
- Lists use controlled state: Pessoas and Etiquetas supply it through `useSearchParamsState`. The
  filter form does not search while typing; actions apply the query.
- `servicesApi` returns an `ApiResult`; token, tenant, version and envelope belong to the HTTP layer.
  Mutations keep expected failures as values; `unwrapOrThrow` is reserved for the framework boundary (no production caller today). Wire
  types come from the generated contract; do not hand-write `fetch` or duplicate wire DTOs.
- Branch on code/status, never by interpreting error text.
- Use existing controls, semantic tokens and the primitive's keyboard/focus behavior. Every control
  needs an accessible name; visible content is pt-BR.
- TypeScript signatures on one line: past 100 columns, take the object whole and destructure it in
  the body.

## Skills

Use the [skill table in the root AGENTS](../../AGENTS.md#skills). Read a skill's additional
references only when the task touches the subject.

## Validation

Use the [app commands](README.md#commands) and check the
[applicable gates](../../.github/workflows/frontend-ci.yml). Coverage thresholds and exclusions are
in [Vitest](vitest.config.ts); a UI folder is not exempt by definition. Do not lower thresholds or
skip gates to make a change pass. `exactOptionalPropertyTypes` needs care with optional props
forwarded by spread.
