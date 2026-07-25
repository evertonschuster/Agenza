// Narrow write side infrastructure sees - reports session invalidation
// without knowing anything about React.
export interface SessionInvalidationNotifier {
  notifyUnauthenticated(): void
}

// Presentation (AuthProvider) subscribes to the same event infrastructure
// (AuthenticatedHttpClient) publishes, without either side depending on the other.
export interface SessionEventBus extends SessionInvalidationNotifier {
  subscribe(listener: () => void): () => void
}
