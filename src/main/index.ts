import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { initIpcHandlers } from './ipc';
import { initDataStore } from './services/store';

// 是否为开发环境
const isDev = process.env.NODE_ENV === 'development';
console.log('App starting in', isDev ? 'development' : 'production', 'mode');

// 主窗口引用
let mainWindow: BrowserWindow | null = null;

/**
 * 创建主窗口
 */
async function createMainWindow() {
  // 创建浏览器窗口
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 1000,
    minWidth: 900,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../preload/index.js'),
    },
    show: false,
    backgroundColor: '#f5f5f5', // 添加背景色，避免白屏
  });

  // 始终打开开发者工具，用于调试
  mainWindow.webContents.openDevTools();
  
  // 添加加载状态监听
  mainWindow.webContents.on('did-start-loading', () => {
    console.log('页面开始加载');
  });
  
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('页面加载完成');
    // 显示启动消息
    dialog.showMessageBox(mainWindow!, {
      type: 'info',
      title: '应用程序已启动',
      message: '应用程序已成功启动。如果您看不到界面，请检查以下几点：\n1. 查看DevTools控制台是否有错误\n2. 预加载脚本是否正确加载\n3. 渲染进程与主进程通信是否正常',
      buttons: ['确定']
    });
  });

  // 加载应用
  if (isDev) {
    // 开发模式: 连接开发服务器
    console.log('尝试从开发服务器加载应用...');
    
    // 配置开发服务器URL和重试逻辑
    const DEV_SERVER_URL = 'http://localhost:5173/';
    let retryCount = 0;
    const maxRetries = 3;
    let loadSuccess = false;
    
    while (!loadSuccess && retryCount < maxRetries) {
      try {
        console.log(`尝试连接开发服务器 (${retryCount + 1}/${maxRetries})...`);
        await mainWindow.loadURL(DEV_SERVER_URL);
        loadSuccess = true;
        console.log('成功连接到开发服务器!');
      } catch (err) {
        retryCount++;
        console.error(`连接开发服务器失败 (${retryCount}/${maxRetries}):`, err);
        if (retryCount < maxRetries) {
          console.log(`等待2秒后重试...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
          console.error('无法连接到开发服务器，尝试加载本地文件');
          try {
            // 尝试加载本地文件备用
            const localPath = path.join(__dirname, '../renderer/index.html');
            if (fs.existsSync(localPath)) {
              await mainWindow.loadFile(localPath);
              console.log('已加载本地文件作为备用');
            } else {
              throw new Error(`本地文件 ${localPath} 不存在`);
            }
          } catch (localErr) {
            console.error('加载本地文件失败:', localErr);
            dialog.showErrorBox(
              '加载错误',
              `无法加载应用: ${(localErr as Error).message}`
            );
          }
        }
      }
    }
  } else {
    // 生产模式：加载打包后的HTML文件
    console.log('加载生产构建...');
    try {
      const indexPath = path.join(__dirname, '../renderer/index.html');
      console.log('Loading production file:', indexPath);
      await mainWindow.loadFile(indexPath);
      console.log('生产构建加载成功');
    } catch (err) {
      console.error('加载生产构建失败:', err);
      dialog.showErrorBox(
        '加载错误',
        `无法加载应用: ${(err as Error).message}`
      );
    }
  }

  // 窗口准备好后显示，避免白屏
  mainWindow.on('ready-to-show', () => {
    if (mainWindow) {
      console.log('窗口准备就绪，显示主窗口');
      mainWindow.show();
    }
  });

  // 监听窗口关闭事件
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
  
  // 监听窗口加载失败
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('页面加载失败:', errorCode, errorDescription);
    if (mainWindow) {
      dialog.showMessageBox(mainWindow, {
        type: 'error',
        title: '加载错误',
        message: `页面加载失败: ${errorDescription} (${errorCode})`,
        buttons: ['重试', '关闭'],
      }).then(({ response }) => {
        if (response === 0) {
          // 重试
          mainWindow?.reload();
        }
      });
    }
  });
}

/**
 * 应用程序初始化
 */
async function init() {
  try {
    // 初始化数据存储
    await initDataStore();
    // 初始化IPC处理器
    initIpcHandlers();
    console.log('应用程序初始化完成');
  } catch (error) {
    console.error('应用程序初始化失败:', error);
    dialog.showErrorBox(
      '初始化错误',
      `应用程序初始化失败: ${(error as Error).message}`
    );
  }
}

// 当Electron完成初始化并准备创建浏览器窗口时调用此方法
app.whenReady().then(async () => {
  await init();
  await createMainWindow();

  // 在macOS上，当点击dock图标且没有其他窗口打开时，重新创建一个窗口
  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createMainWindow();
    }
  });
});

// 关闭所有窗口时退出应用（Windows & Linux）
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 在开发模式下，根据父进程是否为Electron来判断
if (isDev) {
  if (process.platform === 'win32') {
    // Windows下的开发模式特殊处理
    process.on('message', (data) => {
      if (data === 'graceful-exit') {
        app.quit();
      }
    });
  } else {
    // Linux/MacOS下的开发模式特殊处理
    process.on('SIGTERM', () => {
      app.quit();
    });
  }
} 