/** Mirrors KitUsageReport on the server. Cost is null when a model is unpriced. */
export interface KitUsageTotals {
  calls: number;
  costUsd: number | null;
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  failures: number;
}

export interface KitUsageBreakdown {
  key: string;
  calls: number;
  costUsd: number | null;
  failures: number;
  avgLatencyMs: number;
}

export interface KitUsageFailure {
  createdAt: string;
  role: string;
  model: string;
  outcome: string;
  detail: string | null;
}

export interface KitUsageDay {
  date: string;
  calls: number;
  costUsd: number | null;
}

export interface KitUsageReport {
  days: number;
  totals: KitUsageTotals;
  byRole: KitUsageBreakdown[];
  byModel: KitUsageBreakdown[];
  daily: KitUsageDay[];
  recentFailures: KitUsageFailure[];
  hasUnpricedCalls: boolean;
}
