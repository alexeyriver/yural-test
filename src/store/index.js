import { configureStore } from '@reduxjs/toolkit';
import brands from './brandsSlice.js';
import offers from './offersSlice.js';

export function setupStore() {
  return configureStore({
    reducer: { brands, offers },
  });
}

export const store = setupStore();
