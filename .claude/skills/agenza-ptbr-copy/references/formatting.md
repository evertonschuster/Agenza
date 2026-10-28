# Displaying values

Reuse [shared/format](../../../../apps/admin-frontend/src/shared/format/) and existing value parsers
before adding a helper. Use `Intl` for locale data and keep reusable formatters at module scope.
Check the actual generated/property type before coercing a value; do not assume every API number
arrives as the same JavaScript type.

## Dates are either instants or calendar days

- Render an instant in the explicit product zone, `America/Sao_Paulo`, rather than the device's
  implicit zone. For a clock use `hourCycle: 'h23'` to keep midnight in the `00` hour.
- A date-only value is represented by a `Date` at midnight UTC and read in UTC. Local `getDate()`
  or `toLocaleDateString()` without a UTC zone can move `2026-09-04` to 3 September in Brazil.
  Reuse [date.ts](../../../../apps/admin-frontend/src/shared/format/date.ts) for `utcDate`,
  `parseIsoDate`, `todayUtc` and calendar-year calculations.
- Form rules use `todayUtc()`, matching the backend's calendar day. This differs from displaying
  an instant in São Paulo. Build test clocks with an explicit ISO instant ending in `Z`.
- The numeric date field follows `navigator.language` for part order and separator; its copy and
  calendar labels remain pt-BR. Reuse
  [masked-date.ts](../../../../apps/admin-frontend/src/shared/form/fields/components/masked-date.ts)
  and [DateField](../../../../apps/admin-frontend/src/shared/form/fields/components/date-field.tsx),
  which use UTC, Gregorian dates and Latin digits. Do not force `dd/mm/aaaa` for every browser.
- Preserve `DateField`'s distinct values: an empty field is `null`; incomplete/impossible text is an
  invalid `Date` that the schema rejects. Do not convert invalid input to an absent birth date.

For new agenda copy, Hoje/Amanhã/Ontem are calendar-day comparisons in the display zone, not
differences smaller than 24 hours. Prefer an absolute time when the person must act on it; relative
time alone is more appropriate for an activity feed. Keep pt-BR month/weekday names in sentence case.

## Numbers, money and percentages

- Reuse `formatNumber` and `formatCount` from
  [count.ts](../../../../apps/admin-frontend/src/shared/format/count.ts). Its `Intl.PluralRules`
  follows Portuguese rules; zero is not necessarily the English plural category. A count can be
  zero, while an empty list still needs an explanatory empty state.
- For money use `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`. Formatting is
  presentation; financial arithmetic and authoritative totals belong to the backend.
- Currency output contains locale-controlled spacing, commonly a non-breaking space. Do not
  compare it to a manually typed whole string containing only ordinary spaces; normalize spacing
  when it is irrelevant to the assertion, or assert the meaningful formatted parts.
- A percent formatter expects a fraction: `0.1` renders as `10%`. Check whether the source contract
  uses a fraction or a percentage before formatting; a value of `10` is not interchangeable.

For a money input, `Number('129,90')` is not a parser. Reuse the relevant control/parser or define the
accepted decimal/thousands syntax explicitly before converting on submission. `inputMode="decimal"`
is a keyboard hint, not validation. Preserve input sizing that prevents unwanted mobile focus zoom.

## Durations

The compact product convention uses minutes below an hour and hours plus two-digit remaining
minutes above it: `45 min`, `1h`, `1h05`, `1h30`. This composition is integer arithmetic, rather than
locale month/day data. A range joins the formatted endpoints with an en dash: `45 min – 1h30`.
Add a shared helper when a real screen needs it; this convention does not imply one already exists.

## Verification

Check boundary values that the change can affect: midnight in another device zone, leap days, UTC
today near local midnight, invalid/incomplete input, currency spacing, percentage scale or plural
categories. Use fixed expected values instead of calling the same formatter to calculate the test
expectation. Pin browser language only when testing a specific numeric date layout; include another
layout when changing locale handling.
