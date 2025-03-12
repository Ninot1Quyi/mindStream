import fs from 'fs';
import path from 'path';
import { app } from 'electron';

// 用户偏好数据结构
interface UserPreferences {
  confirmation: {
    showDeleteConfirmation: boolean;
    showClearAllConfirmation: boolean;
  };
  appearance: {
    theme: 'light' | 'dark' | 'system';
  };
  canvas: {
    initialZoom: number;
  };
  // 可以根据需要添加更多设置
}

// 默认偏好设置
const defaultPreferences: UserPreferences = {
  confirmation: {
    showDeleteConfirmation: true,
    showClearAllConfirmation: true,
  },
  appearance: {
    theme: 'system',
  },
  canvas: {
    initialZoom: 0.5,
  },
};

// 获取偏好文件路径
const getPreferencesPath = () => {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'preferences', 'user-preferences.json');
};

// 确保偏好目录存在
const ensurePreferencesDir = () => {
  const preferencesPath = path.dirname(getPreferencesPath());
  if (!fs.existsSync(preferencesPath)) {
    fs.mkdirSync(preferencesPath, { recursive: true });
  }
};

// 加载偏好设置
export const loadPreferences = (): UserPreferences => {
  ensurePreferencesDir();
  const preferencesPath = getPreferencesPath();

  try {
    if (fs.existsSync(preferencesPath)) {
      const data = fs.readFileSync(preferencesPath, 'utf8');
      const savedPreferences = JSON.parse(data);
      // 合并保存的设置和默认设置，确保所有必要的字段都存在
      return { ...defaultPreferences, ...savedPreferences };
    }
  } catch (error) {
    console.error('加载偏好设置失败:', error);
  }

  // 如果加载失败或文件不存在，返回默认设置
  savePreferences(defaultPreferences); // 保存默认设置
  return defaultPreferences;
};

// 保存偏好设置
export const savePreferences = (preferences: Partial<UserPreferences>): void => {
  ensurePreferencesDir();
  const preferencesPath = getPreferencesPath();
  
  try {
    // 读取现有设置（如果存在）
    let currentPreferences = defaultPreferences;
    if (fs.existsSync(preferencesPath)) {
      const data = fs.readFileSync(preferencesPath, 'utf8');
      currentPreferences = { ...defaultPreferences, ...JSON.parse(data) };
    }
    
    // 合并新设置
    const updatedPreferences = { ...currentPreferences, ...preferences };
    
    // 写入文件
    fs.writeFileSync(preferencesPath, JSON.stringify(updatedPreferences, null, 2), 'utf8');
  } catch (error) {
    console.error('保存偏好设置失败:', error);
  }
};

// 获取特定偏好设置
export const getPreference = <T>(key: string): T => {
  const preferences = loadPreferences();
  // 通过点符号访问嵌套属性，例如 'confirmation.showDeleteConfirmation'
  return key.split('.').reduce((obj, prop) => {
    return obj && obj[prop as keyof typeof obj];
  }, preferences as any) as T;
};

// 设置特定偏好设置
export const setPreference = (key: string, value: any): void => {
  const preferences = loadPreferences();
  const keys = key.split('.');
  const lastKey = keys.pop()!;
  
  // 找到要设置的嵌套对象
  const target = keys.reduce((obj, prop) => {
    if (!obj[prop as keyof typeof obj]) {
      obj[prop as keyof typeof obj] = {} as any;
    }
    return obj[prop as keyof typeof obj];
  }, preferences as any);
  
  // 设置值
  target[lastKey] = value;
  
  // 保存更新后的偏好设置
  savePreferences(preferences);
};

// 导出偏好设置服务
export const preferencesService = {
  loadPreferences,
  savePreferences,
  getPreference,
  setPreference,
}; 