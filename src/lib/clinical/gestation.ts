export function calculateGestation(
  edd: Date,
  referenceDate: Date = new Date()
): {
  weeks: number;
  days: number;
  totalDays: number;
  trimester: 1 | 2 | 3;
  display: string;
} {
  const PREGNANCY_DURATION_DAYS = 280;
  const eddTime = edd.getTime();
  const refTime = referenceDate.getTime();
  const daysToEdd = Math.floor((eddTime - refTime) / (1000 * 60 * 60 * 24));
  const totalDays = PREGNANCY_DURATION_DAYS - daysToEdd;

  const weeks = Math.floor(totalDays / 7);
  const days = totalDays % 7;
  const trimester = weeks < 14 ? 1 : weeks < 28 ? 2 : 3;

  return {
    weeks,
    days,
    totalDays,
    trimester,
    display: `${weeks}+${days}`,
  };
}

export function eddFromLmp(lmp: Date): Date {
  const edd = new Date(lmp);
  edd.setDate(edd.getDate() + 280);
  return edd;
}

export function isTermRange(weeks: number, days: number): boolean {
  const total = weeks * 7 + days;
  return total >= 259 && total <= 293; // 37+0 to 41+6
}
