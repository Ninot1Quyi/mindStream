import { ipcMain } from 'electron';
import { preferencesService } from '../services/preferences';

// 注册偏好设置相关的IPC处理程序
export const registerPreferencesHandlers = () => {
  // 获取偏好设置
  ipcMain.handle('get-preferences', () => {
    return preferencesService.loadPreferences();
  });

  // 保存偏好设置
  ipcMain.handle('save-preferences', (_, preferences) => {
    preferencesService.savePreferences(preferences);
    return { success: true };
  });

  // 获取特定偏好设置
  ipcMain.handle('get-preference', (_, key) => {
    return preferencesService.getPreference(key);
  });

  // 设置特定偏好设置
  ipcMain.handle('set-preference', (_, key, value) => {
    preferencesService.setPreference(key, value);
    return { success: true };
  });
}; 