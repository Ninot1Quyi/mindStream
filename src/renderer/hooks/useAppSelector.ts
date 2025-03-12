import { useSelector, TypedUseSelectorHook } from 'react-redux';
import { RootState } from '../store';
import { shallowEqual } from 'react-redux';

/**
 * 应用专用的useSelector钩子
 * 使用shallowEqual比较器来避免不必要的重渲染
 * 这对于返回对象和数组的选择器特别有用
 */
export const useAppSelector: TypedUseSelectorHook<RootState> = (selector) => 
  useSelector(selector, shallowEqual);

export default useAppSelector; 