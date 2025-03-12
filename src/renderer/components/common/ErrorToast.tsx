import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { useDispatch } from 'react-redux';
import { clearError } from '../../store/slices/uiSlice';

interface ErrorToastProps {
  message: string;
  duration?: number;
}

const ToastContainer = styled.div<{ visible: boolean }>`
  position: fixed;
  top: 20px;
  right: 20px;
  background-color: #fff1f0;
  border: 1px solid #ffccc7;
  border-radius: 4px;
  padding: 12px 16px;
  box-shadow: 0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 6px 16px 0 rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
  z-index: 1001;
  max-width: 350px;
  opacity: ${props => (props.visible ? 1 : 0)};
  transform: translateX(${props => (props.visible ? 0 : '100%')});
  transition: opacity 0.3s, transform 0.3s;
`;

const IconContainer = styled.div`
  color: #ff4d4f;
  font-size: 16px;
  margin-right: 12px;
  display: flex;
  align-items: center;
`;

const MessageContainer = styled.div`
  flex: 1;
  font-size: 14px;
  color: rgba(0, 0, 0, 0.85);
  word-break: break-word;
`;

const CloseButton = styled.div`
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
  margin-left: 12px;
  cursor: pointer;
  
  &:hover {
    color: rgba(0, 0, 0, 0.75);
  }
`;

const ErrorToast: React.FC<ErrorToastProps> = ({ message, duration = 5000 }) => {
  const [visible, setVisible] = useState(true);
  const dispatch = useDispatch();

  useEffect(() => {
    // 重置可见性状态
    setVisible(true);
    
    // 设置自动关闭计时器
    const timer = setTimeout(() => {
      handleClose();
    }, duration);
    
    // 清理计时器
    return () => clearTimeout(timer);
  }, [message, duration]);

  const handleClose = () => {
    setVisible(false);
    
    // 给过渡动画留出时间
    setTimeout(() => {
      dispatch(clearError());
    }, 300);
  };

  return (
    <ToastContainer visible={visible}>
      <IconContainer>
        <i className="fas fa-exclamation-circle" />
      </IconContainer>
      <MessageContainer>{message}</MessageContainer>
      <CloseButton onClick={handleClose}>
        <i className="fas fa-times" />
      </CloseButton>
    </ToastContainer>
  );
};

export default ErrorToast; 