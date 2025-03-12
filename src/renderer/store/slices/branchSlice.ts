import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Branch, Position } from '../../types/models';
import { branchApi } from '../../services/api/api';
import { setError, setLoading } from './uiSlice';
import { RootState } from '../index';

// 分支状态接口
interface BranchState {
  branches: Record<string, Branch>;
  isLoading: boolean;
}

// 初始状态
const initialState: BranchState = {
  branches: {},
  isLoading: false,
};

// 定义创建分支的返回类型
interface BranchResponse {
  branch: Branch;
}

// 异步Action: 获取分支
export const fetchBranch = createAsyncThunk(
  'branches/fetchOne',
  async (branchId: string, { dispatch }) => {
    try {
      dispatch(setLoading(true));
      const branch = await branchApi.get(branchId);
      return branch;
    } catch (error) {
      const errorMessage = (error as Error).message || `获取分支 ${branchId} 失败`;
      dispatch(setError(errorMessage));
      throw error;
    } finally {
      dispatch(setLoading(false));
    }
  }
);

// 异步Action: 创建分支
export const createBranch = createAsyncThunk<BranchResponse, {
  parentBranchId?: string;
  parentMessageId?: string; 
  name: string;
  position?: Position;
  isRoot?: boolean;
}>(
  'branches/create',
  async (
    { 
      parentBranchId, 
      parentMessageId,
      name,
      position,
      isRoot = false
    }, 
    { dispatch, getState }
  ) => {
    try {
      console.log('创建分支action开始执行', { parentBranchId, name, position, isRoot });
      dispatch(setLoading(true));
      
      // 如果是根节点或没有提供父分支ID，直接创建
      if (isRoot || !parentBranchId) {
        console.log('创建根节点分支', { name, position });
        // 调用API创建根节点
        const rootBranch = await branchApi.createRoot(name, position);
        console.log('根节点分支创建成功', rootBranch);
        
        // 确保返回统一的格式 { branch: { ... } }
        if (rootBranch && typeof rootBranch === 'object') {
          if ('branch' in rootBranch) {
            return rootBranch as BranchResponse;
          } else {
            return { branch: rootBranch as Branch };
          }
        }
        throw new Error('创建根节点分支失败: 返回数据无效');
      }
      
      // 尝试获取父分支信息
      const state = getState() as RootState;
      const branches = state.branches.branches;
      
      console.log('当前Redux状态中的分支数据:', Object.keys(branches));
      console.log('尝试查找父分支:', parentBranchId);
      
      const parentBranch = branches[parentBranchId];
      
      if (!parentBranch) {
        // 如果在Redux状态中找不到父分支，尝试从API获取
        console.warn(`Redux状态中未找到父分支 ${parentBranchId}，尝试从API获取`);
        try {
          const fetchedBranch = await branchApi.get(parentBranchId);
          if (fetchedBranch) {
            console.log('从API成功获取到父分支:', fetchedBranch);
            // 继续创建分支
            const branch = await branchApi.create(parentBranchId, parentMessageId, name, position);
            
            // 确保返回统一的格式 { branch: { ... } }
            if (branch && typeof branch === 'object') {
              if ('branch' in branch) {
                return branch as BranchResponse;
              } else {
                return { branch: branch as Branch };
              }
            }
            throw new Error('创建分支失败: 返回数据无效');
          } else {
            throw new Error(`API也无法找到父分支 ${parentBranchId}`);
          }
        } catch (error) {
          console.error(`获取父分支 ${parentBranchId} 失败:`, error);
          throw new Error(`无法找到指定的父分支，请刷新页面后重试`);
        }
      }
      
      console.log('找到父分支，创建子节点分支', { parentBranchId, name, position });
      // 调用API创建常规分支
      const branch = await branchApi.create(parentBranchId, parentMessageId, name, position);
      
      // 确保返回统一的格式 { branch: { ... } }
      if (branch && typeof branch === 'object') {
        if ('branch' in branch) {
          return branch as BranchResponse;
        } else {
          return { branch: branch as Branch };
        }
      }
      throw new Error('创建分支失败: 返回数据无效');
    } catch (error) {
      console.error('创建分支action执行失败', error);
      const errorMessage = (error as Error).message || '创建分支失败';
      dispatch(setError(errorMessage));
      throw error;
    } finally {
      dispatch(setLoading(false));
    }
  }
);

// 异步Action: 更新分支
export const updateBranch = createAsyncThunk(
  'branches/update',
  async (
    {
      branchId,
      updates
    }: {
      branchId: string;
      updates: { title?: string; position?: Position; width?: number; height?: number };
    },
    { dispatch }
  ) => {
    try {
      const updatedBranch = await branchApi.update(branchId, updates);
      return updatedBranch;
    } catch (error) {
      const errorMessage = (error as Error).message || `更新分支 ${branchId} 失败`;
      dispatch(setError(errorMessage));
      throw error;
    }
  }
);

// 异步Action: 更新分支位置
export const updateBranchPosition = createAsyncThunk(
  'branches/updatePosition',
  async (
    {
      branchId,
      position
    }: {
      branchId: string;
      position: Position;
    },
    { dispatch }
  ) => {
    try {
      const updatedBranch = await branchApi.update(branchId, { position });
      return updatedBranch;
    } catch (error) {
      const errorMessage = (error as Error).message || `更新分支位置失败`;
      dispatch(setError(errorMessage));
      throw error;
    }
  }
);

// 异步Action: 删除分支
export const deleteBranch = createAsyncThunk(
  'branches/delete',
  async (branchId: string, { dispatch }) => {
    try {
      dispatch(setLoading(true));
      const success = await branchApi.delete(branchId);
      return { branchId, success };
    } catch (error) {
      const errorMessage = (error as Error).message || `删除分支失败`;
      dispatch(setError(errorMessage));
      throw error;
    } finally {
      dispatch(setLoading(false));
    }
  }
);

// 异步Action: 创建多个分支
export const createMultipleChildBranches = createAsyncThunk(
  'branches/createMultiple',
  async (
    { 
      parentBranchId, 
      count = 2,
      positions
    }: { 
      parentBranchId: string; 
      count: number;
      positions?: Position[]; 
    }, 
    { dispatch, getState }
  ) => {
    try {
      dispatch(setLoading(true));
      
      // 如果未提供位置，则可以使用状态中现有分支的位置来计算新位置
      const branches: Branch[] = [];
      
      for (let i = 0; i < count; i++) {
        const position = positions && positions[i] ? positions[i] : undefined;
        const branchName = `分支 ${i + 1}`;
        
        // 创建单个分支
        const branch = await branchApi.create(parentBranchId, undefined, branchName, position);
        branches.push(branch);
      }
      
      return branches;
    } catch (error) {
      const errorMessage = (error as Error).message || '创建多个分支失败';
      dispatch(setError(errorMessage));
      throw error;
    } finally {
      dispatch(setLoading(false));
    }
  }
);

// 异步Action: 从特定消息创建分支
export const createBranchFromMessage = createAsyncThunk(
  'branches/createFromMessage',
  async (
    { 
      parentBranchId, 
      messageId,
      name,
      position
    }: { 
      parentBranchId: string; 
      messageId: string;
      name?: string;
      position?: Position;
    }, 
    { dispatch }
  ) => {
    try {
      dispatch(setLoading(true));
      const branchName = name || '新分支';
      const branch = await branchApi.create(parentBranchId, messageId, branchName, position);
      return branch;
    } catch (error) {
      const errorMessage = (error as Error).message || '从消息创建分支失败';
      dispatch(setError(errorMessage));
      throw error;
    } finally {
      dispatch(setLoading(false));
    }
  }
);

// 创建Slice
const branchSlice = createSlice({
  name: 'branches',
  initialState,
  reducers: {
    // 本地更新分支位置（不发送API请求）
    updateBranchPositionLocal: (state, action: PayloadAction<{ branchId: string; position: Position }>) => {
      const { branchId, position } = action.payload;
      if (state.branches[branchId]) {
        state.branches[branchId].position = position;
      }
    },
    
    // 直接设置分支数据（用于在会话切换时快速更新）
    setBranch: (state, action: PayloadAction<Branch>) => {
      const branch = action.payload;
      if (branch && branch.id) {
        state.branches[branch.id] = branch;
      }
    },
    
    // 清空所有分支数据（用于会话切换时）
    clearAll: (state) => {
      state.branches = {};
      state.isLoading = false;
    },
  },
  extraReducers: (builder) => {
    // 处理fetchBranch
    builder.addCase(fetchBranch.pending, (state) => {
      state.isLoading = true;
    });
    builder.addCase(fetchBranch.fulfilled, (state, action) => {
      state.isLoading = false;
      state.branches[action.payload.id] = action.payload;
    });
    builder.addCase(fetchBranch.rejected, (state) => {
      state.isLoading = false;
    });
    
    // 处理createBranch
    builder.addCase(createBranch.pending, (state) => {
      state.isLoading = true;
    });
    builder.addCase(createBranch.fulfilled, (state, action) => {
      state.isLoading = false;
      state.branches[action.payload.branch.id] = action.payload.branch;
    });
    builder.addCase(createBranch.rejected, (state) => {
      state.isLoading = false;
    });
    
    // 处理updateBranch
    builder.addCase(updateBranch.fulfilled, (state, action) => {
      state.branches[action.payload.id] = action.payload;
    });
    
    // 处理updateBranchPosition
    builder.addCase(updateBranchPosition.fulfilled, (state, action) => {
      state.branches[action.payload.id] = action.payload;
    });
    
    // 处理deleteBranch
    builder.addCase(deleteBranch.fulfilled, (state, action) => {
      if (action.payload.success) {
        delete state.branches[action.payload.branchId];
      }
    });
    
    // 处理createMultipleChildBranches
    builder.addCase(createMultipleChildBranches.pending, (state) => {
      state.isLoading = true;
    });
    builder.addCase(createMultipleChildBranches.fulfilled, (state, action) => {
      state.isLoading = false;
      // 将创建的分支添加到状态
      action.payload.forEach(branch => {
        state.branches[branch.id] = branch;
      });
    });
    builder.addCase(createMultipleChildBranches.rejected, (state) => {
      state.isLoading = false;
    });
    
    // 处理createBranchFromMessage
    builder.addCase(createBranchFromMessage.pending, (state) => {
      state.isLoading = true;
    });
    builder.addCase(createBranchFromMessage.fulfilled, (state, action) => {
      state.isLoading = false;
      state.branches[action.payload.id] = action.payload;
    });
    builder.addCase(createBranchFromMessage.rejected, (state) => {
      state.isLoading = false;
    });
  },
});

// 导出actions
export const {
  updateBranchPositionLocal,
  setBranch,
  clearAll
} = branchSlice.actions;

// 导出reducer
export default branchSlice.reducer; 