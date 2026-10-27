import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fetchBrands, fetchOffers } from './api/favoritApi.js';
import App from './App.jsx';
import { DEBOUNCE_MS } from './components/SearchForm.jsx';
import { renderWithStore } from './testUtils.jsx';

vi.mock('./api/favoritApi.js', () => ({
  fetchBrands: vi.fn(),
  fetchOffers: vi.fn(),
}));

const BRANDS = [
  { brand: 'ASAM', number: '01089', name: 'Фильтр топливный' },
  { brand: 'OSSCA', number: '01089', name: 'Стеклоподъемник задний левый' },
];

const offer = (brand, isOriginal = false) => ({
  id: brand,
  brand,
  number: '01089',
  name: 'Деталь',
  isOriginal,
  price: 100,
  stock: 1,
  warehouse: 'МСК РС',
  shipmentDate: null,
});

let user;

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers({ shouldAdvanceTime: true });
  user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
});

afterEach(() => {
  vi.useRealTimers();
});

const waitDebounce = () => act(() => vi.advanceTimersByTimeAsync(DEBOUNCE_MS));

test('renders page title and hint', () => {
  renderWithStore(<App />);
  expect(screen.getByRole('heading', { name: 'Поиск автозапчастей' })).toBeInTheDocument();
  expect(screen.getByText(/Введите артикул/)).toBeInTheDocument();
});

test('typing an article shows brands', async () => {
  fetchBrands.mockResolvedValue(BRANDS);
  renderWithStore(<App />);

  await user.type(screen.getByLabelText('Артикул'), '01089');
  await waitDebounce();

  expect(await screen.findByRole('button', { name: /ASAM/ })).toBeInTheDocument();
  expect(fetchBrands).toHaveBeenCalledTimes(1);
});

test('a new search aborts the previous request', async () => {
  fetchBrands.mockReturnValueOnce(new Promise(() => {})).mockResolvedValueOnce(BRANDS);
  renderWithStore(<App />);

  await user.type(screen.getByLabelText('Артикул'), '01089{Enter}');
  const firstSignal = fetchBrands.mock.calls[0][1];
  expect(firstSignal.aborted).toBe(false);

  await user.type(screen.getByLabelText('Артикул'), '0{Enter}');
  expect(firstSignal.aborted).toBe(true);
  expect(await screen.findByRole('button', { name: /ASAM/ })).toBeInTheDocument();
});

test('retry repeats the failed search', async () => {
  fetchBrands
    .mockRejectedValueOnce(new Error('Нет связи с сервером'))
    .mockResolvedValueOnce(BRANDS);
  renderWithStore(<App />);

  await user.type(screen.getByLabelText('Артикул'), '01089{Enter}');
  await user.click(await screen.findByRole('button', { name: 'Повторить' }));

  expect(await screen.findByRole('button', { name: /ASAM/ })).toBeInTheDocument();
  expect(fetchBrands.mock.calls.map(([number]) => number)).toEqual(['01089', '01089']);
});

const searchAndShowBrands = async () => {
  fetchBrands.mockResolvedValue(BRANDS);
  renderWithStore(<App />);
  await user.type(screen.getByLabelText('Артикул'), '01089{Enter}');
  await screen.findByRole('button', { name: /ASAM/ });
};

test('clicking a brand shows its offers table', async () => {
  await searchAndShowBrands();
  fetchOffers.mockResolvedValue([offer('ASAM', true), offer('SUFIX')]);

  await user.click(screen.getByRole('button', { name: /ASAM/ }));

  expect(fetchOffers).toHaveBeenCalledWith('01089', 'ASAM', expect.any(AbortSignal));
  expect(
    await screen.findByRole('heading', { name: 'ASAM 01089 — предложения' }),
  ).toBeInTheDocument();
  const rows = within(screen.getByRole('table')).getAllByRole('row');
  expect(rows).toHaveLength(3);
  expect(screen.getByText('Оригинал')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /ASAM/ })).toHaveClass('active');
});

test('switching brands aborts the previous offers request', async () => {
  await searchAndShowBrands();
  fetchOffers
    .mockReturnValueOnce(new Promise(() => {}))
    .mockResolvedValueOnce([offer('OSSCA', true)]);

  await user.click(screen.getByRole('button', { name: /ASAM/ }));
  const asamSignal = fetchOffers.mock.calls[0][2];
  await user.click(screen.getByRole('button', { name: /OSSCA/ }));

  expect(asamSignal.aborted).toBe(true);
  expect(
    await screen.findByRole('heading', { name: 'OSSCA 01089 — предложения' }),
  ).toBeInTheDocument();
  expect(screen.getByRole('table')).toHaveTextContent('OSSCA');
});

test('retry repeats the offers request for the same brand', async () => {
  await searchAndShowBrands();
  fetchOffers
    .mockRejectedValueOnce(new Error('Нет связи с сервером'))
    .mockResolvedValueOnce([offer('ASAM', true)]);

  await user.click(screen.getByRole('button', { name: /ASAM/ }));
  await user.click(await screen.findByRole('button', { name: 'Повторить' }));

  expect(await screen.findByRole('table')).toBeInTheDocument();
  expect(fetchOffers.mock.calls.map(([number, brand]) => [number, brand])).toEqual([
    ['01089', 'ASAM'],
    ['01089', 'ASAM'],
  ]);
});

test('a new article hides the offers table', async () => {
  await searchAndShowBrands();
  fetchOffers.mockResolvedValue([offer('ASAM', true)]);
  await user.click(screen.getByRole('button', { name: /ASAM/ }));
  await screen.findByRole('table');

  fetchBrands.mockReturnValue(new Promise(() => {}));
  await user.type(screen.getByLabelText('Артикул'), '0{Enter}');

  expect(screen.queryByRole('table')).not.toBeInTheDocument();
  expect(screen.queryByText(/— предложения/)).not.toBeInTheDocument();
});
