import { ApiOutlined, LockOutlined } from '@ant-design/icons'
import { Alert, Button, Drawer, Input, Popconfirm, Skeleton, Tag, message } from 'antd'
import { useEffect, useState } from 'react'
import { deleteProviderSecret, listProviders, saveProviderSecret, type ProviderStatus } from '../api/projects'

export function ProviderSettings({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [providers, setProviders] = useState<ProviderStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState('')
  const [secret, setSecret] = useState('')

  async function reload() {
    setProviders(await listProviders())
  }

  async function save(provider: ProviderStatus) {
    if (secret.length < 8) return
    try {
      await saveProviderSecret(provider.id, secret)
      setSecret('')
      setEditingId('')
      await reload()
      message.success(`${provider.name} 密钥已安全保存`)
    } catch { setError('密钥保存失败') }
  }

  async function remove(provider: ProviderStatus) {
    try {
      await deleteProviderSecret(provider.id)
      await reload()
    } catch { setError('密钥删除失败') }
  }

  useEffect(() => {
    if (!open) return
    listProviders().then(setProviders).catch(() => setError('服务状态加载失败')).finally(() => setLoading(false))
  }, [open])

  return <Drawer title="AI 服务设置" open={open} onClose={onClose} size="large">
    <Alert showIcon icon={<LockOutlined />} type="info" message="密钥将保存在系统安全存储中" description="macOS 使用钥匙串，Windows 使用凭据管理器。项目数据库和日志都不保存明文密钥。" />
    {error && <Alert className="provider-error" type="error" message={error} />}
    {loading ? <Skeleton active /> : <div className="provider-list">
      {providers.map((provider) => <article key={provider.id} className={editingId === provider.id ? 'editing' : ''}>
        <span className="provider-icon"><ApiOutlined /></span>
        <div><strong>{provider.name}</strong><small>{provider.capability}</small></div>
        <div className="provider-actions"><Tag color={provider.status === 'READY' ? 'success' : provider.status === 'ERROR' ? 'error' : 'default'}>{provider.status === 'READY' ? '已就绪' : provider.status === 'ERROR' ? '连接失败' : '未配置'}</Tag><Button size="small" aria-label={`配置 ${provider.name}`} onClick={() => { setEditingId(provider.id); setSecret('') }}>配置</Button></div>
        {editingId === provider.id && <div className="provider-editor"><Input.Password autoComplete="new-password" aria-label={`${provider.name} API 密钥`} value={secret} onChange={(event) => setSecret(event.target.value)} placeholder="输入 API 密钥" /><Button type="primary" aria-label={`保存 ${provider.name} 密钥`} disabled={secret.length < 8} onClick={() => save(provider)}>安全保存</Button>{provider.status === 'READY' && <Popconfirm title="删除已保存的密钥？" onConfirm={() => remove(provider)}><Button danger>删除密钥</Button></Popconfirm>}</div>}
      </article>)}
    </div>}
  </Drawer>
}
