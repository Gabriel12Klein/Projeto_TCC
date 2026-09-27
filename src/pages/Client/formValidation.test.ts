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
it('valida o rótulo e o local sem exigir foto no registro da compra', () => {
  const data = {
    source: 'VINICULA',
    winerySelection: 'VINUM',
    wineId: 'vinho',
    externalWineId: '',
    name: '',
    qty: '2',
    purchaseLocationId: 'local',
    purchaseLocation: '',
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
  });
  expect(
    validatePurchase({
      ...data,
      source: 'OUTRO_LOCAL',
      winerySelection: 'catena',
      wineId: '',
      externalWineId: 'dv-catena',
    }),
  ).toEqual({});
});
it('exige a safra quando o vinho oficial possui safras cadastradas', () => {
  const data = {
    source: 'VINICULA',
    winerySelection: 'VINUM',
    wineId: 'vinho',
    vintageYear: '',
    vintageRequired: true,
    externalWineId: '',
    name: '',
    qty: '1',
    purchaseLocationId: 'local',
    purchaseLocation: '',
  };
  expect(validatePurchase(data)).toEqual({
    vintageYear: 'Selecione a safra do vinho oficial.',
  });
  expect(validatePurchase({ ...data, vintageYear: '2024' })).toEqual({});
});
