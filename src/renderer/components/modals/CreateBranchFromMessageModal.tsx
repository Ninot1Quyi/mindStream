import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Button } from 'antd';
import { useDispatch } from 'react-redux';
import { closeModal } from '../../store/slices/uiSlice';
import { createBranchFromMessage } from '../../store/slices/branchSlice';
import { Position } from '../../types/models';

interface CreateBranchFromMessageModalProps {
  visible: boolean;
  onCancel?: () => void;
}

const CreateBranchFromMessageModal: React.FC<CreateBranchFromMessageModalProps> = ({ 
  visible,
  onCancel
}) => {
  const dispatch = useDispatch();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [parentBranchId, setParentBranchId] = useState<string | null>(null);
  const [messageId, setMessageId] = useState<string | null>(null);
  const [position, setPosition] = useState<Position | null>(null);
  
  // 从会话存储中获取数据
  useEffect(() => {
    if (visible) {
      const storedData = sessionStorage.getItem('branchFromMessageData');
      if (storedData) {
        try {
          const data = JSON.parse(storedData);
          setParentBranchId(data.parentBranchId);
          setMessageId(data.messageId);
          setPosition(data.position || null);
          
          // 初始化表单
          form.setFieldsValue({
            name: '新分支'
          });
        } catch (error) {
          console.error('解析存储的分支数据失败:', error);
        }
      }
    }
  }, [visible, form]);
  
  // 处理取消
  const handleCancel = () => {
    form.resetFields();
    sessionStorage.removeItem('branchFromMessageData');
    setParentBranchId(null);
    setMessageId(null);
    setPosition(null);
    
    // 调用外部传入的 onCancel 或者默认关闭模态窗口
    if (onCancel) {
      onCancel();
    } else {
      dispatch(closeModal());
    }
  };
  
  // 处理提交
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      if (!parentBranchId || !messageId) {
        console.error('缺少父分支ID或消息ID');
        return;
      }
      
      setLoading(true);
      
      // 调用创建分支的Action
      await dispatch(createBranchFromMessage({
        parentBranchId,
        messageId,
        name: values.name,
        position: position || undefined
      }) as any);
      
      // 关闭模态框
      handleCancel();
    } catch (error) {
      console.error('从消息创建分支失败:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Modal
      title="从消息创建分支"
      open={visible}
      onCancel={handleCancel}
      footer={[
        <Button key="cancel" onClick={handleCancel}>
          取消
        </Button>,
        <Button 
          key="submit" 
          type="primary" 
          loading={loading}
          onClick={handleSubmit}
        >
          创建
        </Button>
      ]}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          name: '新分支'
        }}
      >
        <Form.Item
          name="name"
          label="分支名称"
          rules={[{ required: true, message: '请输入分支名称' }]}
        >
          <Input placeholder="输入分支名称" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CreateBranchFromMessageModal; 