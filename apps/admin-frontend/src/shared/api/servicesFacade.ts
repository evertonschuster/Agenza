import type { Client } from 'openapi-fetch';
import type {
  MediaType,
  PathsWithMethod,
  RequiredKeysOf,
  SuccessResponse,
} from 'openapi-typescript-helpers';
import { ok, fail, type Result } from '@/shared/result';
import type { components, paths } from './generated/services-api.d.ts';

const API_VERSION = '1.0';

export type ApiProblem = components['schemas']['ApiProblemDetails'];
export type ApiResult<T> = Result<T, ApiProblem>;

export const NETWORK_PROBLEM: ApiProblem = {
  status: 0,
  code: 'Network.Unreachable',
  title: 'Sem conexão com o servidor. Tente novamente.',
};

export const SERVER_PROBLEM: ApiProblem = {
  status: 0,
  code: 'Server.Unavailable',
  title: 'O servidor está instável. Tente novamente em instantes.',
};

const isProblem = (value: unknown): boolean =>
  typeof value === 'object' &&
  value !== null &&
  'title' in value &&
  typeof value.title === 'string';

type Verb = 'get' | 'post' | 'put' | 'delete';
type Op<M extends Verb, P extends PathsWithMethod<paths, M>> = paths[P][M];

type QueryOf<O> = O extends { parameters: { query?: infer Q } }
  ? [Q] extends [never]
    ? never
    : Q
  : never;
type PathOf<O> = O extends { parameters: { path: infer PP } } ? Omit<PP, 'version'> : object;
type BodyOf<O> = O extends { requestBody: { content: { 'application/json': infer B } } }
  ? B
  : never;

type CallOptions<O> = (QueryOf<O> extends never
  ? { query?: never }
  : { query?: QueryOf<O> | undefined }) &
  (keyof PathOf<O> extends never ? { path?: never } : { path: PathOf<O> }) &
  (BodyOf<O> extends never ? { body?: never } : { body: BodyOf<O> });

type CallArgs<O> =
  RequiredKeysOf<CallOptions<O>> extends never
    ? [options?: CallOptions<O>]
    : [options: CallOptions<O>];

type Payload<O> = O extends { responses: infer R extends Record<string | number, unknown> }
  ? SuccessResponse<R, MediaType> extends { data: infer D }
    ? NonNullable<D>
    : void
  : void;

type Call<M extends Verb> = <P extends PathsWithMethod<paths, M>>(
  path: P,
  ...args: CallArgs<Op<M, P>>
) => Promise<ApiResult<Payload<Op<M, P>>>>;

interface ServicesApi {
  get: Call<'get'>;
  post: Call<'post'>;
  put: Call<'put'>;
  del: Call<'delete'>;
}

interface RawResult {
  data?: unknown;
  error?: unknown;
  response: Response;
}

type LooseOptions = { query?: unknown; path?: Record<string, unknown>; body?: unknown } | undefined;

type RawClient = Record<
  'GET' | 'POST' | 'PUT' | 'DELETE',
  (path: string, init: unknown) => Promise<RawResult>
>;

export function createServicesFacade(client: Client<paths>): ServicesApi {
  const raw = client as unknown as RawClient;
  const verbs = { get: 'GET', post: 'POST', put: 'PUT', delete: 'DELETE' } as const;

  async function run(dispatch: () => Promise<RawResult>): Promise<ApiResult<unknown>> {
    try {
      const { data, error, response } = await dispatch();
      if (!response.ok) return fail(isProblem(error) ? (error as ApiProblem) : SERVER_PROBLEM);
      return ok((data as { data?: unknown } | undefined)?.data);
    } catch {
      return fail(NETWORK_PROBLEM);
    }
  }

  const buildInit = (options: LooseOptions) => ({
    params: {
      path: { version: API_VERSION, ...options?.path },
      query: options?.query,
    },
    body: options?.body,
  });

  const call =
    (verb: Verb) =>
    (path: string, options?: LooseOptions): Promise<ApiResult<unknown>> =>
      run(() => raw[verbs[verb]](path, buildInit(options)));

  return {
    get: call('get') as ServicesApi['get'],
    post: call('post') as ServicesApi['post'],
    put: call('put') as ServicesApi['put'],
    del: call('delete') as ServicesApi['del'],
  };
}
