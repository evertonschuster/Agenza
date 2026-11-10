import { randomUUID } from 'node:crypto';
import {
  expect,
  test,
  type APIRequestContext,
  type APIResponse,
  type Page,
  type Response,
} from '@playwright/test';
import { loginAsDemoUser, loginAsUser } from './helpers';

const IDENTITY_URL = 'http://localhost:5081';
const CLIENTS_URL = 'http://localhost:5080/api/v1/clients';

interface TenantSession {
  accessToken: string;
  tenantId: string;
}

test.use({ trace: 'off', screenshot: 'off', video: 'off' });
test.skip(
  process.env.AGENZA_DISPOSABLE_TEST_DB !== '1',
  'Tenant provisioning requires a disposable database.',
);

async function send(
  request: APIRequestContext,
  url: string,
  options: NonNullable<Parameters<APIRequestContext['fetch']>[1]>,
): Promise<APIResponse> {
  try {
    return await request.fetch(url, { ...options, maxRedirects: 0, timeout: 10_000 });
  } catch {
    throw new Error(`${options.method ?? 'GET'} ${url} did not complete.`);
  }
}

async function readJson<T>(response: APIResponse | Response, scenario: string): Promise<T> {
  try {
    return (await response.json()) as T;
  } catch {
    throw new Error(`${scenario} did not return JSON.`);
  }
}

async function readAccessToken(
  response: APIResponse | Response,
  scenario: string,
): Promise<string> {
  expect(response.status(), scenario).toBe(200);
  const body = await readJson<{ access_token?: unknown } | null>(response, scenario);
  const token = body?.access_token;
  if (typeof token !== 'string' || token.length === 0) {
    throw new Error(`${scenario} did not return an access token.`);
  }
  return token;
}

async function signIn(page: Page, login: () => Promise<void>): Promise<TenantSession> {
  const [response] = await Promise.all([
    page.waitForResponse(
      (candidate) =>
        new URL(candidate.url()).pathname === '/connect/token' &&
        candidate.request().method() === 'POST',
    ),
    login(),
  ]).catch(() => {
    throw new Error('Tenant owner sign-in did not complete.');
  });

  const accessToken = await readAccessToken(response, 'Owner token exchange');
  const [, encodedClaims = ''] = accessToken.split('.');
  let tenantId: unknown;
  try {
    const claims = JSON.parse(Buffer.from(encodedClaims, 'base64url').toString('utf8')) as {
      tenant_id?: unknown;
    } | null;
    tenantId = claims?.tenant_id;
  } catch {
    throw new Error('Owner access token claims are malformed.');
  }
  if (typeof tenantId !== 'string' || tenantId.length === 0) {
    throw new Error('Owner access token did not contain a tenant claim.');
  }
  return { accessToken, tenantId };
}

function tenantHeaders(session: TenantSession, tenantId = session.tenantId) {
  return { Authorization: `Bearer ${session.accessToken}`, 'X-Tenant-Id': tenantId };
}

async function expectProblem(
  response: APIResponse,
  status: number,
  code: string,
  scenario: string,
): Promise<void> {
  expect(response.status(), scenario).toBe(status);
  const body = await readJson<{ code?: unknown } | null>(response, scenario);
  expect(body?.code, scenario).toBe(code);
}

test('isolates client reads and writes between authenticated tenants', async ({
  baseURL,
  browser,
  page,
  request,
}) => {
  const provisioningSecret = process.env.AGENZA_TENANT_PROVISIONING_SECRET;
  if (!provisioningSecret) {
    throw new Error('Set AGENZA_TENANT_PROVISIONING_SECRET for the disposable Aspire stack.');
  }

  const nonce = randomUUID();
  const ownerEmail = `tenant-${nonce}@demo.local`;
  const ownerPassword = `Tenant-${randomUUID()}-1!`;
  const tokenResponse = await send(request, `${IDENTITY_URL}/connect/token`, {
    method: 'POST',
    form: {
      grant_type: 'client_credentials',
      client_id: 'tenant-provisioning-cli',
      client_secret: provisioningSecret,
      scope: 'identity-admin',
    },
  });
  const provisioningToken = await readAccessToken(tokenResponse, 'Provisioning token exchange');
  const provisioned = await send(request, `${IDENTITY_URL}/internal/v1/tenants`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${provisioningToken}` },
    data: { tenantName: `Isolamento ${nonce}`, ownerEmail, ownerPassword },
  });
  expect(provisioned.status(), 'Provision the second tenant').toBe(201);
  const provisionedTenant = await readJson<{ data?: { tenantId?: string } }>(
    provisioned,
    'Provision tenant',
  );
  const provisionedTenantId = provisionedTenant.data?.tenantId;
  expect(provisionedTenantId, 'Provisioned tenant ID').toBeTruthy();

  const owner = await signIn(page, () => loginAsDemoUser(page));
  const otherContext = await browser.newContext({ baseURL: baseURL ?? 'http://localhost:5173' });
  let otherTenant: TenantSession;
  try {
    const otherPage = await otherContext.newPage();
    otherTenant = await signIn(otherPage, () => loginAsUser(otherPage, ownerEmail, ownerPassword));
  } finally {
    await otherContext.close();
  }
  expect(otherTenant.tenantId).toBe(provisionedTenantId);
  expect(otherTenant.tenantId).not.toBe(owner.tenantId);

  const ownerHeaders = tenantHeaders(owner);
  const otherHeaders = tenantHeaders(otherTenant);
  const list = await send(request, CLIENTS_URL, { headers: otherHeaders });
  expect(list.status(), 'Second tenant can list its clients').toBe(200);

  const fullName = `Pessoa isolamento ${nonce}`;
  const created = await send(request, CLIENTS_URL, {
    method: 'POST',
    headers: ownerHeaders,
    data: { fullName },
  });
  expect(created.status(), 'Create a client in the first tenant').toBe(201);
  const creation = await readJson<{ data?: { id?: string } }>(created, 'Create client');
  const clientId = creation.data?.id;
  if (!clientId) {
    throw new Error('Client creation did not return an ID.');
  }
  const clientUrl = `${CLIENTS_URL}/${clientId}`;
  const before = await send(request, clientUrl, { headers: ownerHeaders });
  expect(before.status(), 'First tenant can read its client').toBe(200);
  const original = await readJson<{ data?: { fullName?: string } }>(before, 'Read client');
  expect(original.data?.fullName).toBe(fullName);

  await expectProblem(
    await send(request, clientUrl, { headers: tenantHeaders(otherTenant, owner.tenantId) }),
    403,
    'Tenant.ContextMismatch',
    'Second tenant sends the first tenant header',
  );

  const foreignRequests = [
    { method: 'GET' },
    { method: 'PUT', data: { fullName: `Pessoa alterada ${nonce}` } },
    { method: 'DELETE' },
  ];
  for (const options of foreignRequests) {
    await expectProblem(
      await send(request, clientUrl, { ...options, headers: otherHeaders }),
      404,
      'Client.NotFound',
      `Second tenant attempts ${options.method} on a client it does not own`,
    );
  }

  const after = await send(request, clientUrl, { headers: ownerHeaders });
  expect(after.status(), 'First tenant still sees its client').toBe(200);
  const preserved = await readJson<{ data?: { fullName?: string } }>(
    after,
    'Read preserved client',
  );
  expect(preserved.data?.fullName).toBe(fullName);

  const deleted = await send(request, clientUrl, { method: 'DELETE', headers: ownerHeaders });
  expect(deleted.status(), 'First tenant deletes its own client').toBe(204);
});
