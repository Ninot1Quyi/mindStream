/**
 * 分支相关的IPC处理函数
 */
import { IpcMainInvokeEvent } from 'electron';
import { branchStore } from '../services/store';
import { Position } from '../../renderer/types/models';

/**
 * 获取单个分支信息
 */
export async function handleGetBranch(branchId: string): Promise<any> {
  try {
    const branch = branchStore.get(branchId);
    if (!branch) {
      throw new Error(`找不到分支 ${branchId}`);
    }
    return { branch };
  } catch (error) {
    console.error(`获取分支 ${branchId} 失败:`, error);
    throw new Error(`获取分支失败: ${(error as Error).message}`);
  }
}

/**
 * 创建新分支
 */
export async function handleCreateBranch(
  parentBranchId: string,
  parentMessageId: string | undefined,
  name: string,
  position?: Position
): Promise<any> {
  try {
    const newBranch = branchStore.create(parentBranchId, parentMessageId, name, position);
    if (!newBranch) {
      throw new Error(`无法创建新分支，父分支 ${parentBranchId} 不存在`);
    }
    return { branch: newBranch };
  } catch (error) {
    console.error(`创建新分支失败:`, error);
    throw new Error(`创建分支失败: ${(error as Error).message}`);
  }
}

/**
 * 更新分支信息（标题、位置等）
 */
export async function handleUpdateBranch(
  branchId: string,
  updates: { title?: string; position?: Position }
): Promise<any> {
  try {
    const updatedBranch = branchStore.update(branchId, updates);
    if (!updatedBranch) {
      throw new Error(`找不到分支 ${branchId}`);
    }
    return { branch: updatedBranch };
  } catch (error) {
    console.error(`更新分支 ${branchId} 失败:`, error);
    throw new Error(`更新分支失败: ${(error as Error).message}`);
  }
}

/**
 * 删除分支
 */
export async function handleDeleteBranch(branchId: string): Promise<any> {
  try {
    const success = branchStore.delete(branchId);
    if (!success) {
      throw new Error(`删除分支 ${branchId} 失败，该分支不存在或是会话的最后一个分支`);
    }
    return { success: true };
  } catch (error) {
    console.error(`删除分支 ${branchId} 失败:`, error);
    throw new Error(`删除分支失败: ${(error as Error).message}`);
  }
}

/**
 * 获取分支的所有消息
 */
export async function handleGetBranchMessages(branchId: string): Promise<any> {
  try {
    const messages = branchStore.getMessages(branchId);
    return { messages };
  } catch (error) {
    console.error(`获取分支 ${branchId} 的消息失败:`, error);
    throw new Error(`获取分支消息失败: ${(error as Error).message}`);
  }
} 