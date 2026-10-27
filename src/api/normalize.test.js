import brands from '../../tests/fixtures/brands.json';
import analogues from '../../tests/fixtures/analogues.json';
import notFound from '../../tests/fixtures/notFound.json';
import { isEmptyGoods, toBrands, toOffers, translateError } from './normalize.js';
import { NO_VALUE } from '../constants.js';

const good = (overrides) => ({
  goodsID: 'G1',
  brand: 'ASAM',
  number: '01089',
  name: 'Деталь',
  count: 0,
  price: 100,
  rate: 1,
  warehouses: [],
  ...overrides,
});

describe('isEmptyGoods', () => {
  test('stub with zero goodsID is empty', () => {
    expect(isEmptyGoods(notFound.goods)).toBe(true);
  });

  test('empty array and non-array are empty', () => {
    expect(isEmptyGoods([])).toBe(true);
    expect(isEmptyGoods(undefined)).toBe(true);
  });

  test('real response is not empty', () => {
    expect(isEmptyGoods(brands.goods)).toBe(false);
  });
});

describe('toBrands', () => {
  test('maps real response to sorted brands', () => {
    const result = toBrands(brands.goods);
    expect(result.map((b) => b.brand)).toEqual([
      'AP',
      'ASAM',
      'FEBI',
      'GLASER',
      'HOFFER',
      'Meat & Doria',
      'Orjin Automotive',
      'OSSCA',
      'SEINTEX',
      'SUPLEX',
    ]);
    expect(result[0]).toEqual({
      brand: 'AP',
      number: '01089',
      name: 'Колодки тормозные барабанные',
    });
  });

  test('not found stub gives empty list', () => {
    expect(toBrands(notFound.goods)).toEqual([]);
  });

  test('duplicate brands collapse to the first one', () => {
    const result = toBrands([
      good({ goodsID: 'G1', name: 'Первая' }),
      good({ goodsID: 'G2', name: 'Вторая' }),
    ]);
    expect(result).toEqual([{ brand: 'ASAM', number: '01089', name: 'Первая' }]);
  });
});

describe('toOffers', () => {
  test('original first, then analogues, one row per warehouse', () => {
    const result = toOffers(analogues.goods);
    expect(result).toHaveLength(11);
    expect(result.filter((o) => o.isOriginal)).toHaveLength(2);
    expect(result.slice(0, 2).every((o) => o.brand === 'ASAM' && o.isOriginal)).toBe(true);
    expect(result.slice(2).every((o) => !o.isOriginal)).toBe(true);
    expect(new Set(result.map((o) => o.id)).size).toBe(result.length);
  });

  test('price and stock come from the warehouse', () => {
    const sufix = toOffers(analogues.goods).filter((o) => o.brand === 'SUFIX');
    expect(sufix.map((o) => o.price)).toEqual([129.74, 126.07, 127.3]);
    expect(sufix[0]).toMatchObject({
      number: 'SQ-1100',
      stock: 1,
      warehouse: 'МСК РС',
      shipmentDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
    });
  });

  test('goods without warehouses give one row without price', () => {
    const bosch = toOffers(analogues.goods).filter((o) => o.brand === 'BOSCH');
    expect(bosch).toHaveLength(1);
    expect(bosch[0]).toMatchObject({
      price: null,
      stock: 0,
      warehouse: NO_VALUE,
      shipmentDate: null,
    });
    expect(bosch[0].id).toMatch(/-none$/);
  });

  test('empty warehouse code is shown as dash', () => {
    const [offer] = toOffers([
      good({
        warehouses: [{ id: 'W1', code: '', own: false, price: 50, stock: 3, shipmentDate: null }],
      }),
    ]);
    expect(offer).toMatchObject({ id: 'G1-W1', warehouse: NO_VALUE, price: 50, stock: 3 });
  });

  test('not found stub gives empty list', () => {
    expect(toOffers(notFound.goods)).toEqual([]);
  });
});

describe('translateError', () => {
  test.each([
    ['Empty key!', 'Не указан ключ API'],
    ['Invalid key client!', 'Неверный ключ API'],
    ['Invalid access key', 'Неверный ключ API'],
    ['Empty number goods!', 'Не указан артикул'],
    ['Request quota exceeded!', 'Превышен лимит запросов. Попробуйте позже.'],
  ])('%s', (message, expected) => {
    expect(translateError(message)).toBe(expected);
  });

  test('unknown message is kept', () => {
    expect(translateError('Something broke')).toBe('Ошибка сервера: Something broke');
  });

  test('empty message', () => {
    expect(translateError('')).toBe('Ошибка сервера');
  });
});
