const fs = require('fs');
const path = require('path');
const rimraf = require('rimraf');

const distPath = path.join(__dirname, 'dist');

// 检查dist目录是否存在
if (fs.existsSync(distPath)) {
  console.log('清理dist目录...');
  rimraf.sync(distPath);
  console.log('dist目录已清理完成');
} else {
  console.log('dist目录不存在，无需清理');
}

// 创建必要的目录结构
console.log('创建必要的目录结构...');
fs.mkdirSync(path.join(distPath, 'main'), { recursive: true });
fs.mkdirSync(path.join(distPath, 'preload'), { recursive: true });
fs.mkdirSync(path.join(distPath, 'renderer'), { recursive: true });
console.log('目录结构已创建完成'); 