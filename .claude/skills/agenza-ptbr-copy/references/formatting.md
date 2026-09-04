# Formatting numbers, money, durations and dates

Read [`SKILL.md`](../SKILL.md) first. This file is for when the task actually renders a value.

**`Intl`, always.** No hand-rolled `padStart` clock, no `${value.toFixed(2)}` money, no
`['jan','fev',…]` array. Locale is `pt-BR`, time zone is `America/Sao_Paulo`, currency is `BRL`.
There is exactly one exception, named below (duration), and it is arithmetic rather than locale data.

**Hoist every formatter to module scope.** Constructing an `Intl.*` object is expensive and a list
row does it once per render per cell. Build it once per module, call `.format()` in the component.

```ts
const LOCALE = 'pt-BR';
const TIME_ZONE = 'America/Sao_Paulo';

const brl = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: 'BRL' });
const timeOfDay = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});
```

## Money

`brl.format(129.9)` → `R$ 129,90`.

Two traps, both of which look like product bugs and are not:

- **The separator between `R$` and the digits is never U+0020.** ICU emits a non-breaking space, and
  which one (U+00A0 or U+202F) has moved between ICU versions, so it also differs between your Node
  and CI. Never assert a whole currency string typed with a normal space. Assert on a
  whitespace-normalised copy, or assert the digits and the symbol separately.
- **Numeric fields arrive typed `number | string`.** The generated types render every `int32` /
  `double` as `number | string` — see `ServiceResponse.price`, `durationMinutes`, and neighbours in
  `src/shared/api/generated/services-api.d.ts`. A formatter must accept `number | string` (and
  coerce) or the call site must coerce; `strict` will not let you forget, and a `Number()` at the top
  of the helper is the whole fix.

Money arithmetic belongs on the backend. Format for display; do not compute a total the owner will
act on from `double`s in the browser.

## Percentages

`style: 'percent'` expects a **fraction**: `0.1` → `10%`. `maxDiscountPercentage` arrives as `10`
meaning ten percent, so it must be divided before formatting — or formatted with plain
`Intl.NumberFormat` and a literal `%`. Feeding `10` to a percent formatter yields `1.000%`, which
reads plausible enough to ship.

## Duration

**Under an hour reads as minutes; an hour or more reads as hours.**

| Minutes | Renders |
| --- | --- |
| 45 | `45 min` |
| 60 | `1h` |
| 90 | `1h30` |
| 65 | `1h05` |
| 150 | `2h30` |

Chosen because the owner says "uma hora e meia", not "noventa minutos" — but she does say "quarenta e
cinco minutos". Minutes are padded to two digits so `1h5` never appears and a column of durations
stays aligned.

This is the one place we compose by hand. `Intl.DurationFormat`'s pt-BR output (`1 h 30 min`,
`1h 30min` narrow) is not the compact form the product wants, and support is still uneven; splitting
minutes into hours and minutes is integer arithmetic, not a locale rule, so nothing locale-specific
is being reinvented. A duration *range* — `ServiceResponse` carries `minDurationMinutes` and
`maxDurationMinutes` — joins with an en dash: `45 min – 1h30`.

## Dates and times

Two kinds of value, and conflating them is the classic bug:

**An instant** (`Format: date-time` on the wire, UTC) — format it with an explicit
`timeZone: 'America/Sao_Paulo'`. Omitting the zone silently uses the *device's* zone: correct on the
owner's phone in Brazil, wrong on a CI runner in UTC, and wrong in a way that only shows up as a
flaky test at 21:00 BRT.

**A date-only value** (`2026-09-04`, no time) — **never hand it to `new Date()`**. The string parses
as UTC midnight, which is 3 September in São Paulo, so the appointment renders one day early. Split
the parts and build a local date, or format the string's parts directly:

```ts
const [year, month, day] = isoDate.split('-').map(Number);
const localDate = new Date(year, month - 1, day);
```

Brazil has had no daylight saving since 2019, so the offset itself never moves — which is exactly why
this bug survives review: the only thing that shifts is a date-only value, and only by one day.

**Clock: 24 hours.** `hourCycle: 'h23'` — pt-BR already defaults to 24-hour, but `hour12: false`
produces `24:30` for half past midnight in some engines. `h23` produces `00:30`.

**Weekday and month names are lowercase in pt-BR** and `Intl` returns them that way — `sex.`,
`setembro`. Capitalise only when the value starts a sentence or a heading, and never Title Case
`Sexta-Feira`. Note that the short weekday carries a trailing period; don't strip it by hand.

### Shorthand a scheduling product needs

| When | Renders |
| --- | --- |
| Same calendar day | `Hoje, 14:30` |
| Next / previous calendar day | `Amanhã, 09:00` · `Ontem, 18:00` |
| Same year | `12 de set, 14:30` |
| Another year | `12 de set de 2025, 14:30` |

"Hoje" and "amanhã" are **calendar-day** questions, not 24-hour-difference questions. Compare the
`year`/`month`/`day` parts produced by a formatter pinned to `America/Sao_Paulo` — subtracting
milliseconds calls 23:00 today and 01:00 tomorrow "the same day".

In a list grouped by day, the group header carries the full date (`Hoje · sexta-feira, 12 de
setembro`) and each row carries only `14:30`. Repeating the date on every row is what makes an agenda
unreadable on a 375 px screen.

`Intl.RelativeTimeFormat` ("há 2 dias") is for audit trails and activity feeds. For anything the
owner has to act on, an absolute time plus the shorthand above wins — "há 3 horas" does not tell her
whether she has to leave now.

## Counts and plurals

Use `Intl.PluralRules(LOCALE)` rather than `n === 1`. CLDR's rule for `pt` is `i = 0..1 → one`, so
`select(0)` returns `'one'` — the opposite of the English instinct, and worth confirming in a
one-liner before you depend on it.

Better still: **never render a zero count.** Zero is an empty state, and "Nenhum serviço ainda" says
more than "0 serviços". → [`states.md`](states.md)

## Input, not output

The owner types `129,90`. `Number('129,90')` is `NaN`.

- Avoid `<input type="number">` for money: the spinner is a mis-click hazard, the scroll wheel edits
  the value, and comma acceptance is browser- and locale-dependent.
- Use `inputMode="decimal"`, keep the raw string in state, and normalise once on submit — drop the
  thousands separator `.`, swap `,` for `.`.
- On mobile the font size of a text input must be at least 16px or iOS Safari zooms on focus, which
  is spec acceptance scenario US2 #2 — a formatting concern that lands as a layout bug.

## Testing

The suite runs on jsdom over Node's ICU, so `Intl` is real and the output is the real thing —
including the non-breaking spaces. Assert on normalised strings, keep the golden values in the test
rather than reimplementing the formatter in the assertion, and pin `TZ` expectations to the São Paulo
zone rather than to the machine's.
