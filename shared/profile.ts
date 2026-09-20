export function ageFromBirthDate(value: string | null | undefined, today = new Date()): number | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const birth = new Date(value + 'T00:00:00.000Z');
  if (!Number.isFinite(birth.getTime()) || birth.toISOString().slice(0, 10) !== value) return null;
  let age = today.getUTCFullYear() - birth.getUTCFullYear();
  if (today.getUTCMonth() < birth.getUTCMonth() || (today.getUTCMonth() === birth.getUTCMonth() && today.getUTCDate() < birth.getUTCDate())) age--;
  return age >= 0 && age <= 130 ? age : null;
}
