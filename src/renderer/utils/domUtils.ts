/**
 * DOM 工具函数
 */

/**
 * 安全地查找最近的匹配选择器的父元素
 * 如果元素不是 HTMLElement 或查找失败，返回 null
 */
export function safeClosest(element: unknown, selector: string): HTMLElement | null {
  if (!(element instanceof HTMLElement)) {
    return null;
  }
  
  try {
    const closest = element.closest(selector);
    return closest instanceof HTMLElement ? closest : null;
  } catch (error) {
    console.warn('Failed to use closest method:', error);
    return null;
  }
}

/**
 * 检查一个元素是否与选择器匹配或者是否有匹配选择器的父元素
 */
export function isOrHasClosest(element: unknown, selector: string): boolean {
  if (!(element instanceof HTMLElement)) {
    return false;
  }
  
  try {
    // 检查元素本身是否匹配
    if (element.matches(selector)) {
      return true;
    }
    
    // 检查父元素
    return !!element.closest(selector);
  } catch (error) {
    console.warn('Failed to check element matching:', error);
    return false;
  }
}

/**
 * 获取元素数据属性的安全方法
 */
export function getDataAttribute(element: unknown, attributeName: string): string | null {
  if (!(element instanceof HTMLElement)) {
    return null;
  }
  
  return element.dataset[attributeName] || null;
} 