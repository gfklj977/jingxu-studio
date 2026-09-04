import { ApiOutlined, CheckCircleOutlined, LockOutlined } from '@ant-design/icons'
import { Alert, Button, Drawer, Input, Popconfirm, Skeleton, Tag, message } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { deleteProviderSecret, listProviders, saveProviderSecret, testProvider, type ProviderStatus } from '../api/projects'

const capabilityOrder = ['文本生成', '联网搜索', '图像生成', '语音合成', '语音识别']
const capabilityHelp: Record<string, string> = {
  文本生成: '生成选题脚本；也可以跳过此服务，手动上传 TXT 或 Markdown 脚本。',
  联网搜索: '写稿前检索事实与参考资料；配置至少一家即可。',
  图像生成: '生成分镜和封面；配置至少一家即可。',
  语音合成: '将脚本转换为配音；AppID 与音色在项目生产页设置。',
  语音识别: '从配音生成 SRT 字幕；AppID 在项目生产页设置。',
}

export function ProviderSettings({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [providers, setProviders] = useState<ProviderStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState('')
  const [secret, setSecret] = useState('')
  const [testingId, setTestingId] = useState('')
  const [latencies, setLatencies] = useState<Record<string, number>>({})
  const groups = useMemo(() => capabilityOrder.map((capability) => ({ capability, providers: providers.filter((provider) => provider.capability === capability) })), [providers])

  async function reload() { setProviders(await listProviders()) }
  async function save(provider: ProviderStatus) {
    if (secret.length < 8) return
    try { await saveProviderSecret(provider.id, secret); setSecret(''); setEditingId(''); await reload(); message.success(`${provider.name} 密钥已安全保存`) }
    catch { setError('密钥保存失败') }
  }
  async function remove(provider: ProviderStatus) {
    try { await deleteProviderSecret(provider.id); await reload() } catch { setError('密钥删除失败') }
  }
  async function check(provider: ProviderStatus) {
    setTestingId(provider.id); setError('')
    try { const result = await testProvider(provider.id); setLatencies((current) => ({ ...current, [provider.id]: result.latencyMs })); message.success(`${provider.name} 连接正常`) }
    catch { setError(`${provider.name} 连接失败，请检查密钥和网络`) }
    finally { setTestingId('') }
  }
  useEffect(() => {
    if (!open) return
    listProviders().then(setProviders).catch(() => setError('服务状态加载失败')).finally(() => setLoading(false))
  }, [open])

  return <Drawer className="settings-center" title="全局配置 · 密钥管理" open={open} onClose={onClose} width="min(1180px, 96vw)">
    <div className="settings-security"><LockOutlined /><div><strong>本机安全存储已启用</strong><p>密钥只保存在 macOS 钥匙串或 Windows 凭据管理器，不进入项目、日志和导出文件。</p></div></div>
    {error && <Alert className="provider-error" type="error" message={error} showIcon />}
    {loading ? <Skeleton active /> : <div className="provider-groups">
      {groups.map(({ capability, providers: items }, groupIndex) => <section key={capability} className="provider-group" aria-labelledby={`provider-group-${groupIndex}`}>
        <header><span>{groupIndex + 1}</span><div><h2 id={`provider-group-${groupIndex}`}>{capability}</h2><p>{capabilityHelp[capability]}</p></div></header>
        <div className="provider-grid">{items.length === 0 && <p className="provider-empty">暂无可用服务</p>}{items.map((provider) => <article key={provider.id} className={editingId === provider.id ? 'editing' : ''}>
          <div className="provider-card-head"><span className="provider-icon"><ApiOutlined /></span><div><strong>{provider.name}</strong><small>{provider.status === 'READY' ? '凭证已配置 / 已就绪' : '尚未保存凭证'}</small></div><Tag icon={provider.status === 'READY' ? <CheckCircleOutlined /> : undefined} color={provider.status === 'READY' ? 'success' : provider.status === 'ERROR' ? 'error' : 'default'}>{provider.status === 'READY' ? '已就绪' : provider.status === 'ERROR' ? '连接失败' : '未配置'}</Tag></div>
          <div className="provider-actions">{latencies[provider.id] !== undefined && <small>{latencies[provider.id]} ms</small>}{provider.status === 'READY' && ['deepseek', 'tavily'].includes(provider.id) && <Button size="small" aria-label={`测试 ${provider.name} 连接`} loading={testingId === provider.id} onClick={() => check(provider)}>测试连接</Button>}<Button size="small" aria-label={`配置 ${provider.name}`} onClick={() => { setEditingId(provider.id); setSecret('') }}>配置凭证</Button></div>
          {editingId === provider.id && <div className="provider-editor"><Input.Password autoComplete="new-password" aria-label={`${provider.name} API 密钥`} value={secret} onChange={(event) => setSecret(event.target.value)} placeholder="输入新的 API Key / Access Token；留空不会覆盖" /><Button type="primary" aria-label={`保存 ${provider.name} 密钥`} disabled={secret.length < 8} onClick={() => save(provider)}>安全保存</Button>{provider.status === 'READY' && <Popconfirm title="删除已保存的密钥？" onConfirm={() => remove(provider)}><Button danger>删除</Button></Popconfirm>}</div>}
        </article>)}</div>
      </section>)}
    </div>}
  </Drawer>
}
