/**
 * 对话模型类型定义
 */

// 消息角色类型
export type MessageRole = 'user' | 'assistant' | 'system';

// 消息对象
export interface Message {
  id: string;
  branchId: string;
  content: string;
  role: MessageRole;
  timestamp: string;
}

// 分支位置
export interface Position {
  x: number;
  y: number;
}

// 分支对象
export interface Branch {
  id: string;
  conversationId: string;
  title: string;
  parentBranchId?: string;
  parentMessageId?: string;
  position: Position;
  createdAt: string;
  updatedAt: string;
  messages: string[]; // 消息ID数组
  width?: number;     // 分支节点宽度
  height?: number;    // 分支节点高度
  isRoot?: boolean;   // 是否是根节点（主分支）
}

// 会话对象
export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  branches: string[]; // 分支ID数组
}

// 画布变换状态
export interface CanvasTransform {
  scale: number;
  offsetX: number;
  offsetY: number;
}

// 拖拽状态
export interface DragState {
  isDragging: boolean;
  target: string | null; // 拖拽对象的ID
  offset: Position;
}

// 应用程序设置
export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  language: string;
  fontSize: number;
  autoSave: boolean;
  llmProvider: string;
  llmModel: string;
  apiKeys: Record<string, string>;
}

// LLM提供商定义
export interface LLMProvider {
  id: string;
  name: string;
  models: LLMModel[];
  requiresApiKey: boolean;
}

// LLM模型定义
export interface LLMModel {
  id: string;
  name: string;
  maxTokens: number;
  defaultParams: Record<string, any>;
}

// Add Size interface if it doesn't exist
export interface Size {
  width: number;
  height: number;
}

// 全局应用状态
export interface AppState {
  conversations: Record<string, Conversation>;
  branches: Record<string, Branch>;
  messages: Record<string, Message>;
  currentConversationId: string | null;
  activeBranchId: string | null;
  canvas: {
    transform: CanvasTransform;
    dragState: DragState;
  };
  settings: AppSettings;
  ui: {
    isLoading: boolean;
    errorMessage: string | null;
    isSidebarOpen: boolean;
    activeModal: string | null;
  };
} 