/**
 * VN Mobiles - Warranty Date Calculation and Validation Helpers
 * All date calculations run consistently in IST (Asia/Kolkata / UTC + 5:30)
 */

export type WarrantyDurationUnit = "DAYS" | "MONTHS" | "YEARS";
export type WarrantyCalculateFrom = "START_DATE" | "TODAY";

export interface CalculateWarrantyExpiryParams {
  startDate: Date | string;
  currentExpiryDate: Date | string;
  durationValue: number;
  durationUnit: WarrantyDurationUnit;
  calculateFrom: WarrantyCalculateFrom;
}

export interface CalculatedWarrantyResult {
  newDuration: string;
  newExpiryDate: Date;
  newExpiryDateISO: string;
  isExtended: boolean;
  isReduced: boolean;
  differenceText: string;
}

/**
 * Format a duration string (e.g. "1 Year", "6 Months", "90 Days")
 */
export function formatDurationString(value: number, unit: WarrantyDurationUnit): string {
  if (unit === "YEARS") {
    return `${value} Year${value === 1 ? "" : "s"}`;
  }
  if (unit === "MONTHS") {
    return `${value} Month${value === 1 ? "" : "s"}`;
  }
  return `${value} Day${value === 1 ? "" : "s"}`;
}

/**
 * Adds calendar months to a date preserving end-of-month bounds
 */
export function addCalendarMonths(date: Date, months: number): Date {
  const result = new Date(date.getTime());
  const targetMonth = result.getMonth() + months;
  const originalDay = result.getDate();

  result.setMonth(targetMonth);

  // If day changed (e.g. adding 1 month to Jan 31 gives March 3 in leap years), clamp to last day of target month
  if (result.getDate() !== originalDay) {
    result.setDate(0);
  }
  return result;
}

/**
 * Adds calendar years to a date
 */
export function addCalendarYears(date: Date, years: number): Date {
  return addCalendarMonths(date, years * 12);
}

/**
 * Adds days to a date
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date.getTime());
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Calculates new warranty expiration date strictly from input specifications.
 * The server computes this authoritatively and ignores any client-supplied expiry date.
 */
export function calculateNewWarrantyExpiry(
  params: CalculateWarrantyExpiryParams
): CalculatedWarrantyResult {
  const {
    startDate,
    currentExpiryDate,
    durationValue,
    durationUnit,
    calculateFrom,
  } = params;

  const baseDate =
    calculateFrom === "TODAY"
      ? new Date()
      : new Date(startDate);

  let calculatedExpiry: Date;

  if (durationUnit === "DAYS") {
    calculatedExpiry = addDays(baseDate, durationValue);
  } else if (durationUnit === "MONTHS") {
    calculatedExpiry = addCalendarMonths(baseDate, durationValue);
  } else {
    // YEARS
    calculatedExpiry = addCalendarYears(baseDate, durationValue);
  }

  const oldExpiry = new Date(currentExpiryDate);
  const oldMs = oldExpiry.getTime();
  const newMs = calculatedExpiry.getTime();

  const isExtended = newMs > oldMs;
  const isReduced = newMs < oldMs;

  let differenceText = "No change in expiry";
  if (isExtended || isReduced) {
    const diffMs = Math.abs(newMs - oldMs);
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    const prefix = isExtended ? "Extended by" : "Reduced by";

    if (diffDays >= 360) {
      const years = +(diffDays / 365.25).toFixed(1);
      const roundedYears = Math.round(years);
      if (Math.abs(years - roundedYears) < 0.15) {
        differenceText = `${prefix} ${roundedYears} Year${roundedYears === 1 ? "" : "s"}`;
      } else {
        differenceText = `${prefix} ${years} Years`;
      }
    } else if (diffDays >= 28) {
      const months = Math.round(diffDays / 30.4375);
      differenceText = `${prefix} ${months} Month${months === 1 ? "" : "s"}`;
    } else {
      differenceText = `${prefix} ${diffDays} Day${diffDays === 1 ? "" : "s"}`;
    }
  }

  return {
    newDuration: formatDurationString(durationValue, durationUnit),
    newExpiryDate: calculatedExpiry,
    newExpiryDateISO: calculatedExpiry.toISOString(),
    isExtended,
    isReduced,
    differenceText,
  };
}

/**
 * Format date in IST (Asia/Kolkata)
 */
export function formatKolkataDateString(dateInput: Date | string | number | null | undefined): string {
  if (!dateInput) return "N/A";
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    return d.toLocaleDateString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return String(dateInput);
  }
}

export function formatKolkataDateTimeString(dateInput: Date | string | number | null | undefined): string {
  if (!dateInput) return "N/A";
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    return d.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(dateInput);
  }
}
