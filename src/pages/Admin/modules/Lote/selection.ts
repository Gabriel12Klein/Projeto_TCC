export function selectVintage(
  wineId: string,
  options: Array<{ value: string; wineId: string }>,
  grapes: Record<string, string[]>,
  currentId = '',
) {
  const valid = options.filter((option) => option.wineId === wineId);
  const vintageId = valid.some((option) => option.value === currentId)
    ? currentId : valid.length === 1 ? valid[0].value : '';
  return { vintageId, grapeIds: grapes[vintageId] ?? [] };
}
