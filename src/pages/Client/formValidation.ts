export function validatePurchase(data: { source: string; wineId: string; name: string; qty: string; purchaseLocation: string; photo: boolean }) {
  const errors: Record<string, string> = {};
  if (data.source === 'VINICULA' && !data.wineId) errors.wineId = 'Selecione um vinho do catálogo da VINUM.';
  if (data.source !== 'VINICULA' && !data.name.trim()) errors.name = 'Informe o nome do rótulo.';
  if (!Number.isSafeInteger(Number(data.qty)) || Number(data.qty) < 1) errors.qty = 'Informe uma quantidade inteira de garrafas, maior que zero.';
  if (!data.purchaseLocation.trim()) errors.purchaseLocation = 'Informe o local onde o vinho foi comprado.';
  if (data.source !== 'VINICULA' && !data.photo) errors.photo = 'Adicione uma foto do rótulo comprado.';
  return errors;
}
export function validateInventory(data: { name: string; qty: string; photo: boolean }) {
  const errors: Record<string, string> = {};
  if (!data.name.trim()) errors.name = 'Informe o nome do rótulo.';
  if (!Number.isSafeInteger(Number(data.qty)) || Number(data.qty) < 1) errors.qty = 'Informe uma quantidade inteira de garrafas, maior que zero.';
  if (!data.photo) errors.photo = 'Adicione uma foto da garrafa.';
  return errors;
}
