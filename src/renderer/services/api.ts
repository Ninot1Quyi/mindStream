/**
 * API服务
 * 
 * 提供与Electron主进程通信的API，如果在非Electron环境中运行，则提供模拟实现
 */

// 检查是否在Electron环境中运行
const isElectron = typeof window !== 'undefined' && 'electronAPI' in window;

// 会话相关API
export const conversationService = {
  getAll: async () => {
    if (isElectron) {
      return (window as any).electronAPI.getConversations();
    }
    console.log('[Mock] getConversations');
    return [];
  },
  
  get: async (conversationId: string) => {
    if (isElectron) {
      return (window as any).electronAPI.getConversation(conversationId);
    }
    console.log('[Mock] getConversation', conversationId);
    return null;
  },
  
  create: async (title: string) => {
    if (isElectron) {
      return (window as any).electronAPI.createConversation(title);
    }
    console.log('[Mock] createConversation', title);
    return { id: 'mock-conv-' + Date.now(), title };
  },
  
  updateTitle: async (conversationId: string, title: string) => {
    if (isElectron) {
      return (window as any).electronAPI.updateConversationTitle(conversationId, title);
    }
    console.log('[Mock] updateConversationTitle', conversationId, title);
    return true;
  }
};

// 分支相关API
export const branchService = {
  get: async (branchId: string) => {
    if (isElectron) {
      return (window as any).electronAPI.getBranch(branchId);
    }
    console.log('[Mock] getBranch', branchId);
    return null;
  },
  
  create: async (parentBranchId: string, parentMessageId: string | undefined, name: string, position: any) => {
    if (isElectron) {
      return (window as any).electronAPI.createBranch(parentBranchId, parentMessageId, name, position);
    }
    console.log('[Mock] createBranch', { parentBranchId, parentMessageId, name, position });
    return { id: 'mock-branch-' + Date.now(), name };
  },
  
  update: async (branchId: string, updates: any) => {
    if (isElectron) {
      return (window as any).electronAPI.updateBranch(branchId, updates);
    }
    console.log('[Mock] updateBranch', branchId, updates);
    return true;
  },
  
  delete: async (branchId: string) => {
    if (isElectron) {
      return (window as any).electronAPI.deleteBranch(branchId);
    }
    console.log('[Mock] deleteBranch', branchId);
    return true;
  },
  
  getMessages: async (branchId: string) => {
    if (isElectron) {
      return (window as any).electronAPI.getBranchMessages(branchId);
    }
    console.log('[Mock] getBranchMessages', branchId);
    return [];
  }
};

// 消息相关API
export const messageService = {
  send: async (branchId: string, content: string, sender = 'user') => {
    if (isElectron) {
      return (window as any).electronAPI.sendMessage(branchId, content, sender);
    }
    console.log('[Mock] sendMessage', { branchId, content, sender });
    return { 
      id: 'mock-msg-' + Date.now(), 
      branchId, 
      content, 
      role: sender,
      timestamp: new Date().toISOString()
    };
  },
  
  generateAIResponse: async (message: string) => {
    if (isElectron) {
      return (window as any).electronAPI.generateAIResponse(message);
    }
    console.log('[Mock] generateAIResponse', message);
    return `这是对"${message}"的模拟AI回复。时间戳：${Date.now()}`;
  }
};

// 环境检查
export const environment = {
  isElectron: () => isElectron,
  isDevelopment: () => process.env.NODE_ENV === 'development'
}; 