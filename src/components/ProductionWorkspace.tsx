import { SaveOutlined, ThunderboltOutlined } from '@ant-design/icons'
import { Alert, Button, Checkbox, Input, InputNumber, Skeleton, Tag, message } from 'antd'
import { useEffect, useState } from 'react'
import { cancelProductionJob, createProductionJob, getLatestProductionJob, getProductionSettings, saveProductionSettings, type ProductionJob, type ProductionSettings, type ProductionStage } from '../api/projects'

const stageLabels: Record<ProductionStage, string> = { AUDIO: '配音', SUBTITLES: '字幕', STORYBOARD: '分镜', COVER: '封面', VIDEO: '成片' }

export function ProductionWorkspace({ projectId }: { projectId: number }) {
  const [settings, setSettings] = useState<ProductionSettings | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [job, setJob] = useState<ProductionJob | null>(null)
  useEffect(() => { let active = true; Promise.all([getProductionSettings(projectId), getLatestProductionJob(projectId)]).then(([value, latest]) => { if (active) { setSettings(value); setJob(latest) } }).catch(() => setError('生产设置加载失败')); return () => { active = false } }, [projectId])
  useEffect(() => {
    if (!job || !['QUEUED', 'RUNNING'].includes(job.status)) return
    const timer = window.setInterval(() => { getLatestProductionJob(projectId).then(setJob).catch(() => undefined) }, 1200)
    return () => window.clearInterval(timer)
  }, [job, projectId])
  if (!settings) return <section className="content-section script-loading">{error ? <Alert type="error" message={error} /> : <Skeleton active />}</section>
  function toggle(stage: ProductionStage) { if (!settings) return; setSettings({ ...settings, stages: settings.stages.includes(stage) ? settings.stages.filter((item) => item !== stage) : [...settings.stages, stage] }) }
  async function save() { if (!settings) return; setSaving(true); try { setSettings(await saveProductionSettings(projectId, settings)); message.success('生产设置已保存') } catch { setError('保存失败') } finally { setSaving(false) } }
  async function start() { setError(''); try { setJob(await createProductionJob(projectId)) } catch { setError('任务无法启动，请检查是否已有运行中的任务。') } }
  async function cancel() { if (!job) return; try { setJob(await cancelProductionJob(job.id)) } catch { setError('取消任务失败') } }
  return <section className="content-section production-workspace">
    <div className="section-heading"><div><h3>生产流水线</h3><p>按需选择阶段，缺失的上游产物将自动补齐</p></div><Button icon={<SaveOutlined />} loading={saving} onClick={save}>保存生产设置</Button></div>
    {error && <Alert type="error" message={error} />}
    <div className="pipeline-stages">{(Object.keys(stageLabels) as ProductionStage[]).map((stage, index) => <label key={stage}><span>{index + 1}</span><Checkbox checked={settings.stages.includes(stage)} onChange={() => toggle(stage)}>{stageLabels[stage]}</Checkbox><small>等待开始</small></label>)}</div>
    <div className="production-standard"><h4>成片标准</h4><div><Tag>1920×1080</Tag><Tag>30 fps</Tag><Tag>H.264</Tag><Tag>AAC</Tag></div><p>人声音量 <b>{settings.voiceVolume.toFixed(2)}</b> · BGM 音量 <b>{settings.bgmVolume.toFixed(2)}</b></p></div>
    {settings.stages.includes('AUDIO') && <div className="production-standard"><h4>豆包配音</h4><Input aria-label="豆包 AppID" placeholder="豆包 AppID" value={settings.ttsAppId} onChange={(event) => setSettings({ ...settings, ttsAppId: event.target.value })} /><Input aria-label="豆包音色 ID" placeholder="音色 ID" value={settings.ttsVoiceType} onChange={(event) => setSettings({ ...settings, ttsVoiceType: event.target.value })} /><p>Access Token 请在“服务设置 → 豆包 TTS”中保存，系统不会写入项目文件。</p></div>}
    {settings.stages.includes('SUBTITLES') && <div className="production-standard"><h4>豆包字幕识别</h4><Input aria-label="豆包 ASR AppID" placeholder="豆包 ASR AppID" value={settings.asrAppId} onChange={(event) => setSettings({ ...settings, asrAppId: event.target.value })} /><p>Access Token 请在“服务设置 → 豆包 ASR”中保存；字幕输出为标准 SRT 文件。</p></div>}
    {settings.stages.includes('STORYBOARD') && <div className="production-standard"><h4>Seedream 分镜</h4><Input aria-label="Seedream 模型" placeholder="模型 ID" value={settings.seedreamModel} onChange={(event) => setSettings({ ...settings, seedreamModel: event.target.value })} /><InputNumber aria-label="分镜数量" min={1} max={20} value={settings.storyboardCount} onChange={(value) => setSettings({ ...settings, storyboardCount: value ?? 6 })} /><p>按脚本语义拆分，最多生成 20 个 16:9、2K 分镜；API Key 请在服务设置中保存。</p></div>}
    <Alert type="info" showIcon message="启动前会检查脚本、服务密钥、磁盘空间和上游产物" />
    {job && <div className="job-status"><div><strong>任务 #{job.id}</strong><Tag color={job.status === 'FAILED' ? 'error' : job.status === 'CANCELLED' ? 'default' : 'processing'}>{job.status === 'QUEUED' ? '排队中' : job.status === 'FAILED' ? '失败' : job.status === 'CANCELLED' ? '已取消' : job.status}</Tag></div>{job.stages.map((item) => <span key={item.name}>{stageLabels[item.name]} <small>{item.status}</small></span>)}{job.logs?.length > 0 && <div className="job-logs" aria-label="任务日志">{job.logs.map((line, index) => <p key={`${index}-${line}`}>{line}</p>)}</div>}</div>}
    <div className="pipeline-actions"><Button type="primary" size="large" icon={<ThunderboltOutlined />} disabled={settings.stages.length === 0 || job?.status === 'QUEUED' || job?.status === 'RUNNING'} onClick={start}>一键生成</Button>{job && ['QUEUED', 'RUNNING'].includes(job.status) && <Button danger onClick={cancel}>取消任务</Button>}</div>
  </section>
}
