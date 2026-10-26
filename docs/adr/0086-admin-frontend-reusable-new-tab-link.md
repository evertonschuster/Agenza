# ADR 0086 — admin-frontend: reusable link to a new tab

Status: accepted (2026-10-26); amends the link presentation of
[ADR 0084](0084-admin-frontend-open-existing-cpf-conflict.md)

The owner requested the visible label “Abrir cadastro existente” and reuse of the link presentation.
`NewTabLink` in `shared/ui/new-tab-link` wraps the router's `Link` and owns the semantic styles,
decorative icon, `target=_blank` and `rel=noopener noreferrer`. Callers supply destination and children;
the component has no knowledge of CPF, form errors or clients, and adds no state or request.

The person section keeps the field-error subscription from ADR 0085 and observes both `cpf` and `email`.
It uses the primitive below each field when its current error is `Client.DuplicateCpf` or
`Client.DuplicateEmail`, respectively, with `meta.clientId`. No conflict state or page props are added.
The label has no “(nova aba)” suffix; the icon remains. Both conflicts have real new-tab browser checks.
