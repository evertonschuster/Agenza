/**
 * Port the HTTP client depends on to report that the current session is no
 * longer valid (no token, or a 401 from the API) without knowing anything
 * about React or how the application reacts to that fact - infrastructure
 * only ever sees this narrow write side.
 */
export interface SessionInvalidationNotifier {
  notifyUnauthenticated(): void
}

/**
 * Full port the composition root wires up: infrastructure (AuthenticatedHttpClient)
 * gets the narrow SessionInvalidationNotifier view to publish on, and
 * presentation (AuthProvider) subscribes to be notified so it can clear the
 * shared session state and let ProtectedRoute redirect - all without either
 * side depending on the other directly.
 */
export interface SessionEventBus extends SessionInvalidationNotifier {
  /**
   * Registers a listener to be called whenever the session is invalidated.
   * Returns an unsubscribe function.
   */
  subscribe(listener: () => void): () => void
}
