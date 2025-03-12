import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Message, MessageRole } from '../../types/models';
import { messageApi, branchApi } from '../../services/api/api';
import { setError, setLoading } from './uiSlice';

// 消息状态接口
interface MessageState {
  messages: Record<string, Message>;
  isLoading: boolean;
}

// 初始状态
const initialState: MessageState = {
  messages: {},
  isLoading: false,
};

// 异步Action: 获取分支的所有消息
export const fetchBranchMessages = createAsyncThunk(
  'messages/fetchBranchMessages',
  async (branchId: string, { dispatch }) => {
    try {
      dispatch(setLoading(true));
      const messages = await branchApi.getMessages(branchId);
      return { branchId, messages };
    } catch (error) {
      const errorMessage = (error as Error).message || `获取分支消息失败`;
      dispatch(setError(errorMessage));
      throw error;
    } finally {
      dispatch(setLoading(false));
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
      dispatch(setLoading(true));
      const result = await messageApi.send(branchId, content, role);
      return result;
    } catch (error) {
      const errorMessage = (error as Error).message || `发送消息失败`;
      dispatch(setError(errorMessage));
      throw error;
    } finally {
      dispatch(setLoading(false));
    }
  }
);

// 异步Action: 生成AI回复
export const generateAIResponse = createAsyncThunk(
  'messages/generateAIResponse',
  async (userMessage: string, { dispatch }) => {
    try {
      dispatch(setLoading(true));
      const response = await messageApi.generateAIResponse(userMessage);
      return response;
    } catch (error) {
      const errorMessage = (error as Error).message || `生成AI回复失败`;
      dispatch(setError(errorMessage));
      throw error;
    } finally {
      dispatch(setLoading(false));
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
    builder.addCase(fetchBranchMessages.pending, (state) => {
      state.isLoading = true;
    });
    builder.addCase(fetchBranchMessages.fulfilled, (state, action) => {
      state.isLoading = false;
      // 将消息添加到状态
      action.payload.messages.forEach(message => {
        state.messages[message.id] = message;
      });
    });
    builder.addCase(fetchBranchMessages.rejected, (state) => {
      state.isLoading = false;
    });
    
    // 处理sendMessage
    builder.addCase(sendMessage.pending, (state) => {
      state.isLoading = true;
    });
    builder.addCase(sendMessage.fulfilled, (state, action) => {
      state.isLoading = false;
      
      // 添加用户消息
      if (action.payload.userMessage) {
        state.messages[action.payload.userMessage.id] = action.payload.userMessage;
      }
      
      // 添加AI回复（如果有）
      if (action.payload.aiMessage) {
        state.messages[action.payload.aiMessage.id] = action.payload.aiMessage;
      }
    });
    builder.addCase(sendMessage.rejected, (state) => {
      state.isLoading = false;
    });
  },
});

// 导出actions
export const {
  addMessage,
  removeMessage,
  clearMessages,
} = messageSlice.actions;

// 导出reducer
export default messageSlice.reducer; 