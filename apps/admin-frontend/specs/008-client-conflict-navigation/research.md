# Research

Decision: preserve the typed field entry in the generic error mapping. The person section reads CPF and e-mail error types and their `meta.clientId`. The backend already scopes the match to the authenticated tenant.

Decision: use the form error as the only source of conflict state. The original page state and CPF value watcher were removed after owner review (ADR 0085). Shared form mapping preserves metadata generically; the CPF section alone interprets the client id.

Decision: open the existing edit route in a new tab, explicitly labelled, preserving the original form. Rejected: a new detail screen, automatic navigation after failure and passing arbitrary backend URLs.

Owner review (ADR 0086): use the visible label “Abrir cadastro existente” and share the presentation in NewTabLink. Both CPF and e-mail conflicts use it, without adding state to the page.
