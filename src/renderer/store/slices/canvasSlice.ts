/**
 * 画布状态相关的Redux Slice
 */
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { CanvasTransform, Position, DragState } from '../../types/models';

// 定义视口状态类型 - 记录当前可见区域
interface ViewportState {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
  scale: number;
  offsetX: number;
  offsetY: number;
}

// 定义画布状态类型
interface CanvasState {
  transform: CanvasTransform;
  dragState: DragState;
  activeBranchId: string | null;
  viewport: ViewportState;
  lastUpdateTimestamp: number;
}

// 缩放限制
const MIN_SCALE = 0.1;
const MAX_SCALE = 3.0;

// 初始状态
const initialState: CanvasState = {
  transform: {
    scale: 0.5,
    offsetX: 0,
    offsetY: 0,
  },
  dragState: {
    isDragging: false,
    target: null,
    offset: { x: 0, y: 0 },
  },
  activeBranchId: null,
  viewport: {
    minX: 0,
    minY: 0,
    maxX: 0,
    maxY: 0,
    width: 0,
    height: 0,
    scale: 0.5,
    offsetX: 0,
    offsetY: 0
  },
  lastUpdateTimestamp: Date.now()
};

// 创建Slice
const canvasSlice = createSlice({
  name: 'canvas',
  initialState,
  reducers: {
    // 设置画布变换（缩放、平移）
    setCanvasTransform: (state, action: PayloadAction<Partial<CanvasTransform>>) => {
      // 获取当前值
      const currentScale = state.transform.scale;
      const currentOffsetX = state.transform.offsetX;
      const currentOffsetY = state.transform.offsetY;
      
      // 从action.payload获取新值，使用当前值作为默认值
      let newScale = action.payload.scale !== undefined ? action.payload.scale : currentScale;
      let newOffsetX = action.payload.offsetX !== undefined ? action.payload.offsetX : currentOffsetX;
      let newOffsetY = action.payload.offsetY !== undefined ? action.payload.offsetY : currentOffsetY;
      
      // 应用缩放限制
      newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale));
      
      // 更新画布状态
      state.transform = { 
        scale: newScale, 
        offsetX: newOffsetX, 
        offsetY: newOffsetY 
      };
      
      // 更新时间戳
      state.lastUpdateTimestamp = Date.now();
    },
    
    // 重置画布视图
    resetCanvasView: (state) => {
      // 获取视口尺寸
      const { width, height } = state.viewport;
      
      // 计算居中位置 - 可以添加额外的偏移量让视图更合理
      const centerX = 0;
      const centerY = 0;
      
      // 使用较小的缩放比例 0.5
      const resetScale = 0.5;
      
      // 更新变换，将视图居中
      state.transform = {
        scale: resetScale,
        offsetX: width / 2,
        offsetY: height / 2
      };
      
      state.lastUpdateTimestamp = Date.now();
    },
    
    // 更新视口信息
    updateViewport: (state, action: PayloadAction<ViewportState>) => {
      state.viewport = action.payload;
    },
    
    // 开始拖拽
    startDragging: (state, action: PayloadAction<{ target: string; offset: Position }>) => {
      state.dragState = {
        isDragging: true,
        target: action.payload.target,
        offset: action.payload.offset,
      };
    },
    
    // 停止拖拽
    stopDragging: (state) => {
      state.dragState.isDragging = false;
    },
    
    // 设置活动分支
    setActiveBranch: (state, action: PayloadAction<string | null>) => {
      state.activeBranchId = action.payload;
    },
    
    // 更新分支位置
    updateBranchPosition: (state, action: PayloadAction<{ branchId: string; position: Position }>) => {
      // 注意：分支位置实际存储在branches状态中，这里只用于触发更新
      // 实际更新在branchSlice中处理
    },
    
    // 画布缩放到指定区域
    zoomToArea: (state, action: PayloadAction<{ 
      minX: number; 
      minY: number; 
      maxX: number; 
      maxY: number; 
      padding?: number;
      animate?: boolean;
    }>) => {
      const { minX, minY, maxX, maxY, padding = 50, animate = false } = action.payload;
      
      // 计算所选区域的宽高
      const width = maxX - minX;
      const height = maxY - minY;
      
      // 获取视口尺寸
      const viewportWidth = state.viewport.width || window.innerWidth;
      const viewportHeight = state.viewport.height || window.innerHeight;
      
      // 计算适合视口的缩放比例
      const scaleX = viewportWidth / (width + padding * 2);
      const scaleY = viewportHeight / (height + padding * 2);
      
      // 选择较小的缩放比例，确保整个区域可见
      const newScale = Math.min(scaleX, scaleY, MAX_SCALE);
      
      // 计算中心点
      const centerX = minX + width / 2;
      const centerY = minY + height / 2;
      
      // 计算新的偏移量，使区域居中
      const newOffsetX = viewportWidth / 2 - centerX * newScale;
      const newOffsetY = viewportHeight / 2 - centerY * newScale;
      
      // 更新变换
      state.transform = {
        scale: newScale,
        offsetX: newOffsetX,
        offsetY: newOffsetY
      };
      
      state.lastUpdateTimestamp = Date.now();
    }
  },
});

// 导出Actions
export const {
  setCanvasTransform,
  resetCanvasView,
  updateViewport,
  startDragging,
  stopDragging,
  setActiveBranch,
  updateBranchPosition,
  zoomToArea
} = canvasSlice.actions;

// 导出Reducer
export default canvasSlice.reducer; 