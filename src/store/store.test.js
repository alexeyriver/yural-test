import { fetchBrands, fetchOffers } from '../api/favoritApi.js';
import { searchBrands } from './brandsSlice.js';
import { setupStore } from './index.js';
import { loadOffers, selectVisibleOffers, toggleOnlyInStock } from './offersSlice.js';
import { STATUS } from '../constants.js';

vi.mock('../api/favoritApi.js', () => ({
  fetchBrands: vi.fn(),
  fetchOffers: vi.fn(),
}));

const deferred = () => {
  let resolve;
  const promise = new Promise((r) => {
    resolve = r;
  });
  return { promise, resolve };
};

const BRANDS = [{ brand: 'ASAM', number: '01089', name: 'Деталь' }];

const offer = (overrides) => ({
  id: overrides.brand + overrides.price,
  number: '01089',
  name: 'Деталь',
  isOriginal: false,
  stock: 1,
  warehouse: 'МСК',
  shipmentDate: null,
  ...overrides,
});

let store;

beforeEach(() => {
  vi.resetAllMocks();
  store = setupStore();
});

describe('brands', () => {
  test('pending → loading, fulfilled → succeeded', async () => {
    const d = deferred();
    fetchBrands.mockReturnValue(d.promise);

    const promise = store.dispatch(searchBrands('01089'));
    expect(store.getState().brands).toMatchObject({ query: '01089', status: STATUS.LOADING });
    expect(fetchBrands).toHaveBeenCalledWith('01089', expect.any(AbortSignal));

    d.resolve(BRANDS);
    await promise;
    expect(store.getState().brands).toMatchObject({
      items: BRANDS,
      status: STATUS.SUCCEEDED,
      error: null,
    });
  });

  test('rejected → failed with message', async () => {
    fetchBrands.mockRejectedValue(new Error('Нет связи с сервером. Проверьте подключение.'));
    await store.dispatch(searchBrands('01089'));
    expect(store.getState().brands).toMatchObject({
      status: STATUS.FAILED,
      error: 'Нет связи с сервером. Проверьте подключение.',
    });
  });

  test('new search clears previous error and items', async () => {
    fetchBrands.mockRejectedValueOnce(new Error('Ошибка'));
    await store.dispatch(searchBrands('01089'));
    fetchBrands.mockReturnValue(new Promise(() => {}));
    store.dispatch(searchBrands('01090'));
    expect(store.getState().brands).toMatchObject({
      items: [],
      status: STATUS.LOADING,
      error: null,
    });
  });

  test('aborted request does not set failed', async () => {
    fetchBrands.mockReturnValue(new Promise(() => {}));
    const promise = store.dispatch(searchBrands('01089'));
    promise.abort();
    await promise;
    expect(store.getState().brands.status).not.toBe(STATUS.FAILED);
    expect(store.getState().brands.error).toBeNull();
  });

  test('slow stale response does not overwrite the latest one', async () => {
    const first = deferred();
    const second = deferred();
    fetchBrands.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);

    const p1 = store.dispatch(searchBrands('01089'));
    const p2 = store.dispatch(searchBrands('7160500039S'));
    second.resolve([{ brand: 'MEYLE', number: '7160500039S', name: 'Новая' }]);
    await p2;
    first.resolve(BRANDS);
    await p1;

    expect(store.getState().brands).toMatchObject({
      query: '7160500039S',
      status: STATUS.SUCCEEDED,
      items: [{ brand: 'MEYLE' }],
    });
  });
});

describe('offers', () => {
  test('loadOffers stores selected and items', async () => {
    const items = [offer({ brand: 'ASAM', price: 10, isOriginal: true })];
    fetchOffers.mockResolvedValue(items);

    const promise = store.dispatch(loadOffers({ number: '01089', brand: 'ASAM' }));
    expect(store.getState().offers).toMatchObject({
      selected: { number: '01089', brand: 'ASAM' },
      status: STATUS.LOADING,
    });
    expect(fetchOffers).toHaveBeenCalledWith('01089', 'ASAM', expect.any(AbortSignal));

    await promise;
    expect(store.getState().offers).toMatchObject({ items, status: STATUS.SUCCEEDED });
  });

  test('rejected → failed, selected kept for retry', async () => {
    fetchOffers.mockRejectedValue(new Error('Неверный ключ API'));
    await store.dispatch(loadOffers({ number: '01089', brand: 'ASAM' }));
    expect(store.getState().offers).toMatchObject({
      status: STATUS.FAILED,
      error: 'Неверный ключ API',
      selected: { number: '01089', brand: 'ASAM' },
    });
  });

  test('aborted request does not set failed', async () => {
    fetchOffers.mockReturnValue(new Promise(() => {}));
    const promise = store.dispatch(loadOffers({ number: '01089', brand: 'ASAM' }));
    promise.abort();
    await promise;
    expect(store.getState().offers.status).not.toBe(STATUS.FAILED);
  });

  test('stale brand response does not overwrite the latest one', async () => {
    const asam = deferred();
    const ossca = deferred();
    fetchOffers.mockReturnValueOnce(asam.promise).mockReturnValueOnce(ossca.promise);

    const p1 = store.dispatch(loadOffers({ number: '01089', brand: 'ASAM' }));
    const p2 = store.dispatch(loadOffers({ number: '01089', brand: 'OSSCA' }));
    ossca.resolve([offer({ brand: 'OSSCA', price: 20 })]);
    await p2;
    asam.resolve([offer({ brand: 'ASAM', price: 10 })]);
    await p1;

    const { offers } = store.getState();
    expect(offers.selected.brand).toBe('OSSCA');
    expect(offers.items.map((o) => o.brand)).toEqual(['OSSCA']);
  });

  test('new brand search resets offers but keeps the stock filter', async () => {
    fetchOffers.mockResolvedValue([offer({ brand: 'ASAM', price: 10 })]);
    await store.dispatch(loadOffers({ number: '01089', brand: 'ASAM' }));
    store.dispatch(toggleOnlyInStock());

    fetchBrands.mockReturnValue(new Promise(() => {}));
    store.dispatch(searchBrands('01090'));

    expect(store.getState().offers).toMatchObject({
      selected: null,
      items: [],
      status: STATUS.IDLE,
      error: null,
      onlyInStock: false,
    });
  });

  test('toggleOnlyInStock', () => {
    expect(store.getState().offers.onlyInStock).toBe(true);
    store.dispatch(toggleOnlyInStock());
    expect(store.getState().offers.onlyInStock).toBe(false);
  });
});

describe('selectVisibleOffers', () => {
  const items = [
    offer({ brand: 'B', price: 300 }),
    offer({ brand: 'NONE', price: null, stock: 0 }),
    offer({ brand: 'A', price: 100 }),
    offer({ brand: 'ORIG', price: 500, isOriginal: true }),
    offer({ brand: 'ZERO', price: 50, stock: 0 }),
  ];
  const state = (onlyInStock) => ({ offers: { items, onlyInStock } });

  test('only in stock: original first, then by price', () => {
    expect(selectVisibleOffers(state(true)).map((o) => o.brand)).toEqual(['ORIG', 'A', 'B']);
  });

  test('all: offers without price go last', () => {
    expect(selectVisibleOffers(state(false)).map((o) => o.brand)).toEqual([
      'ORIG',
      'ZERO',
      'A',
      'B',
      'NONE',
    ]);
  });

  test('does not mutate state and is memoized', () => {
    const s = state(false);
    const result = selectVisibleOffers(s);
    expect(items[0].brand).toBe('B');
    expect(selectVisibleOffers(s)).toBe(result);
  });
});
