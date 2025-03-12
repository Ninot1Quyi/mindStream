import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import styled from 'styled-components';
import { Layout, ConfigProvider, theme, Alert, Button } from 'antd';
import Sidebar from './components/sidebar/Sidebar';
import Toolbar from './components/common/Toolbar';
import Canvas from './components/canvas/Canvas';
import LoadingIndicator from './components/common/LoadingIndicator';
import ErrorToast from './components/common/ErrorToast';
import ModalManager from './components/modals/ModalManager';
import { selectTheme, selectIsLoading, selectErrorMessage } from './store/selectors/uiSelectors';
import { setLoading, setError } from './store/slices/uiSlice';
import { fetchConversations, loadInitialConversation } from './store/slices/conversationSlice';
import { RootState } from './store';
import useAppSelector from './hooks/useAppSelector';

const { Content } = Layout;

// 样式化组件，使用as any解决类型不匹配问题
const StyledLayout = styled(Layout as any)`
  height: 100vh;
  width: 100vw;
`;

const StyledContent = styled(Content as any)`
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  position: relative;
  overflow: hidden;
`;

// 调试信息容器
const DebugContainer = styled.div`
  position: fixed;
  bottom: 0;
  right: 0;
  background-color: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 16px;
  border-top-left-radius: 8px;
  z-index: 1000;
  max-width: 500px;
  max-height: 300px;
  overflow: auto;
  font-family: monospace;
  font-size: 12px;
`;

const App: React.FC = () => {
  const dispatch = useDispatch();
  const currentTheme = useAppSelector(selectTheme);
  const isLoading = useAppSelector(selectIsLoading);
  const errorMessage = useAppSelector(selectErrorMessage);
  
  // 调试状态
  const [debug, setDebug] = useState({
    visible: true,
    error: null as Error | null,
    electronAPIAvailable: false,
    appStatus: '初始化中...'
  });
  
  // 检查Electron API是否可用
  useEffect(() => {
    try {
      const available = !!(window as any).electronAPI;
      setDebug(prev => ({
        ...prev,
        electronAPIAvailable: available,
        appStatus: available ? 'Electron API 可用' : '错误: Electron API 不可用'
      }));
      
      if (!available) {
        console.error('Electron API 不可用，这可能会导致应用程序无法正常运行');
      } else {
        console.log('Electron API 检查通过');
      }
    } catch (error) {
      console.error('检查Electron API时出错:', error);
      setDebug(prev => ({
        ...prev,
        error: error as Error,
        appStatus: '错误: 检查API时发生异常'
      }));
    }
  }, []);
  
  // 初始化应用
  useEffect(() => {
    const initApp = async () => {
      try {
        setDebug(prev => ({ ...prev, appStatus: '正在初始化应用...' }));
        dispatch(setLoading(true));
        
        setDebug(prev => ({ ...prev, appStatus: '正在获取会话列表...' }));
        // 获取所有会话
        await dispatch(fetchConversations() as any);
        
        setDebug(prev => ({ ...prev, appStatus: '正在加载初始会话...' }));
        // 加载初始会话
        await dispatch(loadInitialConversation() as any);
        
        dispatch(setLoading(false));
        setDebug(prev => ({ ...prev, appStatus: '应用初始化成功' }));
      } catch (error) {
        dispatch(setLoading(false));
        const errorMessage = `应用初始化失败: ${(error as Error).message}`;
        dispatch(setError(errorMessage));
        console.error('应用初始化失败:', error);
        setDebug(prev => ({
          ...prev,
          error: error as Error,
          appStatus: `错误: ${errorMessage}`
        }));
      }
    };
    
    if (debug.electronAPIAvailable) {
      initApp();
    }
  }, [dispatch, debug.electronAPIAvailable]);

  // 根据当前主题设置Antd主题
  const { defaultAlgorithm, darkAlgorithm } = theme;
  const themeConfig = {
    algorithm: currentTheme === 'dark' ? darkAlgorithm : defaultAlgorithm,
    token: {
      colorPrimary: '#4a86e8',
    }
  };

  // 显示致命错误
  if (debug.error && !debug.electronAPIAvailable) {
    return (
      <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
        <Alert
          message="应用程序初始化失败"
          description={
            <>
              <p>Electron API 未正确加载，这可能是由以下原因导致的：</p>
              <ol>
                <li>预加载脚本未正确执行</li>
                <li>Electron 与渲染进程之间的通信出现问题</li>
                <li>应用程序配置不正确</li>
              </ol>
              <p><strong>错误详情:</strong> {debug.error.message}</p>
              <p><strong>解决方案:</strong> 请尝试重启应用程序，如果问题仍然存在，请检查应用程序日志。</p>
              <Button type="primary" onClick={() => window.location.reload()}>
                刷新页面
              </Button>
            </>
          }
          type="error"
          showIcon
        />
      </div>
    );
  }
  
  return (
    <ConfigProvider theme={themeConfig}>
      <StyledLayout>
        <Sidebar />
        <StyledContent>
          <Toolbar />
          <Canvas />
        </StyledContent>
        
        {/* 全局加载指示器 */}
        {isLoading && <LoadingIndicator />}
        
        {/* 错误提示 */}
        {errorMessage && <ErrorToast message={errorMessage} />}
        
        {/* 模态窗口管理器 */}
        <ModalManager />
        
        {/* 调试信息 */}
        {debug.visible && (
          <DebugContainer>
            <div><strong>应用状态:</strong> {debug.appStatus}</div>
            <div><strong>Electron API:</strong> {debug.electronAPIAvailable ? '可用' : '不可用'}</div>
            {debug.error && (
              <div>
                <div><strong>错误:</strong> {debug.error.message}</div>
                <div><pre>{debug.error.stack}</pre></div>
              </div>
            )}
            <Button 
              size="small" 
              style={{ marginTop: '8px' }} 
              onClick={() => setDebug(prev => ({ ...prev, visible: false }))}
            >
              隐藏
            </Button>
          </DebugContainer>
        )}
      </StyledLayout>
    </ConfigProvider>
  );
};

export default App; 