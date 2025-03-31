# MindStream - 分支式LLM对话

MindStream是一个创新的跨平台桌面应用程序，允许用户与LLM（大型语言模型）进行分支对话。与传统的线性对话界面不同，MindStream使用户能够从任何点创建多个对话分支，同时探索不同的主题或方法。

> [!NOTE]
>
> **该项目开发过程中使用了大量AI**



## 开发中...

目前尚未达到可用程度，初步页面如下：

![QQ_1743426509851](/Users/quyi/PycharmProjects/mindStream/assets/GUI.png)

**开发进度：**

- [x] 新建会话（画布）
- [x] 新建节点
- [x] 节点中对话
- [x] `画布中节点信息`、`节点中对话历史`历史持久化到文件中
- [ ] 添加模型设置选项(现在使用函数模拟AI响应)
- [ ] 添加节点间的连接线，通过连线重新组织消息历史，从而实现分支对话
- [ ] 允许编辑节点中的用户消息和AI消息
- [ ] 实现节点间的引用
- [ ] 跨画布的节点复制、剪切
- [ ] 添加更多节点、连线逻辑、自动化操作

## 设计功能

- **画布式界面**：将对话可视化为带有分支的流程图
- **对话分支**：从任何点创建新的对话分支
- **可拖动节点**：视觉上组织对话分支
- **缩放和平移**：轻松导航复杂的对话树
- **对话历史**：跟踪所有对话
- **多种LLM集成：支持OpenAI、Google Generative AI、Anthropic等多种AI服务**
- **跨平台支持：在Windows、macOS和Linux上都能运行**

## 技术栈

### 核心框架
- **Electron**: 跨平台桌面应用开发框架
- **React**: 用于构建用户界面的JavaScript库
- **TypeScript**: 为JavaScript添加静态类型的编程语言

### 开发/构建工具
- **electron-vite**: 专为Electron应用优化的快速构建工具
- **electron-builder**: 用于打包和分发Electron应用的完整解决方案
- **Yarn**: 包管理器，使用工作区功能管理多包项目

### 前端技术
- **Ant Design (antd)**: 企业级React UI组件库
- **Redux Toolkit**: 状态管理解决方案
- **Styled Components**: CSS-in-JS样式解决方案
- **React Router**: 页面路由管理

### AI/机器学习集成
- 支持多种AI服务，包括OpenAI、Google Generative AI、Anthropic等
- 支持各种文档格式的嵌入处理

## 项目结构

```
mindstream/
├── package.json
├── tsconfig.json 
├── electron.vite.config.ts
├── .eslintrc.js
├── README.md
├── src/
│   ├── main/           # Electron 主进程
│   │   ├── index.ts
│   │   ├── ipc/         # IPC通信
│   │   └── services/    # 主进程服务 
│   ├── preload/        # 预加载脚本
│   │   └── index.ts
│   └── renderer/       # 渲染进程 (React应用)
       ├── App.tsx
       ├── index.html
       ├── index.tsx 
       ├── assets/      # 静态资源
       ├── components/  # React组件
       │   ├── common/  # 通用UI组件
       │   ├── canvas/  # 画布相关组件 
       │   ├── sidebar/ # 侧边栏组件
       │   └── modals/  # 模态窗口组件
       ├── hooks/       # 自定义React Hooks
       ├── pages/       # 页面组件
       ├── services/    # 服务层
       │   ├── api.ts   # API通信
       │   ├── llm/     # LLM集成
       │   └── storage/ # 本地存储
       ├── store/       # Redux状态管理
       │   ├── index.ts
       │   ├── slices/  # Redux切片
       │   └── selectors/ 
       ├── styles/      # 样式
       ├── types/       # TypeScript类型定义
       └── utils/       # 工具函数
```

## 设置和运行

### 开发环境

1. 安装依赖:
   ```
   yarn install
   ```

2. 启动开发服务器:
   ```
   yarn dev
   ```

### 构建应用

```
yarn build
```

这将为当前平台创建分发包。

## 使用方法

1. **开始对话**：在主分支底部的输入框中输入您的消息
2. **创建分支**：点击任何分支标题中的分支图标创建新的对话路径
3. **组织画布**：通过拖动分支的标题来在画布上排列它们
4. **导航**：使用缩放和平移控件导航复杂的对话树
5. **重命名**：使用编辑按钮重命名分支或整个对话

## 开发

本项目使用:
- TypeScript用于类型安全
- React用于UI组件
- Redux用于状态管理
- Electron用于跨平台桌面功能
- 本地存储数据，无需外部数据库

## 许可证

MIT许可证 