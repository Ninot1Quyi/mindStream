import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import styled, { createGlobalStyle } from 'styled-components';
import { Menu, Button, Tooltip, Popconfirm, Checkbox, App, Modal } from 'antd';
import { 
  ZoomInOutlined, 
  ZoomOutOutlined, 
  FullscreenOutlined,
  PlusOutlined,
  DeleteOutlined,
  LinkOutlined
} from '@ant-design/icons';
import { 
  selectActiveBranchId, 
  selectBranches,
  selectCanvasTransform
} from '../../store/selectors/canvasSelectors';
import {
  selectCurrentConversationId,
  selectCurrentConversation
} from '../../store/selectors/conversationSelectors';
import { selectMessages } from '../../store/selectors/messageSelectors';
import {
  setCanvasTransform, 
  updateViewport,
  resetCanvasView,
  setActiveBranch,
  startDragging,
  stopDragging,
  updateBranchPosition,
  zoomToArea
} from '../../store/slices/canvasSlice';
import { createBranch, deleteBranch, updateBranch, updateBranchPositionLocal } from '../../store/slices/branchSlice';
import { Branch, Position, Conversation } from '../../types/models';
import BranchComponent from './BranchComponent';
import ConnectionsLayer from './ConnectionsLayer';
import { openModal } from '../../store/slices/uiSlice';
import { 
  calculatePositionForChildBranch, 
  calculateSiblingPositions,
  adjustPositionForOverlap
} from '../../utils/branchPositioning';
import useAppSelector from '../../hooks/useAppSelector';
import { debounce, throttle } from 'lodash';
import { fetchConversation, fetchConversationSilently } from '../../store/slices/conversationSlice';
import { setLoading, setError } from '../../store/slices/uiSlice';
// 样式化组件
const CanvasContainer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background-color: #fafafa;
  z-index: 0;
  touch-action: none; /* 防止触摸设备上的默认滚动行为 */
`;

// 修改CanvasContent以支持无限画布，并优化性能
const CanvasContent = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 400%;
  height: 400%;
  transform-origin: top left;
  will-change: transform;
  transition: transform 0.5s cubic-bezier(0.4, 0.0, 0.2, 1);
  
  /* 确保网格线绘制在底层 */
  &::after {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
    z-index: -1;
    background-color: #fafafa;
    background-image: 
      linear-gradient(rgba(130, 150, 230, 0.1) 1px, transparent 1px),
      linear-gradient(90deg, rgba(130, 150, 230, 0.1) 1px, transparent 1px),
      linear-gradient(rgba(130, 150, 230, 0.05) 0.5px, transparent 0.5px),
      linear-gradient(90deg, rgba(130, 150, 230, 0.05) 0.5px, transparent 0.5px);
    background-size: 50px 50px, 50px 50px, 10px 10px, 10px 10px;
    background-position: -1px -1px, -1px -1px, -1px -1px, -1px -1px;
  }
  
  /* 拖动时禁用过渡，确保实时反馈 */
  &.dragging {
    transition: none;
  }
  
  /* 切换会话时使用过渡动画 */
  &.session-switching {
    transition: transform 0.5s cubic-bezier(0.4, 0.0, 0.2, 1);
  }
  
  &.dragging::after {
    background-image: 
      linear-gradient(rgba(130, 150, 230, 0.15) 1px, transparent 1px),
      linear-gradient(90deg, rgba(130, 150, 230, 0.15) 1px, transparent 1px),
      linear-gradient(rgba(130, 150, 230, 0.08) 0.5px, transparent 0.5px),
      linear-gradient(90deg, rgba(130, 150, 230, 0.08) 0.5px, transparent 0.5px);
  }
`;

// 分支内容容器 - 确保正确的层级关系
const BranchesContainer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 10;
  pointer-events: none;
  display: flex;
  flex: 1;
  overflow: visible;
  
  /* 分支组件自身具有pointer-events:auto，所以仍然可以被交互 */
`;

// 分支包装器 - 用于组织分支节点
const BranchesWrapper = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
`;

// 空状态提示 - 当会话没有节点时显示
const EmptyStateTip = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  padding: 24px 32px;
  background: rgba(255, 255, 255, 0.98);
  border-radius: 16px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.04),
              0 2px 8px rgba(0, 0, 0, 0.02);
  font-size: 16px;
  color: #333;
  border: 1px solid rgba(230, 230, 250, 0.6);
  backdrop-filter: blur(10px);
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  
  &:hover {
    transform: translate(-50%, -50%) scale(1.02);
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.06),
                0 4px 12px rgba(0, 0, 0, 0.03);
  }
  
  &::after {
    content: "双击画布创建第一个节点";
    display: block;
    font-size: 13px;
    color: #666;
    margin-top: 8px;
    opacity: 0.8;
    font-weight: 400;
    letter-spacing: 0.2px;
  }
`;

// 右键菜单样式
const ContextMenu = styled.div<{ visible: boolean; x: number; y: number }>`
  position: absolute;
  left: ${props => props.x}px;
  top: ${props => props.y}px;
  background-color: white;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  display: ${props => props.visible ? 'block' : 'none'};
`;

// 工具栏
const CanvasControls = styled.div`
  position: absolute;
  bottom: 16px;
  right: 16px;
  display: flex;
  gap: 8px;
  background-color: white;
  border-radius: 8px;
  padding: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  z-index: 100;
`;

// 创建节点按钮
const CreateNodeButton = styled.div`
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 100;
`;

// 添加欢迎提示样式
const WelcomeGuide = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(255, 255, 255, 0.98);
  padding: 32px 40px;
  border-radius: 20px;
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.06),
              0 4px 16px rgba(0, 0, 0, 0.03);
  max-width: 440px;
  text-align: center;
  z-index: 5;
  border: 1px solid rgba(230, 230, 250, 0.6);
  backdrop-filter: blur(10px);
  animation: welcomeFadeIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
  
  @keyframes welcomeFadeIn {
    from {
      opacity: 0;
      transform: translate(-50%, -45%);
    }
    to {
      opacity: 1;
      transform: translate(-50%, -50%);
    }
  }
`;

const WelcomeTitle = styled.h2`
  margin-bottom: 20px;
  color: #333;
  font-size: 24px;
  font-weight: 600;
  letter-spacing: -0.3px;
  
  &::after {
    content: "";
    display: block;
    width: 40px;
    height: 3px;
    background: linear-gradient(90deg, #4A86E8, #6BA2FF);
    margin: 16px auto 0;
    border-radius: 2px;
    opacity: 0.8;
  }
`;

const WelcomeContent = styled.p`
  margin-bottom: 28px;
  color: #666;
  line-height: 1.6;
  font-size: 15px;
  letter-spacing: 0.2px;
`;

const WelcomeAction = styled.div`
  display: flex;
  justify-content: center;
  
  .ant-btn {
    height: 44px;
    padding: 0 32px;
    font-size: 15px;
    border-radius: 22px;
    font-weight: 500;
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    display: flex;
    align-items: center;
    gap: 8px;
    background: linear-gradient(135deg, #4A86E8, #5E9EFF);
    border: none;
    color: white;
    
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(74, 134, 232, 0.25);
      background: linear-gradient(135deg, #5691F0, #6BA8FF);
    }
    
    &:active {
      transform: translateY(0);
      background: linear-gradient(135deg, #4177D9, #5E9EFF);
    }

    .anticon {
      font-size: 18px;
    }
  }
`;

// 添加画布视觉反馈指示器
const DragIndicator = styled.div`
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  padding: 8px 16px;
  background-color: rgba(0, 0, 0, 0.6);
  color: white;
  border-radius: 20px;
  font-size: 14px;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.3s ease;
  z-index: 1000;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  
  &.visible {
    opacity: 1;
  }
  
  svg {
    font-size: 16px;
  }
`;

// 添加模糊背景效果，增强深度感
const BlurOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  backdrop-filter: blur(0px);
  transition: backdrop-filter 0.3s ease;
  pointer-events: none;
  z-index: 50;
  
  &.active {
    backdrop-filter: blur(1.5px);
  }
`;

// 漂浮元素容器
const FloatingElements = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
  overflow: hidden;
`;

// 装饰元素 - 增强可见性
const DecorativeElement = styled.div<{ 
  size: number; 
  x: number; 
  y: number; 
  color: string; 
  type: 'circle' | 'square' | 'line'; 
  rotation?: number;
  width?: number;
  height?: number;
}>`
  position: absolute;
  left: ${props => props.x}px;
  top: ${props => props.y}px;
  opacity: 0.25; // 增加透明度
  background-color: ${props => props.color};
  transition: transform 0.3s ease, opacity 0.3s ease;
  
  /* 拖动时的效果 */
  .dragging & {
    opacity: 0.35;
    transform: ${props => {
      if (props.type === 'circle') return 'scale(0.95)';
      if (props.type === 'square') return 'scale(0.98)';
      if (props.type === 'line') return `rotate(${(props.rotation || 0) + 0.5}deg)`;
      return 'none';
    }};
  }
  
  /* 根据类型应用不同样式 */
  ${props => props.type === 'circle' && `
    width: ${props.size}px;
    height: ${props.size}px;
    border-radius: 50%;
    box-shadow: 0 0 30px rgba(${props.color.startsWith('#2970ff') ? '41, 112, 255' : '85, 64, 217'}, 0.1);
  `}
  
  ${props => props.type === 'square' && `
    width: ${props.size}px;
    height: ${props.size}px;
    border-radius: 3px;
    transform: rotate(45deg);
    box-shadow: 0 0 20px rgba(${props.color.startsWith('#2970ff') ? '41, 112, 255' : '85, 64, 217'}, 0.1);
  `}
  
  ${props => props.type === 'line' && `
    width: ${props.width || props.size || 100}px;
    height: ${props.height || 2}px;
    transform: rotate(${props.rotation || 0}deg);
    transform-origin: center;
    box-shadow: 0 0 10px rgba(${props.color.startsWith('#2970ff') ? '41, 112, 255' : '85, 64, 217'}, 0.1);
  `}
`;

// 创建一个更简洁的渐变背景效果
const GradientOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(
    circle at center, 
    rgba(255,255,255,0) 0%, 
    rgba(240,240,255,0.02) 70%, 
    rgba(230,230,255,0.05) 100%
  );
  pointer-events: none;
  z-index: 2;
`;

// 世界坐标系中的变换状态
interface WorldTransform {
  scale: number;
  offsetX: number;
  offsetY: number;
}

// 世界坐标系中的位置
interface WorldPosition {
  x: number;
  y: number;
}

// 画布网格 - 使用世界坐标系
const CanvasGrid = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  background-image: 
    linear-gradient(to right, rgba(0, 0, 0, 0.1) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(0, 0, 0, 0.1) 1px, transparent 1px);
  background-size: 
    calc(20px * var(--canvas-scale)) calc(20px * var(--canvas-scale));
  transform: 
    translate(
      calc(var(--canvas-offset-x) % (20px * var(--canvas-scale))),
      calc(var(--canvas-offset-y) % (20px * var(--canvas-scale)))
    );
  will-change: transform;
`;

// 画布内容容器 - 所有节点的父容器
const NodesContainer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  
  /* 子元素（节点）使用世界坐标系定位 */
  & > * {
    position: absolute;
    transform-origin: 0 0;
    /* 应用画布缩放 */
    transform: scale(var(--canvas-scale));
  }
`;

// 增强坐标系统转换助手，添加矩阵变换支持
const createCoordinateHelpers = (scale: number, offsetX: number, offsetY: number) => {
  // 创建变换矩阵
  const createTransformMatrix = () => {
    return {
      a: scale,  // 水平缩放
      b: 0,      // 水平倾斜
      c: 0,      // 垂直倾斜
      d: scale,  // 垂直缩放
      e: offsetX, // 水平偏移
      f: offsetY  // 垂直偏移
    };
  };
  
  // 获取当前变换矩阵
  const matrix = createTransformMatrix();
  
  // 通过矩阵计算点变换
  const transformPoint = (x: number, y: number, matrix: any) => {
    return {
      x: x * matrix.a + y * matrix.c + matrix.e,
      y: x * matrix.b + y * matrix.d + matrix.f
    };
  };
  
  // 矩阵求逆
  const invertMatrix = (matrix: any) => {
    const det = matrix.a * matrix.d - matrix.b * matrix.c;
    if (det === 0) return null; // 矩阵不可逆
    
    const invDet = 1 / det;
    return {
      a: matrix.d * invDet,
      b: -matrix.b * invDet,
      c: -matrix.c * invDet,
      d: matrix.a * invDet,
      e: (matrix.c * matrix.f - matrix.d * matrix.e) * invDet,
      f: (matrix.b * matrix.e - matrix.a * matrix.f) * invDet
    };
  };
  
  // 获取逆矩阵
  const invMatrix = invertMatrix(matrix);
  
  return {
    // 世界坐标转视口坐标
    worldToViewport: (worldX: number, worldY: number) => {
      return transformPoint(worldX, worldY, matrix);
    },
    
    // 视口坐标转世界坐标
    viewportToWorld: (viewX: number, viewY: number) => {
      if (!invMatrix) return { x: viewX, y: viewY }; // 出错时返回原坐标
      return transformPoint(viewX, viewY, invMatrix);
    },
    
    // 获取变换矩阵字符串 (用于CSS)
    getTransformString: () => {
      return `matrix(${matrix.a}, ${matrix.b}, ${matrix.c}, ${matrix.d}, ${matrix.e}, ${matrix.f})`;
    },
    
    // 获取变换矩阵对象
    getMatrix: () => ({ ...matrix }),
    
    // 获取逆变换矩阵对象
    getInverseMatrix: () => invMatrix ? { ...invMatrix } : null,
    
    // 检查世界点是否在视口内
    isWorldPointInViewport: (worldX: number, worldY: number, padding = 0) => {
      const viewportPoint = transformPoint(worldX, worldY, matrix);
      const canvasRect = document.getElementById('canvas-container')?.getBoundingClientRect();
      if (!canvasRect) return false;
      
      return (
        viewportPoint.x >= -padding && 
        viewportPoint.y >= -padding && 
        viewportPoint.x <= canvasRect.width + padding && 
        viewportPoint.y <= canvasRect.height + padding
      );
    }
  };
};

// 添加样式组件 - 位于Canvas组件之前
const StyledPopconfirm = styled(Popconfirm as any)`
  .ant-popover-inner {
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.08), 0 2px 10px rgba(0, 0, 0, 0.04);
    backdrop-filter: blur(10px);
    background-color: rgba(255, 255, 255, 0.95);
    border: 1px solid rgba(230, 230, 250, 0.5);
    transform-origin: center;
  }
  
  .ant-popover-inner-content {
    padding: 16px 20px;
  }
  
  .ant-popover-message {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  
  .ant-popover-message-title {
    font-weight: 500;
    font-size: 15px;
    color: #333;
    margin-bottom: 4px;
  }
  
  .ant-popover-buttons {
    display: flex;
    justify-content: flex-end;
    margin-top: 16px;
    gap: 12px;
  }
  
  .ant-btn {
    transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
    transform: scale(1);
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0);
    
    &:hover {
      transform: scale(1.05);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
    
    &:active {
      transform: scale(0.98);
    }
  }
  
  .ant-btn-primary {
    background-color: #FF3B30;
    border-color: #FF3B30;
    border-radius: 10px;
    
    &:hover {
      background-color: #FF5446;
      border-color: #FF5446;
    }
  }
  
  .ant-btn-default {
    border-radius: 10px;
    color: #007AFF;
    border-color: #007AFF;
    
    &:hover {
      color: #2B8EFF;
      border-color: #2B8EFF;
      background-color: rgba(0, 122, 255, 0.05);
    }
  }
  
  &.ant-popover-placement-left .ant-popover-content,
  &.ant-popover-placement-right .ant-popover-content,
  &.ant-popover-placement-top .ant-popover-content,
  &.ant-popover-placement-bottom .ant-popover-content {
    animation: popoverFadeIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  
  @keyframes popoverFadeIn {
    from {
      opacity: 0;
      transform: scale(0.9);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
  
  /* 添加箭头样式 */
  .ant-popover-arrow {
    border-color: rgba(230, 230, 250, 0.5) !important;
    box-shadow: -2px -2px 5px rgba(0, 0, 0, 0.03);
  }
  
  /* 添加内容淡入效果 */
  .ant-popover-inner-content {
    animation: contentFadeIn 0.4s ease-out;
  }
  
  @keyframes contentFadeIn {
    from {
      opacity: 0;
      transform: translateY(5px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

// 复选框样式
const StyledCheckbox = styled(Checkbox as any)`
  margin-top: 12px;
  display: flex;
  align-items: center;
  
  .ant-checkbox {
    top: 0;
  }
  
  .ant-checkbox + span {
    padding-left: 10px;
    font-size: 14px;
    color: #666;
  }
  
  .ant-checkbox-checked .ant-checkbox-inner {
    background-color: #007AFF;
    border-color: #007AFF;
  }
  
  .ant-checkbox-inner {
    border-radius: 4px;
    transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  
  .ant-checkbox-checked .ant-checkbox-inner::after {
    transform: rotate(45deg) scale(1.2);
    transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s;
  }
  
  &:hover .ant-checkbox-inner {
    border-color: #007AFF;
  }
`;

// 添加淡入淡出动画样式
const FadeTransition = styled.div<{ visible: boolean }>`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: ${props => props.visible ? 1 : 0};
  transition: opacity 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
  pointer-events: ${props => props.visible ? 'auto' : 'none'};
  will-change: opacity, transform;
  transform-origin: center;
  transform: ${props => props.visible ? 'scale(1)' : 'scale(0.98)'};
  transition: 
    opacity 0.3s cubic-bezier(0.4, 0.0, 0.2, 1), 
    transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
`;

// 修改过渡期间的背景模糊效果，增强毛玻璃效果但更透明
const TransitionOverlay = styled.div<{ active: boolean }>`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(255, 255, 255, 0.05);
  pointer-events: none;
  z-index: 1000;
  opacity: ${props => props.active ? 1 : 0};
  backdrop-filter: ${props => props.active ? 'blur(5px)' : 'blur(0px)'};
  transition: 
    opacity 0.25s cubic-bezier(0.4, 0.0, 0.2, 1),
    backdrop-filter 0.25s cubic-bezier(0.4, 0.0, 0.2, 1);
`;

// 添加全局动画关键帧
const GlobalAnimations = createGlobalStyle`
  @keyframes popIn {
    from {
      opacity: 0;
      transform: scale(0.9);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
`;

// 创建一个单独的WelcomeGuide组件
const WelcomeGuideComponent = () => {
  const dispatch = useDispatch();
  const currentConversationId = useAppSelector(selectCurrentConversationId);
  
  // 简化处理函数，确保能够直接调用
  const handleCreateFirstNode = () => {
    console.log('点击创建第一个节点按钮', { currentConversationId });
    
    // 用户点击"创建第一个节点"按钮时的逻辑
    const createNode = () => {
      console.log('直接创建根节点');
      try {
        dispatch(createBranch({
          name: '新建节点',
          position: { x: 0, y: 0 },
          isRoot: true
        }) as any);
      } catch (error) {
        console.error('创建节点时出错:', error);
        Modal.error({
          title: '创建节点失败',
          content: '无法创建新节点，请稍后重试'
        });
      }
    };
    
    // 创建会话的逻辑
    const createNewConversation = async () => {
      console.log('尝试创建新会话');
      try {
        const api = window.electronAPI as any;
        if (api && api.conversation && typeof api.conversation.create === 'function') {
          console.log('调用API创建会话');
          const result = await api.conversation.create();
          console.log('创建会话结果:', result);
          
          if (result && result.id) {
            await dispatch(fetchConversationSilently(result.id) as any);
            console.log('会话加载完成, ID:', result.id);
            // 创建成功后创建节点
            createNode();
          } else {
            console.error('创建会话返回无效结果');
            Modal.error({
              title: '创建会话失败',
              content: '服务器返回了无效的数据'
            });
          }
        } else {
          console.error('会话API不可用');
          Modal.error({
            title: '创建会话失败',
            content: '会话API不可用'
          });
        }
      } catch (error) {
        console.error('创建会话出错:', error);
        Modal.error({
          title: '创建会话失败',
          content: `出现错误: ${(error as Error).message}`
        });
      }
    };
    
    // 主逻辑
    if (currentConversationId) {
      console.log('已有会话ID，直接创建节点');
      createNode();
    } else {
      console.log('没有会话ID，先创建会话');
      createNewConversation();
    }
  };

  return (
    <WelcomeGuide>
      <WelcomeTitle>欢迎使用 MindStream</WelcomeTitle>
      <WelcomeContent>
        点击右上角的"+"按钮或在空白处双击鼠标，创建你的第一个思考节点。
        <br />
        你可以拖动节点改变位置，使用节点控制点调整大小，通过节点间连接展示思维流。
      </WelcomeContent>
      <WelcomeAction>
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={handleCreateFirstNode}
        >
          创建第一个节点
        </Button>
      </WelcomeAction>
    </WelcomeGuide>
  );
};

// 重新排列Canvas组件的函数声明顺序
const CanvasWithApp: React.FC = () => {
  return (
    <App>
      <Canvas />
    </App>
  );
};

const Canvas: React.FC = () => {
  const { message, modal } = App.useApp();
  const dispatch = useDispatch();
  const branches = useAppSelector(selectBranches);
  const activeBranchId = useAppSelector(selectActiveBranchId);
  const canvasTransform = useAppSelector(selectCanvasTransform);
  const currentConversationId = useAppSelector(selectCurrentConversationId);
  const currentConversation = useAppSelector(selectCurrentConversation);
  const messages = useAppSelector(selectMessages);
  
  // 渲染全局动画样式
  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.innerHTML = `
      @keyframes popIn {
        from {
          opacity: 0;
          transform: scale(0.9);
        }
        to {
          opacity: 1;
          transform: scale(1);
        }
      }
    `;
    document.head.appendChild(styleElement);
    
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);
  
  // 直接在组件中定义这些状态，而不是从选择器中获取
  const [rightClickedBranchId, setRightClickedBranchId] = useState<string | null>(null);
  const [isCreatingBranch, setIsCreatingBranch] = useState(false);
  const [newBranchPosition, setNewBranchPosition] = useState<Position | null>(null);
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  
  const canvasRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  
  // 使用useRef保存状态，避免重新渲染和循环更新
  const stateRef = useRef({
    isPanning: false,
    lastPanPoint: null as Position | null,
    cursorStyle: 'default',
    isMouseOverCanvas: false,
    tempOffset: null as { x: number; y: number } | null,
    visibleBranches: [] as Branch[],
    visibleWorldBounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
    lastClickTime: 0,
    clickPosition: { x: 0, y: 0 },
    contextMenuVisible: false,
    contextMenuPosition: { x: 0, y: 0 },
    contextMenuBranchId: null as string | null,
    scale: 1,
    offsetX: 0,
    offsetY: 0
  });
  
  // 我们只有几个必须以状态方式管理的UI变量
  const [cursorStyle, setCursorStyle] = useState('default');
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [contextMenuBranchId, setContextMenuBranchId] = useState<string | null>(null);
  
  // 添加状态来追踪拖动指示器的显示
  const [isDraggingIndicatorVisible, setIsDraggingIndicatorVisible] = useState(false);
  const [dragDistance, setDragDistance] = useState({ x: 0, y: 0 });
  const dragDistanceRef = useRef({ x: 0, y: 0 });
  const [blurActive, setBlurActive] = useState(false);
  
  // 监听当前会话变化，使用useRef避免依赖问题
  const lastLoadedConversationIdRef = useRef<string | null>(null);

  // 在Canvas组件内部，添加状态变量用于控制删除确认气泡
  const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);
  const [branchToDelete, setBranchToDelete] = useState<string | null>(null);
  const [doNotShowDeleteConfirm, setDoNotShowDeleteConfirm] = useState(false);

  // 添加状态来跟踪会话切换过程
  const [isSwitchingConversation, setIsSwitchingConversation] = useState(false);
  
  // 添加状态用于淡入淡出效果
  const [oldBranches, setOldBranches] = useState<Record<string, Branch>>({});
  const [showOldContent, setShowOldContent] = useState(false);
  const [fadeTransition, setFadeTransition] = useState(false);

  // 在Canvas组件内添加一个记录上次变换的状态
  const lastCanvasTransformRef = useRef<{scale: number, offsetX: number, offsetY: number} | null>(null);

  // 重置视图函数
  const resetView = useCallback(() => {
    dispatch(setCanvasTransform({ scale: 1, offsetX: 0, offsetY: 0 }));
  }, [dispatch]);
  
  // 转换函数：客户端坐标 -> 世界坐标
  const clientToWorld = useCallback((clientX: number, clientY: number): WorldPosition => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    
    const rect = canvasRef.current.getBoundingClientRect();
    const canvasX = clientX - rect.left;
    const canvasY = clientY - rect.top;
    
    return {
      x: (canvasX - stateRef.current.offsetX) / stateRef.current.scale,
      y: (canvasY - stateRef.current.offsetY) / stateRef.current.scale
    };
  }, [stateRef.current.scale, stateRef.current.offsetX, stateRef.current.offsetY]);
  
  // 转换函数：世界坐标 -> 客户端坐标
  const worldToClient = useCallback((worldX: number, worldY: number): Position => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    
    const rect = canvasRef.current.getBoundingClientRect();
    
    return {
      x: worldX * stateRef.current.scale + stateRef.current.offsetX + rect.left,
      y: worldY * stateRef.current.scale + stateRef.current.offsetY + rect.top
    };
  }, [stateRef.current.scale, stateRef.current.offsetX, stateRef.current.offsetY]);
  
  // 修改处理缩放的函数
  const handleWheel = useCallback((e: React.WheelEvent) => {
    // 检查是否在分支内容区域
    const targetElement = e.target;
    if (!(targetElement instanceof Element)) return;
    
    const branchContent = targetElement.closest('.branch-content');
    if (branchContent) {
      // 在分支内容区域，允许正常滚动
      return;
    }

    // 获取鼠标相对于画布的位置
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    // 计算鼠标在画布坐标系中的位置（考虑当前的偏移和缩放）
    const mouseX = (e.clientX - rect.left - stateRef.current.offsetX) / stateRef.current.scale;
    const mouseY = (e.clientY - rect.top - stateRef.current.offsetY) / stateRef.current.scale;

    // 计算新的缩放比例
    const zoomFactor = -0.001 * e.deltaY;
    const newScale = Math.min(Math.max(stateRef.current.scale * (1 + zoomFactor), 0.1), 5);
    const scaleDiff = newScale / stateRef.current.scale;

    // 计算新的偏移量，保持鼠标指向的点不变
    const newOffsetX = e.clientX - rect.left - (e.clientX - rect.left - stateRef.current.offsetX) * scaleDiff;
    const newOffsetY = e.clientY - rect.top - (e.clientY - rect.top - stateRef.current.offsetY) * scaleDiff;

    // 更新Redux状态
    dispatch(setCanvasTransform({
      scale: newScale,
      offsetX: newOffsetX,
      offsetY: newOffsetY
    }));

    // 更新视口状态
    dispatch(updateViewport({
      minX: -newOffsetX / newScale,
      minY: -newOffsetY / newScale,
      maxX: (window.innerWidth - newOffsetX) / newScale,
      maxY: (window.innerHeight - newOffsetY) / newScale,
      width: window.innerWidth,
      height: window.innerHeight,
      scale: newScale,
      offsetX: newOffsetX,
      offsetY: newOffsetY
    }));
  }, [stateRef.current.scale, stateRef.current.offsetX, stateRef.current.offsetY, dispatch]);

  // 更新updateViewportInRedux函数，使用canvasTransform替代transform
  const updateViewportInRedux = useCallback(() => {
    if (!canvasRef.current) return;
    
    // 获取可视区域的边界
    const width = canvasRef.current.clientWidth;
    const height = canvasRef.current.clientHeight;
    
    // 计算世界坐标中的可视区域边界
    const minX = -canvasTransform.offsetX / canvasTransform.scale;
    const minY = -canvasTransform.offsetY / canvasTransform.scale;
    const maxX = (width - canvasTransform.offsetX) / canvasTransform.scale;
    const maxY = (height - canvasTransform.offsetY) / canvasTransform.scale;
    
    // 更新Redux中的viewport状态
    dispatch(updateViewport({
      minX,
      minY,
      maxX,
      maxY,
      width,
      height,
      scale: canvasTransform.scale,
      offsetX: canvasTransform.offsetX,
      offsetY: canvasTransform.offsetY
    }));
  }, [dispatch, canvasTransform.offsetX, canvasTransform.offsetY, canvasTransform.scale, canvasRef]);
  
  // 优化创建节点的处理函数
  const handleCreateNode = useCallback(async (position: Position) => {
    if (!currentConversationId) {
      Modal.warning({
        title: '无法创建节点',
        content: '请先选择或创建一个会话'
      });
      return;
    }

    try {
      // 设置加载状态
      setCursorStyle('wait');
      
      // 获取当前活动的分支ID
      const parentBranchId = activeBranchId;
      console.log('创建节点，当前活动分支ID:', parentBranchId);
      
      // 检查分支状态
      if (parentBranchId && !branches[parentBranchId]) {
        console.warn('活动分支ID存在但未找到对应分支数据，将创建根节点');
      }
      
      // 准备创建参数
      const createParams = {
        name: '新建节点',
        position,
        // 只有当parentBranchId存在且能在branches中找到时才传递
        ...(parentBranchId && branches[parentBranchId] ? { parentBranchId } : { isRoot: true })
      };
      
      console.log('使用以下参数创建分支:', createParams);
      
      // 创建新分支
      const result = await dispatch(createBranch(createParams) as any).unwrap();
      console.log('创建分支成功:', result);
      
      // 添加安全检查，确保result和result.branch存在
      if (result) {
        let newBranchId: string | undefined;
        
        // 根据返回结果类型获取branch ID
        if (typeof result === 'object') {
          if (result.branch && typeof result.branch === 'object' && 'id' in result.branch) {
            // 标准返回格式: { branch: { id: 'xxx', ... } }
            newBranchId = result.branch.id as string;
          } else if ('id' in result) {
            // 直接返回了branch对象: { id: 'xxx', ... }
            newBranchId = result.id as string;
          }
        }
        
        // 只有成功获取到分支ID才继续处理
        if (newBranchId) {
          console.log('获取到新创建的分支ID:', newBranchId);
          
          // 设置新创建的分支为活动分支
          dispatch(setActiveBranch(newBranchId));
          
          // 更新Redux中的分支数据
          if (result.branch) {
            dispatch({
              type: 'branches/setBranch',
              payload: result.branch
            });
          } else if ('id' in result) {
            dispatch({
              type: 'branches/setBranch',
              payload: result
            });
          }
          
          // 等待分支数据被加载到Redux状态后再更新视口
          setTimeout(() => {
            // 更新视口信息
            updateViewportInRedux();
            
            // 计算适当的视图区域，使新创建的节点居中显示
            // 获取新创建的节点位置
            const nodePosition = position || { x: 0, y: 0 };
            
            // 使用zoomToArea使节点居中并设置合适的缩放比例
            dispatch(zoomToArea({
              minX: nodePosition.x - 200,
              minY: nodePosition.y - 150,
              maxX: nodePosition.x + 200,
              maxY: nodePosition.y + 150,
              padding: 50  // 适当的内边距
            }));
          }, 100);
        } else {
          console.error('未能从结果中获取分支ID:', result);
          Modal.error({
            title: '创建节点失败',
            content: '服务器返回了无效的数据结构'
          });
        }
      } else {
        console.error('创建分支返回空结果');
        Modal.error({
          title: '创建节点失败',
          content: '服务器未返回有效数据'
        });
      }
    } catch (error) {
      console.error('创建节点失败:', error);
      
      Modal.error({
        title: '创建节点失败',
        content: `出现错误: ${(error as Error).message}`
      });
    } finally {
      // 恢复鼠标指针
      setCursorStyle('default');
    }
  }, [currentConversationId, activeBranchId, branches, dispatch, updateViewportInRedux]);

  // 初始化画布偏移，确保画布初始位置合理
  useEffect(() => {
    // 仅在组件首次挂载时运行一次
    const initializeCanvas = () => {
      if (canvasRef.current) {
        // 获取画布尺寸信息
        const rect = canvasRef.current.getBoundingClientRect();
        
        // 将画布中心点设置在视口中心
        const initialOffsetX = rect.width / 2;
        const initialOffsetY = rect.height / 2;
        
        console.log(`初始化画布: 中心点设置为(${initialOffsetX}, ${initialOffsetY})`);
        
        // 更新画布变换，使用较小的初始缩放比例
        dispatch(setCanvasTransform({
          scale: 0.5, // 将初始缩放从1减小到0.5
          offsetX: initialOffsetX,
          offsetY: initialOffsetY
        }));
      }
    };
    
    // 初始化画布 - 只在组件挂载时执行一次
    const timeoutId = setTimeout(initializeCanvas, 100); // 添加短暂延迟以确保DOM已加载
    
    return () => clearTimeout(timeoutId);
  }, [dispatch]);
  
  // 更新ref以反映最新的redux状态
  useEffect(() => {
    stateRef.current.scale = canvasTransform.scale;
    stateRef.current.offsetX = canvasTransform.offsetX;
    stateRef.current.offsetY = canvasTransform.offsetY;
  }, [canvasTransform.scale, canvasTransform.offsetX, canvasTransform.offsetY]);
  
  // 计算可见区域和过滤分支 - 仅在需要时计算，不触发渲染
  const updateVisibleData = useCallback(() => {
    if (!canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    
    // 计算视口在世界坐标中的可见区域
    // 视口左上角的世界坐标
    const topLeft = {
      x: -canvasTransform.offsetX / canvasTransform.scale,
      y: -canvasTransform.offsetY / canvasTransform.scale
    };
    
    // 视口右下角的世界坐标
    const bottomRight = {
      x: (rect.width - canvasTransform.offsetX) / canvasTransform.scale,
      y: (rect.height - canvasTransform.offsetY) / canvasTransform.scale
    };
    
    const bounds = {
      minX: topLeft.x,
      minY: topLeft.y,
      maxX: bottomRight.x,
      maxY: bottomRight.y,
      width: rect.width,
      height: rect.height
    };
    
    // 更新保存在ref中的可见区域数据
    stateRef.current.visibleWorldBounds = bounds;
    
    return {
      bounds
    };
  }, [canvasTransform.offsetX, canvasTransform.offsetY, canvasTransform.scale]);
  
  // 实现虚拟化渲染，只渲染可视区域内和附近的元素
  const getVisibleBranches = useCallback(() => {
    // 如果需要，更新可见数据
    updateVisibleData();
    
    // 获取可视区域的边界，加上一定边距（为了平滑滚动）
    const bounds = stateRef.current.visibleWorldBounds;
    const padding = 300 / canvasTransform.scale; // 视口边缘额外加载区域
    
    // 过滤只在可视区域附近的分支
    return Object.values(branches).filter(branch => {
      // 节点中心点坐标
      const { x, y } = branch.position;
      const width = branch.width || 300; // 默认宽度
      const height = branch.height || 300; // 默认高度
      
      // 节点边界框
      const right = x + width;
      const bottom = y + height;
      
      // 检查节点是否在扩展可视区域内
      return (
        x < bounds.maxX + padding &&
        right > bounds.minX - padding &&
        y < bounds.maxY + padding &&
        bottom > bounds.minY - padding
      );
    });
  }, [updateVisibleData, branches, canvasTransform.scale]);
  
  // 检查并扩展画布 - 使用节流避免频繁调用
  const checkAndExpandCanvas = useCallback(
    throttle(() => {
      if (!canvasRef.current) return;
      
      // 获取所有分支的位置，计算所需的画布大小
      const branchElements = document.querySelectorAll('.branch-container');
      
      if (branchElements.length === 0) return;
      
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      
      // 添加日志以便调试
      console.log("检查画布边界...");
      
      branchElements.forEach((element: Element) => {
        if (element instanceof HTMLElement) {
          // 获取元素的屏幕位置
          const rect = element.getBoundingClientRect();
          const canvasRect = canvasRef.current?.getBoundingClientRect();
          
          if (canvasRect) {
            // 计算元素相对于画布容器的位置
            const elementLeft = rect.left - canvasRect.left;
            const elementTop = rect.top - canvasRect.top;
            const elementRight = elementLeft + rect.width;
            const elementBottom = elementTop + rect.height;
            
            // 输出各节点位置，帮助调试
            console.log(`节点位置: left=${elementLeft}, top=${elementTop}, right=${elementRight}, bottom=${elementBottom}`);
            
            // 更新边界
            minX = Math.min(minX, elementLeft);
            minY = Math.min(minY, elementTop);
            maxX = Math.max(maxX, elementRight);
            maxY = Math.max(maxY, elementBottom);
          }
        }
      });
      
      // 输出计算的边界
      console.log(`计算的边界: minX=${minX}, minY=${minY}, maxX=${maxX}, maxY=${maxY}`);
      console.log(`当前偏移: offsetX=${stateRef.current.offsetX}, offsetY=${stateRef.current.offsetY}`);
      
      // 计算边距
      const padding = 200;
      let needsUpdate = false;
      let newOffsetX = stateRef.current.offsetX;
      let newOffsetY = stateRef.current.offsetY;
      
      // 获取画布容器尺寸
      const canvasContainer = canvasRef.current;
      const containerRect = canvasContainer.getBoundingClientRect();
      
      // 检查是否需要调整偏移
      // 处理左边界 - 如果有节点在左侧看不见的区域
      if (minX < padding) {
        // 如果有分支超出左侧边界，向右偏移画布
        const deltaX = padding - minX;
        newOffsetX += deltaX;
        needsUpdate = true;
        console.log(`需要向右偏移画布 ${deltaX}px`);
      }
      
      // 处理右边界 - 如果有节点超出右侧边界
      if (maxX > containerRect.width - padding && containerRect.width > 0) {
        // 根据右侧超出多少调整左侧偏移量
        const deltaX = maxX - (containerRect.width - padding);
        newOffsetX -= deltaX;
        needsUpdate = true;
        console.log(`需要向左偏移画布 ${deltaX}px`);
      }
      
      // 处理上边界
      if (minY < padding) {
        // 如果有分支超出上边界，向下偏移画布
        const deltaY = padding - minY;
        newOffsetY += deltaY;
        needsUpdate = true;
        console.log(`需要向下偏移画布 ${deltaY}px`);
      }
      
      // 处理下边界
      if (maxY > containerRect.height - padding && containerRect.height > 0) {
        // 如果有分支超出下边界，向上偏移画布
        const deltaY = maxY - (containerRect.height - padding);
        newOffsetY -= deltaY;
        needsUpdate = true;
        console.log(`需要向上偏移画布 ${deltaY}px`);
      }
      
      // 只有当需要更新时才派发action
      if (needsUpdate) {
        console.log(`更新画布偏移: offsetX=${newOffsetX}, offsetY=${newOffsetY}`);
        dispatch(setCanvasTransform({ 
          scale: canvasTransform.scale,
          offsetX: newOffsetX,
          offsetY: newOffsetY
        }));
      }
    }, 200),
    [dispatch, canvasTransform.scale, stateRef.current.offsetX, stateRef.current.offsetY]
  );
  
  // 全局鼠标移动事件处理 - 优化画布拖动
  const handleGlobalMouseMove = useCallback(throttle((e: MouseEvent) => {
    if (!stateRef.current.isPanning || !stateRef.current.lastPanPoint) return;
    
    // 计算移动距离
    const deltaX = e.clientX - stateRef.current.lastPanPoint.x;
    const deltaY = e.clientY - stateRef.current.lastPanPoint.y;
    
    // 累计总移动距离，用于显示拖动指示器
    dragDistanceRef.current = {
      x: dragDistanceRef.current.x + deltaX,
      y: dragDistanceRef.current.y + deltaY
    };
    
    // 更新拖动指示器状态
    setDragDistance(dragDistanceRef.current);
    
    // 当拖动距离超过阈值时显示指示器
    if (Math.abs(dragDistanceRef.current.x) > 5 || Math.abs(dragDistanceRef.current.y) > 5) {
      setIsDraggingIndicatorVisible(true);
      
      // 添加模糊效果，增强深度感
      if (Math.abs(dragDistanceRef.current.x) > 30 || Math.abs(dragDistanceRef.current.y) > 30) {
        setBlurActive(true);
      }
    }
    
    // 更新lastPanPoint (只更新ref不触发渲染)
    stateRef.current.lastPanPoint = { x: e.clientX, y: e.clientY };
    
    // 计算新的偏移量
    const newOffsetX = stateRef.current.offsetX + deltaX;
    const newOffsetY = stateRef.current.offsetY + deltaY;
    
    // 存储临时偏移量
    stateRef.current.tempOffset = { x: newOffsetX, y: newOffsetY };
    
    // 直接更新DOM，确保平滑拖动
    const canvasContent = document.querySelector('.canvas-content');
    if (canvasContent && canvasContent instanceof HTMLElement) {
      canvasContent.style.transform = `matrix(${stateRef.current.scale}, 0, 0, ${stateRef.current.scale}, ${newOffsetX}, ${newOffsetY})`;
    }
    
    // 使用节流更新Redux状态，减少状态更新频率
    dispatch(setCanvasTransform({
      scale: stateRef.current.scale,
      offsetX: newOffsetX,
      offsetY: newOffsetY
    }));
  }, 16), [dispatch]);
  
  // React事件版本的鼠标移动处理函数
  const handleReactMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // 直接调用全局处理函数
    handleGlobalMouseMove(e.nativeEvent);
  }, [handleGlobalMouseMove]);
  
  // 鼠标按下事件（开始平移）
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // 只处理左键点击
    if (e.button !== 0) return;
    
    // 确保目标元素是有效的 DOM 元素
    const target = e.target;
    if (!target || !(target instanceof Element)) return;
    
    // 检查是否点击在欢迎指南区域
    const isWelcomeGuide = target.closest('.ant-btn') || 
                          target.closest(WelcomeGuide as any) ||
                          target.closest(WelcomeAction as any) ||
                          target.closest('button');
                        
    // 如果点击在按钮或欢迎指南区域，不启动画布拖动
    if (target.closest('.branch-container') || 
        isWelcomeGuide ||
        target.closest('.ant-btn') ||
        target.closest('.ant-tooltip')) {
      console.log('点击在特殊元素上，跳过画布拖动');
      return;
    }
    
    // 无需检查是否点击在特定元素上，任何地方点击都可以拖动整个画布
    console.log('开始画布平移');
    
    // 更新ref
    stateRef.current.isPanning = true;
    stateRef.current.lastPanPoint = { x: e.clientX, y: e.clientY };
    
    // 重置累计拖动距离
    dragDistanceRef.current = { x: 0, y: 0 };
    setDragDistance({ x: 0, y: 0 });
    
    // 添加拖动中的类，禁用过渡效果
    const canvasContent = document.querySelector('.canvas-content');
    if (canvasContent) {
      canvasContent.classList.add('dragging');
    }
    
    // 只更新UI状态
    setCursorStyle('grabbing');
    
    e.preventDefault();
    e.stopPropagation();
  }, []);
  
  // 鼠标进入画布
  const handleMouseEnter = useCallback(() => {
    stateRef.current.isMouseOverCanvas = true;
    if (!stateRef.current.isPanning) {
      setCursorStyle('grab'); // 鼠标悬停在画布上时显示grab光标
    }
  }, []);
  
  // 鼠标离开画布
  const handleMouseLeave = useCallback(() => {
    stateRef.current.isMouseOverCanvas = false;
    if (!stateRef.current.isPanning) {
      setCursorStyle('default');
    }
  }, []);
  
  // 全局鼠标释放事件处理
  const handleGlobalMouseUp = useCallback(() => {
    if (!stateRef.current.isPanning) return;
    
    console.log('结束画布平移');
    
    // 重置拖动状态
    stateRef.current.isPanning = false;
    stateRef.current.lastPanPoint = null;
    
    // 移除拖动中的类
    const canvasContent = document.querySelector('.canvas-content');
    if (canvasContent) {
      canvasContent.classList.remove('dragging');
    }
    
    // 重置UI状态
    setCursorStyle('grab');
    setIsDraggingIndicatorVisible(false);
    
    // 延迟移除模糊效果，使过渡更平滑
    setTimeout(() => {
      setBlurActive(false);
    }, 100);
    
    // 确保最终状态与Redux同步
    if (stateRef.current.tempOffset) {
      dispatch(setCanvasTransform({
        scale: stateRef.current.scale,
        offsetX: stateRef.current.tempOffset.x,
        offsetY: stateRef.current.tempOffset.y
      }));
    }
  }, [dispatch]);
  
  // React事件版本的鼠标释放处理函数
  const handleReactMouseUp = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    handleGlobalMouseUp();
  }, [handleGlobalMouseUp]);
  
  // 修改useEffect中的wheel事件处理
  useEffect(() => {
    // 添加全局鼠标事件处理程序，以支持在拖动时鼠标离开canvas区域的情况
    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);
    
    // 使用CSS来防止页面滚动
    if (canvasRef.current) {
      canvasRef.current.style.overflowY = 'hidden';
      canvasRef.current.style.overflowX = 'hidden';
    }
    
    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      
      if (canvasRef.current) {
        canvasRef.current.style.overflowY = '';
        canvasRef.current.style.overflowX = '';
      }
    };
  }, [handleGlobalMouseMove, handleGlobalMouseUp]);

  // 在会话切换逻辑中修改过渡处理，缩短时间
  useEffect(() => {
    // 防止重复加载
    let isMounted = true;
    
    // 只有在conversationId变化且与上次加载的不同时才加载
    if (currentConversationId && currentConversationId !== lastLoadedConversationIdRef.current) {
      console.log('Canvas组件: 正在加载会话数据', currentConversationId);
      
      // 设置切换状态为true，立即激活毛玻璃效果
      setIsSwitchingConversation(true);
      setFadeTransition(true);
      
      // 保存当前变换状态和分支数据，用于平滑过渡
      lastCanvasTransformRef.current = {
        scale: canvasTransform.scale,
        offsetX: canvasTransform.offsetX,
        offsetY: canvasTransform.offsetY
      };
      
      // 保存当前分支数据，用于过渡动画
      if (Object.keys(branches).length > 0) {
        setOldBranches({...branches});
        setShowOldContent(true);
      }
      
      // 更新上次加载的会话ID
      lastLoadedConversationIdRef.current = currentConversationId;
      
      // 使用原始的fetchConversationSilently函数
      dispatch(fetchConversationSilently(currentConversationId) as any)
        .then((action: any) => {
          // 组件已卸载则不执行后续操作
          if (!isMounted) return;
          
          console.log('Canvas组件: 会话数据加载成功', action.payload);
          
          // 准备新的分支数据
          const conversationBranches = action.payload.branches;
          if (Array.isArray(conversationBranches) && conversationBranches.length > 0) {
            // 清空当前分支数据
            dispatch({ type: 'branches/clearAll' });
            
            // 加载新的分支数据
            conversationBranches.forEach(branch => {
              if (branch && branch.id) {
                dispatch({
                  type: 'branches/setBranch',
                  payload: branch
                });
              }
            });
            
            // 设置第一个分支为活动分支
            const firstBranchId = conversationBranches[0].id;
            dispatch(setActiveBranch(firstBranchId));
            
            // 添加session-switching类以启用平滑过渡
            const canvasContent = document.querySelector('.canvas-content');
            if (canvasContent) {
              canvasContent.classList.add('session-switching');
            }
            
            // 计算所有分支的边界
            let minX = Infinity;
            let minY = Infinity;
            let maxX = -Infinity;
            let maxY = -Infinity;
            
            conversationBranches.forEach(branch => {
              if (branch && branch.position) {
                minX = Math.min(minX, branch.position.x);
                minY = Math.min(minY, branch.position.y);
                maxX = Math.max(maxX, branch.position.x + (branch.width || 300));
                maxY = Math.max(maxY, branch.position.y + (branch.height || 200));
              }
            });
            
            // 使用更平滑的方式设置视图范围
            const padding = 100;
            dispatch(zoomToArea({
              minX: minX - padding,
              minY: minY - padding,
              maxX: maxX + padding,
              maxY: maxY + padding,
              padding: padding,
              animate: true
            }));
            
            // 更新视口
            updateViewportInRedux();
            
            // 在短暂延迟后隐藏旧内容，完成过渡
            setTimeout(() => {
              setShowOldContent(false);
              
              // 延迟关闭毛玻璃效果，确保新内容完全加载，但缩短时间
              setTimeout(() => {
                setFadeTransition(false);
                setIsSwitchingConversation(false);
                
                // 清除session-switching类
                if (canvasContent) {
                  canvasContent.classList.remove('session-switching');
                }
              }, 100);
            }, 200);
          } else {
            // 没有分支数据
            console.warn('Canvas组件: 会话没有分支数据');
            dispatch({ type: 'branches/clearAll' });
            
            // 延迟关闭过渡效果，确保毛玻璃效果持续足够长的时间，但缩短时间
            setTimeout(() => {
              setShowOldContent(false);
              
              setTimeout(() => {
                setFadeTransition(false);
                setIsSwitchingConversation(false);
              }, 100);
            }, 200);
          }
        })
        .catch((error: any) => {
          console.error('Canvas组件: 加载会话数据失败', error);
          dispatch({ type: 'branches/clearAll' });
          
          // 延迟关闭过渡效果，确保毛玻璃效果持续足够长的时间，但缩短时间
          setTimeout(() => {
            setShowOldContent(false);
            
            setTimeout(() => {
              setFadeTransition(false);
              setIsSwitchingConversation(false);
            }, 100);
          }, 200);
        });
    } else if (!currentConversationId) {
      // 清空画布状态
      dispatch(resetCanvasView());
      dispatch(setActiveBranch(null));
      dispatch({ type: 'branches/clearAll' });
      lastLoadedConversationIdRef.current = null;
      setShowOldContent(false);
      setOldBranches({});
    }
    
    return () => {
      isMounted = false;
    };
  }, [currentConversationId, dispatch, updateViewportInRedux, canvasRef, branches]);

  // 替换依赖于updateViewportInRedux的useEffect，避免不必要的更新
  useEffect(() => {
    if (activeBranchId && branches && Object.keys(branches).length > 0) {
      // 当有活动分支且分支数据已加载时，更新视口
      updateViewportInRedux();
    }
  }, [activeBranchId, updateViewportInRedux]);

  // 处理右键菜单
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    
    // 计算真实画布坐标
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    
    // 判断是否点击在分支上
    const target = e.target;
    
    // 确保目标是有效的DOM元素
    if (!(target instanceof Element)) {
      // 如果不是Element实例，在画布上打开通用菜单
      setContextMenuVisible(true);
      setContextMenuPosition({ x: e.clientX, y: e.clientY });
      return;
    }
    
    // 使用Element.closest方法查找最近的分支容器
    const branchContainer = target.closest('.branch-container');
    let branchId = null;
    
    if (branchContainer instanceof HTMLElement && branchContainer.dataset) {
      branchId = branchContainer.dataset.branchId || null;
    }
    
    if (branchId) {
      // 如果在分支上右键，显示分支菜单
      setContextMenuVisible(true);
      setContextMenuPosition({ x: e.clientX, y: e.clientY });
      setContextMenuBranchId(branchId);
    } else {
      // 如果不在分支上，就是在画布上的右键
      setContextMenuVisible(true);
      setContextMenuPosition({ x: e.clientX, y: e.clientY });
    }
  }, []);
  
  // 处理画布点击，包括双击检测
  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    // 如果正在拖拽，不处理点击
    if (stateRef.current.isPanning) return;
    
    // 点击空白处关闭上下文菜单
    if (contextMenuVisible) {
      setContextMenuVisible(false);
      return;
    }
    
    // 如果点击在分支上，跳过处理
    const target = e.target;
    if (target && target instanceof Element && target.closest('.branch-container')) {
      return;
    }
    
    // 检测双击
    const now = Date.now();
    const timeDiff = now - stateRef.current.lastClickTime;
    
    // 保存当前点击位置（相对于画布）
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      // 获取视口坐标
      const viewportX = e.clientX - rect.left;
      const viewportY = e.clientY - rect.top;
      
      // 转换为世界坐标
      const worldX = (viewportX - stateRef.current.offsetX) / stateRef.current.scale;
      const worldY = (viewportY - stateRef.current.offsetY) / stateRef.current.scale;
      
      // 更新ref而不是状态
      stateRef.current.clickPosition = { x: worldX, y: worldY };
      
      // 如果双击，创建新节点
      if (timeDiff < 300) {
        console.log('在画布上检测到双击，位置:', {viewportX, viewportY, worldX, worldY});
        e.preventDefault(); // 防止其他双击事件
        e.stopPropagation();
        handleCreateNode({ x: worldX, y: worldY });
      }
    }
    
    // 更新ref而不是状态
    stateRef.current.lastClickTime = now;
  }, [contextMenuVisible, handleCreateNode]);
  
  // 优化分支位置更新处理，确保与BranchComponent同步
  const handleBranchPositionChange = useCallback((branchId: string, position: Position) => {
    // 使用本地更新而不是发送API请求
    dispatch(updateBranchPositionLocal({ branchId, position }));
    
    // 使用防抖函数延迟发送实际的API更新请求
    debouncedUpdateBranchPosition(branchId, position);
  }, [dispatch]);

  // 创建一个防抖版本的分支位置更新函数
  const debouncedUpdateBranchPosition = useMemo(() => 
    debounce((branchId: string, position: Position) => {
      console.log('发送防抖后的分支位置更新请求', branchId, position);
      dispatch(updateBranch({ branchId, updates: { position } }) as any);
    }, 500), // 500ms防抖延迟
  [dispatch]);

  // 清理防抖函数
  useEffect(() => {
    return () => {
      debouncedUpdateBranchPosition.cancel();
    };
  }, [debouncedUpdateBranchPosition]);
  
  // 根据上下文菜单的目标决定显示哪些菜单项
  const menuItems = useMemo(() => {
    // 如果在分支上右键，显示分支菜单
    if (contextMenuBranchId) {
      return [
        {
          key: 'create-child',
          label: '创建子节点',
          icon: <PlusOutlined />,
          onClick: () => {
            // 计算合适的位置 - 在父节点右下角一定距离
            const parentBranch = branches[contextMenuBranchId];
            if (parentBranch) {
              const childX = parentBranch.position.x + 200;
              const childY = parentBranch.position.y + 100;
              handleCreateNode({ x: childX, y: childY });
            }
            setContextMenuVisible(false);
          }
        },
        {
          key: 'delete-branch',
          label: '删除节点',
          icon: <DeleteOutlined />,
          danger: true,
          onClick: async () => {
            // 检查用户偏好，是否显示删除确认
            try {
              // 使用类型断言处理preferences API
              const api = window.electronAPI as any;
              let showConfirmation = true;
              
              if (api && api.preferences && typeof api.preferences.getPreference === 'function') {
                showConfirmation = await api.preferences.getPreference('confirmation.showDeleteConfirmation');
              }
              
              // 如果设置为false，直接删除
              if (showConfirmation === false) {
                if (contextMenuBranchId) {
                  confirmDeleteBranch(contextMenuBranchId);
                }
              } else {
                // 显示删除确认气泡
                setBranchToDelete(contextMenuBranchId);
                setConfirmDeleteVisible(true);
              }
            } catch (error) {
              console.warn('获取偏好设置失败:', error);
              // 如果获取失败，显示删除确认气泡
              setBranchToDelete(contextMenuBranchId);
              setConfirmDeleteVisible(true);
            }
            
            setContextMenuVisible(false);
          }
        }
      ];
    } else {
      // 画布上的通用菜单
      return [
        {
          key: 'create-node',
          label: '创建新节点',
          icon: <PlusOutlined />,
          onClick: () => {
            if (!canvasRef.current) return;
            
            const rect = canvasRef.current.getBoundingClientRect();
            // 使用菜单位置创建节点，使用ref中的值
            const worldX = (contextMenuPosition.x - rect.left - stateRef.current.offsetX) / stateRef.current.scale;
            const worldY = (contextMenuPosition.y - rect.top - stateRef.current.offsetY) / stateRef.current.scale;
            
            handleCreateNode({ x: worldX, y: worldY });
            setContextMenuVisible(false);
          }
        },
        {
          key: 'reset-view',
          label: '重置视图',
          icon: <FullscreenOutlined />,
          onClick: () => {
            resetView();
            setContextMenuVisible(false);
          }
        }
      ];
    }
  }, [contextMenuBranchId, contextMenuPosition, branches, handleCreateNode, resetView, dispatch]);
  
  // 判断是否显示欢迎提示
  const showWelcomeGuide = useMemo(() => {
    // 如果正在切换会话，不显示欢迎界面
    if (isSwitchingConversation) return false;
    
    // 如果正在显示旧内容或处于过渡动画中，不显示欢迎界面
    if (showOldContent || fadeTransition) return false;
    
    // 如果有会话ID但还没有加载完数据，不显示欢迎界面
    if (currentConversationId && lastLoadedConversationIdRef.current === currentConversationId) return false;
    
    // 正常情况下，只有当branches为空时才显示欢迎界面
    return Object.values(branches).length === 0;
  }, [branches, isSwitchingConversation, showOldContent, fadeTransition, currentConversationId]);

  // 创建新分支按钮处理
  const handleCreateNewBranch = useCallback(() => {
    // 获取画布元素
    const canvasElement = canvasRef.current;
    if (!canvasElement) return;

    // 获取画布的尺寸
    const rect = canvasElement.getBoundingClientRect();

    // 确保节点创建在当前视图的中心
    const viewCenterScreenX = rect.width / 2;
    const viewCenterScreenY = rect.height / 2;
    
    // 从屏幕坐标转换为世界坐标
    const viewCenterWorldX = (viewCenterScreenX - stateRef.current.offsetX) / stateRef.current.scale;
    const viewCenterWorldY = (viewCenterScreenY - stateRef.current.offsetY) / stateRef.current.scale;
    
    console.log('创建节点在视图中心:', {
      viewCenterScreenX, viewCenterScreenY,
      viewCenterWorldX, viewCenterWorldY,
      offsetX: stateRef.current.offsetX,
      offsetY: stateRef.current.offsetY,
      scale: stateRef.current.scale
    });
    
    // 创建分支
    handleCreateNode({ x: viewCenterWorldX, y: viewCenterWorldY });
  }, [handleCreateNode, canvasRef]);

  // 缩放控制
  const handleZoomIn = useCallback(() => {
    dispatch(setCanvasTransform({ 
      scale: Math.min(3, stateRef.current.scale * 1.2),
      offsetX: stateRef.current.offsetX,
      offsetY: stateRef.current.offsetY 
    }));
  }, [dispatch]);

  const handleZoomOut = useCallback(() => {
    dispatch(setCanvasTransform({ 
      scale: Math.max(0.2, stateRef.current.scale / 1.2),
      offsetX: stateRef.current.offsetX,
      offsetY: stateRef.current.offsetY
    }));
  }, [dispatch]);

  // 双击节点以聚焦
  const handleNodeDoubleClick = useCallback((branchId: string) => {
    const branch = branches[branchId];
    if (!branch) return;
    
    // 设置活动分支
    dispatch(setActiveBranch(branchId));
    
    // 获取节点的位置和尺寸
    const width = branch.width || 300;
    const height = branch.height || 300;
    
    // 计算包含区域，加入一些边距
    const padding = 100;
    const area = {
      minX: branch.position.x - padding,
      minY: branch.position.y - padding,
      maxX: branch.position.x + width + padding,
      maxY: branch.position.y + height + padding,
      padding
    };
    
    // 缩放到该区域
    dispatch(zoomToArea(area));
  }, [branches, dispatch]);

  // 处理画布拖动
  const handleCanvasMouseMove = useCallback((e: MouseEvent) => {
    if (!stateRef.current.isPanning || !stateRef.current.lastPanPoint) return;
    
    const currentWorld = clientToWorld(e.clientX, e.clientY);
    const deltaWorld = {
      x: currentWorld.x - stateRef.current.lastPanPoint.x,
      y: currentWorld.y - stateRef.current.lastPanPoint.y
    };
    
    // 计算新的画布偏移（视口坐标系）
    const newOffsetX = stateRef.current.offsetX + deltaWorld.x * canvasTransform.scale;
    const newOffsetY = stateRef.current.offsetY + deltaWorld.y * canvasTransform.scale;
    
    // 更新Redux状态
    dispatch(updateViewport({
      minX: -newOffsetX / canvasTransform.scale,
      minY: -newOffsetY / canvasTransform.scale,
      maxX: (window.innerWidth - newOffsetX) / canvasTransform.scale,
      maxY: (window.innerHeight - newOffsetY) / canvasTransform.scale,
      width: window.innerWidth,
      height: window.innerHeight,
      scale: canvasTransform.scale,
      offsetX: newOffsetX,
      offsetY: newOffsetY
    }));
  }, [stateRef.current.isPanning, stateRef.current.lastPanPoint, canvasTransform.scale, dispatch, clientToWorld]);
  
  // 类型修复：检查branches是否为对象而非数组
  const checkBranches = () => {
    // 如果正在切换会话，返回true以避免显示欢迎页面或加载指示器
    if (isSwitchingConversation) return true;
    
    // 如果有旧分支数据或正在执行过渡动画，也返回true
    if (showOldContent && Object.keys(oldBranches).length > 0) return true;
    if (fadeTransition) return true;
    
    // 如果当前有会话ID但没有分支数据，且不是切换状态，这可能是一个真正的空会话
    if (currentConversationId && lastLoadedConversationIdRef.current === currentConversationId) {
      // 此时不隐藏"当前会话没有节点"的提示
      return branches && typeof branches === 'object' && Object.keys(branches).length > 0;
    }
    
    // 处理初始情况 - 只有当真正没有会话时才返回false
    return currentConversationId !== null || (branches && typeof branches === 'object' && Object.keys(branches).length > 0);
  };

  // 确认删除分支
  const confirmDeleteBranch = async (branchId: string) => {
    try {
      await dispatch(deleteBranch(branchId) as any);
      message.success('节点已删除');
      
      // 如果被删除的节点是当前选中的节点，清除选中状态
      if (selectedNodes.includes(branchId)) {
        setSelectedNodes(selectedNodes.filter(id => id !== branchId));
      }
      
      // 保存用户偏好
      if (doNotShowDeleteConfirm) {
        try {
          const api = window.electronAPI as any;
          if (api?.preferences?.setPreference) {
            await api.preferences.setPreference('confirmation.showDeleteConfirmation', false);
          }
        } catch (error) {
          console.warn('保存偏好设置失败:', error);
        }
      }
    } catch (error) {
      message.error('删除节点失败');
      console.error('删除节点失败:', error);
    } finally {
      setConfirmDeleteVisible(false);
      setBranchToDelete(null);
    }
  };

  // 为连接线层创建简单的空函数，使接口一致
  const getBranchesForConnectionLayer = () => {
    return branches;
  };

  // 处理删除节点
  const handleDeleteNode = (branchId: string) => {
    console.log('准备删除节点:', branchId);
    
    if (branchId === 'main') {
      console.log('尝试删除主分支，操作被拒绝');
      message.error('无法删除主分支');
      return;
    }
    
    modal.confirm({
      title: '确认删除',
      content: (
        <div>
          <div style={{ marginBottom: '16px' }}>
            <span style={{ 
              display: 'inline-block', 
              marginRight: '8px',
              color: '#FF3B30',
              fontSize: '16px',
              verticalAlign: 'middle'
            }}>
              <DeleteOutlined />
            </span>
            删除此节点将同时删除其所有子节点，此操作不可撤销。确定要继续吗？
          </div>
          <Checkbox 
            onChange={(e) => {
              console.log('设置不再提示:', e.target.checked);
              try {
                const api = window.electronAPI as any;
                if (api?.preferences?.setPreference) {
                  api.preferences.setPreference('confirmation.showDeleteConfirmation', !e.target.checked);
                }
              } catch (error) {
                console.warn('保存偏好设置失败:', error);
              }
            }}
          >
            不再提示
          </Checkbox>
        </div>
      ),
      okText: '删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        console.log('确认删除节点:', branchId);
        try {
          await dispatch(deleteBranch(branchId) as any);
          console.log('节点删除成功:', branchId);
          message.success('节点已删除');
          
          // 如果被删除的节点是当前选中的节点，清除选中状态
          if (selectedNodes.includes(branchId)) {
            console.log('清除已删除节点的选中状态');
            setSelectedNodes(selectedNodes.filter(id => id !== branchId));
          }
        } catch (error) {
          console.error('删除节点失败:', error);
          message.error('删除节点失败');
        }
      },
      onCancel: () => {
        console.log('取消删除节点:', branchId);
      },
      maskClosable: false,
      centered: true,
      width: 480,
      className: 'delete-confirm-modal',
      style: { 
        backdropFilter: 'blur(10px)',
        background: 'rgba(255, 255, 255, 0.95)'
      }
    });
  };

  // 处理节点全屏显示
  const handleFullscreenNode = useCallback((branchId: string) => {
    const branch = branches[branchId];
    if (!branch || !canvasRef.current) return;

    const canvasRect = canvasRef.current.getBoundingClientRect();
    const canvasCenter = {
      x: canvasRect.width / 2,
      y: canvasRect.height / 2
    };

    // 计算需要移动的距离
    const deltaX = canvasCenter.x - branch.position.x;
    const deltaY = canvasCenter.y - branch.position.y;

    // 更新所有节点的位置
    Object.keys(branches).forEach(id => {
      const currentBranch = branches[id];
      dispatch(updateBranchPositionLocal({
        branchId: id,
        position: {
          x: currentBranch.position.x + deltaX,
          y: currentBranch.position.y + deltaY
        }
      }));
    });
  }, [branches, dispatch]);

  // 处理节点连接
  const handleConnectNode = useCallback((branchId: string) => {
    // 如果已经选中了一个节点，就创建连接
    if (selectedNodes.includes(branchId)) {
      // TODO: 实现节点连接逻辑
      message.info('节点连接功能正在开发中');
    } else {
      // 否则选中当前节点
      setSelectedNodes([...selectedNodes, branchId]);
    }
  }, [selectedNodes]);

  // 渲染节点
  const renderNode = useCallback((branch: Branch) => {
    return (
      <BranchComponent
        key={branch.id}
        branch={branch}
        isActive={selectedNodes.includes(branch.id)}
        onPositionChange={(position) => handleBranchPositionChange(branch.id, position)}
        onDelete={(id) => {
          console.log('触发删除节点:', id);
          handleDeleteNode(id);
        }}
        onFullscreen={handleFullscreenNode}
        onConnect={handleConnectNode}
      />
    );
  }, [selectedNodes, handleBranchPositionChange, handleDeleteNode, handleFullscreenNode, handleConnectNode]);

  // 渲染 - 重构组件结构确保正确的嵌套关系
  return (
    <CanvasContainer
      id="canvas-container"
      ref={canvasRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleReactMouseMove}
      onMouseUp={handleReactMouseUp}
      onWheel={handleWheel}
      onMouseLeave={handleMouseLeave}
      onContextMenu={handleContextMenu}
      style={{ cursor: cursorStyle }}
      data-testid="canvas-container"
    >
      {/* 当前内容 */}
      <FadeTransition visible={!showOldContent || !fadeTransition}>
        <CanvasContent
          ref={contentRef}
          className={`canvas-content ${stateRef.current.isPanning ? 'dragging' : ''}`}
          style={{
            transform: `matrix(${canvasTransform.scale}, 0, 0, ${canvasTransform.scale}, ${canvasTransform.offsetX}, ${canvasTransform.offsetY})`
          }}
        >
          {/* 加载状态指示器 - 在切换会话时不显示 */}
          {!checkBranches() && !isSwitchingConversation ? (
            <div style={{ 
              position: 'absolute', 
              top: '50%', 
              left: '50%', 
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              padding: '20px',
              background: 'rgba(255,255,255,0.9)',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
              {currentConversationId ? (
                <div>
                  {/* 不再显示加载画布中文本 */}
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: '18px', marginBottom: '10px' }}>请选择或创建一个会话</div>
                  <div style={{ fontSize: '14px', color: '#666' }}>在左侧边栏选择一个现有会话或创建新会话</div>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* 连接线层 */}
              {checkBranches() ? (
                <BranchesWrapper>
                  {/* 连接线层 - 现在不会显示任何连接线 */}
                  <ConnectionsLayer branches={getBranchesForConnectionLayer()} />
                  
                  {Object.values(branches).map((branch: Branch) => (
                    <BranchComponent
                      key={branch.id}
                      branch={branch}
                      isActive={branch.id === activeBranchId}
                      onPositionChange={(position: Position) => handleBranchPositionChange(branch.id, position)}
                      onDoubleClick={() => handleNodeDoubleClick(branch.id)}
                      onDelete={handleDeleteNode}
                    />
                  ))}
                </BranchesWrapper>
              ) : (
                /* 空状态提示 - 只在非切换状态且有指定会话ID时显示 */
                !isSwitchingConversation && 
                currentConversationId !== null && 
                !showOldContent && 
                !fadeTransition && (
                  <EmptyStateTip>当前会话没有节点</EmptyStateTip>
                )
              )}
            </>
          )}
        </CanvasContent>
      </FadeTransition>
      
      {/* 旧内容 - 用于过渡动画 */}
      {showOldContent && (
        <FadeTransition visible={showOldContent && fadeTransition}>
          <CanvasContent
            className={`canvas-content`}
            style={{
              transform: `matrix(${canvasTransform.scale}, 0, 0, ${canvasTransform.scale}, ${canvasTransform.offsetX}, ${canvasTransform.offsetY})`
            }}
          >
            {Object.keys(oldBranches).length > 0 && (
              <>
                {/* 旧的连接线 - 现在不会显示任何连接线 */}
                <ConnectionsLayer branches={oldBranches} />
                
                {/* 旧的分支节点 */}
                {Object.values(oldBranches).map((branch: Branch) => (
                  <BranchComponent
                    key={branch.id}
                    branch={branch}
                    isActive={false}
                    onPositionChange={() => {}}
                    onDoubleClick={() => {}}
                  />
                ))}
              </>
            )}
          </CanvasContent>
        </FadeTransition>
      )}
      
      {/* 添加过渡期间的背景模糊效果 */}
      <TransitionOverlay active={isSwitchingConversation || fadeTransition} />
      
      {/* 欢迎界面 - 仅在初始状态且没有分支时显示 */}
      {!isSwitchingConversation && !showOldContent && !fadeTransition && showWelcomeGuide && (
        <WelcomeGuide>
          <WelcomeTitle>欢迎使用 MindStream</WelcomeTitle>
          <WelcomeContent>
            点击右上角的"+"按钮或在空白处双击鼠标，创建你的第一个思考节点。
            <br />
            你可以拖动节点改变位置，使用节点控制点调整大小，通过节点间连接展示思维流。
          </WelcomeContent>
          <WelcomeAction>
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={async () => {
                console.log('直接在Canvas中处理创建节点按钮点击');
                
                if (!currentConversationId) {
                  console.log('创建新会话并添加节点');
                  try {
                    const api = window.electronAPI as any;
                    if (api && api.conversation && typeof api.conversation.create === 'function') {
                      const result = await api.conversation.create();
                      if (result && result.id) {
                        await dispatch(fetchConversationSilently(result.id) as any);
                        
                        // 获取画布的中心位置
                        const canvasElement = canvasRef.current;
                        if (canvasElement) {
                          const rect = canvasElement.getBoundingClientRect();
                          const centerX = (rect.width / 2 - stateRef.current.offsetX) / stateRef.current.scale;
                          const centerY = (rect.height / 2 - stateRef.current.offsetY) / stateRef.current.scale;
                          
                          handleCreateNode({ x: centerX, y: centerY });
                        } else {
                          // 如果无法获取画布元素，使用默认位置
                          handleCreateNode({ x: 0, y: 0 });
                        }
                      }
                    }
                  } catch (error) {
                    console.error('创建会话失败:', error);
                    Modal.error({
                      title: '创建会话失败',
                      content: `出现错误: ${(error as Error).message}`
                    });
                  }
                } else {
                  console.log('使用现有会话创建节点');
                  
                  // 获取画布的中心位置
                  const canvasElement = canvasRef.current;
                  if (canvasElement) {
                    const rect = canvasElement.getBoundingClientRect();
                    const centerX = (rect.width / 2 - stateRef.current.offsetX) / stateRef.current.scale;
                    const centerY = (rect.height / 2 - stateRef.current.offsetY) / stateRef.current.scale;
                    
                    handleCreateNode({ x: centerX, y: centerY });
                  } else {
                    // 如果无法获取画布元素，使用默认位置
                    handleCreateNode({ x: 0, y: 0 });
                  }
                }
              }}
            >
              创建第一个节点
            </Button>
          </WelcomeAction>
        </WelcomeGuide>
      )}
      
      {contextMenuVisible && (
        <Menu
          style={{
            position: 'absolute',
            left: contextMenuPosition.x,
            top: contextMenuPosition.y,
            zIndex: 1000
          }}
          items={menuItems}
        />
      )}
      
      <CanvasControls>
        <Tooltip title="放大">
          <Button 
            icon={<ZoomInOutlined />} 
            onClick={handleZoomIn}
            shape="circle"
          />
        </Tooltip>
        <Tooltip title="缩小">
          <Button 
            icon={<ZoomOutOutlined />} 
            onClick={handleZoomOut}
            shape="circle"
          />
        </Tooltip>
        <Tooltip title="重置视图">
          <Button 
            icon={<FullscreenOutlined />} 
            onClick={resetView}
            shape="circle"
          />
        </Tooltip>
      </CanvasControls>
      
      <CreateNodeButton>
        <Tooltip title="创建新节点">
          <Button
            type="primary"
            shape="circle"
            icon={<PlusOutlined />}
            onClick={handleCreateNewBranch}
            size="large"
          />
        </Tooltip>
      </CreateNodeButton>
      
      {branchToDelete && (
        <StyledPopconfirm
          title="确认删除"
          description={
            <div>
              <div style={{ 
                fontSize: '14px', 
                lineHeight: '1.6', 
                color: '#444',
                marginBottom: '8px'
              }}>
                <span style={{ 
                  display: 'inline-block', 
                  marginRight: '8px',
                  color: '#FF3B30',
                  fontSize: '16px',
                  verticalAlign: 'middle'
                }}>
                  <DeleteOutlined />
                </span>
                删除此节点将同时删除其所有子节点，此操作不可撤销。确定要继续吗？
              </div>
              <StyledCheckbox 
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDoNotShowDeleteConfirm(e.target.checked)}
              >
                不再提示
              </StyledCheckbox>
            </div>
          }
          open={confirmDeleteVisible}
          onConfirm={() => branchToDelete && confirmDeleteBranch(branchToDelete)}
          onCancel={() => {
            setConfirmDeleteVisible(false);
            setBranchToDelete(null);
          }}
          okText="删除"
          cancelText="取消"
          okButtonProps={{ danger: true }}
          overlayStyle={{ 
            backdropFilter: 'blur(10px)',
            background: 'rgba(255, 255, 255, 0.95)'
          }}
          overlayInnerStyle={{
            animation: 'popIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}
          placement="top"
          mouseEnterDelay={0.1}
          mouseLeaveDelay={0.2}
        />
      )}
    </CanvasContainer>
  );
};

export default React.memo(Canvas); 