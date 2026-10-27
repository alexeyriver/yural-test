import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SearchForm, { DEBOUNCE_MS } from './SearchForm.jsx';

let onSearch;
let user;

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  onSearch = vi.fn();
  user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  render(<SearchForm onSearch={onSearch} />);
});

afterEach(() => {
  vi.useRealTimers();
});

const input = () => screen.getByLabelText('Артикул');
const waitDebounce = () => act(() => vi.advanceTimersByTimeAsync(DEBOUNCE_MS));

test('searches once after the debounce pause', async () => {
  await user.type(input(), '01089');
  expect(onSearch).not.toHaveBeenCalled();
  await waitDebounce();
  expect(onSearch).toHaveBeenCalledTimes(1);
  expect(onSearch).toHaveBeenCalledWith('01089');
});

test('does not search with less than 3 characters', async () => {
  await user.type(input(), '01');
  await waitDebounce();
  await user.keyboard('{Enter}');
  expect(onSearch).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Найти' })).toBeDisabled();
});

test('does not search for spaces only', async () => {
  await user.type(input(), '   {Enter}');
  await waitDebounce();
  expect(onSearch).not.toHaveBeenCalled();
});

test('trims the article', async () => {
  await user.type(input(), '  01089  ');
  await waitDebounce();
  expect(onSearch).toHaveBeenCalledWith('01089');
});

test('Enter searches immediately without a repeat after the debounce', async () => {
  await user.type(input(), '01089{Enter}');
  expect(onSearch).toHaveBeenCalledTimes(1);
  await waitDebounce();
  expect(onSearch).toHaveBeenCalledTimes(1);
});

test('the button searches immediately', async () => {
  await user.type(input(), '01089');
  await user.click(screen.getByRole('button', { name: 'Найти' }));
  expect(onSearch).toHaveBeenCalledWith('01089');
});

test('a changed article is searched again', async () => {
  await user.type(input(), '01089');
  await waitDebounce();
  await user.clear(input());
  await user.type(input(), '7160500039S');
  await waitDebounce();
  expect(onSearch.mock.calls).toEqual([['01089'], ['7160500039S']]);
});
