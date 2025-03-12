import React from 'react';
import styled from 'styled-components';

interface LoadingIndicatorProps {
  message?: string;
}

const LoadingOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const SpinnerContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  background-color: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
`;

const Spinner = styled.div`
  border: 4px solid rgba(0, 0, 0, 0.1);
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border-left-color: var(--primary-color, #4a86e8);
  animation: spin 1s linear infinite;

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
`;

const LoadingText = styled.div`
  margin-top: 12px;
  font-size: 14px;
  color: rgba(0, 0, 0, 0.85);
`;

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ message = '加载中...' }) => {
  return (
    <LoadingOverlay>
      <SpinnerContainer>
        <Spinner />
        <LoadingText>{message}</LoadingText>
      </SpinnerContainer>
    </LoadingOverlay>
  );
};

export default LoadingIndicator; 