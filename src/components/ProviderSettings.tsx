import { ApiOutlined, LockOutlined } from '@ant-design/icons'
import { Alert, Drawer, Skeleton, Tag } from 'antd'
import { useEffect, useState } from 'react'
import { listProviders, type ProviderStatus } from '../api/projects'

export function ProviderSettings({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [providers, setProviders] = useState<ProviderStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    listProviders().then(setProviders).catch(() => setError('服务状态加载失败')).finally(() => setLoading(false))
  }, [open])

  return <Drawer title="AI 服务设置" open={open} onClose={onClose} size="large">
    <Alert showIcon icon={<LockOutlined />} type="info" message="密钥将保存在系统安全存储中" description="macOS 使用钥匙串，Windows 使用凭据管理器。项目数据库和日志都不保存明文密钥。" />
    {error && <Alert className="provider-error" type="error" message={error} />}
    {loading ? <Skeleton active /> : <div className="provider-list">
      {providers.map((provider) => <article key={provider.id}>
        <span className="provider-icon"><ApiOutlined /></span>
        <div><strong>{provider.name}</strong><small>{provider.capability}</small></div>
        <Tag color={provider.status === 'READY' ? 'success' : provider.status === 'ERROR' ? 'error' : 'default'}>{provider.status === 'READY' ? '已就绪' : provider.status === 'ERROR' ? '连接失败' : '未配置'}</Tag>
      </article>)}
    </div>}
  </Drawer>
}
