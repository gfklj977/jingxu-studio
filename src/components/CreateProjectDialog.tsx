import { Form, Input, Modal } from 'antd'

interface CreateProjectDialogProps {
  open: boolean
  submitting: boolean
  onCancel: () => void
  onCreate: (title: string, channel: string) => Promise<void>
}

interface ProjectForm {
  title: string
  channel: string
}

export function CreateProjectDialog({ open, submitting, onCancel, onCreate }: CreateProjectDialogProps) {
  const [form] = Form.useForm<ProjectForm>()

  async function submit() {
    const values = await form.validateFields()
    await onCreate(values.title.trim(), values.channel.trim())
    form.resetFields()
  }

  return (
    <Modal
      title="新建创作项目"
      open={open}
      okText="创建项目"
      cancelText="取消"
      confirmLoading={submitting}
      onOk={submit}
      onCancel={onCancel}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" initialValues={{ channel: '李逍遥说说' }}>
        <Form.Item label="项目标题" name="title" rules={[{ required: true, whitespace: true, message: '请输入项目标题' }, { max: 120, message: '最多输入 120 个字符' }]}>
          <Input autoFocus placeholder="例如：AI 时代的摄影门店" maxLength={120} />
        </Form.Item>
        <Form.Item label="创作栏目" name="channel" rules={[{ required: true, whitespace: true, message: '请输入创作栏目' }, { max: 60, message: '最多输入 60 个字符' }]}>
          <Input maxLength={60} />
        </Form.Item>
      </Form>
    </Modal>
  )
}

