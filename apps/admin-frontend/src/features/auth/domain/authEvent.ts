export interface AuthEvent {
  type: 'login_success' | 'login_failure' | 'renewal_failure' | 'logout';
  timestamp: number;
  tenantId: string | null;
}
