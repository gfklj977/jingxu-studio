import {
  CheckCircleFilled,
  CloudUploadOutlined,
  DownloadOutlined,
  FileImageOutlined,
  FileTextOutlined,
  ReloadOutlined,
  SoundOutlined,
} from '@ant-design/icons'
import { Button, Tag } from 'antd'
import { useCallback, useEffect, useState } from 'react'
import { listProjectArtifacts, projectArtifactUrl, type ArtifactKind, type ProjectArtifact } from '../api/projects'
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
  const load = useCallback(async () => { setLoading(true); setError(''); try { setArtifacts(await listProjectArtifacts(projectId)) } catch { setError('生成结果加载失败') } finally { setLoading(false) } }, [projectId])
  useEffect(() => {
    if (!enabled) return
    let active = true
    listProjectArtifacts(projectId).then((items) => { if (active) setArtifacts(items) }).catch(() => { if (active) setError('生成结果加载失败') }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [enabled, projectId])
  const visible = filter === 'all' ? artifacts : artifacts.filter((item) => item.kind === filter)
  return (
    <section className="content-section" aria-labelledby="results-title">
      <div className="section-heading">
        <div><h3 id="results-title">项目成片</h3><p>统一查看、下载并整理本项目生成的全部内容</p></div>
        <div className="heading-actions"><Button loading={loading} icon={<ReloadOutlined />} onClick={load}>同步文件</Button></div>
      </div>
      <div className="filter-row">
        <div className="filter-pills">{(['all', 'video', 'image', 'audio', 'document'] as const).map((kind) => <button key={kind} className={filter === kind ? 'active' : ''} onClick={() => setFilter(kind)}>{artifactLabels[kind]} <b>{kind === 'all' ? artifacts.length : artifacts.filter((item) => item.kind === kind).length}</b></button>)}</div>
      </div>
      {error ? <div className="asset-empty">{error}</div> : !loading && visible.length === 0 ? <div className="asset-empty">还没有生成产物，请先在“生产”中运行流水线。</div> : <div className="asset-grid">{visible.map((artifact) => <ArtifactCard key={artifact.path} projectId={projectId} artifact={artifact} />)}</div>}
    </section>
  )
}

function ArtifactCard({ projectId, artifact }: { projectId: number; artifact: ProjectArtifact }) {
  const url = projectArtifactUrl(projectId, artifact.path)
  const icon = artifact.kind === 'image' ? <FileImageOutlined /> : artifact.kind === 'audio' ? <SoundOutlined /> : <FileTextOutlined />
  return <article className={`asset-card ${artifact.kind === 'video' ? 'featured' : ''}`}>
    {artifact.kind === 'video' && <video className="video-preview" aria-label={`预览 ${artifact.name}`} src={url} controls preload="metadata" />}
    {artifact.kind === 'image' && <img className="image-preview" alt={artifact.name} src={url} loading="lazy" />}
    {artifact.kind === 'audio' && <div className="audio-preview"><SoundOutlined /><audio aria-label={`预览 ${artifact.name}`} src={url} controls preload="metadata" /></div>}
    {artifact.kind === 'document' && <a className="document-preview" href={url} target="_blank" rel="noreferrer"><FileTextOutlined /><span>查看文稿</span><i /><i /><i /></a>}
    <AssetMeta icon={icon} title={artifact.name} subtitle={`${artifact.path} · ${formatBytes(artifact.size)}`} url={url} />
  </article>
}

function AssetMeta({ icon, title, subtitle, url }: { icon: React.ReactNode; title: string; subtitle: string; url: string }) {
  return (
    <div className="asset-meta">
      <span className="asset-type">{icon}</span>
      <span><strong>{title}</strong><small>{subtitle}</small></span>
      <div className="asset-actions"><a aria-label={`下载 ${title}`} href={url} download={title}><DownloadOutlined /></a></div>
    </div>
  )
}

function PublishView() {
  return <section className="placeholder-view"><CloudUploadOutlined /><h3>辅助投放</h3><p>自动填写抖音、小红书和视频号发布信息，由你检查后手动发布。</p><Button type="primary">准备发布</Button></section>
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
        {stage === '投放' && <PublishView />}
      </div>
    </main>
  )
}
