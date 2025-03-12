import React, { useEffect, useState, useRef } from 'react';
import { useDispatch } from 'react-redux';
import styled, { keyframes, css } from 'styled-components';
import { Button, Layout, Empty, Tooltip, Modal, Input, Popconfirm, Checkbox } from 'antd';
import { 
  PlusOutlined, 
  MenuFoldOutlined, 
  MenuUnfoldOutlined, 
  DeleteOutlined, 
  ClearOutlined,
  CheckOutlined
} from '@ant-design/icons';
import { 
  fetchConversations, 
  createConversation, 
  setCurrentConversation,
  deleteConversation,
  clearAllConversations,
  updateConversationTitle
} from '../../store/slices/conversationSlice';
import { 
  selectConversationList, 
  selectCurrentConversationId 
} from '../../store/selectors/conversationSelectors';
import { selectIsSidebarOpen } from '../../store/selectors/uiSelectors';
import { toggleSidebar } from '../../store/slices/uiSlice';
import { RootState } from '../../store';
import useAppSelector from '../../hooks/useAppSelector';

const { Sider } = Layout;

// 动画效果
const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

const pulse = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
`;

const slideIn = keyframes`
  from { transform: translateX(-20px); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
`;

const breathe = keyframes`
  0% { box-shadow: 0 0 0 rgba(0, 122, 255, 0); }
  50% { box-shadow: 0 0 10px rgba(0, 122, 255, 0.3); }
  100% { box-shadow: 0 0 0 rgba(0, 122, 255, 0); }
`;

// 侧边栏样式
const StyledSider = styled(Sider as any)`
  background-color: #F2F2F7;
  overflow: hidden;
  height: 100vh;
  position: relative;
  transition: all 0.3s cubic-bezier(0.2, 0, 0, 1);
  border-right: 0.5px solid rgba(0, 0, 0, 0.1);
  
  .ant-layout-sider-children {
    width: 280px;
    overflow: hidden;
  }
`;

// 侧边栏头部
const SidebarHeader = styled.div`
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  border-bottom: 0.5px solid rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 10;
`;

// 标题样式
const Title = styled.h2`
  margin: 0;
  font-size: 17px;
  font-weight: 600;
  color: #000000;
  letter-spacing: -0.2px;
`;

// 删除按钮样式
const DeleteButton = styled.button`
  background: transparent;
  border: none;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  padding: 0;
  color: #FF3B30;
  font-size: 14px;
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  opacity: 0; /* 默认隐藏 */
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background-color: rgba(255, 59, 48, 0.1);
    transform: translateY(-50%) scale(1.1);
    opacity: 1;
  }
  
  &:active {
    transform: translateY(-50%) scale(0.95);
  }
`;

// 删除图标样式
const DeleteIcon = styled(DeleteOutlined as any)`
  font-size: 14px;
`;

// 会话列表容器
const ConversationList = styled.div`
  height: calc(100vh - 64px);
  overflow-y: auto;
  padding: 10px;
  width: 280px;
  
  /* 设置滚动条样式 */
  &::-webkit-scrollbar {
    width: 5px;
  }
  
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  
  &::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.1);
    border-radius: 10px;
  }
  
  &::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 0, 0, 0.2);
  }
`;

// 会话项样式
const ConversationItem = styled.div<{ active: boolean }>`
  display: flex;
  flex-direction: column;
  padding: 16px;
  cursor: pointer;
  margin-bottom: 10px;
  border-radius: 14px;
  position: relative;
  min-width: 240px;
  width: 100%;
  transition: all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  background-color: ${props => props.active ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.7)'};
  box-shadow: ${props => props.active 
    ? '0 2px 12px rgba(0, 0, 0, 0.08), 0 0 1px rgba(0, 0, 0, 0.1)' 
    : '0 1px 5px rgba(0, 0, 0, 0.03), 0 0 1px rgba(0, 0, 0, 0.05)'
  };
  animation: ${fadeIn} 0.3s ease-out;
  animation-fill-mode: both;
  animation-delay: ${props => props.active ? '0s' : '0.1s'};
  
  &:hover {
    background-color: rgba(255, 255, 255, 0.95);
    box-shadow: 0 3px 14px rgba(0, 0, 0, 0.1), 0 0 1px rgba(0, 0, 0, 0.1);
    transform: translateY(-2px);
    
    /* 在悬停时显示删除按钮 */
    ${DeleteButton} {
      opacity: 0.8;
    }
  }
  
  &:active {
    transform: scale(0.98);
  }
  
  ${props => props.active && css`
    &::before {
      content: '';
      position: absolute;
      left: -10px;
      top: 50%;
      transform: translateY(-50%);
      width: 4px;
      height: 30px;
      background-color: #007AFF;
      border-radius: 0 4px 4px 0;
      animation: ${slideIn} 0.3s ease-out;
    }
    
    animation: ${breathe} 1.5s ease-in-out;
  `}
`;

// 会话标题样式
const ConversationTitle = styled.div`
  font-size: 16px;
  font-weight: 500;
  color: #000000;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 3px 0;
  width: calc(100% - 40px);
  min-width: 200px;
  transition: all 0.2s ease;
  
  &:hover {
    color: #007AFF;
  }
`;

// 编辑输入框样式
const EditInput = styled(Input as any)`
  font-size: 16px;
  font-weight: 500;
  padding: 4px 6px;
  border-radius: 6px;
  border: none;
  background-color: rgba(0, 122, 255, 0.06);
  box-shadow: none;
  margin-bottom: 5px;
  width: calc(100% - 40px); // 与会话标题保持相同宽度
  
  &:focus {
    background-color: rgba(0, 122, 255, 0.08);
    box-shadow: 0 0 0 1px rgba(0, 122, 255, 0.2);
  }
  
  /* 移除Input组件默认的边框和padding */
  .ant-input {
    padding: 0;
    border: none;
    box-shadow: none;
  }
  
  /* 隐藏清除按钮 */
  .ant-input-clear-icon {
    display: none;
  }
  
  /* 隐藏后缀图标区域 */
  .ant-input-suffix {
    display: none;
  }
`;

// 日期时间样式
const ConversationTime = styled.div`
  font-size: 13px;
  color: #8E8E93; // iOS 次要文本颜色
  margin-top: 3px;
  font-weight: 400;
`;

// 底部操作区域
const ActionsContainer = styled.div`
  display: flex;
  justify-content: center;
  padding: 16px;
  background-color: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  border-top: 0.5px solid rgba(0, 0, 0, 0.1);
  position: sticky;
  bottom: 0;
`;

// 新建按钮样式
const NewButton = styled(Button as any)`
  background: #007AFF;
  border: none;
  height: 38px;
  padding: 0 22px;
  border-radius: 19px;
  font-size: 15px;
  font-weight: 500;
  letter-spacing: -0.2px;
  box-shadow: 0 2px 6px rgba(0, 122, 255, 0.2);
  display: flex;
  align-items: center;
  
  svg {
    font-size: 14px;
    margin-right: 6px;
  }
  
  &:hover {
    background: #0062CC;
    transform: translateY(-1px);
    box-shadow: 0 3px 8px rgba(0, 122, 255, 0.3);
  }
  
  &:active {
    transform: translateY(1px);
    box-shadow: 0 1px 4px rgba(0, 122, 255, 0.2);
  }
  
  transition: all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
`;

// 清空按钮样式
const ClearButton = styled(Button as any)`
  color: #FF3B30;
  border-color: rgba(255, 59, 48, 0.3);
  border-radius: 19px;
  height: 38px;
  font-size: 15px;
  font-weight: 500;
  letter-spacing: -0.2px;
  
  svg {
    font-size: 14px;
    margin-right: 6px;
  }
  
  &:hover {
    background-color: rgba(255, 59, 48, 0.05);
    border-color: #FF3B30;
    color: #FF3B30;
    transform: translateY(-1px);
  }
  
  &:active {
    transform: translateY(1px);
  }
  
  transition: all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
`;

// 侧边栏切换按钮
const CollapseButton = styled(Button as any)<{ $collapsed?: boolean }>`
  position: fixed;
  left: ${props => props.$collapsed ? '15px' : '265px'};
  top: 72px;
  z-index: 100;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #FFFFFF;
  border: 0.5px solid rgba(0, 0, 0, 0.1);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  transition: left 0.3s cubic-bezier(0.2, 0, 0, 1);
  color: #8E8E93;
  
  &:hover {
    color: #007AFF;
    box-shadow: 0 3px 12px rgba(0, 0, 0, 0.15);
    transform: scale(1.05);
  }
  
  &:active {
    transform: scale(0.95);
  }
`;

// 添加气泡确认样式
const StyledPopconfirm = styled(Popconfirm as any)`
  .ant-popover-inner {
    border-radius: 14px;
    overflow: hidden;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    backdrop-filter: blur(10px);
  }
  
  .ant-popover-inner-content {
    padding: 16px;
    font-size: 14px;
  }
  
  .ant-popover-title {
    font-size: 15px;
    font-weight: 600;
    border-bottom: none;
    padding-bottom: 5px;
  }
  
  .ant-popover-buttons {
    display: flex;
    justify-content: flex-end;
    margin-top: 14px;
  }
  
  .ant-btn-primary {
    background-color: #FF3B30;
    border: none;
    border-radius: 8px;
    box-shadow: none;
    font-weight: 500;
    
    &:hover {
      background-color: #E02E24;
    }
  }
  
  .ant-btn-default {
    border-radius: 8px;
    color: #007AFF;
    border-color: transparent;
    background: transparent;
    
    &:hover {
      background-color: rgba(0, 122, 255, 0.05);
      border-color: transparent;
    }
  }
  
  &.ant-popover-placement-left .ant-popover-content,
  &.ant-popover-placement-right .ant-popover-content,
  &.ant-popover-placement-top .ant-popover-content,
  &.ant-popover-placement-bottom .ant-popover-content {
    animation: ${fadeIn} 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  }
`;

// 复选框样式
const StyledCheckbox = styled(Checkbox as any)`
  margin-top: 12px;
  
  .ant-checkbox-inner {
    border-radius: 6px;
    border-color: rgba(0, 0, 0, 0.2);
    background: rgba(0, 0, 0, 0.03);
  }
  
  .ant-checkbox-checked .ant-checkbox-inner {
    background-color: #007AFF;
    border-color: #007AFF;
  }
  
  .ant-checkbox-checked .ant-checkbox-inner::after {
    border-color: #FFFFFF;
  }
  
  span.ant-checkbox + span {
    font-size: 13px;
    color: #8E8E93;
  }
`;

// 空状态样式，使用完全独立的styled组件
const EmptyWrapper = styled.div`
  margin-top: 60px;
  display: flex;
  flex-direction: column;
  align-items: center;
  animation: ${fadeIn} 0.5s ease-out;
  
  /* 自定义Empty组件的文字样式 */
  .ant-empty-description {
    color: #8E8E93;
    font-size: 14px;
    font-weight: 500;
    margin-bottom: 20px;
  }
`;

// 子元素容器动画
const ChildrenContainer = styled.div`
  margin-top: 20px;
  animation: ${fadeIn} 0.5s ease-out;
  animation-delay: 0.2s;
  animation-fill-mode: both;
`;

// 使用一个完全重构的StyledEmpty，不依赖于styeld(Empty)
const StyledEmpty = (props: any) => {
  const { children, ...rest } = props;
  
  return (
    <EmptyWrapper>
      <Empty 
        {...rest}
        styles={{
          image: {
            opacity: 0.7,
            height: 60,
            marginBottom: 20
          }
        }}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}
      />
      {children && (
        <ChildrenContainer>
          {children}
        </ChildrenContainer>
      )}
    </EmptyWrapper>
  );
};

// 创建按钮动画
const pulseAnimation = keyframes`
  0% { transform: scale(1); }
  20% { transform: scale(1.1); }
  40% { transform: scale(1); }
  100% { transform: scale(1); }
`;

const CreateButtonWrapper = styled.div`
  text-align: center;
  animation: ${fadeIn} 0.5s ease-out;
  margin-top: 10px;
  
  .create-button {
    animation: ${pulseAnimation} 2s infinite 1s;
  }
`;

const Sidebar: React.FC = () => {
  const dispatch = useDispatch();
  const conversations = useAppSelector(selectConversationList);
  const currentConversationId = useAppSelector(selectCurrentConversationId);
  const isSidebarOpen = useAppSelector(selectIsSidebarOpen);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const editInputRef = useRef<typeof Input>(null);
  const [doNotShowDeleteConfirm, setDoNotShowDeleteConfirm] = useState(false);
  const [doNotShowClearAllConfirm, setDoNotShowClearAllConfirm] = useState(false);

  // 加载会话列表
  useEffect(() => {
    dispatch(fetchConversations() as any);
  }, [dispatch]);

  // 创建新会话
  const handleCreateConversation = () => {
    dispatch(createConversation('新会话') as any);
  };

  // 选择会话
  const handleSelectConversation = (conversationId: string) => {
    if (editingId) return; // 如果正在编辑，不触发选择操作
    // 直接设置当前会话，不触发全局loading状态
    dispatch(setCurrentConversation(conversationId));
  };

  // 切换侧边栏
  const toggleSidebarVisibility = () => {
    dispatch(toggleSidebar());
  };

  // 格式化日期
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 启动会话名称编辑
  const startEditingTitle = (conversationId: string, title: string, e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    setEditingId(conversationId);
    setEditTitle(title);
    
    // 下一个渲染周期后设置焦点
    setTimeout(() => {
      const inputElement = document.querySelector(`input[data-conversation-id="${conversationId}"]`) as HTMLInputElement;
      if (inputElement) {
        inputElement.focus();
        // 选中全部文本
        inputElement.select();
      }
    }, 10);
  };

  // 保存编辑的会话名称
  const saveEditedTitle = () => {
    if (editingId && editTitle.trim() !== '') {
      dispatch(updateConversationTitle({
        conversationId: editingId,
        title: editTitle.trim()
      }) as any);
      setEditingId(null);
    } else if (editingId) {
      // 如果标题为空，恢复原来的标题
      const conversation = conversations.find(c => c.id === editingId);
      if (conversation) {
        setEditTitle(conversation.title);
      }
      setEditingId(null);
    }
  };

  // 取消编辑
  const cancelEditing = () => {
    setEditingId(null);
  };

  // 删除会话
  const handleDeleteConversation = (conversationId: string, e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    
    // 检查用户偏好，是否显示删除确认
    const checkAndDelete = async () => {
      try {
        // 简化处理：直接忽略API类型问题
        const api = window.electronAPI as any;
        const showConfirmation = await api?.preferences?.getPreference('confirmation.showDeleteConfirmation');
        
        // 如果设置为false，直接删除
        if (showConfirmation === false) {
          dispatch(deleteConversation(conversationId) as any);
          return;
        }
      } catch (error) {
        console.warn('获取偏好设置失败:', error);
        // 如果获取失败，继续显示确认对话框
      }
    };
    
    checkAndDelete();
  };
  
  // 确认删除会话
  const confirmDelete = (conversationId: string) => {
    dispatch(deleteConversation(conversationId) as any);
    
    // 保存用户偏好
    if (doNotShowDeleteConfirm) {
      try {
        const api = window.electronAPI as any;
        api?.preferences?.setPreference('confirmation.showDeleteConfirmation', false);
      } catch (error) {
        console.warn('保存偏好设置失败:', error);
      }
    }
  };
  
  // 清空所有会话
  const handleClearAllConversations = () => {
    // 检查用户偏好，是否显示清空确认
    const checkAndClearAll = async () => {
      try {
        const api = window.electronAPI as any;
        const showConfirmation = await api?.preferences?.getPreference('confirmation.showClearAllConfirmation');
        
        // 如果设置为false，直接清空
        if (showConfirmation === false) {
          dispatch(clearAllConversations() as any);
          return;
        }
      } catch (error) {
        console.warn('获取偏好设置失败:', error);
        // 如果获取失败，继续显示确认对话框
      }
    };
    
    checkAndClearAll();
  };
  
  // 确认清空所有会话
  const confirmClearAll = () => {
    dispatch(clearAllConversations() as any);
    
    // 保存用户偏好
    if (doNotShowClearAllConfirm) {
      try {
        const api = window.electronAPI as any;
        api?.preferences?.setPreference('confirmation.showClearAllConfirmation', false);
      } catch (error) {
        console.warn('保存偏好设置失败:', error);
      }
    }
  };

  return (
    <StyledSider
      width={280}
      collapsible
      collapsed={!isSidebarOpen}
      trigger={null}
      collapsedWidth={0}
    >
      <SidebarHeader>
        <Title>会话列表</Title>
        <Tooltip title="新建会话" placement="bottom">
          <NewButton
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreateConversation}
          >
            新建
          </NewButton>
        </Tooltip>
      </SidebarHeader>
      
      <ConversationList>
        {conversations.length === 0 ? (
          <StyledEmpty
            description="暂无会话"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <CreateButtonWrapper>
              <NewButton
                className="create-button"
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleCreateConversation}
              >
                创建新会话
              </NewButton>
            </CreateButtonWrapper>
          </StyledEmpty>
        ) : (
          conversations.map((conversation, index) => (
            <ConversationItem
              key={conversation.id}
              active={conversation.id === currentConversationId}
              onClick={() => handleSelectConversation(conversation.id)}
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              {editingId === conversation.id ? (
                <EditInput
                  ref={editInputRef as any}
                  value={editTitle}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditTitle(e.target.value)}
                  onPressEnter={saveEditedTitle}
                  onBlur={saveEditedTitle}
                  onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                    if (e.key === 'Escape') {
                      cancelEditing();
                    }
                  }}
                  data-conversation-id={conversation.id}
                />
              ) : (
                <ConversationTitle 
                  onClick={(e: React.MouseEvent<HTMLDivElement>) => startEditingTitle(conversation.id, conversation.title, e)}
                >
                  {conversation.title}
                </ConversationTitle>
              )}
              <ConversationTime>
                {formatDate(conversation.updatedAt || conversation.createdAt)}
              </ConversationTime>
              
              <StyledPopconfirm
                title="确认删除"
                description={
                  <div>
                    <div>确定要删除这个会话吗？此操作不可恢复。</div>
                    <StyledCheckbox 
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDoNotShowDeleteConfirm(e.target.checked)}
                    >
                      不再提示
                    </StyledCheckbox>
                  </div>
                }
                onConfirm={() => confirmDelete(conversation.id)}
                okText="删除"
                cancelText="取消"
                okButtonProps={{ danger: true }}
                placement="left"
                overlayStyle={{ 
                  backdropFilter: 'blur(10px)',
                  background: 'rgba(255, 255, 255, 0.95)'
                }}
              >
                <DeleteButton
                  onClick={(e: React.MouseEvent<HTMLElement>) => e.stopPropagation()}
                >
                  <DeleteIcon />
                </DeleteButton>
              </StyledPopconfirm>
            </ConversationItem>
          ))
        )}
      </ConversationList>
      
      {conversations.length > 0 && (
        <ActionsContainer>
          <StyledPopconfirm
            title="确认清空"
            description={
              <div>
                <div>确定要清空所有会话吗？此操作不可恢复。</div>
                <StyledCheckbox 
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDoNotShowClearAllConfirm(e.target.checked)}
                >
                  不再提示
                </StyledCheckbox>
              </div>
            }
            onConfirm={confirmClearAll}
            okText="清空"
            cancelText="取消"
            okButtonProps={{ danger: true }}
            placement="top"
            overlayStyle={{ 
              backdropFilter: 'blur(10px)',
              background: 'rgba(255, 255, 255, 0.95)'
            }}
          >
            <ClearButton
              icon={<ClearOutlined />}
              onClick={(e: React.MouseEvent<HTMLElement>) => e.stopPropagation()}
            >
              清空所有
            </ClearButton>
          </StyledPopconfirm>
        </ActionsContainer>
      )}
      
      <CollapseButton
        icon={isSidebarOpen ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />}
        onClick={toggleSidebarVisibility}
        $collapsed={!isSidebarOpen}
      />
    </StyledSider>
  );
};

export default Sidebar; 