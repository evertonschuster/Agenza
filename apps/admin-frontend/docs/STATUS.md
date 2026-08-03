# Admin frontend status

This is the only living feature-progress document for the admin frontend.
Implementation details come from the code and tests; versions come from
`package.json`. Do not copy this status into `AGENTS.md` or skills.

Status meanings:

- `done`: implemented and covered by the normal gates.
- `stub`: route/domain placeholder only; no usable vertical.
- `removed`: intentionally absent from the frontend.
- `blocked`: implementation needs an unresolved contract or business decision.

## Platform

| Capability                                | Status | Notes                                     |
| ----------------------------------------- | ------ | ----------------------------------------- |
| Strict TypeScript, ESLint, Prettier       | done   | Config files are the source of truth      |
| Vitest, RTL, MSW, coverage gate           | done   | `onUnhandledRequest: 'error'`             |
| Authenticated `HttpClient`                | done   | Atomic session snapshot; `Result` errors  |
| OIDC authentication and recovery          | done   | Auth feature owns the session             |
| App container and grouped facades         | done   | Concrete construction only in composition |
| shadcn/ui, theme, responsive admin layout | done   | Light/dark; mobile shell                  |
| Playwright smoke coverage                 | done   | Runs against the production build in CI   |
| Generated services-service OpenAPI types  | done   | Drift checked by CI                       |

## Features

| Feature        | Status  | Current boundary                                                       |
| -------------- | ------- | ---------------------------------------------------------------------- |
| Authentication | done    | `src/features/auth/`                                                   |
| Categories     | done    | Full Catalog vertical with routed create/edit dialog                   |
| Services       | stub    | `/services` renders `src/app/pages/ServicesPage/ServicesPage.tsx` only |
| Tags           | removed | Frontend removed by ADR 016; backend API intentionally remains         |
| Clients        | stub    | Contract/vertical not implemented                                      |
| Appointments   | stub    | Contract/vertical not implemented                                      |
| Inbox          | stub    | Contract/vertical not implemented                                      |
| Dashboard      | stub    | Presentation placeholder only                                          |
| Settings       | stub    | Contract/vertical not implemented                                      |

## Recommended next order

1. Confirm the next feature's backend/OpenAPI contract and business rules.
2. Build one complete vertical at a time rather than pre-creating domain or UI
   layers for several placeholders.
3. Update this table in the same change that replaces a stub or removes a
   feature.

The product owner chooses which vertical is next. Historical line counts, test
counts, bundle sizes, and completed-task narratives are intentionally omitted;
CI artifacts and Git history are the source for those volatile facts.
