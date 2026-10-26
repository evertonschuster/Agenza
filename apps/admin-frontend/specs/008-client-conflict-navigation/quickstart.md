# Validation

Run the colocated ClientFormPage tests for create/edit conflicts, missing and unrelated metadata, edited CPF and resubmission. Run all frontend gates.

On the existing Aspire stack, run `e2e/clients.spec.ts`: register one person with CPF or e-mail, submit another with the same value, open “Abrir cadastro existente” and verify that the new tab contains the first person's edit form while the original draft stays intact. The e-mail scenario uses uppercase input to preserve the normalization check.

## Validation on 2026-10-26

The full Vitest coverage gate, typecheck/production build, lint and format passed. The full Playwright suite passed against the existing Aspire stack, including the CPF conflict opening the real existing record in another tab and preserving the draft. OpenAPI remained identical; the real OIDC smoke also passed.
