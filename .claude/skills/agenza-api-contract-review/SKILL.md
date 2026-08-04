---
name: agenza-api-contract-review
description: >
  Use to audit backend OpenAPI contracts against frontend generated types,
  request/response handling, and error mapping. Trigger on contract changes or
  suspected drift. Review by default; never change a public contract silently.
---

# API contract review

Read the root plus affected area instructions. Compare executable sources, not
copied field lists in prose.

## Review order

1. Backend route, method, authorization, command/query binding, response type,
   status codes, and Problem Details shape.
2. Generated OpenAPI document and checked-in TypeScript contract.
3. Frontend decoder, mapper, repository request body/path, and MSW handlers.
4. Tests and CI generation/drift workflow.

Check:

- route/method and path parameter agreement;
- request required/optional/null semantics and route/body id consistency;
- response field names, types, enums, numeric ranges, and nullability;
- success and error status/code mappings;
- auth scope and tenant-header requirements;
- runtime decoding of untrusted JSON;
- stale handwritten DTOs or mocks that bypass the generated contract.

Classify each finding as backend defect, generated-contract drift, frontend
integration defect, test/mock drift, or unresolved product decision. Include
the exact source files and the smallest safe owner-side fix. Run or inspect the
current generation and contract gates when implementation is requested.
