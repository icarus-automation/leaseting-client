import { canReviewSubmissions, collectionMemoError, voidReasonError } from './collection-memo.util';

describe('collectionMemoError', () => {
  it('requires a staff collection memo', () => {
    expect(collectionMemoError('')).toBe('Collection memo is required.');
    expect(collectionMemoError('   ')).toBe('Collection memo is required.');
    expect(collectionMemoError('Office cash')).toBeNull();
  });
});

describe('voidReasonError', () => {
  it('requires a void reason', () => {
    expect(voidReasonError('')).toMatch(/required/i);
    expect(voidReasonError('Posted to the wrong bill')).toBeNull();
  });
});

describe('canReviewSubmissions', () => {
  it('lets owners and admins approve and rejects ordinary members', () => {
    expect(canReviewSubmissions('owner')).toBe(true);
    expect(canReviewSubmissions('admin')).toBe(true);
    expect(canReviewSubmissions('member')).toBe(false);
  });
});
