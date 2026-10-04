# Domain — modeling decisions

Rules: [ARCHITECTURE §3](../../../../backend/docs/ARCHITECTURE.md#3-domain). Code to copy: §10 rows
"Value objects", "Aggregate with children…", "Domain errors". This file is how to decide and how to
write; it does not repeat the rules.

## 1. Aggregate, child, or a reference to another aggregate?

Ask in order and stop at the first yes:

1. **Must it change in the same transaction as another root to keep a rule true?** ("a minor has at
   least one guardian") → a **child** of that root.
2. **Does it have a life of its own** — created, listed, edited or deleted on its own, reachable by its
   own route? → its **own aggregate**: root, repository, feature folder.
3. **Is the link "uses / is tagged with / belongs to"** another thing that has a life of its own? → the
   owner keeps the other's **id**. A set of ids is a small child of the owner that holds the other's id,
   keyed `(TenantId, OwnerId, OtherId)`.

A wrong boundary shows up as: a handler that must save two roots together to keep a rule; a child that
wants its own endpoint; a root that loads another root to answer a question about itself.

## 2. Value object or primitive?

Apply the threshold in §3. In this codebase it reads as:

| Becomes a value object | Because |
| --- | --- |
| CPF, e-mail, phone | format and normalization |
| a duration range | a rule over several values |
| a colour from a palette, contact purposes | a closed set |
| a birth date | its rule needs `today` |
| price, discount | money and a percentage |

| May stay a primitive | Validated by |
| --- | --- |
| a tag's name, a contact's name or relationship, a description | its owner, with a named `DomainError` |

Writing one:

- `sealed record`, private constructor, one `Value` (or the few values it groups).
- `Create(raw)` trims and normalizes, then validates, and fails on the **first** broken rule. An
  optional value returns `Success(null)` for blank input — the caller does not pre-check for blank.
- `Restore(stored)` only rebuilds; no rule runs.
- Limits are `public const`; each rule's error is `public static readonly DomainError`, named
  `<Type>.<Rule>` and worded about the value ("O CPF informado é inválido."), never about the entity
  that holds it.
- A pure predicate (`IsValid`, `HasValidShape`) when the validator needs the check without building the
  value. The predicate and `Create` share the private check, so they cannot disagree.
- No reference to an entity, a repository, a clock or configuration; what a rule needs comes in as a
  parameter (`today`).

## 3. Behaviour

- Name the method after the intention (`Inactivate`, `Reactivate`, `ReplaceContacts`, `Reprice`), not
  after the field (`SetStatus`). If you cannot name the intention, ask what the user is doing.
- Each method: refuse what is not allowed from the current state with a named error (an inactive
  client asked to inactivate again, for instance) → validate every new value → assign → `Success`.
  Nothing is assigned before the last check passes.
- A whole-record `Update(…)` is for an edit form over free data with no transition. It runs the same
  private validations as `Create`, so both refuse the same input.
- Children change through the root: one method receives the desired state as data records, syncs the
  children by id, and re-checks the aggregate's rules (limits, "a minor has a guardian") on the result.
- What the behaviour needs from outside — today, a generated number, the fact that another aggregate
  exists — arrives as a parameter the handler already resolved. The domain never asks for it.

## 4. Factories and ids

| Type | Factory | Called by |
| --- | --- | --- |
| Root | `public static DomainResult<T> Create(Guid id, <value objects>, <context>, <child data>)` | `ToModel` in the Application |
| Child | `internal static DomainResult<TChild> Create(Guid id, Guid rootId, <Child>Data data)` | its root only |
| Value object | `Create(raw)` and `Restore(stored)` | `ToModel`, `ApplyTo`, EF conversions |

- A root's `Create` takes value objects already built, not raw strings, for fields that are value
  objects; its own primitive fields it validates itself.
- `<Child>Data` is a record next to the child, carrying value objects; it is how the outside describes a
  child without creating one.
- Ids are `Guid.CreateVersion7()`: the root's minted by `ToModel`, a child's by the root.
- EF gets a private parameterless constructor; required reference properties are set to `null!` there.
- No `<X>Factory` class, no builder, no public constructor, no static "create from command" on the
  entity — the entity never sees a command.

## 5. Errors

One `static readonly DomainError` per rule, on the type that owns the rule, `<Type>.<Rule>`, pt-BR
message. A rule over the whole aggregate belongs to the root (`Client.GuardianRequired`); a rule over a
value belongs to the value object (`CpfNumber.Invalid`). The validator reuses these codes.

## 6. Red flags in the domain

- `{ get; set; }`, a public setter, a `public void Set…`
- a property or collection typed as another aggregate root
- `new DomainError(` inside a method instead of a named field
- a public constructor; a `<X>Factory` or builder
- `DateTime.Now`, `DateTime.UtcNow`, `DateTime.Today`; a tenant anywhere in `Create`
- a reference to Application, EF Core, JSON attributes or an interface implemented elsewhere
- a `Deleted` value in a status enum
- a comment carrying a rule that a method or error name could carry
