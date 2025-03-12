/**
 * 数据存储服务
 * 用于管理应用程序数据的本地存储
 */
import { app } from 'electron';
import Store from 'electron-store';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { Conversation, Branch, Message, Position } from '../../renderer/types/models';

// 定义存储的Schema类型
interface StoreSchema {
  conversations: Record<string, Conversation>;
}

interface CanvasDataSchema {
  conversation: Conversation;
  branches: Record<string, Branch>;
  messages: Record<string, Message>;
}

// 获取应用数据目录
const userDataPath = app.getPath('userData');
const canvasDataPath = path.join(process.cwd(), 'canvas-data');

// 确保canvas-data目录存在
if (!fs.existsSync(canvasDataPath)) {
  fs.mkdirSync(canvasDataPath, { recursive: true });
}

// 创建主存储实例 - 只存储会话索引
const store = new Store<StoreSchema>({
  name: 'mindstream-index',
  cwd: canvasDataPath,
  defaults: {
    conversations: {},
  },
});

// 获取会话数据文件路径
const getConversationFilePath = (conversationId: string): string => {
  return path.join(canvasDataPath, `conversation-${conversationId}.json`);
};

// 保存会话数据到文件
const saveConversationData = (conversationId: string, data: CanvasDataSchema): void => {
  const filePath = getConversationFilePath(conversationId);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

// 读取会话数据
const loadConversationData = (conversationId: string): CanvasDataSchema | null => {
  const filePath = getConversationFilePath(conversationId);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  
  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data) as CanvasDataSchema;
  } catch (error) {
    console.error(`读取会话数据失败: ${conversationId}`, error);
    return null;
  }
};

/**
 * 初始化数据存储
 */
export async function initDataStore() {
  console.log('初始化数据存储...');
  
  // 清理旧的存储文件
  const oldDataFile = path.join(canvasDataPath, 'mindstream-data.json');
  if (fs.existsSync(oldDataFile)) {
    try {
      console.log('发现旧的数据文件，正在迁移...');
      const oldData = JSON.parse(fs.readFileSync(oldDataFile, 'utf-8'));
      
      // 迁移旧数据到新格式
      if (oldData.conversations) {
        const conversations = oldData.conversations;
        const branches = oldData.branches || {};
        const messages = oldData.messages || {};
        
        // 更新索引存储
        store.set('conversations', conversations);
        
        // 为每个会话创建单独的数据文件
        for (const conversationId of Object.keys(conversations)) {
          const conversation = conversations[conversationId];
          
          // 收集会话相关的分支
          const conversationBranches: Record<string, Branch> = {};
          const conversationMessages: Record<string, Message> = {};
          
          // 收集分支数据
          for (const branchId of conversation.branches) {
            const branch = branches[branchId];
            if (branch) {
              conversationBranches[branchId] = branch;
              
              // 收集消息数据
              for (const messageId of branch.messages) {
                const message = messages[messageId];
                if (message) {
                  conversationMessages[messageId] = message;
                }
              }
            }
          }
          
          // 保存会话数据到单独文件
          saveConversationData(conversationId, {
            conversation,
            branches: conversationBranches,
            messages: conversationMessages
          });
        }
        
        // 删除旧数据文件
        fs.unlinkSync(oldDataFile);
        console.log('数据迁移完成');
      }
    } catch (error) {
      console.error('迁移旧数据失败:', error);
    }
  }
  
  // 检查是否需要创建默认数据
  if (Object.keys(store.get('conversations')).length === 0) {
    await createDefaultData();
  }
  
  console.log('数据存储初始化完成');
}

/**
 * 创建默认数据
 * 如果没有现有数据，创建一个默认会话和分支
 */
async function createDefaultData() {
  console.log('创建默认数据...');
  
  const now = new Date().toISOString();
  const conversationId = uuidv4();
  const mainBranchId = uuidv4();
  const welcomeMessageId = uuidv4();
  
  // 创建欢迎消息
  const welcomeMessage: Message = {
    id: welcomeMessageId,
    branchId: mainBranchId,
    content: '欢迎使用MindStream！这是一个创新的分支式对话应用程序。您可以从任何点创建多个对话分支，探索不同的主题或方法。开始输入消息与AI对话吧！',
    role: 'system',
    timestamp: now,
  };
  
  // 创建主分支
  const mainBranch: Branch = {
    id: mainBranchId,
    conversationId: conversationId,
    title: '主分支',
    position: { x: 100, y: 300 },
    createdAt: now,
    updatedAt: now,
    messages: [welcomeMessageId],
    width: 300,
    height: 300
  };
  
  // 创建默认会话
  const defaultConversation: Conversation = {
    id: conversationId,
    title: '新的对话',
    createdAt: now,
    updatedAt: now,
    branches: [mainBranchId],
  };
  
  // 保存到索引存储
  const conversations = { [conversationId]: defaultConversation };
  store.set('conversations', conversations);
  
  // 保存会话数据到单独文件
  saveConversationData(conversationId, {
    conversation: defaultConversation,
    branches: { [mainBranchId]: mainBranch },
    messages: { [welcomeMessageId]: welcomeMessage }
  });
  
  console.log('默认数据创建完成');
}

// 导出store实例
export { store };

// 会话相关操作函数
export const conversationStore = {
  // 获取所有会话
  getAll: (): Conversation[] => {
    const conversations = store.get('conversations');
    return Object.values(conversations).sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  },
  
  // 获取单个会话
  get: (id: string): Conversation | null => {
    const conversations = store.get('conversations');
    return conversations[id] || null;
  },
  
  // 创建新会话
  create: (title: string): { conversation: Conversation, branch: Branch } => {
    const now = new Date().toISOString();
    const conversationId = uuidv4();
    const mainBranchId = uuidv4();
    
    // 创建主分支
    const mainBranch: Branch = {
      id: mainBranchId,
      conversationId: conversationId,
      title: '主分支',
      position: { x: 100, y: 300 },
      createdAt: now,
      updatedAt: now,
      messages: [],
      width: 300,
      height: 300
    };
    
    // 创建会话
    const conversation: Conversation = {
      id: conversationId,
      title: title || '新的对话',
      createdAt: now,
      updatedAt: now,
      branches: [mainBranchId],
    };
    
    // 更新索引存储
    const conversations = store.get('conversations');
    conversations[conversationId] = conversation;
    store.set('conversations', conversations);
    
    // 保存会话数据到单独文件
    saveConversationData(conversationId, {
      conversation,
      branches: { [mainBranchId]: mainBranch },
      messages: {}
    });
    
    return { conversation, branch: mainBranch };
  },
  
  // 更新会话
  update: (id: string, updates: Partial<Conversation>): Conversation | null => {
    const conversations = store.get('conversations');
    const conversation = conversations[id];
    
    if (!conversation) return null;
    
    const updatedConversation = {
      ...conversation,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    
    // 更新索引存储
    conversations[id] = updatedConversation;
    store.set('conversations', conversations);
    
    // 更新会话数据文件
    const canvasData = loadConversationData(id);
    if (canvasData) {
      canvasData.conversation = updatedConversation;
      saveConversationData(id, canvasData);
    }
    
    return updatedConversation;
  },
  
  // 删除会话
  delete: (id: string): boolean => {
    const conversations = store.get('conversations');
    
    // 检查会话是否存在
    if (!conversations[id]) return false;
    
    // 删除会话
    delete conversations[id];
    
    // 更新索引存储
    store.set('conversations', conversations);
    
    // 删除会话数据文件
    const filePath = getConversationFilePath(id);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    return true;
  },
};

// 分支相关操作函数
export const branchStore = {
  // 获取单个分支
  get: (id: string): Branch | null => {
    // 首先找到分支所属的会话
    const conversations = store.get('conversations');
    for (const conversationId of Object.keys(conversations)) {
      const conversation = conversations[conversationId];
      if (conversation.branches.includes(id)) {
        const canvasData = loadConversationData(conversationId);
        if (canvasData && canvasData.branches[id]) {
          return canvasData.branches[id];
        }
      }
    }
    return null;
  },
  
  // 创建新分支
  create: (
    parentBranchId: string,
    parentMessageId?: string,
    title?: string,
    position?: Position
  ): Branch => {
    // 首先获取父分支
    const parentBranch = branchStore.get(parentBranchId);
    
    // 如果父分支不存在，抛出错误
    if (!parentBranch) {
      throw new Error(`Parent branch ${parentBranchId} not found`);
    }
    
    const conversationId = parentBranch.conversationId;
    const canvasData = loadConversationData(conversationId);
    
    if (!canvasData) {
      throw new Error(`Conversation data ${conversationId} not found`);
    }
    
    const now = new Date().toISOString();
    const newBranchId = uuidv4();
    
    // 确定位置
    const pos = position || { 
      x: (parentBranch.position.x || 100) + 350,
      y: (parentBranch.position.y || 300)
    };
    
    // 创建新分支
    const newBranch: Branch = {
      id: newBranchId,
      conversationId: parentBranch.conversationId,
      title: title || '新分支',
      parentBranchId,
      parentMessageId,
      position: pos,
      createdAt: now,
      updatedAt: now,
      messages: [],
      width: 300,
      height: 300
    };
    
    // 更新会话数据
    canvasData.branches[newBranchId] = newBranch;
    
    // 更新会话的分支列表
    canvasData.conversation.branches.push(newBranchId);
    canvasData.conversation.updatedAt = now;
    
    // 保存会话数据
    saveConversationData(conversationId, canvasData);
    
    // 更新索引存储中的会话
    const conversations = store.get('conversations');
    conversations[conversationId] = canvasData.conversation;
    store.set('conversations', conversations);
    
    return newBranch;
  },
  
  // 更新分支
  update: (id: string, updates: Partial<Branch>): Branch | null => {
    // 首先找到分支所属的会话
    const branch = branchStore.get(id);
    if (!branch) return null;
    
    const conversationId = branch.conversationId;
    const canvasData = loadConversationData(conversationId);
    
    if (!canvasData) return null;
    
    const updatedBranch = {
      ...branch,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    
    // 更新会话数据
    canvasData.branches[id] = updatedBranch;
    saveConversationData(conversationId, canvasData);
    
    return updatedBranch;
  },
  
  // 删除分支
  delete: (branchId: string): boolean => {
    console.log('开始删除分支:', branchId);
    
    // 首先找到分支所属的会话
    const conversations = store.get('conversations');
    for (const conversationId of Object.keys(conversations)) {
      const conversation = conversations[conversationId];
      if (conversation.branches.includes(branchId)) {
        console.log('找到分支所属会话:', conversationId);
        
        // 加载会话数据
        const canvasData = loadConversationData(conversationId);
        if (!canvasData) {
          console.error('无法加载会话数据');
          return false;
        }

        // 检查是否是主分支
        if (canvasData.branches[branchId]?.isRoot) {
          console.error('无法删除主分支');
          return false;
        }

        // 从会话的分支列表中移除
        conversation.branches = conversation.branches.filter(id => id !== branchId);
        
        // 从canvas数据中删除分支
        delete canvasData.branches[branchId];
        
        // 保存更新后的数据
        store.set('conversations', conversations);
        saveConversationData(conversationId, canvasData);
        
        console.log('分支删除成功');
        return true;
      }
    }
    
    console.error('未找到要删除的分支');
    return false;
  },
  
  // 获取分支的所有消息
  getMessages: (id: string): Message[] => {
    // 首先找到分支所属的会话
    const branch = branchStore.get(id);
    if (!branch) return [];
    
    const conversationId = branch.conversationId;
    const canvasData = loadConversationData(conversationId);
    
    if (!canvasData) return [];
    
    // 获取分支内所有消息并按时间排序
    return branch.messages
      .map(messageId => canvasData.messages[messageId])
      .filter(Boolean)
      .sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
  },
};

// 消息相关操作函数
export const messageStore = {
  // 获取单个消息
  get: (id: string): Message | null => {
    // 首先找到消息所属的分支和会话
    const conversations = store.get('conversations');
    for (const conversationId of Object.keys(conversations)) {
      const canvasData = loadConversationData(conversationId);
      if (canvasData && canvasData.messages[id]) {
        return canvasData.messages[id];
      }
    }
    return null;
  },
  
  // 向分支添加消息
  add: (branchId: string, content: string, role: Message['role'] = 'user'): Message | null => {
    // 首先找到分支所属的会话
    const branch = branchStore.get(branchId);
    if (!branch) return null;
    
    const conversationId = branch.conversationId;
    const canvasData = loadConversationData(conversationId);
    
    if (!canvasData) return null;
    
    const now = new Date().toISOString();
    const messageId = uuidv4();
    
    // 创建新消息
    const newMessage: Message = {
      id: messageId,
      branchId,
      content,
      role,
      timestamp: now,
    };
    
    // 更新会话数据
    canvasData.messages[messageId] = newMessage;
    canvasData.branches[branchId].messages.push(messageId);
    canvasData.branches[branchId].updatedAt = now;
    canvasData.conversation.updatedAt = now;
    
    // 保存会话数据
    saveConversationData(conversationId, canvasData);
    
    // 更新索引存储中的会话
    const conversations = store.get('conversations');
    conversations[conversationId] = canvasData.conversation;
    store.set('conversations', conversations);
    
    return newMessage;
  },
  
  // 删除消息
  delete: (id: string): boolean => {
    // 首先找到消息所属的分支和会话
    const message = messageStore.get(id);
    if (!message) return false;
    
    const branchId = message.branchId;
    const branch = branchStore.get(branchId);
    if (!branch) return false;
    
    const conversationId = branch.conversationId;
    const canvasData = loadConversationData(conversationId);
    
    if (!canvasData) return false;
    
    // 从分支的消息列表中删除
    canvasData.branches[branchId].messages = canvasData.branches[branchId].messages.filter(m => m !== id);
    canvasData.branches[branchId].updatedAt = new Date().toISOString();
    
    // 删除消息
    delete canvasData.messages[id];
    
    // 保存会话数据
    saveConversationData(conversationId, canvasData);
    
    return true;
  },
};

// 模拟LLM服务
export const llmService = {
  // 生成AI回复
  generateResponse: async (userMessage: string): Promise<string> => {
    // 这里模拟一个简单的AI回复，实际应用中可以集成OpenAI等服务
    const responses = [
      `我理解你的观点。让我进一步阐述这个话题。`,
      `这是一个有趣的角度。你有没有考虑过另一种方法？`,
      `我正在分析你提供的信息。基于此，我建议考虑以下因素。`,
      `谢谢您的分享。根据我的分析，有几个关键见解需要考虑。`,
      `我已处理您的请求，并可以根据可用信息提供以下见解。`,
      `关于 "${userMessage}"，我有以下看法...\n\n1. 这是一个复杂的话题\n2. 需要从多角度分析\n3. 有多种可能的解决方案`,
      `你提到了 "${userMessage}"。让我分析一下这个问题。`,
      `"${userMessage}" 确实是一个值得探讨的话题。从历史角度看...`,
    ];
    
    // 添加随机延时模拟思考
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1500));
    
    // 返回随机响应
    return responses[Math.floor(Math.random() * responses.length)];
  },
}; 