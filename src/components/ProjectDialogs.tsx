import { DeleteOutlined, UndoOutlined } from '@ant-design/icons'
import { Button, Drawer, Empty, Form, Input, List, Modal } from 'antd'
import { useEffect } from 'react'
import type { Project } from '../types'

export function RenameProjectDialog({ project, onCancel, onRename }: { project: Project | null; onCancel: () => void; onRename: (title: string) => Promise<void> }) {
  const [form] = Form.useForm<{ title: string }>()
  useEffect(() => { if (project) form.setFieldsValue({ title: project.title }) }, [form, project])
  return (
    <Modal title="重命名项目" open={Boolean(project)} okText="保存" cancelText="取消" onCancel={onCancel} onOk={async () => { const value = await form.validateFields(); await onRename(value.title.trim()) }}>
      <Form form={form} layout="vertical"><Form.Item label="项目标题" name="title" rules={[{ required: true, whitespace: true }, { max: 120 }]}><Input maxLength={120} /></Form.Item></Form>
    </Modal>
  )
}

export function DeleteProjectDialog({ project, onCancel, onConfirm }: { project: Project | null; onCancel: () => void; onConfirm: () => Promise<void> }) {
  return (
    <Modal title="移入回收站" open={Boolean(project)} okText="移入回收站" okButtonProps={{ danger: true }} cancelText="取消" onCancel={onCancel} onOk={onConfirm}>
      <p>“{project?.title}”将移入回收站，可随时恢复。</p>
    </Modal>
  )
}

export function RecycleBin({ open, projects, loading, onClose, onRestore }: { open: boolean; projects: Project[]; loading: boolean; onClose: () => void; onRestore: (project: Project) => Promise<void> }) {
  return (
    <Drawer title="项目回收站" open={open} onClose={onClose} size="large">
      {projects.length === 0 && !loading ? <Empty description="回收站为空" /> : (
        <List loading={loading} dataSource={projects} renderItem={(project) => (
          <List.Item actions={[<Button key="restore" type="link" icon={<UndoOutlined />} aria-label={`恢复：${project.title}`} onClick={() => onRestore(project)}>恢复</Button>]}>
            <List.Item.Meta avatar={<DeleteOutlined className="trash-icon" />} title={project.title} description={`${project.channel} · ${project.updatedAt}`} />
          </List.Item>
        )} />
      )}
    </Drawer>
  )
}
