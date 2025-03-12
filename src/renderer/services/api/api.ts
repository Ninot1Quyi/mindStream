/**
 * API服务
 * 用于与Electron主进程通信
 */
import { Conversation, Branch, Message, Position } from '../../types/models';
import { Modal } from 'antd';

// 用于在Electron环境不可用时（例如在开发环境中的测试）提供模拟实现
const mockElectronAPI = {
  conversations: {
    getAll: async () => ({ conversations: [] }),
    get: async () => ({ conversation: {}, branches: [] }),
    create: async () => ({ conversation: {}, branch: {} }),
    updateTitle: async () => ({ conversation: {} }),
    delete: async () => ({ success: true }),
    clearAll: async () => ({ success: true }),
  },
  // 其他API的模拟实现...
};

// 检查Electron API是否可用
const checkElectronAPI = () => {
  if (!window.electronAPI) {
    console.error('Electron API未加载！');
    Modal.error({
      title: '应用程序初始化失败',
      content: '无法访问Electron API。请重启应用程序，如果问题持续存在，请联系支持团队。'
    });
    
    // 使用模拟API
    console.warn('将使用模拟API进行操作。某些功能可能不可用。');
    window.electronAPI = mockElectronAPI as any;
    
    return false;
  }
  return true;
};

// 处理API错误
const handleAPIError = (error: Error, message: string) => {
  console.error(`API错误: ${message}`, error);
  Modal.error({
    title: '操作失败',
    content: `${message}: ${error.message}`
  });
  
  throw error;
};

// 全局错误处理函数
const handleError = (error: Error) => {
  console.error('API调用失败:', error);
  
  if (!window.electronAPI) {
    alert('应用程序初始化失败: Electron API未正确加载。请重启应用程序。');
  }
  
  throw error;
};

// 声明全局Electron API类型
declare global {
  interface Window {
    electronAPI: {
      conversations: {
        getAll: () => Promise<{ conversations: Conversation[] }>;
        get: (conversationId: string) => Promise<{ conversation: Conversation; branches: Branch[] }>;
        create: (title: string) => Promise<{ conversation: Conversation; branch: Branch }>;
        updateTitle: (conversationId: string, title: string) => Promise<{ conversation: Conversation }>;
        delete: (conversationId: string) => Promise<{ success: boolean }>;
        clearAll: () => Promise<{ success: boolean }>;
      };
      branches: {
        get: (branchId: string) => Promise<{ branch: Branch }>;
        create: (parentBranchId: string, parentMessageId: string | undefined, name: string, position?: Position) => 
          Promise<{ branch: Branch }>;
        update: (branchId: string, updates: { title?: string; position?: Position; width?: number; height?: number }) => 
          Promise<{ branch: Branch }>;
        delete: (branchId: string) => Promise<{ success: boolean }>;
        getMessages: (branchId: string) => Promise<{ messages: Message[] }>;
      };
      messages: {
        send: (branchId: string, content: string, sender?: 'user' | 'assistant' | 'system') => 
          Promise<{ user_message: Message; ai_message?: Message }>;
        generateAIResponse: (message: string) => Promise<{ response: string }>;
      };
    };
  }
}

// 应用启动时检查API是否可用
console.log('API服务初始化...');
if (window.electronAPI) {
  console.log('Electron API已加载');
} else {
  console.error('错误: window.electronAPI未定义!');
  setTimeout(() => {
    if (window.electronAPI) {
      console.log('Electron API已延迟加载');
    } else {
      console.error('错误: window.electronAPI在延迟后仍未定义!');
      alert('应用程序初始化失败: Electron API未正确加载。请重启应用程序。');
    }
  }, 1000);
}

/**
 * 会话API服务
 */
export const conversationApi = {
  // 获取所有会话
  getAll: async (): Promise<Conversation[]> => {
    try {
      console.log('调用API: conversationApi.getAll()');
      if (!window.electronAPI || !window.electronAPI.conversations) {
        throw new Error('Electron API未正确加载');
      }
      const response = await window.electronAPI.conversations.getAll();
      console.log('API响应: conversationApi.getAll()', response);
      return response.conversations;
    } catch (error) {
      return handleError(error as Error);
    }
  },

  // 获取单个会话及其所有分支
  get: async (conversationId: string): Promise<{ conversation: Conversation; branches: Branch[] }> => {
    try {
      console.log(`调用API: conversationApi.get(${conversationId})`);
      if (!window.electronAPI || !window.electronAPI.conversations) {
        throw new Error('Electron API未正确加载');
      }
      const response = await window.electronAPI.conversations.get(conversationId);
      console.log(`API响应: conversationApi.get(${conversationId})`, response);
      return response;
    } catch (error) {
      return handleError(error as Error);
    }
  },

  // 创建新会话
  create: async (title: string): Promise<{ conversation: Conversation; branch: Branch }> => {
    try {
      console.log(`调用API: conversationApi.create(${title})`);
      if (!window.electronAPI || !window.electronAPI.conversations) {
        throw new Error('Electron API未正确加载');
      }
      const response = await window.electronAPI.conversations.create(title);
      console.log(`API响应: conversationApi.create(${title})`, response);
      return response;
    } catch (error) {
      return handleError(error as Error);
    }
  },

  // 更新会话标题
  updateTitle: async (conversationId: string, title: string): Promise<Conversation> => {
    try {
      console.log(`调用API: conversationApi.updateTitle(${conversationId}, ${title})`);
      if (!window.electronAPI || !window.electronAPI.conversations) {
        throw new Error('Electron API未正确加载');
      }
      const response = await window.electronAPI.conversations.updateTitle(conversationId, title);
      console.log(`API响应: conversationApi.updateTitle(${conversationId}, ${title})`, response);
      return response.conversation;
    } catch (error) {
      return handleError(error as Error);
    }
  },

  // 删除会话
  delete: async (conversationId: string): Promise<boolean> => {
    try {
      console.log(`调用API: conversationApi.delete(${conversationId})`);
      if (!window.electronAPI || !window.electronAPI.conversations) {
        throw new Error('Electron API未正确加载');
      }
      const response = await window.electronAPI.conversations.delete(conversationId);
      console.log(`API响应: conversationApi.delete(${conversationId})`, response);
      return response.success;
    } catch (error) {
      return handleError(error as Error);
    }
  },

  // 清空所有会话
  clearAll: async (): Promise<boolean> => {
    try {
      console.log('调用API: conversationApi.clearAll()');
      if (!window.electronAPI || !window.electronAPI.conversations) {
        throw new Error('Electron API未正确加载');
      }
      const response = await window.electronAPI.conversations.clearAll();
      console.log('API响应: conversationApi.clearAll()', response);
      return response.success;
    } catch (error) {
      return handleError(error as Error);
    }
  },
};

/**
 * 分支API服务
 */
export const branchApi = {
  // 获取单个分支
  get: async (branchId: string): Promise<Branch> => {
    try {
      const response = await window.electronAPI.branches.get(branchId);
      return response.branch;
    } catch (error) {
      console.error(`获取分支 ${branchId} 失败:`, error);
      throw error;
    }
  },

  // 创建根节点分支（不需要父分支）
  createRoot: async (
    name: string,
    position?: Position
  ): Promise<Branch> => {
    try {
      console.log(`调用API: branchApi.createRoot(name: ${name}, position:`, position, ')');
      // 创建一个新会话并获取其主分支作为根节点
      const response = await conversationApi.create(name);
      console.log(`API响应: branchApi.createRoot 成功`, response);
      return response.branch;
    } catch (error) {
      console.error(`创建根节点分支失败:`, error);
      throw error;
    }
  },

  // 创建新分支
  create: async (
    parentBranchId: string, 
    parentMessageId: string | undefined, 
    name: string,
    position?: Position
  ): Promise<Branch> => {
    try {
      console.log(`调用API: branchApi.create(parentId: ${parentBranchId}, name: ${name}, position:`, position, ')');
      
      if (!window.electronAPI || !window.electronAPI.branches) {
        throw new Error('Electron API未正确加载');
      }
      
      const response = await window.electronAPI.branches.create(
        parentBranchId, 
        parentMessageId, 
        name, 
        position
      );
      console.log(`API响应: branchApi.create 成功`, response);
      return response.branch;
    } catch (error) {
      console.error('创建分支失败:', error);
      throw error;
    }
  },

  // 更新分支（标题、位置等）
  update: async (
    branchId: string, 
    updates: { title?: string; position?: Position; width?: number; height?: number }
  ): Promise<Branch> => {
    try {
      const response = await window.electronAPI.branches.update(branchId, updates);
      return response.branch;
    } catch (error) {
      console.error(`更新分支 ${branchId} 失败:`, error);
      throw error;
    }
  },

  // 删除分支
  delete: async (branchId: string): Promise<boolean> => {
    try {
      console.log(`调用API: branchApi.delete(branchId: ${branchId})`);
      const response = await window.electronAPI.branches.delete(branchId);
      console.log(`API响应: branchApi.delete 成功`, response);
      return response.success;
    } catch (error) {
      console.error(`删除分支 ${branchId} 失败:`, error);
      throw error;
    }
  },

  // 获取分支的所有消息
  getMessages: async (branchId: string): Promise<Message[]> => {
    try {
      const response = await window.electronAPI.branches.getMessages(branchId);
      console.log('Messages received from API:', response.messages);
      return response.messages;
    } catch (error) {
      console.error(`获取分支 ${branchId} 消息失败:`, error);
      throw error;
    }
  },
};

/**
 * 消息API服务
 */
export const messageApi = {
  // 发送消息
  send: async (
    branchId: string, 
    content: string, 
    sender: 'user' | 'assistant' | 'system' = 'user'
  ): Promise<{ userMessage: Message; aiMessage?: Message }> => {
    try {
      const response = await window.electronAPI.messages.send(branchId, content, sender);
      return {
        userMessage: response.user_message,
        aiMessage: response.ai_message,
      };
    } catch (error) {
      console.error(`发送消息到分支 ${branchId} 失败:`, error);
      throw error;
    }
  },

  // 生成AI回复（可用于手动触发生成回复）
  generateAIResponse: async (message: string): Promise<string> => {
    try {
      const response = await window.electronAPI.messages.generateAIResponse(message);
      return response.response;
    } catch (error) {
      console.error('生成AI回复失败:', error);
      throw error;
    }
  },
}; 