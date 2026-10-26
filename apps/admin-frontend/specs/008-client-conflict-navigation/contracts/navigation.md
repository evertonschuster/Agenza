# Navigation contract

The current `cpf` form error with type `Client.DuplicateCpf`, or `email` error with type `Client.DuplicateEmail`, and `meta.clientId` exposes “Abrir cadastro existente” below its field. The shared NewTabLink links to the internal `/pessoas/{id}/editar` route, with the identifier encoded, `target=_blank` and `rel=noopener noreferrer`. Metadata never supplies a URL. Validation and clearing of each form error control its link. No OpenAPI change.
