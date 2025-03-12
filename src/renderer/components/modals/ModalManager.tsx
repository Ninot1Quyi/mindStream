import React from 'react';
import { RootState } from '../../store';
import CreateMultipleBranchesModal from './CreateMultipleBranchesModal';
import CreateBranchFromMessageModal from './CreateBranchFromMessageModal';
import CreateCanvasNodeModal from './CreateCanvasNodeModal';
import { selectActiveModal } from '../../store/selectors/uiSelectors';
import useAppSelector from '../../hooks/useAppSelector';
import { useDispatch } from 'react-redux';
import { closeModal } from '../../store/slices/uiSlice';

const ModalManager: React.FC = () => {
  const activeModal = useAppSelector(selectActiveModal);
  const dispatch = useDispatch();
  
  // 处理关闭模态窗口
  const handleCloseModal = () => {
    dispatch(closeModal());
  };
  
  return (
    <>
      <CreateMultipleBranchesModal 
        visible={activeModal === 'create-multiple-branches'} 
      />
      <CreateBranchFromMessageModal 
        visible={activeModal === 'create-branch-from-message'} 
      />
      <CreateCanvasNodeModal
        visible={activeModal === 'create-canvas-node'} 
        onCancel={handleCloseModal}
      />
    </>
  );
};

export default ModalManager; 