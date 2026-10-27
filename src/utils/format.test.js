import { formatDate, formatPrice } from './format.js';
import { NO_VALUE } from '../constants.js';

// Intl в ru-RU разделяет разряды и «₽» неразрывными пробелами
const normalizeSpaces = (text) => text.replace(/\s/g, ' ');

test('formatPrice', () => {
  expect(normalizeSpaces(formatPrice(1067.26))).toBe('1 067,26 ₽');
  expect(formatPrice(null)).toBe(NO_VALUE);
});

test('formatDate', () => {
  expect(formatDate('2026-10-30T12:20:00+03:00')).toMatch(/^\d{2}\.\d{2}\.\d{4}, \d{2}:\d{2}$/);
  expect(formatDate(null)).toBe(NO_VALUE);
  expect(formatDate('not a date')).toBe(NO_VALUE);
});
