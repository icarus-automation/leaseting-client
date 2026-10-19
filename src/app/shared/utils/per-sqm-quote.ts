import type { PricingBasis } from '../../core/models/enums';
import type { UnitFieldsWrite, UnitPickerItem } from '../../core/models/property.types';

export const PER_SQM_AREA_ERROR = 'Enter the floor area in square meters.';
export const PER_SQM_RATE_ERROR = 'Set a rate per sqm, or set a default rate on the property.';

export const perSqmArea = 'perSqmArea';
export const perSqmRate = 'perSqmRate';

type PerSqmWrite = Extract<UnitFieldsWrite, { pricingBasis: 'PER_SQM' }>;
type FixedWrite = Extract<UnitFieldsWrite, { pricingBasis: 'FIXED' }>;
type _PerSqmOmitsAskingRent = 'monthlyRent' extends keyof PerSqmWrite ? never : true;
type _PerSqmOmitsPreview = 'computedMonthlyRent' extends keyof PerSqmWrite ? never : true;
type _PerSqmRequiresOverride = undefined extends PerSqmWrite['ratePerSqmOverride'] ? never : true;
type _FixedOmitsArea = 'floorAreaSqm' extends keyof FixedWrite ? never : true;
type _RentWriteOmitsMap = 'mapCoordinates' extends keyof UnitFieldsWrite ? never : true;
type _Asserts = _PerSqmOmitsAskingRent &
  _PerSqmOmitsPreview &
  _PerSqmRequiresOverride &
  _FixedOmitsArea &
  _RentWriteOmitsMap;

const _rentWriteShape: _Asserts = true;
void _rentWriteShape;

export interface UnitFormValue {
  unitNo: string;
  notes: string;
  pricingBasis: PricingBasis;
  monthlyRent: number | null;
  floorAreaSqm: number | null;
  ratePerSqmOverride: number | null;
}

export interface PerSqmInputs {
  floorAreaSqm: number | null;
  ratePerSqmOverride: number | null;
  propertyDefaultRatePerSqm: number | null;
}

export interface PerSqmPreview {
  amount: number;
  areaSqm: number;
  ratePerSqm: number;
}

export interface PerSqmFieldErrors {
  floorAreaSqm: typeof PER_SQM_AREA_ERROR | null;
  ratePerSqmOverride: typeof PER_SQM_RATE_ERROR | null;
}

export interface PerSqmBreakdownInput {
  rentPricingBasis: PricingBasis | null;
  rentFloorAreaSqm: number | string | null;
  rentRatePerSqm: number | string | null;
  monthlyRent: number | string | null;
}

export interface StarterChargeLine {
  name: string;
  billType: string;
  amount: number | null;
}

export interface StarterRentFill {
  index: number;
  amount: number;
}

const AREA_FORMAT = new Intl.NumberFormat('en-PH', {
  maximumFractionDigits: 4,
  minimumFractionDigits: 0,
  useGrouping: false,
});

const PESO_FORMAT = new Intl.NumberFormat('en-PH', {
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
  useGrouping: true,
});

function listedArea(area: number | null): number | null {
  if (typeof area !== 'number' || !Number.isFinite(area) || area <= 0) return null;
  return area;
}

function listedRate(override: number | null, propertyDefault: number | null): number | null {
  // A typed override is a choice, including 0 and a negative. Do not replace it with the property default.
  if (override !== null) {
    return Number.isFinite(override) && override >= 0 ? override : null;
  }
  if (
    propertyDefault !== null &&
    Number.isFinite(propertyDefault) &&
    propertyDefault >= 0
  ) {
    return propertyDefault;
  }
  return null;
}

export function previewPerSqm(input: PerSqmInputs): PerSqmPreview | null {
  const areaSqm = listedArea(input.floorAreaSqm);
  const ratePerSqm = listedRate(input.ratePerSqmOverride, input.propertyDefaultRatePerSqm);
  if (areaSqm === null || ratePerSqm === null) return null;
  return { amount: Math.round(areaSqm * ratePerSqm), areaSqm, ratePerSqm };
}

export function perSqmFieldErrors(
  input: PerSqmInputs & { pricingBasis: PricingBasis },
): PerSqmFieldErrors {
  if (input.pricingBasis === 'FIXED') {
    return { floorAreaSqm: null, ratePerSqmOverride: null };
  }
  return {
    floorAreaSqm: listedArea(input.floorAreaSqm) === null ? PER_SQM_AREA_ERROR : null,
    ratePerSqmOverride:
      input.ratePerSqmOverride === null && input.propertyDefaultRatePerSqm === null
        ? PER_SQM_RATE_ERROR
        : null,
  };
}

export function unitFormPayload(
  value: UnitFormValue,
  propertyDefaultRatePerSqm: number | null,
): UnitFieldsWrite | null {
  const errors = perSqmFieldErrors({
    pricingBasis: value.pricingBasis,
    floorAreaSqm: value.floorAreaSqm,
    ratePerSqmOverride: value.ratePerSqmOverride,
    propertyDefaultRatePerSqm,
  });
  if (errors.floorAreaSqm !== null || errors.ratePerSqmOverride !== null) return null;

  const unitNo = value.unitNo.trim();
  const notes = value.notes.trim();
  const base = notes ? { unitNo, notes } : { unitNo };

  if (value.pricingBasis === 'FIXED') {
    const rent = value.monthlyRent;
    if (typeof rent === 'number' && Number.isFinite(rent) && rent >= 0) {
      return { ...base, pricingBasis: 'FIXED', monthlyRent: rent };
    }
    return { ...base, pricingBasis: 'FIXED' };
  }

  const area = listedArea(value.floorAreaSqm);
  if (area === null) return null;
  return {
    ...base,
    pricingBasis: 'PER_SQM',
    floorAreaSqm: area,
    ratePerSqmOverride: value.ratePerSqmOverride,
  };
}

export function vacantPlaceholder(unit: {
  id: string;
  unitNo: string;
  property: { id: string; name: string };
}): Extract<UnitPickerItem, { pricingBasis: null }> {
  return {
    id: unit.id,
    unitNo: unit.unitNo,
    status: 'VACANT',
    floor: { id: '', level: 0 },
    property: unit.property,
    pricingBasis: null,
    monthlyRent: null,
    computedMonthlyRent: null,
  };
}

export function starterRentFill(
  unit: { pricingBasis: PricingBasis | null; computedMonthlyRent: number | null },
  lines: readonly StarterChargeLine[],
): StarterRentFill | null {
  if (unit.pricingBasis !== 'PER_SQM') return null;
  const amount = unit.computedMonthlyRent;
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0) return null;
  const index = lines.findIndex(
    (line) => line.name === 'Monthly Rent' && line.billType === 'RENT' && line.amount === null,
  );
  if (index < 0) return null;
  return { index, amount };
}

function parsePiece(value: number | string | null): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  const text = value.trim();
  if (!text) return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

function peso(value: number): string {
  return `₱${PESO_FORMAT.format(value)}`;
}

export function formatPerSqmBreakdown(input: PerSqmBreakdownInput): string | null {
  if (input.rentPricingBasis !== 'PER_SQM') return null;
  const area = parsePiece(input.rentFloorAreaSqm);
  const rate = parsePiece(input.rentRatePerSqm);
  const total = parsePiece(input.monthlyRent);
  if (area === null || rate === null || total === null) return null;
  // The lease stores the peso total. Multiplying again would hide a snapshot that no longer matches it.
  return `${AREA_FORMAT.format(area)} sqm × ${peso(rate)} = ${peso(total)}`;
}
