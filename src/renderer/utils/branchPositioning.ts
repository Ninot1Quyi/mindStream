/**
 * 分支位置计算工具
 * 从旧版canvas-manager.js迁移而来
 */
import { Branch, Position } from '../types/models';

// 分支框接口
interface BranchBox {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

/**
 * 计算子分支的位置
 * @param parentPosition 父分支位置
 * @param existingBranches 现有分支列表
 * @param defaultWidth 默认分支宽度
 * @param defaultHeight 默认分支高度
 */
export const calculatePositionForChildBranch = (
  parentPosition: Position,
  existingBranches: Branch[] = [],
  defaultWidth = 320,
  defaultHeight = 400
): Position => {
  // 计算父节点底部中心位置
  const startX = parentPosition.x + defaultWidth / 2;
  const startY = parentPosition.y + defaultHeight;
  
  // 默认的新位置（在父节点下方）
  let newX = startX - defaultWidth / 2;
  let newY = startY + 50; // 添加一些垂直间距
  
  // 定义搜索区域
  const searchWidth = 3 * defaultWidth;
  const searchHeight = 2 * defaultHeight;
  
  // 创建网格
  const gridSize = 50; // 网格大小
  const gridCols = Math.ceil(searchWidth / gridSize);
  const gridRows = Math.ceil(searchHeight / gridSize);
  
  // 填充现有分支占据的网格
  const occupiedGrid: boolean[][] = Array(gridRows).fill(null).map(() => Array(gridCols).fill(false));
  
  // 将现有分支转换为盒子
  const branchBoxes: BranchBox[] = existingBranches.map(branch => {
    const left = branch.position?.x || 0;
    const top = branch.position?.y || 0;
    return {
      left,
      top,
      right: left + defaultWidth,
      bottom: top + defaultHeight,
      width: defaultWidth,
      height: defaultHeight
    };
  });
  
  // 填充现有分支的位置
  branchBoxes.forEach(box => {
    // 转换为网格坐标
    const startCol = Math.max(0, Math.floor((box.left - newX + startX) / gridSize));
    const startRow = Math.max(0, Math.floor((box.top - newY + startY) / gridSize));
    const endCol = Math.min(gridCols - 1, Math.ceil((box.right - newX + startX) / gridSize));
    const endRow = Math.min(gridRows - 1, Math.ceil((box.bottom - newY + startY) / gridSize));
    
    // 标记占据的网格
    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        if (row >= 0 && row < gridRows && col >= 0 && col < gridCols) {
          occupiedGrid[row][col] = true;
        }
      }
    }
  });
  
  // 寻找最近的空闲位置
  let bestDistance = Infinity;
  let bestPosition = { x: newX, y: newY };
  
  for (let row = 0; row < gridRows; row++) {
    for (let col = 0; col < gridCols; col++) {
      if (!occupiedGrid[row][col]) {
        // 计算位置
        const posX = newX - startX + col * gridSize;
        const posY = newY - startY + row * gridSize;
        
        // 检查整个分支区域是否空闲
        let isFree = true;
        const branchCols = Math.ceil(defaultWidth / gridSize);
        const branchRows = Math.ceil(defaultHeight / gridSize);
        
        for (let r = 0; r < branchRows && isFree; r++) {
          for (let c = 0; c < branchCols && isFree; c++) {
            const checkRow = row + r;
            const checkCol = col + c;
            if (
              checkRow >= gridRows || 
              checkCol >= gridCols || 
              occupiedGrid[checkRow][checkCol]
            ) {
              isFree = false;
            }
          }
        }
        
        if (isFree) {
          // 计算到父节点底部中心的距离
          const dx = posX + defaultWidth / 2 - startX;
          const dy = posY - startY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          // 更新最佳位置
          if (distance < bestDistance) {
            bestDistance = distance;
            bestPosition = { x: posX, y: posY };
          }
        }
      }
    }
  }
  
  return bestPosition;
};

/**
 * 计算兄弟分支位置
 * @param parentPosition 父分支位置
 * @param count 分支数量
 * @param defaultWidth 默认分支宽度
 * @param defaultHeight 默认分支高度
 */
export const calculateSiblingPositions = (
  parentPosition: Position,
  count = 2,
  defaultWidth = 320,
  defaultHeight = 400
): Position[] => {
  const positions: Position[] = [];
  
  // 计算父节点中心位置
  const parentCenterX = parentPosition.x + defaultWidth / 2;
  const parentBottom = parentPosition.y + defaultHeight;
  
  // 计算每个分支的水平偏移
  const spacing = defaultWidth + 50; // 分支之间的间距
  const totalWidth = (count - 1) * spacing;
  const startX = parentCenterX - totalWidth / 2;
  
  // 为每个分支计算位置
  for (let i = 0; i < count; i++) {
    const x = startX + i * spacing;
    const y = parentBottom + 50; // 添加垂直间距
    
    positions.push({ x, y });
  }
  
  return positions;
};

/**
 * 检查两个盒子是否重叠
 */
export const checkBoxesOverlap = (boxA: BranchBox, boxB: BranchBox): boolean => {
  return !(
    boxA.right < boxB.left ||
    boxA.left > boxB.right ||
    boxA.bottom < boxB.top ||
    boxA.top > boxB.bottom
  );
};

/**
 * 调整位置以避免重叠
 * @param position 初始位置
 * @param existingBranches 现有分支
 * @param branchWidth 分支宽度
 * @param branchHeight 分支高度
 */
export const adjustPositionForOverlap = (
  position: Position,
  existingBranches: Branch[],
  branchWidth = 320,
  branchHeight = 400
): Position => {
  let adjustedPosition = { ...position };
  let hasOverlap = true;
  let iterations = 0;
  const maxIterations = 10; // 防止无限循环
  
  // 创建新分支的盒子
  const newBox: BranchBox = {
    left: adjustedPosition.x,
    top: adjustedPosition.y,
    right: adjustedPosition.x + branchWidth,
    bottom: adjustedPosition.y + branchHeight,
    width: branchWidth,
    height: branchHeight
  };
  
  // 将现有分支转换为盒子
  const existingBoxes: BranchBox[] = existingBranches.map(branch => {
    const left = branch.position?.x || 0;
    const top = branch.position?.y || 0;
    return {
      left,
      top,
      right: left + branchWidth,
      bottom: top + branchHeight,
      width: branchWidth,
      height: branchHeight
    };
  });
  
  // 调整位置直到没有重叠
  while (hasOverlap && iterations < maxIterations) {
    hasOverlap = false;
    
    for (const box of existingBoxes) {
      if (checkBoxesOverlap(newBox, box)) {
        hasOverlap = true;
        
        // 计算水平和垂直偏移
        const horizontalOffset = newBox.right - box.left + 20;
        const verticalOffset = newBox.bottom - box.top + 20;
        
        // 选择移动距离更小的方向
        if (horizontalOffset < verticalOffset) {
          adjustedPosition.x += horizontalOffset;
        } else {
          adjustedPosition.y += verticalOffset;
        }
        
        // 更新新盒子位置
        newBox.left = adjustedPosition.x;
        newBox.top = adjustedPosition.y;
        newBox.right = adjustedPosition.x + branchWidth;
        newBox.bottom = adjustedPosition.y + branchHeight;
        
        break;
      }
    }
    
    iterations++;
  }
  
  return adjustedPosition;
}; 