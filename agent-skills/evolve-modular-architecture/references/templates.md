# Architecture decision templates

## Contents

1. Assessment
2. Module contract
3. Evolution plan
4. ADR

## Assessment

```markdown
# Architecture assessment: <scope>

## Recommendation
<One paragraph>

## Decision question
<Falsifiable question and time horizon>

## Evidence
| Claim | Status: observed/inferred/unknown | Evidence | Confidence/next check |
| --- | --- | --- | --- |

## Drivers and constraints
- Business:
- Technical:
- Organizational:
- Operational:

## Current map
- Capabilities and candidate contexts:
- Code dependencies:
- Data ownership:
- Integrations and consistency:
- Deployments and owners:

## Options
| Option | Benefits | Costs/risks | Reversibility | Evidence needed |
| --- | --- | --- | --- | --- |

## Decision and consequences
<Boundary, ownership, data, integration, and explicit trade-offs>

## Fitness functions
| Characteristic | Check/threshold | Cadence | Owner | Failure response |
| --- | --- | --- | --- | --- |

## Evolution plan
<Small stages with checkpoints>

## Review triggers
<Metrics, dates, or events that reopen the decision>
```

## Module contract

```markdown
# Module: <business capability>

- Purpose:
- Ubiquitous language:
- Owner:
- In scope:
- Out of scope:
- Public commands:
- Public queries:
- Published events:
- Consumed contracts:
- Owned data:
- Consistency and transaction boundary:
- Allowed dependencies:
- Forbidden dependencies:
- Failure semantics:
- Security/privacy:
- SLOs:
- Fitness functions:
```

## Evolution plan

```markdown
| Stage | Vertical outcome | Compatibility/seam | Verification | Rollback | Exit criteria |
| --- | --- | --- | --- | --- | --- |
```

Each stage must produce a working system and evidence for the next decision. Keep removal of the old path separate from proving the new path when rollback matters.

## ADR

```markdown
# ADR-NNN: <decision in active voice>

- Status: proposed | accepted | superseded | rejected
- Date:
- Owners:
- Review triggers:

## Context
<Decision question, evidence, constraints, and uncertainty>

## Decision drivers
- ...

## Considered options
1. Do nothing yet
2. ...

## Decision
<What is being decided, for which scope, and what is explicitly not being standardized>

## Consequences

### Positive
- ...

### Negative
- ...

### Risks and mitigations
- ...

## Fitness functions
- ...

## Migration and rollback
- ...

## Follow-up evidence
<Metrics or experiments that will confirm or challenge the decision>
```

Do not edit accepted ADR history to hide a changed decision. Add a superseding ADR and link both records.
