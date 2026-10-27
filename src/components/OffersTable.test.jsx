import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setupStore } from '../store/index.js';
import { loadOffers } from '../store/offersSlice.js';
import { renderWithStore } from '../testUtils.jsx';
import OffersTable from './OffersTable.jsx';
import { NO_VALUE, OFFERS_PAGE_SIZE } from '../constants.js';

const ARG = { number: '01089', brand: 'ASAM' };

const offer = (overrides) => ({
  id: overrides.brand,
  number: '01089',
  name: 'Деталь',
  isOriginal: false,
  price: 100,
  stock: 5,
  warehouse: 'МСК РС',
  shipmentDate: '2026-10-30T12:20:00+03:00',
  ...overrides,
});

const OFFERS = [
  offer({ brand: 'STELLOX', price: 300 }),
  offer({ brand: 'BOSCH', price: null, stock: 0, warehouse: NO_VALUE, shipmentDate: null }),
  offer({ brand: 'ASAM', price: 500, isOriginal: true }),
  offer({ brand: 'SUFIX', price: 120 }),
];

const pending = loadOffers.pending('r1', ARG);
const fulfilled = (items) => loadOffers.fulfilled(items, 'r1', ARG);

const renderTable = (props = {}, ...actions) => {
  const store = setupStore();
  actions.forEach((action) => store.dispatch(action));
  return renderWithStore(<OffersTable {...props} />, store);
};

const bodyRows = () => within(screen.getByRole('table')).getAllByRole('row').slice(1);

test('hidden until a brand is selected', () => {
  const { container } = renderTable();
  expect(container).toBeEmptyDOMElement();
});

test('loading: title and spinner', () => {
  renderTable({}, pending);
  expect(screen.getByRole('heading', { name: 'ASAM 01089 — предложения' })).toBeInTheDocument();
  expect(screen.getByRole('status')).toBeInTheDocument();
});

test('failed: error with retry', async () => {
  const onRetry = vi.fn();
  renderTable({ onRetry }, pending, loadOffers.rejected(new Error('Неверный ключ API'), 'r1', ARG));
  expect(screen.getByRole('alert')).toHaveTextContent('Неверный ключ API');
  await userEvent.click(screen.getByRole('button', { name: 'Повторить' }));
  expect(onRetry).toHaveBeenCalledTimes(1);
});

test('succeeded, empty: no offers', () => {
  renderTable({}, pending, fulfilled([]));
  expect(screen.getByText('Предложений нет')).toBeInTheDocument();
});

test('nothing in stock: suggests to turn the filter off', () => {
  renderTable({}, pending, fulfilled([OFFERS[1]]));
  expect(screen.getByText(/Нет в наличии — снимите фильтр/)).toBeInTheDocument();
});

test('table: original first, then by price, out of stock hidden', () => {
  renderTable({}, pending, fulfilled(OFFERS));

  const headers = within(screen.getByRole('table')).getAllByRole('columnheader');
  expect(headers.map((h) => h.textContent)).toEqual([
    'Производитель',
    'Номер',
    'Название',
    'Цена',
    'Остаток',
    'Склад',
    'Отгрузка',
  ]);

  const rows = bodyRows();
  expect(rows.map((row) => within(row).getAllByRole('cell')[0].textContent)).toEqual([
    'ASAMОригинал',
    'SUFIX',
    'STELLOX',
  ]);
  const cells = within(rows[1])
    .getAllByRole('cell')
    .map((cell) => cell.textContent);
  expect(cells[3].replace(/\s/g, ' ')).toBe('120,00 ₽');
  expect(cells[4]).toBe('5');
  expect(cells[5]).toBe('МСК РС');
  expect(screen.getByTestId('offers-count')).toHaveTextContent('3 шт');
});

test('turning the filter off shows offers without stock at the end', async () => {
  renderTable({}, pending, fulfilled(OFFERS));
  await userEvent.click(screen.getByLabelText('Только в наличии'));

  const rows = bodyRows();
  expect(rows).toHaveLength(4);
  const last = within(rows[3])
    .getAllByRole('cell')
    .map((cell) => cell.textContent);
  expect(last).toEqual(['BOSCH', '01089', 'Деталь', NO_VALUE, 'нет в наличии', NO_VALUE, NO_VALUE]);
  expect(screen.getByTestId('offers-count')).toHaveTextContent('4 шт');
});

describe('large lists', () => {
  const many = Array.from({ length: 250 }, (_, i) =>
    offer({ brand: `B${String(i).padStart(3, '0')}`, price: i + 1 }),
  );

  test('renders the first page and loads more on demand', async () => {
    renderTable({}, pending, fulfilled(many));
    expect(bodyRows()).toHaveLength(OFFERS_PAGE_SIZE);
    expect(screen.getByText('Показано 100 из 250')).toBeInTheDocument();
    expect(screen.getByTestId('offers-count')).toHaveTextContent('250 шт');

    await userEvent.click(screen.getByRole('button', { name: 'Показать ещё 100' }));
    expect(bodyRows()).toHaveLength(200);

    await userEvent.click(screen.getByRole('button', { name: 'Показать ещё 50' }));
    expect(bodyRows()).toHaveLength(250);
    expect(screen.queryByRole('button', { name: /Показать ещё/ })).not.toBeInTheDocument();
  });

  test('changing the filter starts from the first page again', async () => {
    renderTable({}, pending, fulfilled(many));
    await userEvent.click(screen.getByRole('button', { name: 'Показать ещё 100' }));
    await userEvent.click(screen.getByLabelText('Только в наличии'));
    expect(bodyRows()).toHaveLength(OFFERS_PAGE_SIZE);
  });
});
