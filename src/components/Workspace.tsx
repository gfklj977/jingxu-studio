import {
  CheckCircleFilled,
  CloudUploadOutlined,
  DownloadOutlined,
  FileImageOutlined,
  FileTextOutlined,
  FolderOpenOutlined,
  RedoOutlined,
  ReloadOutlined,
  SoundOutlined,
} from '@ant-design/icons'
import { Button, Checkbox, Input, Skeleton, Tag, message } from 'antd'
import { useCallback, useEffect, useState } from 'react'
import { createProductionJob, generatePublishDrafts, getPublishDrafts, listProjectArtifacts, openProjectArtifactsFolder, preparePublish, projectArtifactUrl, savePublishDraft, type ArtifactKind, type ProductionStage, type ProjectArtifact, type PublishDraft, type PublishPlatform } from '../api/projects'
import type { Project, Stage } from '../types'
import { ScriptWorkspace } from './ScriptWorkspace'
import { ProductionWorkspace } from './ProductionWorkspace'

const stages: Stage[] = ['脚本', '生产', '成片', '投放']

interface WorkspaceProps {
  project: Project
  stage: Stage
  onStageChange: (stage: Stage) => void
  resultsEnabled: boolean
}

const artifactLabels: Record<ArtifactKind | 'all', string> = { all: '全部', video: '视频', image: '图片', audio: '音频', document: '文稿' }
function formatBytes(size: number) { if (size < 1024) return `${size} B`; if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`; return `${(size / 1024 / 1024).toFixed(1)} MB` }

function ResultsView({ projectId, enabled }: { projectId: number; enabled: boolean }) {
  const [artifacts, setArtifacts] = useState<ProjectArtifact[]>([])
  const [filter, setFilter] = useState<ArtifactKind | 'all'>('all')
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState('')
  const [regenerating, setRegenerating] = useState<ProductionStage | null>(null)
  const load = useCallback(async () => { setLoading(true); setError(''); try { setArtifacts(await listProjectArtifacts(projectId)) } catch { setError('生成结果加载失败') } finally { setLoading(false) } }, [projectId])
  useEffect(() => {
    if (!enabled) return
    let active = true
    listProjectArtifacts(projectId).then((items) => { if (active) setArtifacts(items) }).catch(() => { if (active) setError('生成结果加载失败') }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [enabled, projectId])
  const visible = filter === 'all' ? artifacts : artifacts.filter((item) => item.kind === filter)
  async function openFolder() { try { await openProjectArtifactsFolder(projectId) } catch { message.error('无法打开项目文件夹') } }
  async function regenerate(stage: ProductionStage) { setRegenerating(stage); try { await createProductionJob(projectId, [stage]); message.success('已创建重新生成任务，请在“生产”页查看进度') } catch { message.error('重新生成失败，请检查是否已有任务运行') } finally { setRegenerating(null) } }
  return (
    <section className="content-section" aria-labelledby="results-title">
      <div className="section-heading">
        <div><h3 id="results-title">项目成片</h3><p>统一查看、下载并整理本项目生成的全部内容</p></div>
        <div className="heading-actions"><Button loading={loading} icon={<ReloadOutlined />} onClick={load}>同步文件</Button><Button type="primary" icon={<FolderOpenOutlined />} onClick={openFolder}>打开项目文件夹</Button></div>
      </div>
      <div className="filter-row">
        <div className="filter-pills">{(['all', 'video', 'image', 'audio', 'document'] as const).map((kind) => <button key={kind} className={filter === kind ? 'active' : ''} onClick={() => setFilter(kind)}>{artifactLabels[kind]} <b>{kind === 'all' ? artifacts.length : artifacts.filter((item) => item.kind === kind).length}</b></button>)}</div>
      </div>
      {error ? <div className="asset-empty">{error}</div> : !loading && visible.length === 0 ? <div className="asset-empty">还没有生成产物，请先在“生产”中运行流水线。</div> : <div className="asset-grid">{visible.map((artifact) => <ArtifactCard key={artifact.path} projectId={projectId} artifact={artifact} regenerating={regenerating} onRegenerate={regenerate} />)}</div>}
    </section>
  )
}

function artifactStage(path: string): ProductionStage | null { if (path.startsWith('audio/')) return 'AUDIO'; if (path.startsWith('subtitles/')) return 'SUBTITLES'; if (path.startsWith('storyboard/')) return 'STORYBOARD'; if (path.startsWith('cover/')) return 'COVER'; if (path.startsWith('video/')) return 'VIDEO'; return null }
function ArtifactCard({ projectId, artifact, regenerating, onRegenerate }: { projectId: number; artifact: ProjectArtifact; regenerating: ProductionStage | null; onRegenerate: (stage: ProductionStage) => void }) {
  const url = projectArtifactUrl(projectId, artifact.path)
  const stage = artifactStage(artifact.path)
  const icon = artifact.kind === 'image' ? <FileImageOutlined /> : artifact.kind === 'audio' ? <SoundOutlined /> : <FileTextOutlined />
  return <article className={`asset-card ${artifact.kind === 'video' ? 'featured' : ''}`}>
    {artifact.kind === 'video' && <video className="video-preview" aria-label={`预览 ${artifact.name}`} src={url} controls preload="metadata" />}
    {artifact.kind === 'image' && <img className="image-preview" alt={artifact.name} src={url} loading="lazy" />}
    {artifact.kind === 'audio' && <div className="audio-preview"><SoundOutlined /><audio aria-label={`预览 ${artifact.name}`} src={url} controls preload="metadata" /></div>}
    {artifact.kind === 'document' && <a className="document-preview" href={url} target="_blank" rel="noreferrer"><FileTextOutlined /><span>查看文稿</span><i /><i /><i /></a>}
    <AssetMeta icon={icon} title={artifact.name} subtitle={`${artifact.path} · ${formatBytes(artifact.size)}`} url={url} stage={stage} regenerating={regenerating} onRegenerate={onRegenerate} />
  </article>
}

function AssetMeta({ icon, title, subtitle, url, stage, regenerating, onRegenerate }: { icon: React.ReactNode; title: string; subtitle: string; url: string; stage: ProductionStage | null; regenerating: ProductionStage | null; onRegenerate: (stage: ProductionStage) => void }) {
  return (
    <div className="asset-meta">
      <span className="asset-type">{icon}</span>
      <span><strong>{title}</strong><small>{subtitle}</small></span>
      <div className="asset-actions">{stage && <button aria-label={`重新生成 ${title}`} disabled={regenerating !== null} onClick={() => onRegenerate(stage)}>{regenerating === stage ? '…' : <RedoOutlined />}</button>}<a aria-label={`下载 ${title}`} href={url} download={title}><DownloadOutlined /></a></div>
    </div>
  )
}

const platformInfo: Record<PublishPlatform, { name: string; url: string }> = {
  DOUYIN: { name: '抖音', url: 'https://creator.douyin.com/' },
  XIAOHONGSHU: { name: '小红书', url: 'https://creator.xiaohongshu.com/publish/publish?source=official' },
  WECHAT_CHANNELS: { name: '视频号', url: 'https://channels.weixin.qq.com/platform/post/create' },
}
function PublishView({ projectId, enabled }: { projectId: number; enabled: boolean }) {
  const [drafts, setDrafts] = useState<PublishDraft[]>([])
  const [loading, setLoading] = useState(enabled)
  const [busy, setBusy] = useState('')
  useEffect(() => { if (!enabled) return; let active = true; getPublishDrafts(projectId).then((data) => { if (active) setDrafts(data) }).catch(() => undefined).finally(() => { if (active) setLoading(false) }); return () => { active = false } }, [enabled, projectId])
  function update(platform: PublishPlatform, changes: Partial<PublishDraft>) { setDrafts((current) => current.map((item) => item.platform === platform ? { ...item, ...changes } : item)) }
  async function generate() { setBusy('generate'); try { setDrafts(await generatePublishDrafts(projectId)); message.success('三个平台的投放文案已生成') } catch { message.error('生成失败，请先保存项目脚本') } finally { setBusy('') } }
  async function save(draft: PublishDraft) { setBusy(draft.platform); try { update(draft.platform, await savePublishDraft(projectId, draft)); message.success(`${platformInfo[draft.platform].name}草稿已保存`) } catch { message.error('保存失败') } finally { setBusy('') } }
  async function copy(draft: PublishDraft) { await navigator.clipboard.writeText(`${draft.title}\n\n${draft.body}\n\n${draft.hashtags}`); message.success('标题、正文和话题已复制') }
  async function prepare(draft: PublishDraft) { setBusy(`prepare-${draft.platform}`); try { await savePublishDraft(projectId, draft); await preparePublish(projectId, draft.platform); message.success('发布包已生成，文案已复制并打开平台，请人工确认发布') } catch { message.error('准备失败，请先生成成片、封面和投放草稿') } finally { setBusy('') } }
  if (loading) return <section className="content-section script-loading"><Skeleton active /></section>
  return <section className="content-section publish-workspace">
    <div className="section-heading"><div><h3>辅助投放</h3><p>自动准备发布信息，检查无误后由你在平台完成发布</p></div><Button type="primary" icon={<CloudUploadOutlined />} loading={busy === 'generate'} onClick={generate}>{drafts.length ? '重新生成文案' : '生成投放文案'}</Button></div>
    {drafts.length === 0 ? <div className="asset-empty">尚未生成投放草稿。系统会为抖音、小红书和视频号分别适配文案。</div> : <div className="publish-grid">{drafts.map((draft) => <article key={draft.platform}><header><strong>{platformInfo[draft.platform].name}</strong><Tag color="processing">人工发布</Tag></header><label>标题<Input value={draft.title} maxLength={100} showCount onChange={(event) => update(draft.platform, { title: event.target.value })} /></label><label>正文<Input.TextArea value={draft.body} rows={7} onChange={(event) => update(draft.platform, { body: event.target.value })} /></label><label>话题标签<Input.TextArea value={draft.hashtags} rows={2} onChange={(event) => update(draft.platform, { hashtags: event.target.value })} /></label><div className="publish-checklist">{draft.checklist.map((item) => <Checkbox key={item}>{item}</Checkbox>)}</div><footer><Button onClick={() => copy(draft)}>复制全部</Button><Button loading={busy === draft.platform} onClick={() => save(draft)}>保存草稿</Button><Button type="primary" loading={busy === `prepare-${draft.platform}`} onClick={() => prepare(draft)}>准备并打开</Button></footer></article>)}</div>}
  </section>
}

export function Workspace({ project, stage, onStageChange, resultsEnabled }: WorkspaceProps) {
  return (
    <main className="workspace">
      <header className="workspace-header">
        <div className="project-title"><div><p>{project.channel} / 项目</p><h2>{project.title}</h2></div><Tag icon={<CheckCircleFilled />} color={project.status === '已完成' ? 'success' : 'processing'}>{project.status}</Tag></div>
        <nav className="stage-tabs" aria-label="项目流程" role="tablist">
          {stages.map((item, index) => <button key={item} role="tab" aria-label={item} aria-selected={stage === item} onClick={() => onStageChange(item)}><span aria-hidden="true">{index + 1}</span>{item}</button>)}
        </nav>
      </header>
      <div className="workspace-body">
        {stage === '成片' && <ResultsView key={project.id} projectId={project.id} enabled={resultsEnabled} />}
        {stage === '生产' && <ProductionWorkspace key={project.id} projectId={project.id} />}
        {stage === '脚本' && <ScriptWorkspace key={project.id} projectId={project.id} />}
        {stage === '投放' && <PublishView key={project.id} projectId={project.id} enabled={resultsEnabled} />}
      </div>
    </main>
  )
}
