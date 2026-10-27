import { NO_VALUE } from '../constants.js';

const priceFormat = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB' });
const dateFormat = new Intl.DateTimeFormat('ru-RU', { dateStyle: 'short', timeStyle: 'short' });

export function formatPrice(price) {
  return price == null ? NO_VALUE : priceFormat.format(price);
}

export function formatDate(iso) {
  if (!iso) return NO_VALUE;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? NO_VALUE : dateFormat.format(date);
}
