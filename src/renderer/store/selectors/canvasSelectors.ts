import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '../index';

// 基础选择器
const selectCanvasState = (state: RootState) => state.canvas;
const selectBranchesState = (state: RootState) => state.branches;

// 获取画布变换状态
export const selectCanvasTransform = createSelector(
  [selectCanvasState],
  (canvas) => canvas.transform
);

// 获取拖拽状态
export const selectDragState = createSelector(
  [selectCanvasState],
  (canvas) => canvas.dragState
);

// 获取当前活动分支ID
export const selectActiveBranchId = createSelector(
  [selectCanvasState],
  (canvas) => canvas.activeBranchId
);

// 获取所有分支
export const selectBranches = createSelector(
  [selectBranchesState],
  (branches) => branches.branches
);

// 获取特定分支
export const selectBranchById = createSelector(
  [selectBranches, (state: RootState, branchId: string) => branchId],
  (branches, branchId) => branches[branchId]
);

// 根据会话ID获取相关分支
export const selectBranchesByConversationId = createSelector(
  [selectBranches, (state: RootState, conversationId: string) => conversationId],
  (branches, conversationId) => Object.values(branches).filter(branch => branch.conversationId === conversationId)
); 