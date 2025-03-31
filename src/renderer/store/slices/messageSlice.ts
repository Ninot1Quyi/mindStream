import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Message, MessageRole } from '../../types/models';
import { messageApi, branchApi } from '../../services/api/api';
import { setError } from './uiSlice';

// 消息状态接口
interface MessageState {
  messages: Record<string, Message>;
  isLoading: boolean;
  loadingBranches: Record<string, boolean>; // Track loading state per branch
}

// 初始状态
const initialState: MessageState = {
  messages: {},
  isLoading: false,
  loadingBranches: {},
};

// 异步Action: 获取分支的所有消息
export const fetchBranchMessages = createAsyncThunk(
  'messages/fetchBranchMessages',
  async (branchId: string, { dispatch, getState }) => {
    try {
      // 检查是否已经有该分支的消息，避免重复获取
      const state = getState() as { messages: MessageState };
      const existingMessages = Object.values(state.messages.messages)
        .filter(msg => msg.branchId === branchId);
      
      // 如果已经有消息且不在加载中，则跳过获取
      if (existingMessages.length > 0 && !state.messages.loadingBranches[branchId]) {
        console.log(`分支 ${branchId} 的消息已存在，跳过获取`);
        return { branchId, messages: existingMessages };
      }
      
      // Don't use global loading state
      const messages = await branchApi.getMessages(branchId);
      return { branchId, messages };
    } catch (error) {
      const errorMessage = (error as Error).message || `获取分支消息失败`;
      dispatch(setError(errorMessage));
      throw error;
    }
  }
);

// 异步Action: 发送消息
export const sendMessage = createAsyncThunk(
  'messages/send',
  async (
    {
      branchId,
      content,
      role = 'user'
    }: {
      branchId: string;
      content: string;
      role?: MessageRole;
    },
    { dispatch }
  ) => {
    try {
      // Don't use global loading state
      const result = await messageApi.send(branchId, content, role);
      
      // 立即添加用户消息并触发事件
      if (result.userMessage) {
        dispatch(addMessage(result.userMessage));
        window.dispatchEvent(new CustomEvent('new-message', {
          detail: { messageId: result.userMessage.id, branchId }
        }));
      }
      
      // 立即添加AI回复并触发事件
      if (result.aiMessage) {
        dispatch(addMessage(result.aiMessage));
        window.dispatchEvent(new CustomEvent('new-message', {
          detail: { messageId: result.aiMessage.id, branchId }
        }));
        
        // 结束加载状态
        dispatch(setLoadingState({ branchId, isLoading: false }));
      }
      
      return { ...result, branchId };
    } catch (error) {
      const errorMessage = (error as Error).message || `发送消息失败`;
      dispatch(setError(errorMessage));
      throw error;
    }
  }
);

// 异步Action: 生成AI回复
export const generateAIResponse = createAsyncThunk(
  'messages/generateAIResponse',
  async (userMessage: string, { dispatch }) => {
    try {
      // Don't use global loading state
      const response = await messageApi.generateAIResponse(userMessage);
      return response;
    } catch (error) {
      const errorMessage = (error as Error).message || `生成AI回复失败`;
      dispatch(setError(errorMessage));
      throw error;
    }
  }
);

// 创建Slice
const messageSlice = createSlice({
  name: 'messages',
  initialState,
  reducers: {
    // 添加消息到状态
    addMessage: (state, action: PayloadAction<Message>) => {
      state.messages[action.payload.id] = action.payload;
      // 如果是AI回复，结束加载状态
      if (action.payload.role === 'assistant') {
        state.loadingBranches[action.payload.branchId] = false;
      }
    },
    
    // 更新分支加载状态
    setLoadingState: (state, action: PayloadAction<{ branchId: string; isLoading: boolean }>) => {
      state.loadingBranches[action.payload.branchId] = action.payload.isLoading;
    },
    
    // 移除消息
    removeMessage: (state, action: PayloadAction<string>) => {
      delete state.messages[action.payload];
    },
    
    // 清除所有消息
    clearMessages: (state) => {
      state.messages = {};
    },
  },
  extraReducers: (builder) => {
    // 处理fetchBranchMessages
    builder.addCase(fetchBranchMessages.pending, (state, action) => {
      const branchId = action.meta.arg;
      state.loadingBranches[branchId] = true;
    });
    
    builder.addCase(fetchBranchMessages.fulfilled, (state, action) => {
      const { branchId, messages } = action.payload;
      
      // 更新消息
      messages.forEach(message => {
        state.messages[message.id] = message;
      });
      
      state.loadingBranches[branchId] = false;
      
      // 触发新消息事件
      if (messages.length > 0) {
        window.dispatchEvent(new CustomEvent('new-message', {
          detail: { messageId: messages[messages.length - 1].id, branchId }
        }));
      }
    });
    
    builder.addCase(fetchBranchMessages.rejected, (state, action) => {
      const branchId = action.meta.arg;
      state.loadingBranches[branchId] = false;
    });
    
    // 处理sendMessage
    builder.addCase(sendMessage.pending, (state, action) => {
      const { branchId } = action.meta.arg;
      state.loadingBranches[branchId] = true;
    });
    
    builder.addCase(sendMessage.fulfilled, (state, action) => {
      const { branchId } = action.payload;
      // 确保加载状态被重置
      state.loadingBranches[branchId] = false;
    });
    
    builder.addCase(sendMessage.rejected, (state, action) => {
      const { branchId } = action.meta.arg;
      state.loadingBranches[branchId] = false;
    });
  },
});

// 导出actions
export const {
  addMessage,
  removeMessage,
  clearMessages,
  setLoadingState,
} = messageSlice.actions;

// 导出reducer
export default messageSlice.reducer; 