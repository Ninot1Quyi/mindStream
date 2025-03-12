import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, InputNumber, Button, Space } from 'antd';
import { useDispatch } from 'react-redux';
import { closeModal } from '../../store/slices/uiSlice';
import { createMultipleChildBranches } from '../../store/slices/branchSlice';
import { Position } from '../../types/models';

interface CreateMultipleBranchesModalProps {
  visible: boolean;
  onCancel?: () => void;
}

const CreateMultipleBranchesModal: React.FC<CreateMultipleBranchesModalProps> = ({ 
  visible,
  onCancel
}) => {
  const dispatch = useDispatch();
  const [form] = Form.useForm();
  const [count, setCount] = useState(2);
  const [loading, setLoading] = useState(false);
  const [parentBranchId, setParentBranchId] = useState<string | null>(null);
  const [positions, setPositions] = useState<Position[] | null>(null);
  
  // 从会话存储中获取数据
  useEffect(() => {
    if (visible) {
      const storedData = sessionStorage.getItem('multipleBranchesData');
      if (storedData) {
        try {
          const data = JSON.parse(storedData);
          setParentBranchId(data.parentBranchId);
          setCount(data.count || 2);
          setPositions(data.positions || null);
          
          // 初始化表单
          form.setFieldsValue({
            count: data.count || 2,
            branchNames: Array(data.count || 2).fill('').map((_, i) => `分支 ${i + 1}`)
          });
        } catch (error) {
          console.error('解析存储的分支数据失败:', error);
        }
      }
    }
  }, [visible, form]);
  
  // 处理数量变化
  const handleCountChange = (value: number | null) => {
    if (value !== null) {
      setCount(value);
      
      // 更新分支名称数组
      const currentNames = form.getFieldValue('branchNames') || [];
      const newNames = Array(value).fill('').map((_, i) => {
        return i < currentNames.length ? currentNames[i] : `分支 ${i + 1}`;
      });
      
      form.setFieldsValue({ branchNames: newNames });
    }
  };
  
  // 处理取消
  const handleCancel = () => {
    form.resetFields();
    sessionStorage.removeItem('multipleBranchesData');
    setCount(2);
    setParentBranchId(null);
    setPositions(null);
    
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
      
      if (!parentBranchId) {
        console.error('缺少父分支ID');
        return;
      }
      
      setLoading(true);
      
      // 创建分支数据
      const branchData = values.branchNames.map((name: string, index: number) => {
        return {
          name,
          position: positions && positions[index] ? positions[index] : undefined
        };
      });
      
      // 调用创建多个分支的Action
      await dispatch(createMultipleChildBranches({
        parentBranchId,
        count: values.branchNames.length,
        positions: positions || undefined
      }) as any);
      
      // 关闭模态框
      handleCancel();
    } catch (error) {
      console.error('创建多个分支失败:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Modal
      title="创建多个分支"
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
          count: 2,
          branchNames: ['分支 1', '分支 2']
        }}
      >
        <Form.Item
          name="count"
          label="分支数量"
          rules={[{ required: true, message: '请输入分支数量' }]}
        >
          <InputNumber 
            min={1} 
            max={5} 
            onChange={handleCountChange}
            style={{ width: '100%' }}
          />
        </Form.Item>
        
        <Form.List name="branchNames">
          {(fields, { add, remove }) => (
            <>
              {fields.map((field, index) => (
                <Form.Item
                  key={field.key}
                  label={`分支 ${index + 1} 名称`}
                  name={[field.name]}
                  rules={[{ required: true, message: '请输入分支名称' }]}
                >
                  <Input placeholder={`分支 ${index + 1}`} />
                </Form.Item>
              ))}
            </>
          )}
        </Form.List>
      </Form>
    </Modal>
  );
};

export default CreateMultipleBranchesModal; 