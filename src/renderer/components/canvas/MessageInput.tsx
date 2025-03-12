import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import styled from 'styled-components';
import { Button, Tooltip, Dropdown, Menu } from 'antd';
import { 
  SendOutlined, 
  SmileOutlined, 
  PictureOutlined, 
  CodeOutlined, 
  ClearOutlined, 
  PaperClipOutlined
} from '@ant-design/icons';
import { sendMessage } from '../../store/slices/messageSlice';
import useAppSelector from '../../hooks/useAppSelector';

interface MessageInputProps {
  branchId: string;
}

const InputWrapper = styled.div`
  position: relative;
  width: 100%;
  padding: 20px 0;
  margin: -20px 0;
  cursor: text;
  
  &:before {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
    z-index: 0;
  }
  
  /* Define CSS variables for animation states */
  --hover-opacity: 0.5;
  --hover-transform: translateY(0);
  --hover-width: 36px;
  
  &:hover {
    --hover-opacity: 0.8;
    --hover-transform: translateY(-8px);
    --hover-width: 100px;
  }
`;

const InputContainer = styled.div<{ isFocused: boolean; hasContent: boolean }>`
  display: flex;
  flex-direction: column;
  padding: ${props => props.isFocused || props.hasContent ? '10px' : '0px'};
  border-radius: ${props => props.isFocused || props.hasContent ? '16px' : '20px'};
  background-color: ${props => props.isFocused ? 'white' : 'rgba(255, 255, 255, 0.7)'};
  border: 1px solid ${props => props.isFocused ? 'var(--primary-color, #4a86e8)' : 'transparent'};
  position: relative;
  margin-top: ${props => props.isFocused || props.hasContent ? '8px' : '0'};
  margin-bottom: ${props => props.isFocused || props.hasContent ? '0' : '2px'};
  box-shadow: ${props => props.isFocused || props.hasContent ? '0 2px 8px rgba(0, 0, 0, 0.05)' : 'none'};
  backdrop-filter: blur(4px);
  transform-origin: center bottom;
  overflow: visible;
  z-index: 1;
  
  /* Separate transitions for different properties */
  transition:
    padding 0.4s cubic-bezier(0.4, 0, 0.2, 1),
    border-radius 0.4s cubic-bezier(0.4, 0, 0.2, 1),
    background-color 0.4s cubic-bezier(0.4, 0, 0.2, 1),
    border-color 0.4s cubic-bezier(0.4, 0, 0.2, 1),
    margin 0.4s cubic-bezier(0.4, 0, 0.2, 1),
    box-shadow 0.4s cubic-bezier(0.4, 0, 0.2, 1),
    transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1),
    width 0.5s cubic-bezier(0.34, 1.56, 0.64, 1),
    opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1),
    max-height 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  
  /* Use CSS variables for animated properties */
  opacity: ${props => props.isFocused || props.hasContent ? '1' : 'var(--hover-opacity)'};
  transform: ${props => props.isFocused || props.hasContent ? 'translateY(0) scale(1)' : 'var(--hover-transform)'};
  width: ${props => props.isFocused || props.hasContent ? '100%' : 'var(--hover-width)'};
  max-height: ${props => props.isFocused || props.hasContent ? '200px' : '5px'};
  margin-left: ${props => props.isFocused || props.hasContent ? '0' : 'auto'};
  margin-right: ${props => props.isFocused || props.hasContent ? '0' : 'auto'};
  
  &:before {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    height: ${props => props.isFocused || props.hasContent ? '0' : '5px'};
    background-color: rgba(180, 180, 180, 0.3);
    border-radius: 20px;
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  ${InputWrapper}:hover &:before {
    background-color: rgba(74, 134, 232, 0.4);
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  border: none;
  outline: none;
  resize: none;
  background: transparent;
  font-size: 14px;
  line-height: 1.4;
  min-height: 20px;
  max-height: 100px;
  padding: 0;
  padding-right: 40px;
  margin-right: 8px;
  font-family: inherit;
  transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  
  &::placeholder {
    color: var(--light-text, #9aa0a6);
  }
`;

const InputActions = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 4px;
  opacity: 0;
  transform: translateY(10px);
  transition: 
    opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1) 0.2s,
    transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s;
  
  ${InputContainer}:hover &,
  ${InputContainer}[data-focused="true"] & {
    opacity: 1;
    transform: translateY(0);
  }
`;

const LeftActions = styled.div`
  display: flex;
  gap: 8px;
`;

const RightActions = styled.div`
  display: flex;
  gap: 8px;
`;

const SendButton = styled(Button as any)`
  transition: opacity 0.2s, transform 0.2s;
`;

const Placeholder = styled.div`
  position: absolute;
  top: ${props => props.theme.isFocused ? '8px' : '7px'};
  left: 0;
  right: 0;
  text-align: center;
  color: var(--light-text, #9aa0a6);
  pointer-events: none;
  transition: 
    all 0.4s cubic-bezier(0.4, 0, 0.2, 1),
    opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  font-size: ${props => props.theme.isFocused ? '14px' : '13px'};
  opacity: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  
  svg {
    margin-right: 4px;
    font-size: 14px;
    transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
`;

const EnterHint = styled.div`
  font-size: 12px;
  color: var(--light-text, #9aa0a6);
  transition: opacity 0.2s;
`;

const AttachButton = styled.button`
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%) scale(0.8);
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--light-text, #9aa0a6);
  opacity: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: 
    opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1),
    transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
    color 0.2s ease;
  pointer-events: none;
  
  &:hover {
    color: var(--primary-color, #4a86e8);
    background: transparent;
  }
  
  ${InputContainer}[data-focused="true"] &,
  ${InputContainer}[data-has-content="true"] & {
    opacity: 1;
    transform: translateY(-50%) scale(1);
    pointer-events: auto;
  }
`;

// 特殊命令前缀
const COMMAND_PREFIX = '/';

// 可用命令列表
const COMMANDS = [
  { key: 'clear', text: 'clear', description: '清空当前输入' },
  { key: 'reset', text: 'reset', description: '重置对话上下文' },
  { key: 'code', text: 'code', description: '插入代码块' },
  { key: 'image', text: 'image', description: '插入图片链接' },
  { key: 'help', text: 'help', description: '显示帮助' },
];

const MessageInput: React.FC<MessageInputProps> = ({ branchId }) => {
  const dispatch = useDispatch();
  const [content, setContent] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isCommand, setIsCommand] = useState(false);
  const [matchedCommands, setMatchedCommands] = useState<typeof COMMANDS>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // 自动调整文本区域高度
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(150, textareaRef.current.scrollHeight)}px`;
    }
  }, [content]);
  
  // 检查命令
  useEffect(() => {
    if (content.startsWith(COMMAND_PREFIX)) {
      setIsCommand(true);
      const commandText = content.slice(COMMAND_PREFIX.length).toLowerCase();
      
      // 过滤匹配的命令
      const matched = COMMANDS.filter(cmd => 
        cmd.text.startsWith(commandText)
      );
      
      setMatchedCommands(matched);
    } else {
      setIsCommand(false);
      setMatchedCommands([]);
    }
  }, [content]);
  
  // 处理内容变化
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
  }, []);
  
  // 处理焦点
  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);
  
  const handleBlur = useCallback(() => {
    setIsFocused(false);
  }, []);
  
  // 执行命令
  const executeCommand = useCallback((command: string) => {
    const cmd = command.toLowerCase();
    
    switch (cmd) {
      case 'clear':
        setContent('');
        break;
      case 'reset':
        // 发送系统消息，重置上下文
        dispatch(sendMessage({
          branchId,
          content: '请重置对话上下文，开始新的对话。',
          role: 'system'
        }) as any);
        setContent('');
        break;
      case 'code':
        setContent('```\n\n```');
        // 延迟聚焦到代码块中间
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.focus();
            textareaRef.current.selectionStart = 4;
            textareaRef.current.selectionEnd = 4;
          }
        }, 0);
        break;
      case 'image':
        setContent('![图片描述](图片URL)');
        // 延迟选中图片URL部分
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.focus();
            textareaRef.current.selectionStart = 7;
            textareaRef.current.selectionEnd = 13;
          }
        }, 0);
        break;
      case 'help':
        // 显示所有命令的帮助信息
        const helpText = COMMANDS.map(cmd => 
          `/${cmd.text} - ${cmd.description}`
        ).join('\n');
        setContent(helpText);
        break;
      default:
        console.log('未知命令:', cmd);
    }
  }, [branchId, dispatch]);
  
  // 选择命令
  const handleCommandSelect = useCallback((command: string) => {
    executeCommand(command);
  }, [executeCommand]);
  
  // 发送消息
  const handleSend = useCallback(() => {
    if (!content.trim()) return;
    
    // 检查是否是命令
    if (content.startsWith(COMMAND_PREFIX)) {
      const commandText = content.slice(COMMAND_PREFIX.length).split(' ')[0];
      executeCommand(commandText);
      return;
    }
    
    // 发送普通消息
    dispatch(sendMessage({
      branchId,
      content: content.trim(),
      role: 'user'
    }) as any);
    
    setContent('');
    
    // 重置文本区域高度
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [branchId, content, dispatch, executeCommand]);
  
  // 处理按键事件
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // 处理Tab键，插入两个空格
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.currentTarget.selectionStart;
      const end = e.currentTarget.selectionEnd;
      
      // 插入两个空格
      const newText = content.substring(0, start) + '  ' + content.substring(end);
      setContent(newText);
      
      // 设置光标位置
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = start + 2;
          textareaRef.current.selectionEnd = start + 2;
        }
      }, 0);
    }
    
    // 处理回车键发送消息
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      
      // 如果显示命令列表且有匹配的命令，执行第一个命令
      if (isCommand && matchedCommands.length > 0) {
        handleCommandSelect(matchedCommands[0].key);
      } else {
        handleSend();
      }
    }
  }, [content, handleCommandSelect, handleSend, isCommand, matchedCommands]);
  
  // 插入表情菜单项
  const emojiItems = [
    { key: '😊', label: '😊' },
    { key: '👍', label: '👍' },
    { key: '🎉', label: '🎉' },
    { key: '❤️', label: '❤️' },
    { key: '🤔', label: '🤔' },
    { key: '😂', label: '😂' },
  ];
  
  // 插入表情
  const handleEmojiSelect = ({ key }: { key: string }) => {
    if (textareaRef.current) {
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      
      const newText = content.substring(0, start) + key + content.substring(end);
      setContent(newText);
      
      // 设置光标位置
      setTimeout(() => {
        if (textareaRef.current) {
          const newPos = start + key.length;
          textareaRef.current.selectionStart = newPos;
          textareaRef.current.selectionEnd = newPos;
          textareaRef.current.focus();
        }
      }, 0);
    }
  };
  
  // 插入代码块
  const handleInsertCode = () => {
    executeCommand('code');
  };
  
  // 插入图片
  const handleInsertImage = () => {
    executeCommand('image');
  };
  
  // 清空输入
  const handleClear = () => {
    executeCommand('clear');
  };
  
  // Add wrapper click handler
  const handleWrapperClick = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);
  
  // 修改处理图片插入的函数
  const handleAttachClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    // 先执行插入图片的操作
    handleInsertImage();
    
    // 确保输入框重新获得焦点
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [handleInsertImage]);
  
  return (
    <InputWrapper onClick={handleWrapperClick}>
      <InputContainer 
        isFocused={isFocused} 
        hasContent={content.length > 0}
        data-focused={isFocused}
        data-has-content={content.length > 0}
      >
        {!isFocused && content.length === 0 && (
          <Placeholder theme={{ isFocused }}>
            新消息
          </Placeholder>
        )}
        
        <TextArea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          rows={1}
          spellCheck={false}
          style={{ 
            opacity: isFocused || content.length > 0 ? 1 : 0,
            transition: 'opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        />
        
        <AttachButton
          onMouseDown={(e: React.MouseEvent) => {
            // 阻止默认的失焦行为
            e.preventDefault();
          }}
          onClick={handleAttachClick}
        >
          <PaperClipOutlined />
        </AttachButton>
        
        {isCommand && matchedCommands.length > 0 && (
          <Menu
            style={{ 
              position: 'absolute', 
              width: '100%', 
              left: 0, 
              bottom: '100%',
              marginBottom: '4px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
              zIndex: 1000
            }}
            items={matchedCommands.map(cmd => ({
              key: cmd.key,
              label: (
                <div>
                  <b>/{cmd.text}</b> - {cmd.description}
                </div>
              )
            }))}
            onClick={({key}) => handleCommandSelect(key as string)}
          />
        )}
      </InputContainer>
    </InputWrapper>
  );
};

export default React.memo(MessageInput); 