"""Exercise the MCP OAuth boundary against the Aspire development stack."""

from __future__ import annotations

import base64
import hashlib
import http.cookiejar
import json
import os
import secrets
import unittest
from html.parser import HTMLParser
from urllib import error, parse, request


class NoRedirect(request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


class Inputs(HTMLParser):
    def __init__(self):
        super().__init__()
        self.values = {}

    def handle_starttag(self, tag, attrs):
        attributes = dict(attrs)
        if tag == "input" and attributes.get("type") == "hidden":
            self.values[attributes["name"]] = attributes.get("value", "")


class McpOAuthTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.identity = os.getenv("AGENZA_IDENTITY_URL", "https://localhost:7081").rstrip("/")
        cls.resource = os.getenv("AGENZA_MCP_URL", "https://localhost:7091/mcp")
        cls.client_id = os.getenv("AGENZA_MCP_CLIENT_ID", "agenza-mcp")
        cls.callback = os.getenv("AGENZA_MCP_CALLBACK", "http://127.0.0.1/oauth/callback")
        cls.browser = request.build_opener(
            request.HTTPCookieProcessor(http.cookiejar.CookieJar()), NoRedirect()
        )
        status, _, body = cls.send("GET", cls.identity + "/Account/Login")
        if status != 200:
            raise AssertionError(f"Login indisponível: HTTP {status}")
        inputs = Inputs()
        inputs.feed(body)
        inputs.values.update(
            Email=os.getenv("AGENZA_TEST_EMAIL", "owner@demo.local"),
            Password=os.getenv("AGENZA_TEST_PASSWORD", "Passw0rd!"),
        )
        status, _, _ = cls.send("POST", cls.identity + "/Account/Login", form=inputs.values)
        if status != 302:
            raise AssertionError(f"Login não concluído: HTTP {status}")

    @classmethod
    def send(cls, method, url, *, form=None, json_body=None, headers=None):
        headers = dict(headers or {})
        data = None
        if form is not None:
            data = parse.urlencode(form).encode()
            headers["Content-Type"] = "application/x-www-form-urlencoded"
        if json_body is not None:
            data = json.dumps(json_body).encode()
            headers["Content-Type"] = "application/json"
        req = request.Request(url, data=data, method=method, headers=headers)
        try:
            response = cls.browser.open(req, timeout=20)
        except error.HTTPError as failure:
            response = failure
        with response:
            return response.code, response.headers, response.read().decode()

    def authorize(self, **overrides):
        verifier = secrets.token_urlsafe(48)
        challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).decode().rstrip("=")
        values = dict(
            client_id=self.client_id, redirect_uri=self.callback, response_type="code",
            scope="openid tenant_id services-mcp offline_access", resource=self.resource,
            code_challenge=challenge, code_challenge_method="S256", state=secrets.token_urlsafe(16),
        )
        values.update(overrides)
        status, headers, _ = self.send("GET", self.identity + "/connect/authorize?" + parse.urlencode({key: value for key, value in values.items() if value is not None}))
        location = headers.get("Location", "")
        result = parse.parse_qs(parse.urlsplit(location).query)
        return status, location, result, verifier, values["state"]

    def token(self, **overrides):
        values = dict(client_id=self.client_id, redirect_uri=self.callback, grant_type="authorization_code")
        values.update(overrides)
        status, _, body = self.send("POST", self.identity + "/connect/token", form=values)
        return status, json.loads(body)

    def access_token(self):
        status, location, result, verifier, state = self.authorize()
        self.assertEqual(status, 302)
        self.assertTrue(location.startswith(self.callback + "?"))
        self.assertEqual(result.get("state"), [state])
        self.assertIn("code", result)
        status, tokens = self.token(code=result["code"][0], code_verifier=verifier)
        self.assertEqual(status, 200)
        return tokens

    def call_tool(self, token, tenant=None):
        headers = dict(Authorization="Bearer " + token, Accept="application/json, text/event-stream")
        if tenant:
            headers["X-Tenant-Id"] = tenant
        return self.send("POST", self.resource, headers=headers, json_body=dict(
            jsonrpc="2.0", id=1, method="tools/call", params=dict(name="hello_world", arguments={})
        ))

    @staticmethod
    def tool_result(body):
        payload = next((line[6:] for line in body.splitlines() if line.startswith("data: ")), body)
        return json.loads(payload)["result"]

    def test_descoberta_publica_recurso_e_s256_sem_cadastro_dinamico(self):
        status, _, body = self.send("GET", self.identity + "/.well-known/openid-configuration")
        self.assertEqual(status, 200)
        metadata = json.loads(body)
        self.assertEqual(metadata["code_challenge_methods_supported"], ["S256"])
        self.assertIn("services-mcp", metadata["scopes_supported"])
        self.assertIn("none", metadata["token_endpoint_auth_methods_supported"])
        self.assertNotIn("registration_endpoint", metadata)
        self.assertNotIn("client_id_metadata_document_supported", metadata)
        status, headers, _ = self.send("POST", self.resource,
            headers={"Accept": "application/json, text/event-stream"},
            json_body=dict(jsonrpc="2.0", id=1, method="tools/list"))
        self.assertEqual(status, 401)
        challenge = headers["WWW-Authenticate"]
        metadata_url = challenge.split('resource_metadata="', 1)[1].split('"', 1)[0]
        status, _, body = self.send("GET", metadata_url)
        self.assertEqual(status, 200)
        metadata = json.loads(body)
        self.assertEqual(metadata["resource"], self.resource)
        self.assertEqual(metadata["scopes_supported"], ["services-mcp", "offline_access"])

    def test_callback_raiz_do_vscode_aceita_porta_variavel(self):
        callback = "http://127.0.0.1:33418/"
        status, location, result, verifier, _ = self.authorize(redirect_uri=callback)
        self.assertEqual(status, 302)
        self.assertTrue(location.startswith(callback + "?"))
        self.assertIn("code", result)
        status, tokens = self.token(redirect_uri=callback, code=result["code"][0], code_verifier=verifier)
        self.assertEqual(status, 200)
        self.assertIn("access_token", tokens)

    def test_callback_nativo_aceita_porta_variavel(self):
        callback = parse.urlsplit(self.callback)
        if callback.scheme != "http" or callback.hostname not in ("127.0.0.1", "::1", "localhost"):
            self.skipTest("O cliente configurado não usa callback nativo de loopback.")
        host = "[::1]" if callback.hostname == "::1" else callback.hostname
        dynamic_callback = parse.urlunsplit(callback._replace(netloc=host + ":49817"))
        status, location, result, verifier, _ = self.authorize(redirect_uri=dynamic_callback)
        self.assertEqual(status, 302)
        self.assertTrue(location.startswith(dynamic_callback + "?"))
        self.assertIn("code", result)
        status, _ = self.token(redirect_uri=dynamic_callback, code=result["code"][0], code_verifier=verifier)
        self.assertEqual(status, 200)

    def test_cadastro_anonimo_nao_existe(self):
        status, _, _ = self.send("POST", self.identity + "/connect/register", json_body=dict(
            redirect_uris=["https://attacker.invalid/callback"], scope="services-mcp"
        ))
        self.assertEqual(status, 404)

    def test_cliente_desconhecido_nao_recebe_codigo(self):
        status, location, result, _, _ = self.authorize(client_id="mcp-desconhecido")
        self.assertNotIn("code", result)
        self.assertFalse(location.startswith(self.callback))
        self.assertEqual(status, 400)

    def test_identidade_publicada_desconhecida_e_recusada(self):
        status, _, result, _, _ = self.authorize(client_id="https://attacker.invalid/client.json")
        self.assertEqual(status, 400)
        self.assertNotIn("code", result)

    def test_spa_e_mcp_recebem_escopos_dedicados_e_mesmas_roles(self):
        identity_scopes = "openid profile email tenant_id offline_access"
        payloads = []
        for client_id, callback, resource, scope in (
            ("admin-panel", "http://localhost:5173/callback", None, "services-api"),
            (self.client_id, self.callback, self.resource, "services-mcp"),
        ):
            status, _, result, verifier, _ = self.authorize(
                client_id=client_id, redirect_uri=callback, scope=identity_scopes + " " + scope, resource=resource)
            self.assertEqual(status, 302)
            status, tokens = self.token(client_id=client_id, redirect_uri=callback,
                code=result["code"][0], code_verifier=verifier)
            self.assertEqual(status, 200)
            payloads.append(json.loads(base64.urlsafe_b64decode(
                tokens["access_token"].split('.')[1] + "==")))
        self.assertEqual(set(payloads[0]["scope"].split()), set(identity_scopes.split()) | {"services-api"})
        self.assertEqual(set(payloads[1]["scope"].split()), set(identity_scopes.split()) | {"services-mcp"})
        for claim in ("sub", "tenant_id", "role"):
            self.assertEqual(payloads[0].get(claim), payloads[1].get(claim))
        self.assertIn(payloads[0]["aud"], ("services-api", ["services-api"]))
        self.assertIn(payloads[1]["aud"], (self.resource, [self.resource]))

    def test_clientes_nao_solicitam_escopo_da_outra_interface(self):
        for client_id, callback, scope, resource in (
            ("admin-panel", "http://localhost:5173/callback", "services-mcp", self.resource),
            (self.client_id, self.callback, "services-api", None),
        ):
            _, _, result, _, _ = self.authorize(client_id=client_id, redirect_uri=callback,
                scope="openid tenant_id " + scope, resource=resource)
            self.assertNotIn("code", result)

    def test_callback_nao_cadastrado_e_recusado(self):
        status, location, result, _, _ = self.authorize(redirect_uri="https://attacker.invalid/callback")
        self.assertEqual(status, 400)
        self.assertNotIn("code", result)
        self.assertNotEqual(parse.urlsplit(location).hostname, "attacker.invalid")

    def test_caminho_local_nao_cadastrado_e_recusado(self):
        callback = "http://127.0.0.1:49817/callback/" + secrets.token_urlsafe(12)
        status, location, result, _, _ = self.authorize(redirect_uri=callback)
        self.assertEqual(status, 400)
        self.assertNotIn("code", result)
        self.assertFalse(location.startswith(callback))

    def test_codigo_com_callback_fixo_exige_pkce_e_nao_pode_ser_reutilizado(self):
        callback = "http://127.0.0.1:49817/oauth/callback"
        _, _, result, _, _ = self.authorize(redirect_uri=callback)
        self.assertIn("code", result)
        status, tokens = self.token(redirect_uri=callback, code=result["code"][0],
                                   code_verifier=secrets.token_urlsafe(48))
        self.assertEqual(status, 400)
        self.assertNotIn("access_token", tokens)
        _, _, result, verifier, _ = self.authorize(redirect_uri=callback)
        self.assertIn("code", result)
        status, _ = self.token(redirect_uri=callback, code=result["code"][0], code_verifier=verifier)
        self.assertEqual(status, 200)
        status, tokens = self.token(redirect_uri=callback, code=result["code"][0], code_verifier=verifier)
        self.assertEqual(status, 400)
        self.assertNotIn("access_token", tokens)

    def test_troca_do_codigo_recusa_outro_callback_cadastrado(self):
        callback = "http://127.0.0.1:49817/"
        _, _, result, verifier, _ = self.authorize(redirect_uri=callback)
        self.assertIn("code", result)
        status, tokens = self.token(redirect_uri="http://127.0.0.1:49817/oauth/callback",
                                    code=result["code"][0], code_verifier=verifier)
        self.assertEqual(status, 400)
        self.assertNotIn("access_token", tokens)

    def test_pkce_ausente_e_recusado(self):
        status, _, result, _, _ = self.authorize(code_challenge="", code_challenge_method="")
        self.assertNotIn("code", result)
        self.assertTrue(status == 400 or "error" in result)

    def test_pkce_plain_e_recusado(self):
        status, _, result, _, _ = self.authorize(code_challenge="a" * 64, code_challenge_method="plain")
        self.assertNotIn("code", result)
        self.assertTrue(status == 400 or "error" in result)

    def test_recurso_desconhecido_e_recusado(self):
        status, _, result, _, _ = self.authorize(resource="https://attacker.invalid/mcp")
        self.assertNotIn("code", result)
        self.assertTrue(status == 400 or "error" in result)

    def test_pkce_incorreto_nao_troca_codigo_por_token(self):
        _, _, result, _, _ = self.authorize()
        self.assertIn("code", result)
        status, tokens = self.token(code=result["code"][0], code_verifier=secrets.token_urlsafe(48))
        self.assertEqual(status, 400)
        self.assertNotIn("access_token", tokens)

    def test_login_sem_consentimento_executa_ferramenta_e_renova_acesso(self):
        tokens = self.access_token()
        status, _, body = self.call_tool(tokens["access_token"])
        self.assertEqual(status, 200)
        result = self.tool_result(body)
        self.assertFalse(result.get("isError", False), result)
        self.assertEqual(result["content"][0]["text"], "Olá! O MCP do Agenza está funcionando.")
        status, renewed = self.token(grant_type="refresh_token", refresh_token=tokens["refresh_token"])
        self.assertEqual(status, 200)
        status, _, _ = self.call_tool(renewed["access_token"])
        self.assertEqual(status, 200)

    def test_header_de_outro_tenant_nao_participa_da_autorizacao(self):
        tokens = self.access_token()
        status, _, body = self.call_tool(tokens["access_token"], "11111111-1111-1111-1111-111111111111")
        self.assertEqual(status, 200)
        self.assertFalse(self.tool_result(body).get("isError", False))

    def test_audiencia_rest_e_recusada_pelo_mcp(self):
        _, _, result, verifier, _ = self.authorize(
            client_id="admin-panel", redirect_uri="http://localhost:5173/callback",
            scope="openid tenant_id services-api", resource=None,
        )
        self.assertIn("code", result)
        status, tokens = self.token(
            client_id="admin-panel", redirect_uri="http://localhost:5173/callback",
            code=result["code"][0], code_verifier=verifier,
        )
        self.assertEqual(status, 200)
        status, _, _ = self.call_tool(tokens["access_token"])
        self.assertEqual(status, 401)

    def test_anonimo_recebe_desafio_com_metadados_do_recurso(self):
        status, headers, _ = self.send("POST", self.resource,
            headers={"Accept": "application/json, text/event-stream"},
            json_body=dict(jsonrpc="2.0", id=1, method="tools/list"))
        self.assertEqual(status, 401)
        self.assertIn("resource_metadata=", headers.get("WWW-Authenticate", ""))
        self.assertIn('scope="services-mcp offline_access"', headers["WWW-Authenticate"])
        self.assertNotIn("invalid_token", headers["WWW-Authenticate"])

    def test_token_recusado_recebe_invalid_token_no_desafio(self):
        status, headers, _ = self.call_tool("abc.def.ghi")
        self.assertEqual(status, 401)
        self.assertIn('error="invalid_token"', headers["WWW-Authenticate"])

    def test_recurso_fora_dos_escopos_explica_o_erro(self):
        _, _, result, _, _ = self.authorize(scope="openid")
        self.assertEqual(result.get("error"), ["invalid_target"])
        self.assertNotIn("end user", result["error_description"][0])

    def test_callbacks_dos_clientes_suportados_sao_aceitos(self):
        for callback in (
            "http://localhost:54321/callback",
            "http://127.0.0.1:54321/callback",
            "http://[::1]:54321/oauth/callback",
            "https://insiders.vscode.dev/redirect",
            "https://claude.ai/api/mcp/auth_callback",
            "https://claude.com/api/mcp/auth_callback",
        ):
            with self.subTest(callback=callback):
                status, _, result, verifier, _ = self.authorize(redirect_uri=callback)
                self.assertEqual(status, 302)
                self.assertIn("code", result)
                status, _ = self.token(redirect_uri=callback, code=result["code"][0], code_verifier=verifier)
                self.assertEqual(status, 200)

    def test_cors_libera_apenas_origens_configuradas(self):
        preflight = {"Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "authorization,content-type"}
        for url in (self.resource, self.identity + "/connect/token"):
            status, headers, _ = self.send("OPTIONS", url, headers={"Origin": "https://vscode.dev", **preflight})
            self.assertIn(status, (200, 204))
            self.assertEqual(headers.get("Access-Control-Allow-Origin"), "https://vscode.dev")
            status, headers, _ = self.send("OPTIONS", url, headers={"Origin": "https://attacker.invalid", **preflight})
            self.assertIsNone(headers.get("Access-Control-Allow-Origin"))

    def test_prompt_login_exige_novo_login(self):
        status, location, _, _, _ = self.authorize(prompt="login")
        self.assertEqual(status, 302)
        self.assertIn("/Account/Login", location)
        self.assertNotIn("prompt%3Dlogin", location)

    def test_escopo_do_desafio_rende_token_com_refresh(self):
        status, headers, _ = self.send("POST", self.resource,
            headers={"Accept": "application/json, text/event-stream"},
            json_body=dict(jsonrpc="2.0", id=1, method="tools/list"))
        scope = headers["WWW-Authenticate"].split('scope="', 1)[1].split('"', 1)[0]
        _, _, result, verifier, _ = self.authorize(scope=scope)
        status, tokens = self.token(code=result["code"][0], code_verifier=verifier)
        self.assertEqual(status, 200)
        self.assertIn("refresh_token", tokens)


if __name__ == "__main__":
    unittest.main(verbosity=2)
