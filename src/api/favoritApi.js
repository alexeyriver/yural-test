import { toBrands, toOffers, translateError } from './normalize.js';

const BASE = 'https://api.favorit-parts.ru/hs/hsprice/';
const KEY = import.meta.env.VITE_FAVORIT_KEY || '00000000-0000-0000-0000-000000000001';

export const NETWORK_ERROR = 'Нет связи с сервером. Проверьте подключение.';
export const BAD_RESPONSE_ERROR = 'Некорректный ответ сервера';

const isAbort = (e) => e?.name === 'AbortError';

// encodeURIComponent, а не URLSearchParams: тот кодирует пробел как «+»
export function buildUrl(params) {
  const query = Object.entries({ key: KEY, ...params })
    .filter(([, value]) => value != null && value !== '')
    .map(([name, value]) => `${name}=${encodeURIComponent(value)}`)
    .join('&');
  return `${BASE}?${query}`;
}

// Без кастомных заголовков: на preflight OPTIONS сервер отвечает 403
export async function request(params, signal) {
  let res;
  try {
    res = await fetch(buildUrl(params), { signal });
  } catch (e) {
    if (isAbort(e)) throw e;
    throw new Error(NETWORK_ERROR);
  }

  // Тело читаем и при !res.ok: в 403-м ответе лежит {"error": "..."}
  let data;
  try {
    data = await res.json();
  } catch (e) {
    if (isAbort(e)) throw e;
    throw new Error(BAD_RESPONSE_ERROR);
  }

  if (data?.error) throw new Error(translateError(data.error));
  if (!res.ok) throw new Error(`Ошибка сервера (HTTP ${res.status})`);
  if (!Array.isArray(data?.goods)) throw new Error(BAD_RESPONSE_ERROR);
  return data.goods;
}

export async function fetchBrands(number, signal) {
  return toBrands(await request({ number }, signal));
}

export async function fetchOffers(number, brand, signal) {
  return toOffers(await request({ number, brand, analogues: 'on' }, signal));
}
