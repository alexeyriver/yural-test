import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { searchBrands } from '../store/brandsSlice.js';
import { setupStore } from '../store/index.js';
import { loadOffers } from '../store/offersSlice.js';
import { renderWithStore } from '../testUtils.jsx';
import BrandList from './BrandList.jsx';

const BRANDS = [
  { brand: 'AP', number: '01089', name: 'Колодки тормозные барабанные' },
  { brand: 'ASAM', number: '01089', name: 'Фильтр топливный' },
];

const renderList = (props = {}, ...actions) => {
  const store = setupStore();
  actions.forEach((action) => store.dispatch(action));
  return renderWithStore(<BrandList {...props} />, store);
};

const pending = searchBrands.pending('r1', '01089');

test('idle: hint', () => {
  renderList();
  expect(screen.getByText(/Введите артикул/)).toBeInTheDocument();
});

test('loading: spinner', () => {
  renderList({}, pending);
  expect(screen.getByRole('status')).toHaveTextContent('Загрузка');
});

test('failed: error with retry', async () => {
  const onRetry = vi.fn();
  renderList(
    { onRetry },
    pending,
    searchBrands.rejected(new Error('Неверный ключ API'), 'r1', '01089'),
  );
  expect(screen.getByRole('alert')).toHaveTextContent('Неверный ключ API');
  await userEvent.click(screen.getByRole('button', { name: 'Повторить' }));
  expect(onRetry).toHaveBeenCalledTimes(1);
});

test('succeeded, empty: not found', () => {
  renderList({}, pending, searchBrands.fulfilled([], 'r1', '01089'));
  expect(screen.getByText('Производители не найдены')).toBeInTheDocument();
});

test('succeeded: brands with names, click selects', async () => {
  const onSelect = vi.fn();
  renderList({ onSelect }, pending, searchBrands.fulfilled(BRANDS, 'r1', '01089'));

  const buttons = screen.getAllByRole('button');
  expect(buttons.map((b) => b.textContent)).toEqual([
    'APКолодки тормозные барабанные',
    'ASAMФильтр топливный',
  ]);

  await userEvent.click(screen.getByRole('button', { name: /ASAM/ }));
  expect(onSelect).toHaveBeenCalledWith(BRANDS[1]);
});

test('selected brand is highlighted', () => {
  renderList(
    {},
    pending,
    searchBrands.fulfilled(BRANDS, 'r1', '01089'),
    loadOffers.pending('r2', { number: '01089', brand: 'ASAM' }),
  );
  expect(screen.getByRole('button', { name: /ASAM/ })).toHaveClass('active');
  expect(screen.getByRole('button', { name: /ASAM/ })).toHaveAttribute('aria-current', 'true');
  expect(screen.getByRole('button', { name: /AP/ })).not.toHaveClass('active');
});
