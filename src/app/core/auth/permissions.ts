/**
 * The catalog codes this client checks, as `area:action` (leaseting-api
 * docs/fe-access-api.md). `/users/me` lists the ones the session holds in the
 * active organization. The API is the authority and may add codes later: an
 * unknown code in that list is ignored, and the API still checks every call.
 */
export type Permission =
  | 'properties:view'
  | 'properties:manage'
  | 'units:view'
  | 'units:manage'
  | 'residents:view'
  | 'residents:manage'
  | 'residents:manage_access'
  | 'leases:view'
  | 'leases:manage'
  | 'bills:view'
  | 'bills:manage'
  | 'soa:view'
  | 'soa:manage'
  | 'payments:view'
  | 'payments:record'
  | 'payments:void'
  | 'payment_submissions:view'
  | 'payment_submissions:review'
  | 'payment_destinations:manage'
  | 'maintenance_requests:view'
  | 'maintenance_requests:manage'
  | 'parking:view'
  | 'parking:void'
  | 'parking_passes:sell'
  | 'parking_passes:administer'
  | 'parking:confirm_shift'
  | 'parking_setup:manage'
  | 'parking_attendants:manage'
  | 'reports:view'
  | 'kit:use'
  | 'organization:view'
  | 'organization:update'
  | 'settings:manage'
  | 'members:view'
  | 'members:invite'
  | 'members:update'
  | 'members:deactivate'
  | 'roles:view'
  | 'roles:manage'
  | 'audit_log:view';

export function holdsAll(held: ReadonlySet<string>, codes: readonly Permission[]): boolean {
  return codes.every((code) => held.has(code));
}
