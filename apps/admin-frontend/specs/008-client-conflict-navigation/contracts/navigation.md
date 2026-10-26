# Navigation contract

The current CPF form error with type `Client.DuplicateCpf` and `meta.clientId` exposes “Abrir cadastro existente (nova aba)” below CPF. It links to the internal `/pessoas/{id}/editar` route, with the identifier encoded, `target=_blank` and `rel=noopener noreferrer`. Metadata never supplies a URL. Validation and clearing of the form error control the link. No OpenAPI change.
