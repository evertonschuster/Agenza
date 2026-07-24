/** One request's token + tenant, read from a single session snapshot - never two independent reads. */
export interface RequestSession {
  readonly accessToken: string
  readonly tenantId: string | null
}

/** Null means no valid session - the caller treats that as unauthenticated. */
export type GetRequestSession = () => Promise<RequestSession | null>
