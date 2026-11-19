"""Exercise the MCP OAuth boundary against a controlled Aspire environment."""

import argparse
import base64
import hashlib
import html
import http.cookiejar
import json
import os
import re
import secrets
from urllib import error, parse, request


class NoRedirect(request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


class OAuthProbe:
    def __init__(self, args):
        self.args = args
        self.browser = request.build_opener(
            request.HTTPCookieProcessor(http.cookiejar.CookieJar()), NoRedirect()
        )

    def send(self, url, *, form=None, rpc=None, json_body=None, token=None, tenant=None):
        headers = {"Accept": "application/json, text/event-stream"}
        data = None
        if form is not None:
            headers["Content-Type"] = "application/x-www-form-urlencoded"
            data = parse.urlencode(form).encode()
        if rpc is not None:
            headers["MCP-Protocol-Version"] = "2025-11-25"
            json_body = rpc
        if json_body is not None:
            headers["Content-Type"] = "application/json"
            data = json.dumps(json_body).encode()
        if token:
            headers["Authorization"] = f"Bearer {token}"
        if tenant:
            headers["X-Tenant-Id"] = tenant
        try:
            response = self.browser.open(request.Request(url, data, headers), timeout=15)
        except error.HTTPError as response_error:
            response = response_error
        with response:
            return response.status, response.headers, response.read().decode()

    @staticmethod
    def antiforgery(page):
        match = re.search(r'name="__RequestVerificationToken"[^>]*value="([^"]+)"', page)
        assert match, "Formulário sem proteção antiforgery"
        return html.unescape(match[1])

    def autorizar_com_pkce(self):
        verifier = secrets.token_urlsafe(48)
        challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).rstrip(b"=").decode()
        state = secrets.token_urlsafe(24)
        params = {
            "client_id": self.args.client_id,
            "redirect_uri": self.args.callback,
            "response_type": "code",
            "scope": "openid profile tenant_id mcp:connect offline_access",
            "code_challenge": challenge,
            "code_challenge_method": "S256",
            "resource": self.args.mcp_url,
            "state": state,
        }
        authorize = f"{self.args.identity_url}/connect/authorize?{parse.urlencode(params)}"
        status, headers, page = self.send(authorize)
        expected = parse.urlparse(self.args.callback)
        destination = parse.urlparse(parse.urljoin(self.args.identity_url, headers.get("Location", "")))
        if status == 302 and (destination.scheme, destination.netloc, destination.path) != (expected.scheme, expected.netloc, expected.path):
            login = parse.urljoin(self.args.identity_url, headers["Location"])
            status, _, page = self.send(login)
            assert status == 200, "Login indisponível"
            status, _, invalid_login = self.send(login, form={
                "Email": self.args.email,
                "Password": secrets.token_urlsafe(32),
                "__RequestVerificationToken": self.antiforgery(page),
            })
            assert status == 200 and "AUTH_INVALID_CREDENTIALS" in invalid_login, "Credenciais inválidas aceitas"
            status, headers, _ = self.send(login, form={
                "Email": self.args.email,
                "Password": os.environ["AGENZA_MCP_TEST_PASSWORD"],
                "__RequestVerificationToken": self.antiforgery(page),
            })
            assert status == 302, "Login não concluído"
            status, headers, page = self.send(authorize)
        assert status == 302, "Login deve retornar diretamente ao cliente"
        callback = parse.urlparse(headers["Location"])
        assert (callback.scheme, callback.netloc, callback.path) == (expected.scheme, expected.netloc, expected.path)
        result = parse.parse_qs(callback.query)
        assert result["state"] == [state], "State alterado no retorno"
        assert "code" in result, "Código de autorização ausente"
        return {
            "grant_type": "authorization_code",
            "client_id": self.args.client_id,
            "redirect_uri": self.args.callback,
            "code": result["code"][0],
            "code_verifier": verifier,
            "resource": self.args.mcp_url,
        }

    def executar_ferramenta(self, token):
        status, _, body = self.send(self.args.mcp_url, token=token, rpc={
            "jsonrpc": "2.0", "id": 1, "method": "tools/call",
            "params": {"name": "hello_world", "arguments": {}},
        })
        assert status == 200, f"Ferramenta retornou HTTP {status}"
        payload = next((line[5:].strip() for line in body.splitlines() if line.startswith("data:")), body)
        result = json.loads(payload)["result"]
        assert result["content"][0]["text"] == "Olá! O MCP do Agenza está funcionando."

    def verificar_fluxo(self):
        initialize = {"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {
            "protocolVersion": "2025-11-25", "capabilities": {},
            "clientInfo": {"name": "prova-oauth", "version": "1.0"},
        }}
        status, headers, _ = self.send(self.args.mcp_url, rpc=initialize)
        assert status == 401, "MCP permitiu chamada anônima"
        metadata = re.search(r'resource_metadata="([^"]+)"', headers["WWW-Authenticate"])
        assert metadata, "Desafio sem metadados MCP"
        status, _, body = self.send(metadata[1])
        assert status == 200 and json.loads(body)["resource"] == self.args.mcp_url
        status, _, body = self.send(f"{self.args.identity_url}/.well-known/openid-configuration")
        discovery = json.loads(body)
        assert status == 200 and "S256" in discovery["code_challenge_methods_supported"]
        assert "mcp:connect" in discovery["scopes_supported"]
        if self.args.register:
            registration = discovery["registration_endpoint"]
            for invalid in [
                {"redirect_uris": ["http://externo.invalid/callback"]},
                {"redirect_uris": [self.args.callback], "scope": "identity-admin"},
                {"redirect_uris": [self.args.callback], "token_endpoint_auth_method": "client_secret_post"},
                {"redirect_uris": [self.args.callback], "grant_types": ["client_credentials"]},
                {"redirect_uris": [self.args.callback + "#fragmento"]},
            ]:
                status, _, body = self.send(registration, json_body=invalid)
                assert status == 400 and "error" in json.loads(body), "Cadastro inválido aceito"
            status, _, body = self.send(registration, json_body={
                "client_name": "Prova de cadastro MCP",
                "redirect_uris": [self.args.callback],
                "token_endpoint_auth_method": "none",
                "grant_types": ["authorization_code", "refresh_token"],
                "response_types": ["code"],
            })
            assert status == 201, "Cadastro automático falhou"
            registered = json.loads(body)
            assert registered["token_endpoint_auth_method"] == "none" and "client_secret" not in registered
            if self.args.callback.startswith("http://"):
                callback = parse.urlparse(self.args.callback)
                expected_registration = callback._replace(netloc=callback.hostname).geturl()
                assert expected_registration in registered["redirect_uris"], "Callback nativo não permite porta variável"
            self.args.client_id = registered["client_id"]
        invalid_authorization = parse.urlencode({
            "client_id": self.args.client_id,
            "redirect_uri": self.args.callback,
            "response_type": "code",
            "scope": "mcp:connect",
            "resource": "https://outro-recurso.invalid/mcp",
            "code_challenge": secrets.token_urlsafe(32),
            "code_challenge_method": "S256",
        })
        status, _, body = self.send(f"{self.args.identity_url}/connect/authorize?{invalid_authorization}")
        assert status == 400 and "invalid_target" in body, "Recurso inválido aceito na autorização"
        form = self.autorizar_com_pkce()
        status, _, _ = self.send(discovery["token_endpoint"], form={**form, "resource": "https://outro-recurso.invalid/mcp"})
        assert status == 400, "Recurso de destino incorreto foi aceito"
        form = self.autorizar_com_pkce()
        status, _, _ = self.send(discovery["token_endpoint"], form={**form, "code_verifier": "incorreto"})
        assert status == 400, "PKCE inválido foi aceito"
        form = self.autorizar_com_pkce()
        status, _, body = self.send(discovery["token_endpoint"], form=form)
        assert status == 200, "Troca do código falhou"
        tokens = json.loads(body)
        self.executar_ferramenta(tokens["access_token"])
        status, _, _ = self.send(self.args.mcp_url, rpc=initialize, token=tokens["access_token"],
                                 tenant="00000000-0000-0000-0000-000000000001")
        assert status == 403, "Header de outra empresa foi aceito"
        status, _, _ = self.send(self.args.mcp_url, rpc=initialize, token="token-invalido")
        assert status == 401, "Token inválido foi aceito"
        status, _, body = self.send(discovery["token_endpoint"], form={
            "grant_type": "refresh_token", "client_id": self.args.client_id,
            "refresh_token": tokens["refresh_token"], "resource": self.args.mcp_url,
        })
        assert status == 200, "Renovação falhou"
        self.executar_ferramenta(json.loads(body)["access_token"])
        status, _, _ = self.send(discovery["token_endpoint"], form=form)
        assert status == 400, "Código foi reutilizado"
        status, _, body = self.send(discovery["token_endpoint"], form={
            "grant_type": "client_credentials", "client_id": "assistant-service-worker",
            "client_secret": os.environ["AGENZA_MCP_REST_CLIENT_SECRET"], "scope": "services-api",
        })
        assert status == 200, "Token REST de controle indisponível"
        status, _, _ = self.send(self.args.mcp_url, rpc=initialize, token=json.loads(body)["access_token"])
        assert status == 401, "MCP aceitou token REST"
        print("PASSOU: descoberta, login com retorno direto, PKCE, hello_world, renovação e recusa de token REST")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--identity-url", default="https://localhost:7081")
    parser.add_argument("--mcp-url", default="https://localhost:7091/mcp")
    parser.add_argument("--client-id")
    parser.add_argument("--register", action="store_true")
    parser.add_argument("--callback", required=True)
    parser.add_argument("--email", required=True)
    args = parser.parse_args()
    if not args.client_id and not args.register:
        parser.error("Informe --client-id ou --register.")
    OAuthProbe(args).verificar_fluxo()


if __name__ == "__main__":
    main()
