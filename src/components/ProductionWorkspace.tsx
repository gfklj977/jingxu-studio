import { SaveOutlined, ThunderboltOutlined } from '@ant-design/icons'
import { Alert, Button, Checkbox, Skeleton, Tag, message } from 'antd'
import { useEffect, useState } from 'react'
import { getProductionSettings, saveProductionSettings, type ProductionSettings, type ProductionStage } from '../api/projects'

const stageLabels: Record<ProductionStage, string> = { AUDIO: '配音', SUBTITLES: '字幕', STORYBOARD: '分镜', COVER: '封面', VIDEO: '成片' }

export function ProductionWorkspace({ projectId }: { projectId: number }) {
  const [settings, setSettings] = useState<ProductionSettings | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => { let active = true; getProductionSettings(projectId).then((value) => { if (active) setSettings(value) }).catch(() => setError('生产设置加载失败')); return () => { active = false } }, [projectId])
  if (!settings) return <section className="content-section script-loading">{error ? <Alert type="error" message={error} /> : <Skeleton active />}</section>
  function toggle(stage: ProductionStage) { if (!settings) return; setSettings({ ...settings, stages: settings.stages.includes(stage) ? settings.stages.filter((item) => item !== stage) : [...settings.stages, stage] }) }
  async function save() { if (!settings) return; setSaving(true); try { setSettings(await saveProductionSettings(projectId, settings)); message.success('生产设置已保存') } catch { setError('保存失败') } finally { setSaving(false) } }
  return <section className="content-section production-workspace">
    <div className="section-heading"><div><h3>生产流水线</h3><p>按需选择阶段，缺失的上游产物将自动补齐</p></div><Button icon={<SaveOutlined />} loading={saving} onClick={save}>保存生产设置</Button></div>
    {error && <Alert type="error" message={error} />}
    <div className="pipeline-stages">{(Object.keys(stageLabels) as ProductionStage[]).map((stage, index) => <label key={stage}><span>{index + 1}</span><Checkbox checked={settings.stages.includes(stage)} onChange={() => toggle(stage)}>{stageLabels[stage]}</Checkbox><small>等待开始</small></label>)}</div>
    <div className="production-standard"><h4>成片标准</h4><div><Tag>1920×1080</Tag><Tag>30 fps</Tag><Tag>H.264</Tag><Tag>AAC</Tag></div><p>人声音量 <b>{settings.voiceVolume.toFixed(2)}</b> · BGM 音量 <b>{settings.bgmVolume.toFixed(2)}</b></p></div>
    <Alert type="info" showIcon message="启动前会检查脚本、服务密钥、磁盘空间和上游产物" />
    <Button className="pipeline-start" type="primary" size="large" icon={<ThunderboltOutlined />} disabled={settings.stages.length === 0}>一键生成</Button>
  </section>
}
