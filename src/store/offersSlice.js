import { createAsyncThunk, createSelector, createSlice } from '@reduxjs/toolkit';
import { fetchOffers } from '../api/favoritApi.js';
import { searchBrands } from './brandsSlice.js';

export const loadOffers = createAsyncThunk('offers/load', ({ number, brand }, { signal }) =>
  fetchOffers(number, brand, signal),
);

const initialState = {
  selected: null,
  items: [],
  status: 'idle',
  error: null,
  requestId: null,
  onlyInStock: true,
};

const offersSlice = createSlice({
  name: 'offers',
  initialState,
  reducers: {
    toggleOnlyInStock: (state) => {
      state.onlyInStock = !state.onlyInStock;
    },
  },
  extraReducers: (builder) => {
    builder
      // Новый артикул — новый подбор; выбор фильтра пользователя сохраняем
      .addCase(searchBrands.pending, (state) => ({
        ...initialState,
        onlyInStock: state.onlyInStock,
      }))
      .addCase(loadOffers.pending, (state, action) => {
        state.selected = { number: action.meta.arg.number, brand: action.meta.arg.brand };
        state.items = [];
        state.status = 'loading';
        state.error = null;
        state.requestId = action.meta.requestId;
      })
      .addCase(loadOffers.fulfilled, (state, action) => {
        if (action.meta.requestId !== state.requestId) return;
        state.items = action.payload;
        state.status = 'succeeded';
      })
      .addCase(loadOffers.rejected, (state, action) => {
        if (action.meta.aborted || action.meta.requestId !== state.requestId) return;
        state.status = 'failed';
        state.error = action.error.message;
      });
  },
});

export const { toggleOnlyInStock } = offersSlice.actions;

export const selectOffers = (state) => state.offers;

// Сначала искомая деталь, затем по цене; без цены — в конец
const compareOffers = (a, b) => {
  if (a.isOriginal !== b.isOriginal) return a.isOriginal ? -1 : 1;
  if (a.price === b.price) return 0;
  if (a.price === null) return 1;
  if (b.price === null) return -1;
  return a.price - b.price;
};

export const selectVisibleOffers = createSelector(
  [(state) => state.offers.items, (state) => state.offers.onlyInStock],
  (items, onlyInStock) =>
    (onlyInStock ? items.filter((offer) => offer.stock > 0) : [...items]).sort(compareOffers),
);

export default offersSlice.reducer;
