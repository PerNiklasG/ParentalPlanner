export const FRACTIONS = [1, 0.75, 0.5, 0.25, 0.125, 0] as const;
export type Fraction = (typeof FRACTIONS)[number];

export function isFraction(n: number): n is Fraction {
  return (FRACTIONS as readonly number[]).includes(n);
}
export function toFraction(n: number): Fraction {
  if (isFraction(n)) return n;
  throw new Error(`Invalid fraction: ${n}`);
}

export const DAY_TYPES = ["SBL", "MIN", "OFF"] as const;
export type DayType = typeof DAY_TYPES[number];

export type ParentEntry = {
  fraction: Fraction;
  type: DayType;
  reserved: boolean;
};

export type DayEntry = {
  dateISO: string; // YYYY-MM-DD
  a: ParentEntry;
  b: ParentEntry;
  doubleDay: boolean;
};

export type Config = { childDob: string; years: number };

export const CAPS = {
  TOTAL_SBL: 390,
  TOTAL_MIN: 90,
  RESERVED_PER_PARENT: 90,
  MAX_DOUBLE_PER_PARENT: 60,
  MAX_POST4_SAVED: 96,
} as const;