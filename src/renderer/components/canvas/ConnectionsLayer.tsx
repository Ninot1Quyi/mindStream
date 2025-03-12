import React from 'react';
import styled from 'styled-components';
import { Branch } from '../../types/models';

interface ConnectionsLayerProps {
  branches: Record<string, Branch>;
}

const SVGLayer = styled.svg`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
`;

/**
 * 连接线层组件 - 当前返回空白内容
 * 
 * 注意：连接线功能已暂时禁用，等待自定义实现
 * 后续将根据特定需求实现连接线逻辑
 */
const ConnectionsLayer: React.FC<ConnectionsLayerProps> = ({ branches }) => {
  // 空白连接线层 - 保留组件结构但不显示连接线
  return (
    <SVGLayer className="connections-layer">
      {/* 连接线功能已禁用 */}
    </SVGLayer>
  );
};

export default React.memo(ConnectionsLayer); 