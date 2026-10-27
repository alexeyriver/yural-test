import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { fetchBrands } from '../api/favoritApi.js';

export const searchBrands = createAsyncThunk('brands/search', (number, { signal }) =>
  fetchBrands(number, signal),
);

const initialState = {
  query: '',
  items: [],
  status: 'idle',
  error: null,
  requestId: null,
};

const brandsSlice = createSlice({
  name: 'brands',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(searchBrands.pending, (state, action) => {
        state.query = action.meta.arg;
        state.items = [];
        state.status = 'loading';
        state.error = null;
        state.requestId = action.meta.requestId;
      })
      .addCase(searchBrands.fulfilled, (state, action) => {
        if (action.meta.requestId !== state.requestId) return;
        state.items = action.payload;
        state.status = 'succeeded';
      })
      .addCase(searchBrands.rejected, (state, action) => {
        // Отмена — не ошибка: её вызывает новый запрос или размонтирование
        if (action.meta.aborted || action.meta.requestId !== state.requestId) return;
        state.status = 'failed';
        state.error = action.error.message;
      });
  },
});

export const selectBrands = (state) => state.brands;

export default brandsSlice.reducer;
