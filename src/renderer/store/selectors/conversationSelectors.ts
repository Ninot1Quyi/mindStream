import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '../index';
import { Conversation } from '../../types/models';

// 基础选择器
const selectConversationsState = (state: RootState) => state.conversations;

// 获取所有会话
export const selectConversations = createSelector(
  [selectConversationsState],
  (conversations) => conversations.conversations
);

// 获取会话列表（排序后的数组）
export const selectConversationList = createSelector(
  [selectConversations],
  (conversations) => {
    return Object.values(conversations).sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }
);

// 获取当前会话ID
export const selectCurrentConversationId = createSelector(
  [selectConversationsState],
  (conversations) => conversations.currentConversationId
);

// 获取当前会话
export const selectCurrentConversation = createSelector(
  [selectConversations, selectCurrentConversationId],
  (conversations, currentId) => {
    return currentId ? conversations[currentId] : null;
  }
);

// 获取特定会话
export const selectConversationById = createSelector(
  [selectConversations, (state: RootState, conversationId: string) => conversationId],
  (conversations, conversationId) => conversations[conversationId]
); 