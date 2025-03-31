import React from 'react';
import styled from 'styled-components';
import { Tooltip } from 'antd';
import { BranchesOutlined, CopyOutlined, DeleteOutlined } from '@ant-design/icons';
import { Message } from '../../types/models';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store';
import { createBranchFromMessage } from '../../store/slices/branchSlice';
import { selectBranches } from '../../store/selectors/canvasSelectors';
import { calculatePositionForChildBranch } from '../../utils/branchPositioning';
import { removeMessage } from '../../store/slices/messageSlice';
import { openModal } from '../../store/slices/uiSlice';
import { messageStore } from '../../../main/services/store';
import { handleGenerateAIResponse as generateAIResponse } from '../../../main/ipc/messageHandlers';
import { AppDispatch } from '../../store';

interface MessageComponentProps {
  message: Message;
}

const MessageContainer = styled.div<{ role: string }>`
  display: flex;
  flex-direction: column;
  padding: 10px 12px;
  border-radius: 12px;
  position: relative;
  box-shadow: 0 1px 1px rgba(0, 0, 0, 0.01);
  transition: all 0.2s;
  
  background-color: ${props => {
    switch (props.role) {
      case 'user':
        return 'var(--user-message-color, rgba(240, 247, 255, 0.7))';
      case 'assistant':
        return 'var(--ai-message-color, rgba(248, 249, 250, 0.7))';
      case 'system':
        return 'rgba(245, 245, 245, 0.7)';
      default:
        return 'rgba(255, 255, 255, 0.7)';
    }
  }};
  
  border-left: 2px solid ${props => {
    switch (props.role) {
      case 'user':
        return 'rgba(74, 134, 232, 0.6)';
      case 'assistant':
        return 'var(--primary-color, rgba(74, 134, 232, 0.6))';
      case 'system':
        return 'rgba(158, 158, 158, 0.6)';
      default:
        return 'transparent';
    }
  }};
  
  &:hover {
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
    background-color: ${props => {
      switch (props.role) {
        case 'user':
          return 'var(--user-message-color, rgba(240, 247, 255, 0.9))';
        case 'assistant':
          return 'var(--ai-message-color, rgba(248, 249, 250, 0.9))';
        case 'system':
          return 'rgba(245, 245, 245, 0.9)';
        default:
          return 'rgba(255, 255, 255, 0.9)';
      }
    }};
  }
`;

const MessageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
  align-items: center;
  opacity: 0.9;
`;

const MessageLabel = styled.div<{ role: string }>`
  font-size: 12px;
  font-weight: 500;
  color: ${props => {
    switch (props.role) {
      case 'user':
        return 'rgba(74, 134, 232, 0.9)';
      case 'assistant':
        return 'var(--primary-color, rgba(74, 134, 232, 0.9))';
      case 'system':
        return 'rgba(158, 158, 158, 0.9)';
      default:
        return 'var(--text-color, rgba(32, 33, 36, 0.9))';
    }
  }};
`;

const MessageTimestamp = styled.div`
  font-size: 10px;
  color: rgba(154, 160, 166, 0.8);
`;

const MessageContent = styled.div`
  font-size: 14px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
  color: rgba(51, 51, 51, 0.9);
  
  p:first-child {
    margin-top: 0;
  }
  
  p:last-child {
    margin-bottom: 0;
  }
  
  code {
    background-color: rgba(0, 0, 0, 0.02);
    padding: 2px 4px;
    border-radius: 4px;
    font-family: 'Courier New', monospace;
    font-size: 13px;
  }
  
  pre {
    background-color: rgba(0, 0, 0, 0.05);
    padding: 8px;
    border-radius: 4px;
    overflow-x: auto;
    font-family: 'Courier New', monospace;
  }
`;

const MessageActions = styled.div`
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;
  
  ${MessageContainer}:hover & {
    opacity: 1;
  }
`;

const ActionButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  color: var(--light-text, #70757a);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 4px;
  
  &:hover {
    background-color: rgba(0, 0, 0, 0.05);
    color: var(--text-color, #202124);
  }
`;

const MessageBubble = styled(MessageContainer)`
  max-width: 100%;
  margin: 5px 0;
  align-self: ${props => (props.role === 'user' ? 'flex-end' : 'flex-start')};
  border-radius: 12px;
  background-color: ${props => {
    switch (props.role) {
      case 'user':
        return 'var(--user-message-color, rgba(240, 247, 255, 0.9))';
      case 'assistant':
        return 'var(--ai-message-color, rgba(248, 249, 250, 0.9))';
      case 'system':
        return 'rgba(245, 245, 245, 0.9)';
      default:
        return 'rgba(255, 255, 255, 0.9)';
    }
  }};
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  position: relative;
  width: 100%;
  display: flex;
  flex-direction: column;
  
  /* Add fade-in animation for new messages */
  animation: message-fade-in 0.3s ease-out;
  
  @keyframes message-fade-in {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  &:before {
    content: '';
    position: absolute;
    ${props => props.role === 'user' ? 'right: -8px;' : 'left: -8px;'}
    top: 10px;
    width: 0;
    height: 0;
    border-style: solid;
    ${props => props.role === 'user' 
      ? 'border-width: 8px 0 8px 8px;'
      : 'border-width: 8px 8px 8px 0;'
    }
    border-color: ${props => {
      const backgroundColor = props.role === 'user'
        ? 'var(--user-message-color, rgba(240, 247, 255, 0.9))'
        : props.role === 'assistant'
          ? 'var(--ai-message-color, rgba(248, 249, 250, 0.9))'
          : 'rgba(245, 245, 245, 0.9)';
      return `transparent ${props.role === 'user' ? backgroundColor : 'transparent'} transparent ${props.role === 'user' ? 'transparent' : backgroundColor}`;
    }};
  }
`;

const MessageComponent: React.FC<MessageComponentProps> = ({ message }) => {
  const dispatch = useDispatch<AppDispatch>();
  const branches = useSelector((state: RootState) => selectBranches(state));
  
  // 格式化时间戳 - 使用useMemo缓存结果
  const formattedTimestamp = React.useMemo(() => {
    const date = new Date(message.timestamp);
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }, [message.timestamp]);
  
  // 获取角色标签 - 使用useMemo缓存结果
  const roleLabel = React.useMemo(() => {
    switch (message.role) {
      case 'user':
        return '用户';
      case 'assistant':
        return '助手';
      case 'system':
        return '系统';
      default:
        return message.role;
    }
  }, [message.role]);
  
  // 复制消息内容 - 使用useCallback避免重新创建函数
  const handleCopy = React.useCallback(() => {
    navigator.clipboard.writeText(message.content)
      .then(() => {
        console.log('消息已复制到剪贴板');
      })
      .catch(err => {
        console.error('复制失败:', err);
      });
  }, [message.content]);
  
  // 从此消息创建新分支 - 使用useCallback避免重新创建函数
  const handleCreateBranch = React.useCallback(() => {
    const sourceBranch = branches[message.branchId];
    if (!sourceBranch) return;
    
    // 计算新分支的位置
    const existingBranches = Object.values(branches);
    const position = calculatePositionForChildBranch(
      sourceBranch.position,
      existingBranches
    );
    
    // 创建分支
    dispatch(createBranchFromMessage({
      messageId: message.id,
      parentBranchId: message.branchId,
      position,
    }));
  }, [branches, message.branchId, message.id, dispatch]);
  
  // 删除消息 - 使用useCallback避免重新创建函数
  const handleDelete = React.useCallback(() => {
    dispatch(openModal('confirm-delete-message'));
    // 存储要删除的消息ID，以便确认对话框访问
    sessionStorage.setItem('messageToDelete', message.id);
  }, [dispatch, message.id]);

  return (
    <MessageBubble role={message.role}>
      <MessageHeader>
        <MessageLabel role={message.role}>{roleLabel}</MessageLabel>
        <MessageTimestamp>{formattedTimestamp}</MessageTimestamp>
      </MessageHeader>
      <MessageContent>{message.content}</MessageContent>
      <MessageActions>
        <Tooltip title="复制">
          <ActionButton onClick={handleCopy}>
            <CopyOutlined style={{ fontSize: '14px' }} />
          </ActionButton>
        </Tooltip>
        <Tooltip title="创建分支">
          <ActionButton onClick={handleCreateBranch}>
            <BranchesOutlined style={{ fontSize: '14px' }} />
          </ActionButton>
        </Tooltip>
        <Tooltip title="删除">
          <ActionButton onClick={handleDelete}>
            <DeleteOutlined style={{ fontSize: '14px' }} />
          </ActionButton>
        </Tooltip>
      </MessageActions>
    </MessageBubble>
  );
};

// 使用React.memo包装组件，只有当props变化时才重新渲染
export default React.memo(MessageComponent, (prevProps, nextProps) => {
  // 只有当消息ID和内容相同时，认为是相同的消息，不需要重新渲染
  return prevProps.message.id === nextProps.message.id && 
         prevProps.message.content === nextProps.message.content;
});