/**
 * Redux store配置
 */
import { configureStore } from '@reduxjs/toolkit';
import conversationReducer from './slices/conversationSlice';
import branchReducer from './slices/branchSlice';
import messageReducer from './slices/messageSlice';
import canvasReducer from './slices/canvasSlice';
import uiReducer from './slices/uiSlice';
import settingsReducer from './slices/settingsSlice';

// 创建Redux store
export const store = configureStore({
  reducer: {
    conversations: conversationReducer,
    branches: branchReducer,
    messages: messageReducer,
    canvas: canvasReducer,
    ui: uiReducer,
    settings: settingsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

// Redux类型
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch; 