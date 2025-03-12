/**
 * 偏好设置服务
 * 用于与Electron API通信，获取和设置用户偏好
 */

// 用户偏好类型定义
export interface UserPreferences {
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
}

// 提供同步和异步方法来访问偏好设置
class PreferenceService {
  private cache: Partial<UserPreferences> | null = null;
  
  // 加载所有偏好设置
  async getAllPreferences(): Promise<UserPreferences> {
    try {
      this.cache = await window.electronAPI.preferences.getAll();
      return this.cache as UserPreferences;
    } catch (error) {
      console.error('获取偏好设置失败:', error);
      throw error;
    }
  }
  
  // 保存偏好设置
  async savePreferences(preferences: Partial<UserPreferences>): Promise<void> {
    try {
      await window.electronAPI.preferences.save(preferences);
      
      // 更新缓存
      if (this.cache) {
        this.cache = { ...this.cache, ...preferences };
      }
    } catch (error) {
      console.error('保存偏好设置失败:', error);
      throw error;
    }
  }
  
  // 获取特定偏好设置
  async getPreference<T>(key: string): Promise<T> {
    try {
      return await window.electronAPI.preferences.getPreference<T>(key);
    } catch (error) {
      console.error(`获取偏好设置 ${key} 失败:`, error);
      throw error;
    }
  }
  
  // 设置特定偏好设置
  async setPreference(key: string, value: any): Promise<void> {
    try {
      await window.electronAPI.preferences.setPreference(key, value);
      
      // 如果缓存存在，更新缓存
      if (this.cache) {
        const keys = key.split('.');
        let current = this.cache as any;
        
        // 导航到嵌套对象中的最后一级
        for (let i = 0; i < keys.length - 1; i++) {
          const k = keys[i];
          if (!current[k]) current[k] = {};
          current = current[k];
        }
        
        // 设置最后一级的值
        current[keys[keys.length - 1]] = value;
      }
    } catch (error) {
      console.error(`设置偏好设置 ${key} 失败:`, error);
      throw error;
    }
  }
  
  // 检查偏好设置是否存在
  async hasPreference(key: string): Promise<boolean> {
    try {
      const value = await this.getPreference(key);
      return value !== undefined;
    } catch {
      return false;
    }
  }
  
  // 清除缓存
  clearCache(): void {
    this.cache = null;
  }
}

// 导出单例实例
export const preferenceService = new PreferenceService(); 