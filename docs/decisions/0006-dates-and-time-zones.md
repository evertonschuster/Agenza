# ADR 0006 — Datas e fusos

Status: proposta (2026-11-14); passa a aceita no merge.

## Decisão

- **O backend trabalha só em UTC.** Instantes são `DateTimeOffset` do `TimeProvider` injetado;
  datas de calendário são `DateOnly`; "hoje" é o dia UTC, calculado no handler ou validator e
  passado ao domínio. Sem `DateTime.Now`, `DateTime.Today` nem `TimeZoneInfo`.
- **Uma data de calendário enviada como instante mantém o dia escrito.** Um value object de data
  aceita `2015-03-10T23:59:59-03:00` como 10 de março, ignorando hora e offset. O resto continua
  com o framework.
- **No frontend, a ordem e o formato de datas digitadas e exibidas seguem o idioma do navegador**;
  textos e números seguem pt-BR.

Uma regra que dependa do dia local do negócio exige uma ADR nova.

## Rejeitado

- **Converter a data no repositório do frontend** e manter o contrato estrito. O dono preferiu
  afrouxar o backend a mexer no gerador de tipos.
- **Usar o dia UTC do instante recebido.** O dono pediu a data como foi escrita.
- **Fixar a ordem de data em pt-BR.** Um usuário com o navegador em outro idioma lê e digita na
  ordem dele.
