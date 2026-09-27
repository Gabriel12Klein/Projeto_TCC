export function validatePurchase(data: {
  source: string;
  winerySelection: string;
  wineId: string;
  vintageYear?: string;
  vintageRequired?: boolean;
  externalWineId: string;
  name: string;
  qty: string;
  purchaseLocation: string;
  purchaseLocationId: string;
}) {
  const errors: Record<string, string> = {};
  if (!data.winerySelection) errors.winerySelection = 'Selecione uma vinícola.';
  if (data.source === 'VINICULA' && !data.wineId) errors.wineId = 'Selecione um vinho do catálogo da VINUM.';
  if (data.source === 'VINICULA' && data.vintageRequired && !data.vintageYear)
    errors.vintageYear = 'Selecione a safra do vinho oficial.';
  if (data.source !== 'VINICULA' && data.winerySelection !== 'LEGACY' && !data.externalWineId)
    errors.wineId = 'Selecione um vinho cadastrado para esta vinícola.';
  if (data.winerySelection === 'LEGACY' && !data.name.trim()) errors.name = 'Informe o nome do rótulo.';
  if (!Number.isSafeInteger(Number(data.qty)) || Number(data.qty) < 1)
    errors.qty = 'Informe uma quantidade inteira de garrafas, maior que zero.';
  if (!data.purchaseLocationId && !data.purchaseLocation.trim())
    errors.purchaseLocation = 'Selecione o local onde o vinho foi comprado.';
  return errors;
}
export function validateConsumption(data: { qty: string; date: string; available: number; today: string }) {
  const errors: Record<string, string> = {};
  if (!Number.isSafeInteger(Number(data.qty)) || Number(data.qty) < 1)
    errors.qty = 'Informe uma quantidade inteira de garrafas, maior que zero.';
  if (Number.isSafeInteger(Number(data.qty)) && Number(data.qty) > data.available)
    errors.qty = 'A quantidade consumida não pode superar o saldo disponível.';
  if (!data.date) errors.date = 'Informe a data do consumo.';
  else if (data.date > data.today) errors.date = 'A data do consumo não pode estar no futuro.';
  return errors;
}
