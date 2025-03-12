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
  const dispatch = useDispatch();
  const branches = useSelector((state: RootState) => selectBranches(state));
  
  // 格式化时间戳
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };
  
  // 获取角色标签
  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'user':
        return '用户';
      case 'assistant':
        return '助手';
      case 'system':
        return '系统';
      default:
        return role;
    }
  };
  
  // 复制消息内容
  const handleCopy = () => {
    navigator.clipboard.writeText(message.content)
      .then(() => {
        console.log('消息已复制到剪贴板');
      })
      .catch(err => {
        console.error('复制失败:', err);
      });
  };
  
  // 从此消息创建分支
  const handleCreateBranch = () => {
    // 获取父分支
    const parentBranch = Object.values(branches).find(
      branch => branch.id === message.branchId
    );
    
    if (!parentBranch) {
      console.error('无法找到消息所属的分支');
      return;
    }
    
    // 计算新分支的位置
    const existingBranches = Object.values(branches);
    let position = { x: 0, y: 0 };
    
    if (parentBranch.position) {
      position = calculatePositionForChildBranch(
        parentBranch.position,
        existingBranches
      );
    }
    
    // 显示创建分支的模态框
    dispatch(openModal('create-branch-from-message') as any);
    
    // 存储数据到会话存储或Redux中，以便模态框访问
    sessionStorage.setItem('branchFromMessageData', JSON.stringify({
      parentBranchId: parentBranch.id,
      messageId: message.id,
      position
    }));
  };
  
  // 删除消息
  const handleDelete = () => {
    if (window.confirm('确定要删除这条消息吗？')) {
      dispatch(removeMessage(message.id) as any);
    }
  };
  
  return (
    <MessageBubble role={message.role}>
      <MessageHeader>
        <MessageLabel role={message.role}>
          {getRoleLabel(message.role)}
        </MessageLabel>
        <MessageTimestamp>
          {formatTimestamp(message.timestamp)}
        </MessageTimestamp>
      </MessageHeader>
      
      <MessageContent>
        {message.content}
      </MessageContent>
      
      <MessageActions>
        <Tooltip title="复制">
          <ActionButton onClick={handleCopy}>
            <CopyOutlined />
          </ActionButton>
        </Tooltip>
        
        {message.role !== 'system' && (
          <Tooltip title="从此处创建分支">
            <ActionButton onClick={handleCreateBranch}>
              <BranchesOutlined />
            </ActionButton>
          </Tooltip>
        )}
        
        <Tooltip title="删除">
          <ActionButton onClick={handleDelete}>
            <DeleteOutlined />
          </ActionButton>
        </Tooltip>
      </MessageActions>
    </MessageBubble>
  );
};

export default MessageComponent;