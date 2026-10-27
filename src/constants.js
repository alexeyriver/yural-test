/**
 * Статус асинхронной загрузки в slice-ах
 * @enum {string}
 */
export const STATUS = {
  IDLE: 'idle',
  LOADING: 'loading',
  SUCCEEDED: 'succeeded',
  FAILED: 'failed',
};

// Заглушка для отсутствующего значения: склада, цены, даты
export const NO_VALUE = '—';

// Сколько строк предложений рендерить за раз: у популярных артикулов их тысячи
export const OFFERS_PAGE_SIZE = 100;
