/**
 * 开发环境重启脚本
 * 
 * 用于清理缓存并启动开发服务器和Electron应用
 */
const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const http = require('http');

// 清理目录
const distPath = path.join(__dirname, 'dist');
const cachePath = path.join(os.homedir(), '.vite');

// 检查是否存在dist目录
if (fs.existsSync(distPath)) {
  console.log('🧹 清理dist目录...');
  fs.rmSync(distPath, { recursive: true, force: true });
  console.log('✅ dist目录已清理');
}

// 杀死所有相关进程
console.log('🔄 终止遗留的进程...');
let killCommand;
if (os.platform() === 'win32') {
  // Windows平台
  killCommand = 'taskkill /F /IM electron.exe /T & taskkill /F /IM node.exe /FI "WINDOWTITLE eq vite" /T';
} else {
  // macOS/Linux平台
  killCommand = 'pkill -f electron || true; pkill -f "vite.*dev" || true';
}

exec(killCommand, (error) => {
  if (error && os.platform() !== 'win32') {
    console.log('📝 没有找到需要终止的进程');
  } else {
    console.log('✅ 进程已终止');
  }
  
  // 启动开发服务器
  console.log('🚀 启动开发服务器...');
  
  // 创建一个独立的vite开发服务器进程
  const viteProcess = spawn('npx', ['vite', '--port', '5173', '--strictPort', 'true', '-c', 'electron.vite.config.ts', 'src/renderer'], { 
    stdio: 'inherit',
    shell: true
  });
  
  viteProcess.on('error', (error) => {
    console.error('❌ 启动Vite开发服务器失败:', error);
    process.exit(1);
  });

  // 检查Vite服务器是否已启动
  const checkServerInterval = setInterval(() => {
    http.get('http://localhost:5173', (res) => {
      if (res.statusCode === 200) {
        clearInterval(checkServerInterval);
        console.log('✅ Vite开发服务器已准备就绪');
        
        // 启动Electron应用
        console.log('🚀 启动Electron应用...');
        const electronProcess = spawn('npx', ['electron', '.'], { 
          stdio: 'inherit',
          shell: true,
          env: { ...process.env, NODE_ENV: 'development' }
        });
        
        electronProcess.on('error', (error) => {
          console.error('❌ 启动Electron应用失败:', error);
          viteProcess.kill();
          process.exit(1);
        });
        
        // 处理Electron进程退出
        electronProcess.on('exit', (code) => {
          console.log(`🛑 Electron应用已退出，退出码: ${code}`);
          // 是否也终止Vite服务器
          const shouldExitVite = true;
          if (shouldExitVite) {
            viteProcess.kill();
            console.log('🛑 Vite开发服务器已停止');
          }
        });
      }
    }).on('error', () => {
      // 服务器尚未准备好，继续等待
    });
  }, 500);
  
  // 设置超时
  setTimeout(() => {
    clearInterval(checkServerInterval);
    console.error('❌ Vite开发服务器启动超时');
    viteProcess.kill();
    process.exit(1);
  }, 30000);

  // 处理停止信号
  process.on('SIGINT', () => {
    console.log('🛑 收到中断信号，正在停止...');
    clearInterval(checkServerInterval);
    viteProcess.kill();
    process.exit(0);
  });
});

console.log('⏳ 正在准备开发环境...'); 