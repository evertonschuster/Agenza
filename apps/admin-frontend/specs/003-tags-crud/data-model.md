# Phase 1 Data Model: Service Tags CRUD

## Tag

The only entity this feature deals with. Frontend domain type (`features/tags/model/tag.ts`),
structurally identical to the generated `TagResponse` (Decision 6) — no mapper.

| Field | Type | Rules | Source |
|---|---|---|---|
| `id` | `string` (GUID) | Server-assigned, never edited | `TagResponse.id` |
| `name` | `string` | Required, ≤40 chars, unique per tenant (case/whitespace-insensitive — enforced server-side, spec FR-004) | `TagResponse.name` / `CreateTagCommand.name` / `UpdateTagCommand.name` |
| `color` | `string` | One of exactly 8 fixed hex values (spec FR-011); never free text in this UI | `TagResponse.color` |
| `description` | `string \| null` | Optional, ≤200 chars; empty/whitespace-only normalizes to `null` (spec Edge Cases) | `TagResponse.description` |

No relationships are modeled on the frontend. A `Tag` can be associated with zero or more `Service`
records (spec Key Entities), but that association is read-only from this feature's perspective — it
surfaces only as a count inside a blocked-delete error message (FR-008), never as a list of services
to fetch or render. No frontend model needed for it.

## Color palette

`features/tags/model/tag.ts` also exports the 8-entry palette consumed by the
`color-swatch-picker` (research.md Decision 4). Values and order mirror
`ServicesService.Domain.ValueObjects.TagColor.Palette` exactly (verified against backend source this
session) — this list is duplicated by necessity (the frontend can't import backend C#), so it MUST be
kept in sync by hand if the backend palette ever changes:

| Hex | Label (pt-BR, frontend-authored — backend has no name for these) |
|---|---|
| `#0d9488` | Verde-azulado |
| `#0ea5e9` | Azul |
| `#8b5cf6` | Violeta |
| `#ec4899` | Rosa |
| `#ef4444` | Vermelho |
| `#f59e0b` | Âmbar |
| `#22c55e` | Verde |
| `#64748b` | Cinza |

## State transitions

None. Create/update/delete are the only operations; there is no status field or lifecycle beyond
existing vs. not (soft-delete is a backend persistence detail — `Tags.DeletedAt` — invisible to this
feature, confirmed against `TagConfiguration.cs` this session).

## Validation summary (client-side pre-check only — see research.md Decision 5)

- `name`: required, trimmed length 1–40.
- `description`: trimmed length 0–200.
- `color`: always valid by construction (picker only offers the 8 palette values).

None of the above is authoritative. The backend's response (`ApiProblemDetails.errors`) is what
actually renders (spec FR-012).
