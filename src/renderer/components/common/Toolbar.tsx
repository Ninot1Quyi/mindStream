import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import styled from 'styled-components';
import { Button, Tooltip } from 'antd';
import { 
  ZoomInOutlined, 
  ZoomOutOutlined, 
  ExpandOutlined, 
  EditOutlined,
  DownloadOutlined,
  SettingOutlined
} from '@ant-design/icons';
import { resetCanvasView, setCanvasTransform } from '../../store/slices/canvasSlice';
import { openModal } from '../../store/slices/uiSlice';
import { selectCanvasTransform } from '../../store/selectors/canvasSelectors';
import { selectCurrentConversation } from '../../store/selectors/conversationSelectors';

const ToolbarContainer = styled.div`
  height: 64px;
  border-bottom: 1px solid var(--border-color, #dee2e6);
  display: flex;
  align-items: center;
  padding: 0 16px;
  justify-content: space-between;
  background-color: white;
`;

const LeftTools = styled.div`
  display: flex;
  gap: 8px;
`;

const RightTools = styled.div`
  display: flex;
  gap: 8px;
`;

const ConversationTitleArea = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const Title = styled.h1`
  margin: 0;
  font-size: 18px;
  color: var(--header-color, #5f6368);
`;

const Toolbar: React.FC = () => {
  const dispatch = useDispatch();
  const { scale } = useSelector(selectCanvasTransform);
  const currentConversation = useSelector(selectCurrentConversation);

  // 缩放处理
  const handleZoomIn = () => {
    const newScale = Math.min(2, scale + 0.1);
    dispatch(setCanvasTransform({ scale: newScale }));
  };

  const handleZoomOut = () => {
    const newScale = Math.max(0.5, scale - 0.1);
    dispatch(setCanvasTransform({ scale: newScale }));
  };

  const handleResetView = () => {
    dispatch(resetCanvasView());
  };

  // 重命名会话
  const handleRename = () => {
    if (currentConversation) {
      dispatch(openModal('rename-conversation'));
    }
  };

  // 导出会话
  const handleExport = () => {
    if (currentConversation) {
      dispatch(openModal('export-conversation'));
    }
  };

  // 打开设置
  const handleOpenSettings = () => {
    dispatch(openModal('settings'));
  };

  return (
    <ToolbarContainer>
      <LeftTools>
        <Tooltip title="放大">
          <Button icon={<ZoomInOutlined />} onClick={handleZoomIn} />
        </Tooltip>
        <Tooltip title="缩小">
          <Button icon={<ZoomOutOutlined />} onClick={handleZoomOut} />
        </Tooltip>
        <Tooltip title="重置视图">
          <Button icon={<ExpandOutlined />} onClick={handleResetView} />
        </Tooltip>
      </LeftTools>

      <ConversationTitleArea>
        <Title>{currentConversation?.title || '新会话'}</Title>
        <Tooltip title="重命名">
          <Button 
            icon={<EditOutlined />} 
            onClick={handleRename}
            disabled={!currentConversation}
          />
        </Tooltip>
      </ConversationTitleArea>

      <RightTools>
        <Tooltip title="导出">
          <Button 
            icon={<DownloadOutlined />} 
            onClick={handleExport}
            disabled={!currentConversation}
          />
        </Tooltip>
        <Tooltip title="设置">
          <Button icon={<SettingOutlined />} onClick={handleOpenSettings} />
        </Tooltip>
      </RightTools>
    </ToolbarContainer>
  );
};

export default Toolbar; 