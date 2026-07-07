# Graph Report - .  (2026-07-06)

## Corpus Check
- Corpus is ~15,830 words - fits in a single context window. You may not need a graph.

## Summary
- 385 nodes · 626 edges · 36 communities (17 shown, 19 thin omitted)
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 41 edges (avg confidence: 0.87)
- Token cost: 0 input · 118,611 output

## Community Hubs (Navigation)
- [[_COMMUNITY_API Contract & Conventions|API Contract & Conventions]]
- [[_COMMUNITY_Architecture Rules & Project Status|Architecture Rules & Project Status]]
- [[_COMMUNITY_ContainerAsync React Hooks|Container/Async React Hooks]]
- [[_COMMUNITY_Session Domain Model & Tests|Session Domain Model & Tests]]
- [[_COMMUNITY_TenantContext & Auth Repository|TenantContext & Auth Repository]]
- [[_COMMUNITY_Husky Lint-Staged Tooling|Husky Lint-Staged Tooling]]
- [[_COMMUNITY_Package Dependencies|Package Dependencies]]
- [[_COMMUNITY_TypeScript App Compiler Config|TypeScript App Compiler Config]]
- [[_COMMUNITY_TypeScript Node Compiler Config|TypeScript Node Compiler Config]]
- [[_COMMUNITY_App Bootstrap & Providers|App Bootstrap & Providers]]
- [[_COMMUNITY_Domain Error Types|Domain Error Types]]
- [[_COMMUNITY_OIDC Auth Repository Tests|OIDC Auth Repository Tests]]
- [[_COMMUNITY_Prettier Formatting Config|Prettier Formatting Config]]
- [[_COMMUNITY_Icon Sprite Symbols|Icon Sprite Symbols]]
- [[_COMMUNITY_MSW Test Server Setup|MSW Test Server Setup]]
- [[_COMMUNITY_Husky Shell Helper|Husky Shell Helper]]
- [[_COMMUNITY_Vite Env Types|Vite Env Types]]
- [[_COMMUNITY_TS Project References|TS Project References]]
- [[_COMMUNITY_Git Hook applypatch-msg|Git Hook: applypatch-msg]]
- [[_COMMUNITY_Git Hook commit-msg|Git Hook: commit-msg]]
- [[_COMMUNITY_Git Hook post-applypatch|Git Hook: post-applypatch]]
- [[_COMMUNITY_Git Hook post-checkout|Git Hook: post-checkout]]
- [[_COMMUNITY_Git Hook post-commit|Git Hook: post-commit]]
- [[_COMMUNITY_Git Hook post-merge|Git Hook: post-merge]]
- [[_COMMUNITY_Git Hook post-rewrite|Git Hook: post-rewrite]]
- [[_COMMUNITY_Git Hook pre-applypatch|Git Hook: pre-applypatch]]
- [[_COMMUNITY_Git Hook pre-auto-gc|Git Hook: pre-auto-gc]]
- [[_COMMUNITY_Git Hook pre-commit|Git Hook: pre-commit]]
- [[_COMMUNITY_Git Hook pre-merge-commit|Git Hook: pre-merge-commit]]
- [[_COMMUNITY_Git Hook pre-push|Git Hook: pre-push]]
- [[_COMMUNITY_Git Hook pre-rebase|Git Hook: pre-rebase]]
- [[_COMMUNITY_Git Hook prepare-commit-msg|Git Hook: prepare-commit-msg]]
- [[_COMMUNITY_Favicon Logo|Favicon Logo]]

## God Nodes (most connected - your core abstractions)
1. `AuthRepository` - 22 edges
2. `Tenant` - 21 edges
3. `compilerOptions` - 21 edges
4. `Admin Panel AI Assistant Instructions` - 19 edges
5. `User` - 18 edges
6. `Project Decisions Log` - 17 edges
7. `Session` - 16 edges
8. `compilerOptions` - 15 edges
9. `scripts` - 13 edges
10. `AppContainer` - 12 edges

## Surprising Connections (you probably didn't know these)
- `ServiceDto Interface Pattern` --shares_data_with--> `Service`  [INFERRED]
  .skills/admin-api-contract/SKILL.md → docs/DOMAIN.md
- `ListServices Use Case Example` --shares_data_with--> `Service`  [INFERRED]
  .skills/admin-feature-vertical/SKILL.md → docs/DOMAIN.md
- `React + TypeScript + Vite Template README` --conceptually_related_to--> `Admin Panel Tech Stack`  [INFERRED]
  README.md → CLAUDE.md
- `index.html Vite Entry Point` --conceptually_related_to--> `React + TypeScript + Vite Template README`  [INFERRED]
  index.html → README.md
- `Admin Panel AI Assistant Instructions` --references--> `Admin API Contract Skill`  [EXTRACTED]
  CLAUDE.md → .skills/admin-api-contract/SKILL.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **TypeScript Strict Mode Constraints Group** — claude_md_erasablesyntaxonly, claude_md_exactoptionalpropertytypes, claude_md_nouncheckedindexedaccess, docs_decisions_erasablesyntaxonly, docs_decisions_exactoptionalpropertytypes, docs_decisions_nouncheckedindexedaccess, skills_admin_tdd_conventions_skill_erasablesyntaxonly_gotcha, skills_admin_tdd_conventions_skill_exactoptionalpropertytypes_gotcha [INFERRED 0.85]
- **Core Tenant-Scoped Domain Entities** — docs_domain_business_tenant, docs_domain_user, docs_domain_service, docs_domain_client, docs_domain_appointment, docs_domain_conversation, docs_domain_business_settings [EXTRACTED 1.00]
- **Feature Vertical Build Order Chain** — docs_status_httpclient_stub, docs_status_services_vertical, docs_status_clients_vertical, docs_status_appointments_vertical, docs_status_inbox_vertical, docs_status_dashboard_vertical, docs_status_settings_vertical [EXTRACTED 1.00]

## Communities (36 total, 19 thin omitted)

### Community 0 - "API Contract & Conventions"
Cohesion: 0.07
Nodes (48): TenantContext First Param Rule, API Integration Guide, ApiError Class, Bearer Token Authentication Flow, VITE_API_BASE_URL Config, API Error Shape (Placeholder), How to Add a New Resource Workflow, Pagination Strategy (TBD) (+40 more)

### Community 1 - "Architecture Rules & Project Status"
Cohesion: 0.06
Nodes (45): Admin Panel AI Assistant Instructions, Clean Architecture Boundary Constraint, composition/container.ts Composition Root, Current Project State Summary, Admin Panel Design Language, erasableSyntaxOnly Constraint, exactOptionalPropertyTypes Constraint, noUncheckedIndexedAccess Constraint (+37 more)

### Community 2 - "Container/Async React Hooks"
Cohesion: 0.08
Nodes (23): useAppContainer(), AsyncStatus, useAsync(), UseAsyncOptions, UseAsyncResult, AuthStatus, renderUseAuth(), useAuth() (+15 more)

### Community 3 - "Session Domain Model & Tests"
Cohesion: 0.13
Nodes (9): CreateSessionInput, Session, CreateUserInput, User, Tenant, OidcAuthRepository, mapOidcUserToSession(), FakeUseCases (+1 more)

### Community 4 - "TenantContext & Auth Repository"
Cohesion: 0.15
Nodes (10): TenantContext, toTenantContext(), AuthRepository, createFakeAuthRepository(), GetCurrentSession, HandleAuthCallback, InitiateLogin, Logout (+2 more)

### Community 5 - "Husky Lint-Staged Tooling"
Cohesion: 0.07
Nodes (27): husky.sh script, devDependencies, eslint, eslint-config-prettier, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals (+19 more)

### Community 6 - "Package Dependencies"
Cohesion: 0.09
Nodes (22): dependencies, oidc-client-ts, react, react-dom, react-router, name, private, scripts (+14 more)

### Community 7 - "TypeScript App Compiler Config"
Cohesion: 0.09
Nodes (22): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, exactOptionalPropertyTypes, jsx, lib, module, moduleDetection (+14 more)

### Community 8 - "TypeScript Node Compiler Config"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 9 - "App Bootstrap & Providers"
Cohesion: 0.31
Nodes (6): App(), createAppContainer(), rootElement, AppProviders(), AppProvidersProps, router

### Community 10 - "Domain Error Types"
Cohesion: 0.39
Nodes (4): DomainError, InvalidSessionError, InvalidTenantError, InvalidUserError

### Community 11 - "OIDC Auth Repository Tests"
Cohesion: 0.31
Nodes (4): createFakeOidcUser(), createFakeUserManager(), FakeUserManager, MissingTenantClaimError

### Community 12 - "Prettier Formatting Config"
Cohesion: 0.29
Nodes (6): arrowParens, printWidth, semi, singleQuote, tabWidth, trailingComma

### Community 13 - "Icon Sprite Symbols"
Cohesion: 0.43
Nodes (7): Bluesky Icon Symbol, Discord Icon Symbol, Documentation Icon Symbol, GitHub Icon Symbol, Public Icon Sprite (SVG Symbols), Social/People Icon Symbol, X (Twitter) Icon Symbol

## Knowledge Gaps
- **125 isolated node(s):** `husky.sh script`, `semi`, `singleQuote`, `trailingComma`, `printWidth` (+120 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **19 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Admin Panel AI Assistant Instructions` connect `Architecture Rules & Project Status` to `API Contract & Conventions`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **Why does `Project Decisions Log` connect `Architecture Rules & Project Status` to `API Contract & Conventions`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **Why does `AuthRepository` connect `TenantContext & Auth Repository` to `Session Domain Model & Tests`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **What connects `husky.sh script`, `semi`, `singleQuote` to the rest of the system?**
  _129 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `API Contract & Conventions` be split into smaller, more focused modules?**
  _Cohesion score 0.06914893617021277 - nodes in this community are weakly interconnected._
- **Should `Architecture Rules & Project Status` be split into smaller, more focused modules?**
  _Cohesion score 0.0595959595959596 - nodes in this community are weakly interconnected._
- **Should `Container/Async React Hooks` be split into smaller, more focused modules?**
  _Cohesion score 0.08305647840531562 - nodes in this community are weakly interconnected._