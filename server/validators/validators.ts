export const VALID_COMPLAINT_CATEGORIES = new Set([
  'Electricity',
  'Water',
  'Wi-Fi',
  'Cleaning',
  'Furniture',
  'Maintenance',
  'Other',
]);

export const VALID_COMPLAINT_STATUSES = new Set(['PENDING', 'IN_PROGRESS', 'RESOLVED']);
export const VALID_COMPLAINT_PRIORITIES = new Set(['LOW', 'MEDIUM', 'HIGH']);
export const VALID_DAYS = new Set([
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
]);
export const VALID_MEAL_TYPES = new Set(['Breakfast', 'Lunch', 'Evening Snacks', 'Dinner']);
export const VALID_BED_STATUSES = new Set(['VACANT', 'OCCUPIED', 'MAINTENANCE']);

export function isNonEmptyString(val: unknown): val is string {
  return typeof val === 'string' && val.trim().length > 0;
}

export function isValidEmail(val: unknown): boolean {
  return typeof val === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
}

export function isValidPhone(val: unknown): boolean {
  return typeof val === 'string' && /^[0-9+\-\s]{8,15}$/.test(val.trim());
}

export function isValidBillingMonth(val: unknown): boolean {
  return typeof val === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(val.trim());
}

export function toPositiveNumber(val: unknown): number | null {
  const num = Number(val);
  if (!Number.isFinite(num) || num <= 0) return null;
  return num;
}

export function toNonNegativeNumber(val: unknown): number | null {
  const num = Number(val);
  if (!Number.isFinite(num) || num < 0) return null;
  return num;
}

export function currentBillingMonth(): string {
  // Align default demo view with seeded November 2026 operational cycle if current clock is Nov 2026 or return actual YYYY-MM
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}
