/**
 * 消息相关的IPC处理函数
 */
import { IpcMainInvokeEvent } from 'electron';
import { messageStore, llmService } from '../services/store';
import { MessageRole } from '../../renderer/types/models';

/**
 * 发送消息到分支
 */
export async function handleSendMessage(
  branchId: string,
  content: string,
  sender: MessageRole = 'user'
): Promise<any> {
  try {
    // 添加用户消息
    const userMessage = messageStore.add(branchId, content, sender);
    if (!userMessage) {
      throw new Error(`添加消息失败，分支 ${branchId} 不存在`);
    }
    
    // 如果是用户消息，自动生成AI回复
    let aiMessage = null;
    if (sender === 'user') {
      try {
        // 生成AI回复
        const aiResponseText = await llmService.generateResponse(content);
        
        // 添加AI回复到分支
        aiMessage = messageStore.add(branchId, aiResponseText, 'assistant');
      } catch (aiError) {
        console.error('生成AI回复失败:', aiError);
        // 即使AI响应失败，也返回用户消息
      }
    }
    
    // 返回结果
    const result: any = { user_message: userMessage };
    if (aiMessage) {
      result.ai_message = aiMessage;
    }
    
    return result;
  } catch (error) {
    console.error(`发送消息到分支 ${branchId} 失败:`, error);
    throw new Error(`发送消息失败: ${(error as Error).message}`);
  }
}

/**
 * 生成AI回复（可用于手动触发生成回复）
 */
export async function handleGenerateAIResponse(userMessage: string): Promise<any> {
  try {
    // 生成AI回复文本
    const response = await llmService.generateResponse(userMessage);
    
    return { response };
  } catch (error) {
    console.error('生成AI回复失败:', error);
    throw new Error(`生成AI回复失败: ${(error as Error).message}`);
  }
} 