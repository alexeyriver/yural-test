import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { setupStore } from './store/index.js';

export function renderWithStore(ui, store = setupStore()) {
  return { store, ...render(<Provider store={store}>{ui}</Provider>) };
}
