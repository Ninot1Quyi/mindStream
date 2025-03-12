import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Button, Select, Alert, Radio, Space } from 'antd';
import { useDispatch } from 'react-redux';
import { createBranch, updateBranch } from '../../store/slices/branchSlice';
import { createConversation } from '../../store/slices/conversationSlice';
import useAppSelector from '../../hooks/useAppSelector';
import { selectConversations } from '../../store/selectors/conversationSelectors';
import { selectBranches } from '../../store/selectors/canvasSelectors';

interface CreateCanvasNodeModalProps {
  visible: boolean;
  onCancel: () => void;
  position?: { x: number; y: number };
}

// 使用普通的 Form.Item
const FormItem = Form.Item;

const CreateCanvasNodeModal: React.FC<CreateCanvasNodeModalProps> = ({
  visible,
  onCancel,
  position = { x: 0, y: 0 }
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [nodeType, setNodeType] = useState<'existing' | 'new'>('existing');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const dispatch = useDispatch();
  const conversations = useAppSelector(selectConversations);
  const branches = useAppSelector(selectBranches);
  
  // 重置表单和状态
  useEffect(() => {
    if (visible) {
      // 检查是否有会话可供选择
      if (Object.keys(conversations).length === 0) {
        setNodeType('new'); // 如果没有会话，默认选择创建新会话
      }
      
      // 从 sessionStorage 获取保存的数据
      const savedData = sessionStorage.getItem('newNodeData');
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        form.setFieldsValue({
          nodeName: parsedData.name || '',
          conversationId: parsedData.conversationId || undefined,
          newConversationTitle: '',
        });
      }
    }
  }, [visible, form, conversations]);

  const handleCancel = () => {
    form.resetFields();
    setErrorMessage(null);
    onCancel();
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      setErrorMessage(null);
      
      if (nodeType === 'new') {
        // 创建新会话
        try {
          // 创建新会话
          const resultAction = await dispatch(createConversation(
            values.newConversationTitle || 'New Conversation'
          ) as any);
          
          if (resultAction.payload) {
            const { conversation, branch } = resultAction.payload;
            
            // 已经创建了会话和主分支，现在更新位置即可
            if (branch) {
              // 更新主分支位置
              const updateResult = await dispatch(updateBranch({
                branchId: branch.id,
                updates: { position }
              }) as any);
              
              if (updateResult.payload) {
                // 清除会话存储
                sessionStorage.removeItem('newNodeData');
                handleCancel();
                return;
              }
            }
            
            throw new Error('创建会话成功但无法更新节点位置');
          } else {
            throw new Error('创建会话失败');
          }
        } catch (error) {
          console.error('创建新会话和节点失败:', error);
          setErrorMessage('创建新会话失败，请稍后再试');
        }
      } else {
        // 使用现有会话创建节点
        try {
          // 获取父节点ID，从sessionStorage
          const savedData = sessionStorage.getItem('newNodeData');
          const parsedData = savedData ? JSON.parse(savedData) : {};
          
          // 获取父节点ID和根节点标记
          let parentId = parsedData.parentId;
          const isRoot = parsedData.isRoot || false;
          
          // 创建分支参数
          const branchParams: any = {
            name: values.nodeName,
            position: position,
            isRoot: isRoot
          };
          
          // 只有在父分支存在的情况下才添加父分支ID
          if (parentId && branches[parentId]) {
            branchParams.parentBranchId = parentId;
            branchParams.isRoot = false;
          } else if (nodeType === 'existing' && values.conversationId) {
            // 尝试获取所选会话的主分支
            const selectedConversation = conversations[values.conversationId];
            if (selectedConversation && 
                selectedConversation.branches && 
                selectedConversation.branches.length > 0) {
              
              const mainBranchId = selectedConversation.branches[0];
              // 检查这个分支是否存在于branches对象中
              if (branches[mainBranchId]) {
                branchParams.parentBranchId = mainBranchId;
                branchParams.isRoot = false;
              }
            }
          }
          
          // 创建分支
          console.log('创建分支参数:', branchParams);
          const branchResult = await dispatch(createBranch(branchParams) as any);
          
          if (branchResult.payload) {
            // 清除会话存储
            sessionStorage.removeItem('newNodeData');
            handleCancel();
            return;
          } else {
            throw new Error('创建节点失败：API 返回错误');
          }
        } catch (error) {
          console.error('创建节点失败:', error);
          setErrorMessage('创建节点失败：' + (error instanceof Error ? error.message : '未知错误'));
        }
      }
    } catch (error) {
      console.error('表单验证失败:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="创建新节点"
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
        </Button>,
      ]}
      destroyOnClose
    >
      {errorMessage && (
        <Alert
          message={errorMessage}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Form form={form} layout="vertical">
        <FormItem
          name="nodeName"
          label="节点名称"
          rules={[{ required: true, message: '请输入节点名称' }]}
        >
          <Input placeholder="输入节点的名称" />
        </FormItem>

        <FormItem
          label="选择创建方式"
          style={{ marginBottom: 8 }}
        >
          <Radio.Group 
            value={nodeType} 
            onChange={(e) => setNodeType(e.target.value)}
            disabled={Object.keys(conversations).length === 0}
          >
            <Radio.Button value="existing" disabled={Object.keys(conversations).length === 0}>
              使用现有会话
            </Radio.Button>
            <Radio.Button value="new">创建新会话</Radio.Button>
          </Radio.Group>
        </FormItem>

        {nodeType === 'existing' ? (
          <FormItem
            name="conversationId"
            label="选择会话"
            rules={[{ required: true, message: '请选择会话' }]}
          >
            <Select placeholder="选择要关联的会话">
              {Object.values(conversations).map((conversation) => (
                <Select.Option key={conversation.id} value={conversation.id}>
                  {conversation.title}
                </Select.Option>
              ))}
            </Select>
          </FormItem>
        ) : (
          <FormItem
            name="newConversationTitle"
            label="新会话标题"
            rules={[{ required: true, message: '请输入新会话的标题' }]}
          >
            <Input placeholder="输入新会话的标题" />
          </FormItem>
        )}

        <FormItem label="节点位置（自动生成）">
          {/* 使用 Space.Compact 替代 Input.Group */}
          <Space.Compact style={{ width: '100%' }}>
            <Input
              style={{ width: '50%' }}
              value={`X: ${position.x}`}
              disabled
            />
            <Input
              style={{ width: '50%' }}
              value={`Y: ${position.y}`}
              disabled
            />
          </Space.Compact>
        </FormItem>
      </Form>
    </Modal>
  );
};

export default CreateCanvasNodeModal; 