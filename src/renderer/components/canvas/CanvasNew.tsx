import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import styled, { createGlobalStyle } from 'styled-components';
import { Menu, Button, Tooltip, Popconfirm, Checkbox, App } from 'antd';
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
import useAppSelector from '../../hooks/useAppSelector';

// ... rest of imports ...

const Canvas: React.FC = () => {
  const { message, modal } = App.useApp();
  const dispatch = useDispatch();
  const branches = useAppSelector(selectBranches);
  const activeBranchId = useAppSelector(selectActiveBranchId);
  const canvasTransform = useAppSelector(selectCanvasTransform);
  const currentConversationId = useAppSelector(selectCurrentConversationId);
  const currentConversation = useAppSelector(selectCurrentConversation);
  const messages = useAppSelector(selectMessages);

  // ... rest of the component code, replacing all Modal.error with modal.error ...

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
      {/* ... rest of the JSX ... */}
    </CanvasContainer>
  );
};

export default React.memo(Canvas); 