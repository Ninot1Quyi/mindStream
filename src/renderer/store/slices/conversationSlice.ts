import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Conversation } from '../../types/models';
import { conversationApi } from '../../services/api/api';
import { setError, setLoading } from './uiSlice';
import { RootState } from '../index';

// 会话状态接口
interface ConversationState {
  conversations: Record<string, Conversation>;
  currentConversationId: string | null;
  isLoading: boolean;
}

// 初始状态
const initialState: ConversationState = {
  conversations: {},
  currentConversationId: null,
  isLoading: false,
};

// 异步Action: 获取所有会话
export const fetchConversations = createAsyncThunk(
  'conversations/fetchAll',
  async (_, { dispatch }) => {
    try {
      dispatch(setLoading(true));
      const conversations = await conversationApi.getAll();
      return conversations;
    } catch (error) {
      const errorMessage = (error as Error).message || '获取会话列表失败';
      dispatch(setError(errorMessage));
      throw error;
    } finally {
      dispatch(setLoading(false));
    }
  }
);

// 异步Action: 获取会话详情
export const fetchConversation = createAsyncThunk(
  'conversations/fetchOne',
  async (conversationId: string, { dispatch }) => {
    try {
      dispatch(setLoading(true));
      const response = await conversationApi.get(conversationId);
      return response;
    } catch (error) {
      const errorMessage = (error as Error).message || `获取会话 ${conversationId} 失败`;
      dispatch(setError(errorMessage));
      throw error;
    } finally {
      dispatch(setLoading(false));
    }
  }
);

// 异步Action: 获取会话详情(静默模式，不显示加载动画)
export const fetchConversationSilently = createAsyncThunk(
  'conversations/fetchOneSilently',
  async (conversationId: string, { dispatch }) => {
    try {
      // 不调用setLoading(true)，以避免显示加载动画
      const response = await conversationApi.get(conversationId);
      return response;
    } catch (error) {
      const errorMessage = (error as Error).message || `获取会话 ${conversationId} 失败`;
      dispatch(setError(errorMessage));
      throw error;
    }
  }
);

// 异步Action: 创建新会话
export const createConversation = createAsyncThunk(
  'conversations/create',
  async (title: string, { dispatch }) => {
    try {
      dispatch(setLoading(true));
      const response = await conversationApi.create(title);
      return response;
    } catch (error) {
      const errorMessage = (error as Error).message || '创建会话失败';
      dispatch(setError(errorMessage));
      throw error;
    } finally {
      dispatch(setLoading(false));
    }
  }
);

// 异步Action: 更新会话标题
export const updateConversationTitle = createAsyncThunk(
  'conversations/updateTitle',
  async ({ conversationId, title }: { conversationId: string, title: string }, { dispatch }) => {
    try {
      const updatedConversation = await conversationApi.updateTitle(conversationId, title);
      return updatedConversation;
    } catch (error) {
      const errorMessage = (error as Error).message || `更新会话标题失败`;
      dispatch(setError(errorMessage));
      throw error;
    }
  }
);

// 异步Action: 加载初始会话
export const loadInitialConversation = createAsyncThunk(
  'conversations/loadInitial',
  async (_, { dispatch, getState }) => {
    const state = getState() as RootState;
    const { conversations } = state.conversations;
    
    // 如果已有会话，加载第一个
    if (Object.keys(conversations).length > 0) {
      const firstConversationId = Object.keys(conversations)[0];
      return await dispatch(fetchConversation(firstConversationId)).unwrap();
    } else {
      // 没有会话则创建一个新会话
      return await dispatch(createConversation('新会话')).unwrap();
    }
  }
);

// 异步Action: 删除会话
export const deleteConversation = createAsyncThunk(
  'conversations/delete',
  async (conversationId: string, { dispatch }) => {
    try {
      dispatch(setLoading(true));
      const success = await conversationApi.delete(conversationId);
      if (success) {
        dispatch(clearCurrentConversation());
      }
      return { conversationId, success };
    } catch (error) {
      const errorMessage = (error as Error).message || `删除会话 ${conversationId} 失败`;
      dispatch(setError(errorMessage));
      throw error;
    } finally {
      dispatch(setLoading(false));
    }
  }
);

// 异步Action: 清空所有会话
export const clearAllConversations = createAsyncThunk(
  'conversations/clearAll',
  async (_, { dispatch }) => {
    try {
      dispatch(setLoading(true));
      const success = await conversationApi.clearAll();
      if (success) {
        dispatch(clearCurrentConversation());
      }
      return { success };
    } catch (error) {
      const errorMessage = (error as Error).message || '清空所有会话失败';
      dispatch(setError(errorMessage));
      throw error;
    } finally {
      dispatch(setLoading(false));
    }
  }
);

// 创建Slice
const conversationSlice = createSlice({
  name: 'conversations',
  initialState,
  reducers: {
    // 设置当前会话
    setCurrentConversation: (state, action: PayloadAction<string>) => {
      state.currentConversationId = action.payload;
    },
    
    // 清除当前会话
    clearCurrentConversation: (state) => {
      state.currentConversationId = null;
    },
  },
  extraReducers: (builder) => {
    // 处理fetchConversations
    builder.addCase(fetchConversations.pending, (state) => {
      state.isLoading = true;
    });
    builder.addCase(fetchConversations.fulfilled, (state, action) => {
      state.isLoading = false;
      // 转换数组为对象
      const conversationsRecord: Record<string, Conversation> = {};
      action.payload.forEach(conversation => {
        conversationsRecord[conversation.id] = conversation;
      });
      state.conversations = conversationsRecord;
    });
    builder.addCase(fetchConversations.rejected, (state) => {
      state.isLoading = false;
    });
    
    // 处理fetchConversation
    builder.addCase(fetchConversation.pending, (state) => {
      state.isLoading = true;
    });
    builder.addCase(fetchConversation.fulfilled, (state, action) => {
      state.isLoading = false;
      state.conversations[action.payload.conversation.id] = action.payload.conversation;
      state.currentConversationId = action.payload.conversation.id;
    });
    builder.addCase(fetchConversation.rejected, (state) => {
      state.isLoading = false;
    });
    
    // 处理fetchConversationSilently
    builder.addCase(fetchConversationSilently.fulfilled, (state, action) => {
      const { conversation } = action.payload;
      state.conversations[conversation.id] = conversation;
      state.currentConversationId = conversation.id;
      state.isLoading = false;
    });
    
    builder.addCase(fetchConversationSilently.rejected, (state) => {
      state.isLoading = false;
    });
    
    // 处理createConversation
    builder.addCase(createConversation.pending, (state) => {
      state.isLoading = true;
    });
    builder.addCase(createConversation.fulfilled, (state, action) => {
      state.isLoading = false;
      state.conversations[action.payload.conversation.id] = action.payload.conversation;
      state.currentConversationId = action.payload.conversation.id;
    });
    builder.addCase(createConversation.rejected, (state) => {
      state.isLoading = false;
    });
    
    // 处理updateConversationTitle
    builder.addCase(updateConversationTitle.fulfilled, (state, action) => {
      state.conversations[action.payload.id] = action.payload;
    });

    // 处理deleteConversation
    builder.addCase(deleteConversation.pending, (state) => {
      state.isLoading = true;
    });
    builder.addCase(deleteConversation.fulfilled, (state, action) => {
      state.isLoading = false;
      if (action.payload.success) {
        delete state.conversations[action.payload.conversationId];
        if (state.currentConversationId === action.payload.conversationId) {
          state.currentConversationId = null;
        }
      }
    });
    builder.addCase(deleteConversation.rejected, (state) => {
      state.isLoading = false;
    });

    // 处理clearAllConversations
    builder.addCase(clearAllConversations.pending, (state) => {
      state.isLoading = true;
    });
    builder.addCase(clearAllConversations.fulfilled, (state, action) => {
      state.isLoading = false;
      if (action.payload.success) {
        state.conversations = {};
        state.currentConversationId = null;
      }
    });
    builder.addCase(clearAllConversations.rejected, (state) => {
      state.isLoading = false;
    });
  },
});

// 导出actions
export const {
  setCurrentConversation,
  clearCurrentConversation,
} = conversationSlice.actions;

// 导出reducer
export default conversationSlice.reducer; 