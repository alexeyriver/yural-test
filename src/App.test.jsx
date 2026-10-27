import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fetchBrands } from './api/favoritApi.js';
import App from './App.jsx';
import { DEBOUNCE_MS } from './components/SearchForm.jsx';
import { renderWithStore } from './testUtils.jsx';

vi.mock('./api/favoritApi.js', () => ({
  fetchBrands: vi.fn(),
  fetchOffers: vi.fn(),
}));

const BRANDS = [{ brand: 'ASAM', number: '01089', name: 'Фильтр топливный' }];

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
