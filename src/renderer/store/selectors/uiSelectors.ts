import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '../index';

// 基础选择器
const selectUiState = (state: RootState) => state.ui;

// 获取加载状态
export const selectIsLoading = createSelector(
  [selectUiState],
  (ui) => ui.isLoading
);

// 获取错误消息
export const selectErrorMessage = createSelector(
  [selectUiState],
  (ui) => ui.errorMessage
);

// 获取侧边栏状态
export const selectIsSidebarOpen = createSelector(
  [selectUiState],
  (ui) => ui.isSidebarOpen
);

// 获取当前激活的模态窗口
export const selectActiveModal = createSelector(
  [selectUiState],
  (ui) => ui.activeModal
);

// 获取当前主题
export const selectTheme = createSelector(
  [selectUiState],
  (ui) => ui.theme
); 