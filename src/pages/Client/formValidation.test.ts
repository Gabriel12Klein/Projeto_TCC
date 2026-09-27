import { expect, it } from 'vitest';
import { validateConsumption, validatePurchase } from './formValidation';

it.each(['0', '-1', '1.5', '', 'abc', '9007199254740992'])(
  'rejeita quantidade %s antes de enviar pedido/consumo',
  (qty) => {
    expect(
      validateConsumption({ qty, date: '2026-09-26', available: 5, today: '2026-09-26' }),
    ).toHaveProperty('qty');
    expect(
      validatePurchase({
        source: 'VINICULA',
        winerySelection: 'VINUM',
        wineId: 'vinho',
        externalWineId: '',
        name: '',
        qty,
        purchaseLocationId: 'local',
        purchaseLocation: '',
        photo: false,
      }),
    ).toHaveProperty('qty');
  },
);
it('impede consumo superior ao saldo e data futura', () => {
  expect(validateConsumption({ qty: '6', date: '2026-09-27', available: 5, today: '2026-09-26' })).toEqual({
    qty: 'A quantidade consumida não pode superar o saldo disponível.',
    date: 'A data do consumo não pode estar no futuro.',
  });
});
it('usa foto do catálogo mas exige foto do rótulo externo e local da compra', () => {
  const data = {
    source: 'VINICULA',
    winerySelection: 'VINUM',
    wineId: 'vinho',
    externalWineId: '',
    name: '',
    qty: '2',
    purchaseLocationId: 'local',
    purchaseLocation: '',
    photo: false,
  };
  expect(validatePurchase(data)).toEqual({});
  expect(
    validatePurchase({
      ...data,
      source: 'OUTRO_LOCAL',
      winerySelection: 'catena',
      wineId: '',
      purchaseLocationId: '',
    }),
  ).toEqual({
    wineId: 'Selecione um vinho cadastrado para esta vinícola.',
    purchaseLocation: 'Selecione o local onde o vinho foi comprado.',
    photo: 'Adicione uma foto do rótulo comprado.',
  });
  expect(
    validatePurchase({
      ...data,
      source: 'OUTRO_LOCAL',
      winerySelection: 'catena',
      wineId: '',
      externalWineId: 'dv-catena',
      photo: true,
    }),
  ).toEqual({});
});
