# ADR 0010 — Git, CI e toolchain

## Decisão

- **Trunk-based.** Só `main` é permanente e está sempre liberável. Trabalho vai por PR, numa branch
  curta cortada da `main` atualizada; nada é commitado direto na `main`.
- **Uma feature que atravessa backend e frontend vira dois PRs**, ambos cortados da `main`: o do
  backend primeiro, levando os tipos OpenAPI regenerados; depois o do frontend. Cada um passa
  sozinho nos seus gates.
- **O CI é a autoridade dos gates.** O repositório não instala hooks locais; quem contribui, pessoa
  ou agente, roda os comandos aplicáveis antes de declarar o trabalho pronto.
- **Versões vêm dos pins**, nunca de documentação: `.nvmrc`, `packageManager`,
  `backend/global.json`, `.python-version`, `uv.lock` e as actions de setup do CI.
- **O AppHost usa o bundle da CLI do Aspire** (`AspireUseCliBundle=true`).
  `dotnet run --project backend/AppHost --launch-profile http` continua sendo o comando único, sem
  instalar a CLI. O job de contrato roda a configuração Debug, a mesma que a CLI lança.
- **Pins de compatibilidade ficam até a linha estável seguinte suportar a mudança**, por exemplo o
  TypeScript até o typescript-eslint estável aceitar a versão nova. O motivo de cada pin fica no PR
  que o cria.

## Rejeitado

- **Uma branch permanente de `develop` ou staging.**
- **Husky e lint-staged.** Duplicavam o CI e travavam commits locais sem ser a autoridade.
- **Um pre-commit que recusasse commits na `main`.** A proteção da branch no GitHub já é essa
  autoridade.
