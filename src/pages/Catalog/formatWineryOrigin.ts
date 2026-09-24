type WineryLocation = { name: string; city?: string | null; state?: string | null };

export function formatWineryOrigin(winery: WineryLocation | null | undefined) {
  if (!winery) return 'VINUM';
  const location = [winery.city, winery.state].filter(Boolean).join('/');
  return location ? `${winery.name} · ${location}` : winery.name;
}
