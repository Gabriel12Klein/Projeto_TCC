import { expect, it } from 'vitest';
import { validateInventory, validatePurchase } from './formValidation';

it.each(['0', '-1', '1.5', '', 'abc', '9007199254740992'])('rejeita quantidade %s antes de enviar pedido/estoque', qty => {
  expect(validateInventory({ name: 'Rótulo', qty, photo: true })).toHaveProperty('qty');
  expect(validatePurchase({ source: 'VINICULA', wineId: 'vinho', name: '', qty, purchaseLocation: 'Loja', photo: false })).toHaveProperty('qty');
});
it('usa foto do catálogo mas exige foto do rótulo externo e local da compra', () => {
  const data = { source: 'VINICULA', wineId: 'vinho', name: '', qty: '2', purchaseLocation: 'Loja', photo: false };
  expect(validatePurchase(data)).toEqual({});
  expect(validatePurchase({ ...data, source: 'OUTRO_LOCAL', purchaseLocation: '' })).toEqual({ name: 'Informe o nome do rótulo.', purchaseLocation: 'Informe o local onde o vinho foi comprado.', photo: 'Adicione uma foto do rótulo comprado.' });
  expect(validatePurchase({ ...data, source: 'OUTRO_LOCAL', name: 'Rótulo externo', photo: true })).toEqual({});
});
