import type { ChargeLine } from './charge-item.types';
import type { PaymentMethod } from './enums';

export type OnboardingStatus = 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export type OnboardingStepKey =
  | 'overview'
  | 'tenant'
  | 'requirements'
  | 'lease-terms'
  | 'deposit'
  | 'contract'
  | 'move-in-payment'
  | 'turnover';

export const ONBOARDING_STEP_ORDER: OnboardingStepKey[] = [
  'overview',
  'tenant',
  'requirements',
  'lease-terms',
  'deposit',
  'contract',
  'move-in-payment',
  'turnover',
];

export const ONBOARDING_STEP_LABELS: Record<OnboardingStepKey, string> = {
  overview: 'Overview',
  tenant: 'Tenant',
  requirements: 'Requirements',
  'lease-terms': 'Lease terms',
  deposit: 'Deposit',
  contract: 'Contract',
  'move-in-payment': 'Move-in payment',
  turnover: 'Turnover',
};

export interface OverviewStepData {
  unitId: string;
  startDate: string;
  endDate: string;
}

export interface TenantStepData {
  tenantId: string;
}

export interface RequirementsStepData {
  validId: boolean;
  proofOfIncome?: boolean;
  priorAddress?: boolean;
}

export interface LeaseTermsStepData {
  dueDay: number;
  charges: ChargeLine[];
}

export interface DepositStepData {
  collectsAdvance: boolean;
  advanceMonths: number;
  holdsDeposit: boolean;
  depositMonths: number;
}

export interface ContractStepData {
  documentId?: string;
  deferred?: boolean;
}

export interface MoveInPaymentStepData {
  advanceAmount: number;
  depositAmount: number;
  paidOn: string;
  method: PaymentMethod;
  referenceNo?: string;
  notes?: string;
}

export interface TurnoverStepData {
  keysHanded: boolean;
  unitInspected: boolean;
  utilitiesRead: boolean;
}

export type OnboardingStepData =
  | OverviewStepData
  | TenantStepData
  | RequirementsStepData
  | LeaseTermsStepData
  | DepositStepData
  | ContractStepData
  | MoveInPaymentStepData
  | TurnoverStepData;

export interface OnboardingStepEntry {
  completedAt: string;
  data: Record<string, unknown>;
}

export interface OnboardingListItem {
  id: string;
  status: OnboardingStatus;
  currentStepKey: OnboardingStepKey;
  completedSteps: OnboardingStepKey[];
  totalSteps: number;
  tenant: { id: string; firstName: string; lastName: string } | null;
  unit: { id: string; unitNo: string; property: { id: string; name: string } } | null;
  leaseId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OnboardingDetail extends OnboardingListItem {
  stepsState: Partial<Record<OnboardingStepKey, OnboardingStepEntry>>;
}
