import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// UI状态接口定义
interface UIState {
  isLoading: boolean;
  errorMessage: string | null;
  isSidebarOpen: boolean;
  activeModal: string | null;
  theme: 'light' | 'dark' | 'system';
}

// 初始状态
const initialState: UIState = {
  isLoading: false,
  errorMessage: null,
  isSidebarOpen: true,
  activeModal: null,
  theme: 'system',
};

// 创建Slice
const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    // 设置加载状态
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    
    // 设置错误信息
    setError: (state, action: PayloadAction<string | null>) => {
      state.errorMessage = action.payload;
    },
    
    // 清除错误信息
    clearError: (state) => {
      state.errorMessage = null;
    },
    
    // 切换侧边栏
    toggleSidebar: (state) => {
      state.isSidebarOpen = !state.isSidebarOpen;
    },
    
    // 设置侧边栏状态
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.isSidebarOpen = action.payload;
    },
    
    // 打开模态窗口
    openModal: (state, action: PayloadAction<string>) => {
      state.activeModal = action.payload;
    },
    
    // 关闭模态窗口
    closeModal: (state) => {
      state.activeModal = null;
    },
    
    // 设置主题
    setTheme: (state, action: PayloadAction<'light' | 'dark' | 'system'>) => {
      state.theme = action.payload;
    }
  },
});

// 导出actions
export const {
  setLoading,
  setError,
  clearError,
  toggleSidebar,
  setSidebarOpen,
  openModal,
  closeModal,
  setTheme,
} = uiSlice.actions;

// 导出reducer
export default uiSlice.reducer; 