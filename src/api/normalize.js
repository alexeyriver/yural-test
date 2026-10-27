import { NO_VALUE } from '../constants.js';

// API на «не найдено» отвечает заглушкой с нулевым goodsID
const EMPTY_GOODS_ID = '00000000-0000-0000-0000-000000000000';

const ERROR_MESSAGES = {
  'Empty key!': 'Не указан ключ API',
  'Invalid key client!': 'Неверный ключ API',
  // Так отвечает живой API на неверный ключ (в документации — «Invalid key client!»)
  'Invalid access key': 'Неверный ключ API',
  'Empty number goods!': 'Не указан артикул',
  'Request quota exceeded!': 'Превышен лимит запросов. Попробуйте позже.',
};

const isStub = (item) => !item || !item.goodsID || item.goodsID === EMPTY_GOODS_ID;

export function isEmptyGoods(goods) {
  return !Array.isArray(goods) || goods.every(isStub);
}

export function toBrands(goods) {
  if (isEmptyGoods(goods)) return [];
  const byBrand = new Map();
  for (const item of goods) {
    if (isStub(item) || byBrand.has(item.brand)) continue;
    byBrand.set(item.brand, { brand: item.brand, number: item.number, name: item.name });
  }
  return [...byBrand.values()].sort((a, b) =>
    a.brand.localeCompare(b.brand, 'ru', { sensitivity: 'base' }),
  );
}

// Одна строка = деталь × склад; цена берётся со склада, а не из goods[].price
function itemToOffers(item, isOriginal) {
  const base = { brand: item.brand, number: item.number, name: item.name, isOriginal };
  const warehouses = item.warehouses || [];
  if (warehouses.length === 0) {
    return [
      {
        ...base,
        id: `${item.goodsID}-none`,
        price: null,
        stock: 0,
        warehouse: NO_VALUE,
        shipmentDate: null,
      },
    ];
  }
  return warehouses.map((w) => ({
    ...base,
    id: `${item.goodsID}-${w.id}`,
    price: w.price,
    stock: w.stock,
    warehouse: w.code || NO_VALUE,
    shipmentDate: w.shipmentDate || null,
  }));
}

export function toOffers(goods) {
  if (isEmptyGoods(goods)) return [];
  return goods
    .filter((item) => !isStub(item))
    .flatMap((item) => [
      ...itemToOffers(item, true),
      ...(item.analogues || []).filter((a) => !isStub(a)).flatMap((a) => itemToOffers(a, false)),
    ]);
}

export function translateError(message) {
  if (!message) return 'Ошибка сервера';
  return ERROR_MESSAGES[message] || `Ошибка сервера: ${message}`;
}
