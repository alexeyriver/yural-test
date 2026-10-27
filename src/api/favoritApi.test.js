import brands from '../../tests/fixtures/brands.json';
import analogues from '../../tests/fixtures/analogues.json';
import notFound from '../../tests/fixtures/notFound.json';
import error from '../../tests/fixtures/error.json';
import {
  BAD_RESPONSE_ERROR,
  NETWORK_ERROR,
  buildUrl,
  fetchBrands,
  fetchOffers,
  request,
} from './favoritApi.js';

const jsonResponse = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

let fetchMock;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('buildUrl', () => {
  test('contains key, number, brand and analogues', () => {
    const url = new URL(buildUrl({ number: '01089', brand: 'ASAM', analogues: 'on' }));
    expect(url.origin + url.pathname).toBe('https://api.favorit-parts.ru/hs/hsprice/');
    expect(url.searchParams.get('key')).toBeTruthy();
    expect(url.searchParams.get('number')).toBe('01089');
    expect(url.searchParams.get('brand')).toBe('ASAM');
    expect(url.searchParams.get('analogues')).toBe('on');
  });

  test('encodes #, & and spaces', () => {
    const url = buildUrl({ number: 'A&B 1#2', brand: 'Meat & Doria' });
    expect(url).toContain('number=A%26B%201%232');
    expect(url).toContain('brand=Meat%20%26%20Doria');
  });

  test('skips empty params', () => {
    expect(buildUrl({ number: '01089', brand: undefined })).not.toContain('brand=');
  });
});

describe('request', () => {
  test('returns goods', async () => {
    fetchMock.mockResolvedValue(jsonResponse(brands));
    await expect(request({ number: '01089' })).resolves.toHaveLength(10);
  });

  test('sends a simple request without custom headers and passes signal', async () => {
    fetchMock.mockResolvedValue(jsonResponse(brands));
    const controller = new AbortController();
    await request({ number: '01089' }, controller.signal);
    const [, options] = fetchMock.mock.calls[0];
    expect(options).toEqual({ signal: controller.signal });
  });

  test('network failure gives a clear message', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(request({ number: '01089' })).rejects.toThrow(NETWORK_ERROR);
  });

  test('403 with error body gives translated text', async () => {
    fetchMock.mockResolvedValue(jsonResponse(error, 403));
    await expect(request({ number: '01089' })).rejects.toThrow('Не указан ключ API');
  });

  test('non-JSON body', async () => {
    fetchMock.mockResolvedValue(new Response('<html>Bad Gateway</html>', { status: 502 }));
    await expect(request({ number: '01089' })).rejects.toThrow(BAD_RESPONSE_ERROR);
  });

  test('JSON without goods', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ foo: 1 }));
    await expect(request({ number: '01089' })).rejects.toThrow(BAD_RESPONSE_ERROR);
  });

  test('HTTP error without error field', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, 500));
    await expect(request({ number: '01089' })).rejects.toThrow('Ошибка сервера (HTTP 500)');
  });

  test('abort is rethrown as is', async () => {
    fetchMock.mockRejectedValue(new DOMException('Aborted', 'AbortError'));
    await expect(request({ number: '01089' })).rejects.toMatchObject({ name: 'AbortError' });
  });
});

describe('fetchBrands / fetchOffers', () => {
  test('fetchBrands normalizes response', async () => {
    fetchMock.mockResolvedValue(jsonResponse(brands));
    const result = await fetchBrands('01089');
    expect(result[0]).toEqual({
      brand: 'AP',
      number: '01089',
      name: 'Колодки тормозные барабанные',
    });
  });

  test('fetchBrands on not found gives empty list', async () => {
    fetchMock.mockResolvedValue(jsonResponse(notFound));
    await expect(fetchBrands('7260500039S')).resolves.toEqual([]);
  });

  test('fetchOffers requests analogues and normalizes response', async () => {
    fetchMock.mockResolvedValue(jsonResponse(analogues));
    const result = await fetchOffers('01089', 'ASAM');
    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.searchParams.get('brand')).toBe('ASAM');
    expect(url.searchParams.get('analogues')).toBe('on');
    expect(result).toHaveLength(11);
  });
});
