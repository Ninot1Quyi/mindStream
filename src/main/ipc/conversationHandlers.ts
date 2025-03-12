/**
 * 会话相关的IPC处理函数
 */
import { IpcMainInvokeEvent } from 'electron';
import { conversationStore, branchStore } from '../services/store';

/**
 * 获取所有会话列表
 */
export async function handleGetConversations(): Promise<any> {
  try {
    const conversations = conversationStore.getAll();
    return { conversations };
  } catch (error) {
    console.error('获取会话列表失败:', error);
    throw new Error(`获取会话列表失败: ${(error as Error).message}`);
  }
}

/**
 * 获取单个会话及其所有分支
 */
export async function handleGetConversation(conversationId: string): Promise<any> {
  try {
    const conversation = conversationStore.get(conversationId);
    if (!conversation) {
      throw new Error(`找不到会话 ${conversationId}`);
    }

    // 获取会话的所有分支
    const branches = conversation.branches
      .map(branchId => branchStore.get(branchId))
      .filter(Boolean);

    return { conversation, branches };
  } catch (error) {
    console.error(`获取会话 ${conversationId} 失败:`, error);
    throw new Error(`获取会话失败: ${(error as Error).message}`);
  }
}

/**
 * 创建新会话
 */
export async function handleCreateConversation(title: string): Promise<any> {
  try {
    const result = conversationStore.create(title || '新的对话');
    return {
      conversation: result.conversation,
      branch: result.branch,
    };
  } catch (error) {
    console.error('创建会话失败:', error);
    throw new Error(`创建会话失败: ${(error as Error).message}`);
  }
}

/**
 * 更新会话标题
 */
export async function handleUpdateConversationTitle(
  conversationId: string,
  title: string
): Promise<any> {
  try {
    if (!title) {
      throw new Error('会话标题不能为空');
    }
    
    const updatedConversation = conversationStore.update(conversationId, { title });
    if (!updatedConversation) {
      throw new Error(`找不到会话 ${conversationId}`);
    }
    
    return { conversation: updatedConversation };
  } catch (error) {
    console.error(`更新会话 ${conversationId} 标题失败:`, error);
    throw new Error(`更新会话标题失败: ${(error as Error).message}`);
  }
}

/**
 * 删除会话
 */
export async function handleDeleteConversation(conversationId: string): Promise<any> {
  try {
    // 获取会话信息
    const conversation = conversationStore.get(conversationId);
    if (!conversation) {
      throw new Error(`找不到会话 ${conversationId}`);
    }

    // 删除会话及其所有分支
    const result = conversationStore.delete(conversationId);
    
    // 删除会话关联的所有分支
    if (conversation.branches && Array.isArray(conversation.branches)) {
      conversation.branches.forEach(branchId => {
        try {
          branchStore.delete(branchId);
        } catch (error) {
          console.warn(`删除分支 ${branchId} 失败:`, error);
        }
      });
    }

    return { success: result };
  } catch (error) {
    console.error(`删除会话 ${conversationId} 失败:`, error);
    throw new Error(`删除会话失败: ${(error as Error).message}`);
  }
}

/**
 * 清空所有会话
 */
export async function handleClearAllConversations(): Promise<any> {
  try {
    // 获取所有会话
    const conversations = conversationStore.getAll();
    
    // 删除所有会话及其关联的分支
    conversations.forEach(conversation => {
      try {
        // 删除会话关联的所有分支
        if (conversation.branches && Array.isArray(conversation.branches)) {
          conversation.branches.forEach(branchId => {
            try {
              branchStore.delete(branchId);
            } catch (error) {
              console.warn(`删除分支 ${branchId} 失败:`, error);
            }
          });
        }
        
        // 删除会话本身
        conversationStore.delete(conversation.id);
      } catch (error) {
        console.warn(`删除会话 ${conversation.id} 失败:`, error);
      }
    });

    return { success: true };
  } catch (error) {
    console.error('清空所有会话失败:', error);
    throw new Error(`清空所有会话失败: ${(error as Error).message}`);
  }
} 