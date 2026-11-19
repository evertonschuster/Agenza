# ADR 0015 — Prova de autenticação OAuth do MCP

Status: proposta (2026-11-19).

## Decisão

O IdentityService autentica o usuário pela página de login existente e emite tokens para o recurso
MCP. O host MCP valida o token com os accessors compartilhados e exige usuário, tenant e escopo
`mcp:connect`. O recurso configurado é a audiência do token. Tokens destinados ao REST são recusados.

A prova usa Authorization Code com PKCE S256 e clientes públicos, com callbacks explícitos por
cliente. O IdentityService anuncia `connect/register` nos metadados OAuth e aceita cadastro dinâmico
para o cliente que começa apenas pela URL do MCP. O cadastro é limitado a 20 requisições por minuto
por instância, com callbacks HTTPS ou HTTP no loopback e permissões exclusivas da prova MCP.
O cliente nativo registra o callback sem porta para permitir a porta variável da aplicação local.

O cadastro prévio opcional vem de `IdentityClients:Mcp:Clients`; o recurso vem de
`IdentityClients:Mcp:Resource` no emissor e `Mcp:Resource` no host. O bootstrap existente aplica o
cadastro. O cliente desktop local é nativo e aceita portas variáveis de loopback, mantendo o
endereço e o caminho registrados, conforme RFC 8252. Seu callback foi obtido pela versão instalada
do cliente. O cadastro web depende do callback exibido para a conexão real.

O SDK MCP publica os metadados do recurso protegido e o desafio de autenticação. Após o login, o
IdentityService retorna diretamente ao cliente e emite o código de autorização. Uma sessão válida
existente pode ser reutilizada. Os clientes MCP usam autorização implícita após a autenticação,
conforme o fluxo solicitado para a prova. `hello_world` é protegida para verificar esse contrato
antes das ferramentas de negócio.

O MCP e o login usam HTTPS em localhost com o certificado de desenvolvimento confiável da máquina.
O callback do cliente nativo usa HTTP no endereço de loopback `127.0.0.1`, conforme RFC 8252.

O aceite da #232 exige demonstração no ChatGPT Desktop e no ChatGPT web pelo navegador do celular.
Disponibilidade da integração, callback e apresentação da janela dependem de cada cliente e
precisam de validação manual.

## Alternativas rejeitadas

- Receber a senha como parâmetro de ferramenta ou formulário do agente. As credenciais são
  submetidas ao IdentityService pelo navegador.
- Reaproveitar o cliente `admin-panel` e a audiência REST. A integração tem cadastro e recurso
  próprios, com permissão explícita para o MCP.
- Conceder escopos REST ou de administração pelo cadastro dinâmico do MCP. O registro é restrito à
  conexão MCP e exige a autenticação do usuário para obter o token.
