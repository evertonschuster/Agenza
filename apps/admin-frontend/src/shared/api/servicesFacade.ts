import type { Client } from 'openapi-fetch';
import type {
  MediaType,
  PathsWithMethod,
  RequiredKeysOf,
  SuccessResponse,
} from 'openapi-typescript-helpers';
import { ok, fail } from '@/shared/result';
import { type ApiResult, networkFailure, serverFailure, toApiFailure } from './apiFailure';
import type { paths } from './generated/services-api.d.ts';

const API_VERSION = '1.0';

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

export interface ServicesApi {
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
    let result: RawResult;
    try {
      result = await dispatch();
    } catch {
      return fail(networkFailure());
    }

    const { data, error, response } = result;
    if (response.status === 204) return ok(undefined);
    if (!response.ok || error !== undefined) {
      return fail(toApiFailure(response.status, error ?? null));
    }

    const payload = (data as { data?: unknown } | undefined)?.data;
    return payload == null ? fail(serverFailure()) : ok(payload);
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
