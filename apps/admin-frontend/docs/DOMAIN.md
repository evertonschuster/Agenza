# Domain Glossary

Definitions of the core business concepts in this system. Agents should
read this before designing any domain entity to avoid inventing shapes
that conflict with the actual business model.

---

## Core concepts

### Business (Tenant)

A single service-based business — a dental clinic, aesthetics practice,
massage therapist, etc. Every piece of data in the system belongs to
exactly one Business. In the code, Business identity is carried by
`Tenant` (value object wrapping `tenant_id`).

One user → one Business. No multi-business user accounts in v1.

### User

A business owner or staff member who logs into the admin panel. Has a
`tenant_id` claim in their OIDC token that ties them to their Business.
In v1, a User and their Business are effectively the same person
(owner-operator model).

### Session

The authenticated state: a valid access token + the User it belongs to +
an expiry. Domain-level concept — does not know it's a JWT.

---

## Appointment

A scheduled service for a specific client at a specific time.

Key fields (confirm exact names with API spec before implementing):

- `id` — unique identifier
- `clientId` — which client
- `serviceId` — which service was booked
- `staffId` — which staff member (optional in v1 — some businesses are solo operators)
- `startTime` — when the appointment begins (DateTime)
- `duration` — derived from the Service, or overridden
- `status` — see AppointmentStatus below
- `source` — how it was booked (see AppointmentSource below)
- `paymentStatus` — simple field/enum only, no payment flow in v1
- `notes` — optional free text

### AppointmentStatus

Valid states (confirm with API spec):

- `scheduled` — booked, not yet confirmed
- `confirmed` — business has confirmed
- `cancelled` — cancelled by client or business
- `completed` — the appointment happened
- `no_show` — client didn't show up

### AppointmentSource

How an appointment was created:

- `ai` — the AI receptionist booked it automatically
- `staff` — a staff member created it manually in the admin panel

---

## Service

A service the business offers that clients can book.

Key fields:

- `id`
- `name` — e.g. "60-minute Deep Tissue Massage"
- `duration` — in minutes (integer)
- `price` — monetary amount (confirm currency handling with API spec)
- `description` — optional, shown to clients by the AI
- `isActive` — whether the AI should offer this service to clients

Services are tenant-scoped. The AI references this list when answering
client questions about what's available.

---

## Client

A person who has interacted with the business (booked an appointment,
messaged via the AI, or been added manually).

Key fields:

- `id`
- `name`
- `phone` — optional
- `email` — optional
- `notes` — optional, internal notes from staff
- `createdAt`

Clients are **tenant-scoped** — the same real-world person appears as
separate Client records under different businesses. There is no
cross-tenant client identity.

Client history = their list of Appointments under this Business.

---

## Conversation

An interaction between a client and the AI receptionist (or a staff
member who took over). The client-facing channel (WhatsApp, web widget,
SMS) is abstracted away — a Conversation is channel-agnostic.

Key fields:

- `id`
- `clientId` — who the conversation is with (may be unidentified initially)
- `status` — see ConversationStatus below
- `channel` — the channel type (abstracted, not built yet)
- `createdAt`
- `lastMessageAt`

### ConversationStatus

- `ai_active` — the AI is handling it
- `needs_attention` — AI flagged it for human review (escalation)
- `human_active` — a staff member has taken over
- `resolved` — closed

### Message

A single message within a Conversation.

Key fields:

- `id`
- `conversationId`
- `sender` — `'ai'` | `'client'` | `'staff'`
- `content` — text content
- `timestamp`

**Inbox** is the admin panel's view of Conversations, filtered to show
those needing attention or recently active.

---

## Business Settings

Configuration owned by the Business, not individual Users.

Sub-domains:

- **Profile** — business name, address, contact info
- **WorkingHours** — per-day open/close times, weekly schedule for v1
  (no holiday exceptions in v1)
- **StaffMembers** — basic list of who works there (name, role)
- **AiConfiguration** — tone, escalation rules (abstract in v1 — a
  loosely-typed settings bag, not a rigid schema)

---

## What is explicitly out of scope in v1

- Online payment processing (Stripe, etc.)
- The client-facing channel/widget (built separately, not part of this app)
- Voice/phone AI
- Holiday/exception schedules for working hours
- Multi-business user accounts
- Cross-tenant client identity

Model these as abstractions where they appear (e.g. `paymentStatus` field
on Appointment exists, but no payment flow), not as built features.
