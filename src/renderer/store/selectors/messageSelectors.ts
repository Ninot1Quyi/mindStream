import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '../index';

// 基础选择器
const selectMessagesState = (state: RootState) => state.messages;
const selectBranchesState = (state: RootState) => state.branches;

// 获取所有消息
export const selectMessages = createSelector(
  [selectMessagesState],
  (messages) => messages.messages
);

// 获取特定消息
export const selectMessageById = createSelector(
  [selectMessages, (state: RootState, messageId: string) => messageId],
  (messages, messageId) => messages[messageId]
);

// 获取指定分支的所有消息
export const selectMessagesByBranchId = createSelector(
  [
    selectMessages,
    selectBranchesState,
    (state: RootState, branchId: string) => branchId
  ],
  (messages, branches, branchId) => {
    const branch = branches.branches[branchId];
    if (!branch) return [];
    
    // 获取分支中的所有消息并按时间排序
    return branch.messages
      .map(messageId => messages[messageId])
      .filter(Boolean)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }
); 