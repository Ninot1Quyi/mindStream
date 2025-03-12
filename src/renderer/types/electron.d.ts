/**
 * Electron API类型定义
 */
import { Conversation, Branch, Position } from './models';

// 用户偏好定义
export interface UserPreferences {
  confirmation: {
    showDeleteConfirmation: boolean;
    showClearAllConfirmation: boolean;
  };
  appearance: {
    theme: 'light' | 'dark' | 'system';
  };
  canvas: {
    initialZoom: number;
  };
}

// 声明全局Electron API类型
declare global {
  interface Window {
    electronAPI: {
      // 会话相关API
      conversations: {
        getAll: () => Promise<{ conversations: Conversation[] }>;
        get: (conversationId: string) => Promise<{ conversation: Conversation; branches: Branch[] }>;
        create: (title: string) => Promise<{ conversation: Conversation; branch: Branch }>;
        updateTitle: (conversationId: string, title: string) => Promise<{ conversation: Conversation }>;
        delete: (conversationId: string) => Promise<{ success: boolean }>;
        clearAll: () => Promise<{ success: boolean }>;
      };
      
      // 分支相关API
      branches: {
        get: (branchId: string) => Promise<{ branch: Branch }>;
        create: (
          parentBranchId: string, 
          parentMessageId: string | undefined, 
          name: string, 
          position?: Position
        ) => Promise<{ branch: Branch }>;
        update: (branchId: string, updates: any) => Promise<{ branch: Branch }>;
        delete: (branchId: string) => Promise<{ success: boolean }>;
        getMessages: (branchId: string) => Promise<{ messages: any[] }>;
      };
      
      // 消息相关API
      messages: {
        send: (branchId: string, content: string, sender?: string) => Promise<{ message: any }>;
        generateAIResponse: (message: string) => Promise<{ response: string }>;
      };
      
      // 偏好设置API
      preferences?: {
        getAll: () => Promise<UserPreferences>;
        save: (preferences: Partial<UserPreferences>) => Promise<{ success: boolean }>;
        getPreference: <T>(key: string) => Promise<T>;
        setPreference: (key: string, value: any) => Promise<{ success: boolean }>;
      };
    };
  }
} 