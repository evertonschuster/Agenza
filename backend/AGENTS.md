# backend — instruções para agentes

Complementa o [AGENTS.md da raiz](../AGENTS.md), que vale primeiro. Aqui só o que é específico do
backend .NET.

> Aponta, não copia ([ADR 0041](../docs/adr/0041-ai-instruction-files-reinstated.md)). Versões vêm de
> `global.json` e `Directory.Packages.props`; a forma e as regras vêm de
> [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md). Este arquivo não lista features, endpoints nem
> entidades — isso é o código.

## Antes de tocar no código

1. [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — a forma, as regras e o porquê. **O §10 diz qual
   código copiar e qual é da geração anterior**: o arquivo mais próximo nem sempre é o exemplo certo.
2. O [índice de ADRs](../docs/adr/README.md) — abra só as ADRs vigentes da preocupação em jogo; uma
   passagem marcada como superseded é histórico, não instrução.
3. [`docs/API.md`](../docs/API.md) — as formas da fronteira HTTP: envelope, erros, status.
4. Skills: `agenza-backend-slice` para criar ou mudar uma fatia; `agenza-backend-review` para revisar
   uma mudança, inclusive a sua antes do PR; `agenza-tenant-isolation` para qualquer coisa que toque
   tenant; `agenza-api-contract` para o contrato com o frontend.

## Forma

Serviços agregados por contexto ([ADR 0001](../docs/adr/0001-context-aggregated-services.md)): uma
capacidade nova que cabe num contexto existente é uma pasta `<Feature>/<Operation>/` na Application
daquele serviço, não um serviço novo. Dentro do serviço, Clean Architecture com portas e adaptadores —
`Domain ← Application ← Infrastructure ← Api`, imposto pelas referências de projeto. As fatias
verticais organizam a Application; não substituem as camadas.

## Regras que quebram build ou review

Cada linha é um lembrete; a regra, com o porquê, está na seção indicada da
[ARCHITECTURE](docs/ARCHITECTURE.md).

- **O Domain não referencia nada** — nem projeto, nem pacote. [§1](docs/ARCHITECTURE.md#1-shape)
- **A forma mais simples correta primeiro** — mecanismo de desempenho só com evidência no PR.
  [Regras gerais](docs/ARCHITECTURE.md)
- **O handler é dono da orquestração; entrada e saída são records explícitos.**
  [§2](docs/ARCHITECTURE.md#2-anatomy-of-a-feature)
- **Domínio rico** — a raiz cria os filhos, agregados se referenciam por id, value objects com
  `Create`/`Restore`, transição com nome de intenção, factory estática. [§3](docs/ARCHITECTURE.md#3-domain)
- **Erros são valores, em cinco portões** — validator síncrono e com código em toda regra; `try/catch`
  em handler é achado. [§4](docs/ARCHITECTURE.md#4-errors--one-pipeline-five-gates)
- **O tenant nunca é parâmetro; repositório simples sobre os filtros do `DbContext`; o banco decide a
  unicidade; migração só aditiva.** [§5](docs/ARCHITECTURE.md#5-tenancy-and-persistence)
- **Controller sem lógica; enum no fio é string.** [§6](docs/ARCHITECTURE.md#6-http-surface)
- **UTC, sempre.** [§7](docs/ARCHITECTURE.md#7-time)
- **Log com `ILogger<T>` e template com placeholders, nunca string interpolada; nível em `Serilog:MinimumLevel`.**
  [§8](docs/ARCHITECTURE.md#logging)
- **Corpo em bloco com guard clauses; sem comentário de "o quê".** [§8](docs/ARCHITECTURE.md#8-code-style)

## Portões

```bash
dotnet build backend/AdminBackend.slnx -c Release
dotnet test backend/AdminBackend.slnx -c Release
```

Warnings são erros, e o gate de cobertura de Domain + Application roda no `dotnet test` local igual ao
CI. Mudou o contrato de um endpoint? Regenere os tipos do frontend no mesmo PR — `npm run
generate:api-types` em `apps/admin-frontend`, com o serviço rodando; o `generate:api-types:check` do CI
compara byte a byte. Mudou algo que só o PostgreSQL garante (índice único, FK composta, `CHECK`)?
Verifique à mão num PostgreSQL descartável e registre no PR o que rodou (ARCHITECTURE §9).

## Ao terminar

- Decisão nova, ou tentada e revertida → ADR.
- Uma regra deste diretório mudou → `docs/ARCHITECTURE.md` no mesmo PR. Uma fatia nova virou a
  referência de alguma preocupação → troque a linha do §10.
- Não escreva aqui, no README nem na ARCHITECTURE lista de features, status ou "hoje só X faz Y".
