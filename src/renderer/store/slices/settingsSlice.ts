import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AppSettings } from '../../types/models';

// 初始状态
const initialState: AppSettings = {
  theme: 'system',
  language: 'zh-CN',
  fontSize: 14,
  autoSave: true,
  llmProvider: 'openai',
  llmModel: 'gpt-3.5-turbo',
  apiKeys: {},
};

// 创建Slice
const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    // 更新主题
    setTheme: (state, action: PayloadAction<'light' | 'dark' | 'system'>) => {
      state.theme = action.payload;
    },
    
    // 更新语言
    setLanguage: (state, action: PayloadAction<string>) => {
      state.language = action.payload;
    },
    
    // 更新字体大小
    setFontSize: (state, action: PayloadAction<number>) => {
      state.fontSize = action.payload;
    },
    
    // 更新自动保存设置
    setAutoSave: (state, action: PayloadAction<boolean>) => {
      state.autoSave = action.payload;
    },
    
    // 更新LLM提供商
    setLlmProvider: (state, action: PayloadAction<string>) => {
      state.llmProvider = action.payload;
    },
    
    // 更新LLM模型
    setLlmModel: (state, action: PayloadAction<string>) => {
      state.llmModel = action.payload;
    },
    
    // 更新API密钥
    setApiKey: (state, action: PayloadAction<{ provider: string; key: string }>) => {
      const { provider, key } = action.payload;
      state.apiKeys[provider] = key;
    },
    
    // 删除API密钥
    removeApiKey: (state, action: PayloadAction<string>) => {
      delete state.apiKeys[action.payload];
    },
    
    // 重置设置为默认值
    resetSettings: () => initialState,
  },
});

// 导出actions
export const {
  setTheme,
  setLanguage,
  setFontSize,
  setAutoSave,
  setLlmProvider,
  setLlmModel,
  setApiKey,
  removeApiKey,
  resetSettings,
} = settingsSlice.actions;

// 导出reducer
export default settingsSlice.reducer; 