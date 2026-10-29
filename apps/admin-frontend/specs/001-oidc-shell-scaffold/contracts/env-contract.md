# Contrato de ambiente — Aspire e admin-frontend

Fronteira de integração introduzida pela spec 001 e ainda referenciada por `shared/env.ts` e
`.env.example`. As definições executáveis são o
[AppHost](../../../../../backend/AppHost/AppHost.cs), produtor, e
[loadEnv](../../../src/shared/env.ts), consumidor. O [README](../../../README.md#variáveis-de-ambiente)
contém a preparação do ambiente; este contrato registra correspondência e falha, sem copiar valores.

| Variável                             | Responsabilidade                                                       |
| ------------------------------------ | ---------------------------------------------------------------------- |
| `VITE_API_BASE_URL`                  | Endpoint descoberto do services-service.                               |
| `VITE_OIDC_AUTHORITY`                | Autoridade OIDC descoberta do identity-service.                        |
| `VITE_OIDC_CLIENT_ID`                | Cliente público registrado no identity-service, com PKCE.              |
| `VITE_OIDC_REDIRECT_URI`             | Redirect registrado que corresponde à rota pública `/callback`.        |
| `VITE_OIDC_POST_LOGOUT_REDIRECT_URI` | Retorno registrado que corresponde à rota pública `/login`.            |
| `VITE_OIDC_SCOPE`                    | Escopos registrados para identidade, tenant, acesso à API e renovação. |

O AppHost injeta as variáveis; o Vite as expõe por `import.meta.env`. A ausência de qualquer uma
falha na inicialização, sem fallback para uma URL presumida. Alterar endpoint, cliente, redirect ou
escopo exige conferir produtor, consumidor e registro OIDC em conjunto. As rotas do protocolo ficam
públicas para não bloquear a autenticação com a própria guarda.

Endereços de descoberta são configuração, não uma fonte de autorização. A extração de tenant do
token no cliente não verifica sua assinatura; o backend valida token e escopo em cada requisição.
