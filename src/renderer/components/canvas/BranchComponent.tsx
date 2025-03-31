import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import styled from 'styled-components';
import { Button, Tooltip } from 'antd';
import { 
  BranchesOutlined, 
  EditOutlined, 
  DeleteOutlined,
  FullscreenOutlined,
  LinkOutlined
} from '@ant-design/icons';
import { AnyAction } from '@reduxjs/toolkit';
import { Branch, Message, Position, Size } from '../../types/models';
import { selectMessagesByBranchId, selectBranchLoadingState } from '../../store/selectors/messageSelectors';
import { selectCanvasTransform } from '../../store/selectors/canvasSelectors';
import { openModal } from '../../store/slices/uiSlice';
import { setActiveBranch } from '../../store/slices/canvasSlice';
import { updateBranch, updateBranchPosition, updateBranchPositionLocal } from '../../store/slices/branchSlice';
import { RootState } from '../../store';
import MessageComponent from './MessageComponent';
import MessageInput from './MessageInput';
import useAppSelector from '../../hooks/useAppSelector';
import { debounce } from 'lodash';
import { AppDispatch } from '../../store';
import { fetchBranchMessages } from '../../store/slices/messageSlice';

interface BranchComponentProps {
  branch: Branch;
  isActive: boolean;
  onPositionChange: (position: Position) => void;
  onSizeChange?: (width: number, height: number) => void;
  onDoubleClick?: () => void;
  onDelete?: (branchId: string) => void;
  onFullscreen?: (branchId: string) => void;
  onConnect?: (branchId: string) => void;
}

// 调整大小模式
type ResizeMode = 'top' | 'right' | 'bottom' | 'left' | 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight' | null;

const BranchContainer = styled.div<{ isActive: boolean, position?: Position }>`
  position: absolute;
  width: 320px;
  min-height: 300px;
  background-color: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  border: 1px solid rgba(240, 240, 240, 0.8);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.03);
  overflow: hidden;
  transition: all 0.3s;
  transform-origin: 0 0;
  pointer-events: auto;
  z-index: 1;
  left: ${props => props.position?.x || 0}px;
  top: ${props => props.position?.y || 0}px;
  backdrop-filter: blur(4px);
  clip-path: inset(0 0 0 0);
  
  &:hover {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
    border-color: rgba(220, 220, 220, 0.9);
  }
  
  &.dragging {
    opacity: 0.92;
    cursor: grabbing;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
    z-index: 100;
  }
  
  &.resizing {
    opacity: 0.95;
    user-select: none;
    z-index: 100;
    border-style: dashed;
    border-color: rgba(122, 160, 230, 0.5);
  }
`;

const BranchHeader = styled.div`
  padding: 12px 16px;
  background-color: rgba(255, 255, 255, 0.8);
  border-bottom: 1px solid rgba(245, 245, 245, 0.8);
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: move;
  user-select: none;
  position: relative;
  height: 50px;
  
  &:hover {
    background-color: rgba(250, 250, 250, 0.9);
    
    .branch-actions {
      opacity: 1;
    }
  }
  
  .branch-title {
    font-weight: 500;
    font-size: 16px;
    color: #333;
    flex: 0 1 auto;
    overflow: hidden;
    margin: 0;
    outline: none;
    white-space: nowrap;
    position: relative;
    
    /* Custom editing style */
    &::after {
      content: '';
      position: absolute;
      left: 0;
      bottom: 0;
      height: 2px;
      background-color: rgba(200, 200, 200, 0.5);
      width: 0;
      transition: width 0.3s ease;
    }
    
    &:focus::after {
      width: 100%;
    }
    
    /* Remove default selection */
    &::selection {
      background-color: transparent;
    }
  }
  
  .branch-actions {
    display: flex;
    gap: 8px;
    opacity: 0.4;
    transition: opacity 0.3s;
    
    button {
      opacity: 0.75;
      transition: all 0.2s;
      
      &:hover {
        opacity: 1;
        background-color: rgba(245, 245, 245, 0.8);
        color: var(--primary-color, #4a86e8);
      }
    }
  }
`;

const BranchTitle = styled.div`
  font-weight: 500;
  font-size: 14px;
  color: var(--header-color, #5f6368);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
`;

const BranchActions = styled.div`
  display: flex;
  gap: 4px;
`;

const BranchContent = styled.div`
  display: flex;
  flex-direction: column;
  height: calc(100% - 50px);
  overflow: hidden;
  position: relative;
  background-color: transparent;
`;

const MessagesContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 10px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const MessageWrapper = styled.div<{ role: string }>`
  display: flex;
  justify-content: ${props => props.role === 'user' ? 'flex-end' : 'flex-start'};
  width: 100%;
  margin: 4px 0;
`;

const InputContainer = styled.div`
  padding: 0 12px 6px;
  background-color: transparent;
  display: flex;
  justify-content: center;
  align-items: flex-end;
  min-height: 40px;
  position: relative;
  margin-bottom: 2px;
  z-index: 1;
  
  &::after {
    content: '';
    position: absolute;
    bottom: 2px;
    left: 50%;
    transform: translateX(-50%);
    width: 36px;
    height: 5px;
    border-radius: 20px;
    background-color: transparent;
    z-index: -1;
    transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);
  }
`;

const EmptyMessage = styled.div`
  text-align: center;
  padding: 20px;
  color: var(--light-text, #70757a);
  font-style: italic;
`;

// 节点内部加载指示器
const NodeLoadingIndicator = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px;
  margin: 10px 0;
  align-self: flex-start;
  
  .loading-container {
    position: relative;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .loading-spinner {
    width: 24px;
    height: 24px;
    border: 3px solid rgba(74, 134, 232, 0.2);
    border-radius: 50%;
    border-top-color: var(--primary-color, rgba(74, 134, 232, 0.8));
    animation: node-spinner 1.2s linear infinite;
  }
  
  .loading-pulse {
    position: absolute;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background-color: rgba(74, 134, 232, 0.05);
    animation: pulse-animation 1.5s ease-in-out infinite;
  }
  
  .loading-text {
    margin-top: 12px;
    font-size: 13px;
    color: var(--light-text, #70757a);
    display: flex;
    align-items: center;
  }
  
  .loading-dots {
    display: inline-flex;
    margin-left: 3px;
  }
  
  .dot {
    width: 4px;
    height: 4px;
    margin: 0 2px;
    border-radius: 50%;
    background-color: var(--light-text, #70757a);
    opacity: 0.7;
  }
  
  .dot:nth-child(1) {
    animation: dot-animation 1.5s infinite ease-in-out;
  }
  
  .dot:nth-child(2) {
    animation: dot-animation 1.5s infinite ease-in-out 0.3s;
  }
  
  .dot:nth-child(3) {
    animation: dot-animation 1.5s infinite ease-in-out 0.6s;
  }
  
  @keyframes node-spinner {
    to {
      transform: rotate(360deg);
    }
  }
  
  @keyframes pulse-animation {
    0% {
      transform: scale(0.8);
      opacity: 0.3;
    }
    50% {
      transform: scale(1.2);
      opacity: 0.5;
    }
    100% {
      transform: scale(0.8);
      opacity: 0.3;
    }
  }
  
  @keyframes dot-animation {
    0%, 100% {
      opacity: 0.4;
      transform: scale(0.8);
    }
    50% {
      opacity: 1;
      transform: scale(1.2);
    }
  }
`;

// 修改调整大小手柄，支持四个边和四个角，定位在内侧
const ResizeHandle = styled.div<{ visible: boolean, position: string }>`
  position: absolute;
  background-color: transparent;
  border-radius: 0;
  opacity: 0;
  transition: opacity 0.2s;
  z-index: 10;
  pointer-events: auto;
  
  ${props => {
    switch (props.position) {
      // 角的样式 - 放置在内侧
      case 'topLeft':
        return `
          top: 0;
          left: 0;
          width: 12px;
          height: 12px;
          cursor: nwse-resize;
        `;
      case 'topRight':
        return `
          top: 0;
          right: 0;
          width: 12px;
          height: 12px;
          cursor: nesw-resize;
        `;
      case 'bottomLeft':
        return `
          bottom: 0;
          left: 0;
          width: 12px;
          height: 12px;
          cursor: nesw-resize;
        `;
      case 'bottomRight':
        return `
          bottom: 0;
          right: 0;
          width: 12px;
          height: 12px;
          cursor: nwse-resize;
        `;
      // 边的样式 - 放置在内侧
      case 'top':
        return `
          top: 0;
          left: 12px;
          right: 12px;
          height: 6px;
          cursor: ns-resize;
        `;
      case 'right':
        return `
          top: 12px;
          right: 0;
          width: 6px;
          bottom: 12px;
          cursor: ew-resize;
        `;
      case 'bottom':
        return `
          bottom: 0;
          left: 12px;
          right: 12px;
          height: 6px;
          cursor: ns-resize;
        `;
      case 'left':
        return `
          top: 12px;
          left: 0;
          width: 6px;
          bottom: 12px;
          cursor: ew-resize;
        `;
      default:
        return '';
    }
  }}
  
  ${BranchContainer}:hover & {
    opacity: ${props => props.visible ? 1 : 0};
  }
`;

// 各个控制点的大小约束
const MIN_WIDTH = 240;
const MAX_WIDTH = 800;
const MIN_HEIGHT = 300;
const MAX_HEIGHT = 1000;

const BranchComponent: React.FC<BranchComponentProps> = ({ 
  branch, 
  isActive,
  onPositionChange,
  onSizeChange,
  onDoubleClick,
  onDelete,
  onFullscreen,
  onConnect
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const { scale, offsetX, offsetY } = useAppSelector(selectCanvasTransform);
  const messages = useAppSelector((state: RootState) => selectMessagesByBranchId(state, branch.id));
  const isLoading = useAppSelector((state: RootState) => selectBranchLoadingState(state, branch.id));
  
  // 使用ref存储当前世界坐标位置
  const currentPositionRef = useRef<Position>(branch.position);
  
  // 拖动状态
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 });
  
  // 添加一个ref来跟踪canvas是否正在被拖动
  const isCanvasDraggingRef = useRef(false);
  
  // 调整大小状态
  const [isResizing, setIsResizing] = useState(false);
  const [resizeMode, setResizeMode] = useState<ResizeMode>(null);
  const [initialMousePos, setInitialMousePos] = useState<Position>({ x: 0, y: 0 });
  const [initialPosition, setInitialPosition] = useState<Position>({ x: 0, y: 0 });
  const [initialSize, setInitialSize] = useState<Size>({ width: 0, height: 0 });
  const [currentSize, setCurrentSize] = useState<Size>({ 
    width: branch.width || 320, 
    height: branch.height || 300 
  });
  
  // 标题编辑状态
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  
  // 用于限制更新频率
  const dragLastUpdateTime = useRef<number | null>(null);
  const resizeLastUpdateTime = useRef<number | null>(null);

  // 添加内容引用
  const contentRef = useRef<HTMLDivElement>(null);
  
  // 添加拖拽和缩放相关的状态
  const [resizeStartPosition, setResizeStartPosition] = useState<Position | null>(null);
  const [resizeStartSize, setResizeStartSize] = useState<Size>({ width: 0, height: 0 });
  
  // 更新CSS变量以应用世界坐标
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.style.setProperty('--world-x', `${branch.position.x}px`);
      containerRef.current.style.setProperty('--world-y', `${branch.position.y}px`);
      containerRef.current.style.setProperty('--canvas-scale', scale.toString());
    }
  }, [branch.position.x, branch.position.y, scale]);

  // 处理拖动开始
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button === 2) return; // 忽略右键点击
    e.stopPropagation();

    if (e.detail === 2 && onDoubleClick) {
      onDoubleClick();
      return;
    }

    const target = e.target;
    if (!(target instanceof Element)) return;
    
    // 如果点击的是操作按钮区域，不处理拖动
    if (target.closest('.branch-actions')) return;
    
    // 只有点击标题栏才能拖动
    const header = target.closest('.branch-header');
    if (!header) return;

    setIsDragging(true);
    
    // 获取画布容器
    const canvasContainer = document.getElementById('canvas-container');
    if (!canvasContainer) return;
    
    const canvasRect = canvasContainer.getBoundingClientRect();
    const branchRect = containerRef.current?.getBoundingClientRect();
    
    if (!branchRect) return;
    
    // 计算鼠标在画布坐标系中的位置
    const mouseCanvasX = (e.clientX - canvasRect.left - offsetX) / scale;
    const mouseCanvasY = (e.clientY - canvasRect.top - offsetY) / scale;
    
    // 计算节点在画布坐标系中的位置
    const nodeCanvasX = branch.position.x;
    const nodeCanvasY = branch.position.y;
    
    // 计算鼠标相对于节点的偏移（画布坐标系）
    const dragOffsetX = mouseCanvasX - nodeCanvasX;
    const dragOffsetY = mouseCanvasY - nodeCanvasY;
    
    setDragOffset({ x: dragOffsetX, y: dragOffsetY });
    
    if (containerRef.current) {
      containerRef.current.classList.add('dragging');
    }
    
    console.log('开始拖动节点', {
      mouseCanvas: { x: mouseCanvasX, y: mouseCanvasY },
      nodeCanvas: { x: nodeCanvasX, y: nodeCanvasY },
      offset: { x: dragOffsetX, y: dragOffsetY },
      scale
    });
  }, [branch.position, scale, offsetX, offsetY, onDoubleClick]);

  // 处理拖动
  const handleDrag = useCallback((e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;

    const canvasContainer = document.getElementById('canvas-container');
    if (!canvasContainer) return;
    
    const canvasRect = canvasContainer.getBoundingClientRect();
    
    // 计算鼠标在画布坐标系中的位置
    const mouseCanvasX = (e.clientX - canvasRect.left - offsetX) / scale;
    const mouseCanvasY = (e.clientY - canvasRect.top - offsetY) / scale;
    
    // 计算节点的新位置（画布坐标系）
    const newX = mouseCanvasX - dragOffset.x;
    const newY = mouseCanvasY - dragOffset.y;
    
    // 更新节点位置
    containerRef.current.style.left = `${newX}px`;
    containerRef.current.style.top = `${newY}px`;
    
    // 更新当前位置引用
    currentPositionRef.current = { x: newX, y: newY };
    
    if (!dragLastUpdateTime.current || Date.now() - dragLastUpdateTime.current > 100) {
      dragLastUpdateTime.current = Date.now();
      console.log('拖动节点', {
        mouseCanvas: { x: mouseCanvasX, y: mouseCanvasY },
        newPosition: { x: newX, y: newY },
        scale,
        offset: { x: offsetX, y: offsetY }
      });
    }
  }, [isDragging, dragOffset, scale, offsetX, offsetY]);

  // 修改调整大小的处理函数，处理多个方向
  const handleResizeStart = useCallback((e: React.MouseEvent<HTMLDivElement>, mode: ResizeMode) => {
    e.stopPropagation();
    
    // 设置调整模式
    setResizeMode(mode);
    setIsResizing(true);
    
    // 设置初始鼠标位置
    const mouseX = e.clientX;
    const mouseY = e.clientY;
    setResizeStartPosition({ x: mouseX, y: mouseY });
    setResizeStartSize({ ...currentSize });
    
    if (containerRef.current) {
      containerRef.current.classList.add('resizing');
    }
    
    // 根据模式设置光标
    document.body.style.cursor = getResizeCursor(mode);
    
  }, [currentSize]);

  // 修改调整大小的函数来处理多个方向
  const handleResize = useCallback((e: MouseEvent) => {
    if (!isResizing || !resizeStartPosition || !containerRef.current || !resizeMode) return;
    
    const deltaX = (e.clientX - resizeStartPosition.x) / scale;
    const deltaY = (e.clientY - resizeStartPosition.y) / scale;
    
    let newWidth = resizeStartSize.width;
    let newHeight = resizeStartSize.height;
    let newLeft = branch.position.x;
    let newTop = branch.position.y;
    
    // 根据拉伸模式应用不同的逻辑
    if (resizeMode === 'right' || resizeMode === 'topRight' || resizeMode === 'bottomRight') {
      // 向右拉伸 - 增加宽度
      newWidth = Math.max(MIN_WIDTH, resizeStartSize.width + deltaX);
    }
    
    if (resizeMode === 'left' || resizeMode === 'topLeft' || resizeMode === 'bottomLeft') {
      // 向左拉伸 - 调整位置和宽度
      const possibleWidth = Math.max(MIN_WIDTH, resizeStartSize.width - deltaX);
      if (possibleWidth !== resizeStartSize.width) {
        newLeft = branch.position.x + (resizeStartSize.width - possibleWidth);
        newWidth = possibleWidth;
      }
    }
    
    if (resizeMode === 'bottom' || resizeMode === 'bottomLeft' || resizeMode === 'bottomRight') {
      // 向下拉伸 - 增加高度
      newHeight = Math.max(MIN_HEIGHT, resizeStartSize.height + deltaY);
    }
    
    if (resizeMode === 'top' || resizeMode === 'topLeft' || resizeMode === 'topRight') {
      // 向上拉伸 - 调整位置和高度
      const possibleHeight = Math.max(MIN_HEIGHT, resizeStartSize.height - deltaY);
      if (possibleHeight !== resizeStartSize.height) {
        newTop = branch.position.y + (resizeStartSize.height - possibleHeight);
        newHeight = possibleHeight;
      }
    }
    
    // 限制最大尺寸
    newWidth = Math.min(newWidth, MAX_WIDTH);
    newHeight = Math.min(newHeight, MAX_HEIGHT);
    
    // 更新当前大小和位置
    setCurrentSize((prevSize: Size) => ({
      ...prevSize,
      width: newWidth,
      height: newHeight
    }));
    
    // 更新样式
    containerRef.current.style.width = `${newWidth}px`;
    containerRef.current.style.height = `${newHeight}px`;
    containerRef.current.style.left = `${newLeft}px`;
    containerRef.current.style.top = `${newTop}px`;
    
    // 更新当前位置
    currentPositionRef.current = { x: newLeft, y: newTop };
    
  }, [isResizing, resizeStartPosition, resizeStartSize, scale, resizeMode, branch.position]);

  // 修改鼠标抬起处理
  const handleMouseUp = useCallback(() => {
    if (isDragging || isResizing) {
      if (isResizing) {
        const finalWidth = Math.min(Math.max(currentSize.width, MIN_WIDTH), MAX_WIDTH);
        const finalHeight = Math.min(Math.max(currentSize.height, MIN_HEIGHT), MAX_HEIGHT);
        
        // 更新分支的大小和位置
        dispatch(updateBranch({
          branchId: branch.id,
          updates: {
            width: finalWidth,
            height: finalHeight,
            position: currentPositionRef.current
          }
        }) as any);
        
        // 通知父组件尺寸变化
        if (onSizeChange) {
          onSizeChange(finalWidth, finalHeight);
        }
        
        // 通知父组件位置变化
        onPositionChange(currentPositionRef.current);
      } else if (isDragging) {
        // 如果是拖动，则更新位置状态
        if (currentPositionRef.current) {
          dispatch(updateBranchPosition({
            branchId: branch.id,
            position: currentPositionRef.current
          }));
          
          // 通知父组件位置变化
          onPositionChange(currentPositionRef.current);
        }
      }
      
      // 重置状态
      setIsDragging(false);
      setIsResizing(false);
      setResizeMode(null);
      document.body.style.cursor = 'default';
      
      if (containerRef.current) {
        containerRef.current.classList.remove('dragging', 'resizing');
      }
    }
  }, [branch.id, currentSize, dispatch, isDragging, isResizing, onPositionChange, onSizeChange]);

  // 处理分支点击，设置为活动分支
  const handleBranchClick = useCallback(() => {
    if (!isActive && !isResizing && !isDragging) {
      dispatch(setActiveBranch(branch.id));
    }
  }, [branch.id, dispatch, isActive, isResizing, isDragging]);
  
  // 处理点击标题，开始编辑
  const handleTitleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isEditingTitle) {
      setIsEditingTitle(true);
      // 使用setTimeout确保状态更新后再聚焦
      setTimeout(() => {
        if (titleRef.current) {
          titleRef.current.focus();
          // 选中所有文本
          const selection = window.getSelection();
          const range = document.createRange();
          range.selectNodeContents(titleRef.current);
          selection?.removeAllRanges();
          selection?.addRange(range);
        }
      }, 0);
    }
  }, [isEditingTitle]);
  
  // 处理标题编辑结束
  const handleTitleBlur = useCallback(() => {
    if (isEditingTitle && titleRef.current) {
      const newTitle = titleRef.current.textContent || '主分支';
      // 如果标题有变化，则更新
      if (newTitle !== branch.title) {
        dispatch(updateBranch({
          branchId: branch.id,
          updates: { title: newTitle }
        }) as any);
      }
      setIsEditingTitle(false);
    }
  }, [branch.id, branch.title, dispatch, isEditingTitle]);
  
  // 处理键盘事件，支持按Enter完成编辑
  const handleTitleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (titleRef.current) {
        titleRef.current.blur();
      }
    }
  }, []);
  
  // 处理创建分支
  const handleCreateBranch = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch(openModal('create-branch'));
    
    // 存储父分支ID
    sessionStorage.setItem('createBranchData', JSON.stringify({
      parentBranchId: branch.id
    }));
  }, [branch.id, dispatch]);
  
  // 处理删除
  const handleDelete = useCallback((e: React.MouseEvent) => {
    console.log('点击删除按钮，分支ID:', branch.id);
    e.stopPropagation();
    onDelete?.(branch.id);
  }, [branch.id, onDelete]);
  
  // 处理全屏
  const handleFullscreen = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onFullscreen?.(branch.id);
  }, [branch.id, onFullscreen]);
  
  // 处理连接
  const handleConnect = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onConnect?.(branch.id);
  }, [branch.id, onConnect]);
  
  // 修改渲染调整大小手柄的函数，渲染所有边和角
  const renderResizeHandles = () => {
    // 添加所有八个调整位置
    const handles = ['topLeft', 'top', 'topRight', 'right', 'bottomRight', 'bottom', 'bottomLeft', 'left'];
    return handles.map(position => (
      <ResizeHandle 
        key={position}
        position={position}
        visible={isActive}
        onMouseDown={(e) => handleResizeStart(e, position as ResizeMode)}
      />
    ));
  };

  // 获取调整大小模式对应的鼠标样式
  function getResizeCursor(mode: ResizeMode): string {
    switch (mode) {
      case 'top':
      case 'bottom':
        return 'ns-resize';
      case 'left':
      case 'right':
        return 'ew-resize';
      case 'topLeft':
      case 'bottomRight':
        return 'nwse-resize';
      case 'topRight':
      case 'bottomLeft':
        return 'nesw-resize';
      default:
        return 'default';
    }
  }

  // 更新全局鼠标事件监听
  useEffect(() => {
    if (!isDragging && !isResizing) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        handleDrag(e);
      } else if (isResizing) {
        handleResize(e);
      }
    };
    
    const handleMouseUpEvent = (e: MouseEvent) => {
      handleMouseUp();
    };
    
    const handleKeyEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isDragging) {
          // 取消拖动，恢复原位置
          if (containerRef.current) {
            containerRef.current.style.left = `${branch.position.x}px`;
            containerRef.current.style.top = `${branch.position.y}px`;
            containerRef.current.classList.remove('dragging');
          }
          setIsDragging(false);
        }
        
        if (isResizing) {
          handleMouseUp();
        }
      }
    };
    
    // 添加事件监听器
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUpEvent);
    window.addEventListener('keydown', handleKeyEscape);
    
    // 清理函数
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUpEvent);
      window.removeEventListener('keydown', handleKeyEscape);
    };
  }, [isDragging, isResizing, handleDrag, handleResize, handleMouseUp, branch.position]);

  // 渲染消息列表 - 使用useMemo优化，避免不必要的重新渲染
  const renderedMessages = useMemo(() => {
    if (!messages || messages.length === 0) {
      return null;
    }
    return messages.map((message: Message) => (
      <MessageWrapper key={message.id} role={message.role}>
        <MessageComponent message={message} />
      </MessageWrapper>
    ));
  }, [messages]);

  // 加载分支消息 - 移除拖动条件
  useEffect(() => {
    const loadMessages = async () => {
      if (branch.id) {
        try {
          await dispatch(fetchBranchMessages(branch.id)).unwrap();
        } catch (error) {
          console.error('Failed to fetch messages:', error);
        }
      }
    };

    loadMessages();
  }, [branch.id, dispatch]);

  // 监听新消息添加 - 优化滚动逻辑
  useEffect(() => {
    const handleNewMessage = () => {
      if (messagesContainerRef.current) {
        const container = messagesContainerRef.current;
        // 总是滚动到底部以显示新消息
        requestAnimationFrame(() => {
          container.scrollTo({
            top: container.scrollHeight,
            behavior: 'smooth'
          });
        });
      }
    };

    // 添加消息监听器
    window.addEventListener('new-message', handleNewMessage);
    
    return () => {
      window.removeEventListener('new-message', handleNewMessage);
    };
  }, []);

  // 自动滚动到最新消息 - 优化滚动逻辑
  useEffect(() => {
    if (messages.length > 0) {
      const scrollToBottom = () => {
        if (messagesContainerRef.current) {
          const container = messagesContainerRef.current;
          const scrollHeight = container.scrollHeight;
          const height = container.clientHeight;
          const maxScroll = scrollHeight - height;
          
          // 使用平滑滚动
          container.scrollTo({
            top: maxScroll,
            behavior: 'smooth'
          });
        }
      };

      // 使用 requestAnimationFrame 确保在 DOM 更新后执行滚动
      requestAnimationFrame(scrollToBottom);
    }
  }, [messages]); // 只依赖消息列表变化

  // 监听canvas拖动状态
  useEffect(() => {
    const handleCanvasDragStart = () => {
      isCanvasDraggingRef.current = true;
    };
    
    const handleCanvasDragEnd = () => {
      isCanvasDraggingRef.current = false;
    };
    
    // 添加自定义事件监听
    window.addEventListener('canvas-drag-start', handleCanvasDragStart);
    window.addEventListener('canvas-drag-end', handleCanvasDragEnd);
    
    return () => {
      window.removeEventListener('canvas-drag-start', handleCanvasDragStart);
      window.removeEventListener('canvas-drag-end', handleCanvasDragEnd);
    };
  }, []);

  return (
    <BranchContainer
      ref={containerRef}
      isActive={isActive}
      position={currentPositionRef.current}
      style={{
        width: currentSize.width || 320,
        height: currentSize.height || 'auto',
        cursor: isDragging ? 'grabbing' : isResizing ? getResizeCursor(resizeMode) : 'default',
        transition: isResizing ? 'none' : 'box-shadow 0.3s, transform 0.1s, border-color 0.2s',
        left: `${currentPositionRef.current.x}px`,
        top: `${currentPositionRef.current.y}px`
      }}
      onClick={handleBranchClick}
      className={`branch-container ${isDragging ? 'dragging' : ''} ${isResizing ? 'resizing' : ''}`}
      data-branch-id={branch.id}
      onMouseDown={handleMouseDown}
    >
      <BranchHeader className="branch-header">
        <h3
          ref={titleRef}
          className="branch-title"
          contentEditable={isEditingTitle}
          suppressContentEditableWarning={true}
          onClick={handleTitleClick}
          onBlur={handleTitleBlur}
          onKeyDown={handleTitleKeyDown}
        >
          {branch.title || '主分支'}
        </h3>
        <div className="branch-actions">
          <Tooltip title="展示此分支">
            <Button 
              size="small" 
              type="text" 
              icon={<FullscreenOutlined />} 
              onClick={handleFullscreen}
            />
          </Tooltip>
          <Tooltip title="连接">
            <Button 
              size="small" 
              type="text" 
              icon={<LinkOutlined />} 
              onClick={handleConnect}
            />
          </Tooltip>
          <Tooltip title="删除">
            <Button 
              size="small" 
              type="text" 
              icon={<DeleteOutlined />} 
              onClick={handleDelete}
              disabled={branch.id === 'main'} // 防止删除主分支
            />
          </Tooltip>
        </div>
      </BranchHeader>
      <BranchContent 
        className="branch-content"
        ref={contentRef}
      >
        <MessagesContainer 
          className="messages-container"
          ref={messagesContainerRef}
        >
          {renderedMessages}
          {isLoading && (
            <NodeLoadingIndicator>
              <div className="loading-container">
                <div className="loading-pulse"></div>
                <div className="loading-spinner"></div>
              </div>
              <div className="loading-text">
                思考中
                <div className="loading-dots">
                  <div className="dot"></div>
                  <div className="dot"></div>
                  <div className="dot"></div>
                </div>
              </div>
            </NodeLoadingIndicator>
          )}
        </MessagesContainer>
        <InputContainer className="input-container">
          <MessageInput branchId={branch.id} />
        </InputContainer>
      </BranchContent>
      
      {/* 渲染调整大小的手柄 */}
      {renderResizeHandles()}
    </BranchContainer>
  );
};

export default React.memo(BranchComponent);