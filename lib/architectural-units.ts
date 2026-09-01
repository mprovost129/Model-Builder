const TICKS_PER_INCH = 16;

export function snapToSixteenth(inches: number): number {
  return Math.round(inches * TICKS_PER_INCH) / TICKS_PER_INCH;
}

function parseNumberOrFraction(value: string): number | null {
  const normalized = value.trim().replace(/\s+/g, " ");
  if (!normalized) return 0;

  const mixed = normalized.match(/^(\d+(?:\.\d+)?)\s+(\d+)\/(\d+)$/);
  if (mixed) {
    const denominator = Number(mixed[3]);
    if (!denominator) return null;
    return Number(mixed[1]) + Number(mixed[2]) / denominator;
  }

  const fraction = normalized.match(/^(\d+)\/(\d+)$/);
  if (fraction) {
    const denominator = Number(fraction[2]);
    if (!denominator) return null;
    return Number(fraction[1]) / denominator;
  }

  if (/^\d+(?:\.\d+)?$/.test(normalized)) return Number(normalized);
  return null;
}

export function parseArchitectural(input: string): number | null {
  let value = input
    .trim()
    .replace(/[′’]/g, "'")
    .replace(/[″“”]/g, '"')
    .replace(/\s+/g, " ");

  if (!value || /^-/.test(value)) return null;

  let feet = 0;
  const feetMatch = value.match(/^(\d+(?:\.\d+)?)\s*'/);
  if (feetMatch) {
    feet = Number(feetMatch[1]);
    value = value.slice(feetMatch[0].length).trim();
    value = value.replace(/^-\s*/, "");
  }

  value = value.replace(/"\s*$/, "").trim();
  const inches = parseNumberOrFraction(value);
  if (inches === null || (!feetMatch && !value)) return null;

  const total = feet * 12 + inches;
  return Number.isFinite(total) ? total : null;
}

export function parseSignedArchitectural(input: string): number | null {
  let value = input.trim();
  let sign = 1;
  const signMatch = value.match(/^([+−-])\s*/);
  if (signMatch) {
    sign = signMatch[1] === "+" ? 1 : -1;
    value = value.slice(signMatch[0].length);
  }
  const parsed = parseArchitectural(value);
  return parsed === null ? null : sign * parsed;
}

function greatestCommonDivisor(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) [x, y] = [y, x % y];
  return x || 1;
}

export function formatArchitectural(inches: number): string {
  const totalTicks = Math.max(0, Math.round(inches * TICKS_PER_INCH));
  const ticksPerFoot = 12 * TICKS_PER_INCH;
  const feet = Math.floor(totalTicks / ticksPerFoot);
  const remainingTicks = totalTicks % ticksPerFoot;
  const wholeInches = Math.floor(remainingTicks / TICKS_PER_INCH);
  const fractionTicks = remainingTicks % TICKS_PER_INCH;

  let inchText = `${wholeInches}`;
  if (fractionTicks) {
    const divisor = greatestCommonDivisor(fractionTicks, TICKS_PER_INCH);
    inchText += ` ${fractionTicks / divisor}/${TICKS_PER_INCH / divisor}`;
  }

  return `${feet}'-${inchText}"`;
}

export function formatSignedArchitectural(inches: number): string {
  const sign = inches < 0 ? "−" : "";
  return `${sign}${formatArchitectural(Math.abs(inches))}`;
}
