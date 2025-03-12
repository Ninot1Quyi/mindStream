/**
 * IPC通信处理模块
 * 处理渲染进程和主进程之间的通信
 */
import { ipcMain } from 'electron';
import { 
  handleGetConversations, 
  handleGetConversation, 
  handleCreateConversation, 
  handleUpdateConversationTitle,
  handleDeleteConversation,
  handleClearAllConversations
} from './conversationHandlers';
import {
  handleGetBranch,
  handleCreateBranch,
  handleUpdateBranch,
  handleDeleteBranch,
  handleGetBranchMessages
} from './branchHandlers';
import {
  handleSendMessage,
  handleGenerateAIResponse
} from './messageHandlers';
import { registerPreferencesHandlers } from './preferencesHandlers';

/**
 * 初始化IPC处理器
 */
export function initIpcHandlers() {
  // 会话相关处理器
  ipcMain.handle('get-conversations', handleGetConversations);
  ipcMain.handle('get-conversation', (event, conversationId) => 
    handleGetConversation(conversationId));
  ipcMain.handle('create-conversation', (event, title) => 
    handleCreateConversation(title));
  ipcMain.handle('update-conversation-title', (event, conversationId, title) => 
    handleUpdateConversationTitle(conversationId, title));
  ipcMain.handle('delete-conversation', (event, conversationId) => 
    handleDeleteConversation(conversationId));
  ipcMain.handle('clear-all-conversations', () => 
    handleClearAllConversations());

  // 分支相关处理器
  ipcMain.handle('get-branch', (event, branchId) => 
    handleGetBranch(branchId));
  ipcMain.handle('create-branch', (event, parentBranchId, parentMessageId, name, position) => 
    handleCreateBranch(parentBranchId, parentMessageId, name, position));
  ipcMain.handle('update-branch', (event, branchId, updates) => 
    handleUpdateBranch(branchId, updates));
  ipcMain.handle('delete-branch', (event, branchId) => 
    handleDeleteBranch(branchId));
  ipcMain.handle('get-branch-messages', (event, branchId) => 
    handleGetBranchMessages(branchId));

  // 消息相关处理器
  ipcMain.handle('send-message', (event, branchId, content, sender) => 
    handleSendMessage(branchId, content, sender));
  ipcMain.handle('generate-ai-response', (event, message) => 
    handleGenerateAIResponse(message));
  
  // 注册偏好设置处理程序
  registerPreferencesHandlers();

  console.log('IPC处理器初始化完成');
} 