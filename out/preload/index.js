"use strict";
const electron = require("electron");
const api = {
  // 会话相关
  conversations: {
    getAll: () => electron.ipcRenderer.invoke("get-conversations"),
    get: (conversationId) => electron.ipcRenderer.invoke("get-conversation", conversationId),
    create: (title) => electron.ipcRenderer.invoke("create-conversation", title),
    updateTitle: (conversationId, title) => electron.ipcRenderer.invoke("update-conversation-title", conversationId, title)
  },
  // 分支相关
  branches: {
    get: (branchId) => electron.ipcRenderer.invoke("get-branch", branchId),
    create: (parentBranchId, parentMessageId, name, position) => electron.ipcRenderer.invoke("create-branch", parentBranchId, parentMessageId, name, position),
    update: (branchId, updates) => electron.ipcRenderer.invoke("update-branch", branchId, updates),
    delete: (branchId) => electron.ipcRenderer.invoke("delete-branch", branchId),
    getMessages: (branchId) => electron.ipcRenderer.invoke("get-branch-messages", branchId)
  },
  // 消息相关
  messages: {
    send: (branchId, content, sender) => electron.ipcRenderer.invoke("send-message", branchId, content, sender),
    generateAIResponse: (message) => electron.ipcRenderer.invoke("generate-ai-response", message)
  }
};
electron.contextBridge.exposeInMainWorld("electronAPI", api);
