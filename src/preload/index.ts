/**
 * 预加载脚本
 * 用于安全地为渲染进程提供API
 */
import { contextBridge, ipcRenderer } from 'electron';
import { Position } from '../renderer/types/models';

// 暴露安全的API给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 会话相关API
  conversations: {
    getAll: () => ipcRenderer.invoke('get-conversations'),
    get: (conversationId: string) => ipcRenderer.invoke('get-conversation', conversationId),
    create: (title: string) => ipcRenderer.invoke('create-conversation', title),
    updateTitle: (conversationId: string, title: string) => 
      ipcRenderer.invoke('update-conversation-title', conversationId, title),
    delete: (conversationId: string) => ipcRenderer.invoke('delete-conversation', conversationId),
    clearAll: () => ipcRenderer.invoke('clear-all-conversations'),
  },
  
  // 分支相关API
  branches: {
    get: (branchId: string) => ipcRenderer.invoke('get-branch', branchId),
    create: (parentBranchId: string, parentMessageId: string | undefined, name: string, position?: Position) => 
      ipcRenderer.invoke('create-branch', parentBranchId, parentMessageId, name, position),
    update: (branchId: string, updates: any) => 
      ipcRenderer.invoke('update-branch', branchId, updates),
    delete: (branchId: string) => ipcRenderer.invoke('delete-branch', branchId),
    getMessages: (branchId: string) => ipcRenderer.invoke('get-branch-messages', branchId),
  },
  
  // 消息相关API
  messages: {
    send: (branchId: string, content: string, sender?: string) => 
      ipcRenderer.invoke('send-message', branchId, content, sender),
    generateAIResponse: (message: string) => ipcRenderer.invoke('generate-ai-response', message),
  },
  
  // 偏好设置API
  preferences: {
    getAll: () => ipcRenderer.invoke('get-preferences'),
    save: (preferences: any) => ipcRenderer.invoke('save-preferences', preferences),
    getPreference: (key: string) => ipcRenderer.invoke('get-preference', key),
    setPreference: (key: string, value: any) => ipcRenderer.invoke('set-preference', key, value),
  }
});

console.log('Preload script loaded'); 