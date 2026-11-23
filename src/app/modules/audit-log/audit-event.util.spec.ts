import type { AuditEvent } from '../../core/models/audit-event.types';
import { AUDIT_AREA_ACTIONS, auditActionLabel, describeAuditEvent, targetName } from './audit-event.util';

function event(overrides: Partial<AuditEvent>): AuditEvent {
  return {
    id: 'e-1',
    action: 'MEMBER_ROLE_CHANGED',
    actor: { id: 'u-1', name: 'Olive Reyes', email: 'olive@example.com' },
    target: { type: 'MEMBER', id: 'm-1', label: 'Ana Cruz <ana@example.com>' },
    area: 'team',
    propertyId: null,
    before: null,
    after: null,
    createdAt: '2026-10-30T02:20:11.000Z',
    ...overrides,
  };
}

describe('describeAuditEvent', () => {
  it('names both roles on a role change, custom roles by name', () => {
    expect(
      describeAuditEvent(
        event({
          before: { role: 'member', roleName: 'Member' },
          after: { role: '6f1c2a9e-4b7d-4c1e-9a3f-2d8b5e7c1a40', roleName: 'Leasing agent' },
        }),
      ),
    ).toBe("Changed Ana Cruz's role from Member to Leasing agent");
  });

  it('reads an invitation by its email and role', () => {
    expect(
      describeAuditEvent(
        event({
          action: 'INVITATION_CREATED',
          target: { type: 'INVITATION', id: 'i-1', label: 'ben@example.com' },
          after: { email: 'ben@example.com', role: 'admin' },
        }),
      ),
    ).toBe('Invited ben@example.com as Admin');
  });

  it('adds the property limits an invitation carries, by name', () => {
    expect(
      describeAuditEvent(
        event({
          action: 'INVITATION_CREATED',
          target: { type: 'INVITATION', id: 'i-1', label: 'ben@example.com' },
          after: {
            email: 'ben@example.com',
            role: '6f1c2a9e-4b7d-4c1e-9a3f-2d8b5e7c1a40',
            roleName: 'Leasing agent',
            propertyIds: ['p-1'],
            propertyNames: ['Brickstone'],
          },
        }),
      ),
    ).toBe('Invited ben@example.com as Leasing agent, limited to Brickstone');
  });

  it('reads a property access change as a limit, or as every property', () => {
    const change = (after: Record<string, unknown>) =>
      describeAuditEvent(event({ action: 'MEMBER_PROPERTY_ACCESS_CHANGED', before: { propertyIds: [] }, after }));

    expect(change({ propertyIds: ['p-1', 'p-2'], propertyNames: ['Brickstone', 'Harbor View'] })).toBe(
      'Limited Ana Cruz to Brickstone, Harbor View',
    );
    expect(change({ propertyIds: ['p-1', 'p-2'], propertyNames: ['Brickstone', null] })).toBe(
      'Limited Ana Cruz to 2 properties',
    );
    expect(change({ propertyIds: [], propertyNames: [] })).toBe('Gave Ana Cruz access to every property');
    expect(auditActionLabel('MEMBER_PROPERTY_ACCESS_CHANGED')).toBe('Property access changed');
  });

  it('writes accepted invitations from the joiner’s side', () => {
    expect(describeAuditEvent(event({ action: 'INVITATION_ACCEPTED', after: { role: 'member' } }))).toBe(
      'Joined as Member',
    );
  });

  it('lists the fields a role edit touched', () => {
    expect(
      describeAuditEvent(
        event({
          action: 'ROLE_UPDATED',
          target: { type: 'ROLE', id: 'r-1', label: 'Leasing agent' },
          before: { permissions: [] },
          after: { name: 'Leasing agent', permissions: ['leases:view'] },
        }),
      ),
    ).toBe('Edited the role Leasing agent: name, permissions');
  });

  it('reads a published privacy notice by its version', () => {
    expect(
      describeAuditEvent(
        event({
          action: 'PRIVACY_NOTICE_PUBLISHED',
          area: 'settings',
          target: { type: 'PRIVACY_NOTICE', id: 'n-2', label: 'Privacy notice v2' },
          before: { version: 1 },
          after: { version: 2 },
        }),
      ),
    ).toBe('Published privacy notice v2');
  });

  it('tells a staff attestation from a tenant agreeing in Residence Care', () => {
    const consent = (source: string) =>
      event({
        action: 'PRIVACY_CONSENT_RECORDED',
        area: 'tenants',
        target: { type: 'PRIVACY_CONSENT', id: 'c-1', label: 'Maria Santos' },
        after: { noticeVersion: 2, source },
      });

    expect(describeAuditEvent(consent('Signed consent form'))).toBe(
      "Recorded Maria Santos's signed consent to privacy notice v2",
    );
    expect(describeAuditEvent(consent('Residence Care'))).toBe('Maria Santos agreed to privacy notice v2 in Residence Care');
  });

  it('reads a restored tenant', () => {
    expect(
      describeAuditEvent(
        event({ action: 'RESIDENT_RESTORED', target: { type: 'RESIDENT', id: 'r-1', label: 'Lauren Tan' } }),
      ),
    ).toBe('Restored Lauren Tan');
  });

  it('files privacy events under tenants and settings', () => {
    expect(AUDIT_AREA_ACTIONS.tenants).toEqual(expect.arrayContaining(['RESIDENT_RESTORED', 'PRIVACY_CONSENT_RECORDED']));
    expect(AUDIT_AREA_ACTIONS.settings).toContain('PRIVACY_NOTICE_PUBLISHED');
  });

  it('falls back to a readable label for an action this client does not know', () => {
    expect(describeAuditEvent(event({ action: 'MEMBER_PROPERTIES_LIMITED' }))).toBe(
      'Member properties limited: Ana Cruz',
    );
  });
});

describe('audit labels', () => {
  it('strips the email from a member label', () => {
    expect(targetName('Ana Cruz <ana@example.com>')).toBe('Ana Cruz');
    expect(targetName('ben@example.com')).toBe('ben@example.com');
    expect(targetName(null)).toBe('someone');
  });

  it('labels known actions and humanizes unknown ones', () => {
    expect(auditActionLabel('OWNERSHIP_TRANSFERRED')).toBe('Ownership transferred');
    expect(auditActionLabel('SOMETHING_NEW')).toBe('Something new');
  });
});
