import {
  CheckCircleFilled,
  CloudUploadOutlined,
  CopyOutlined,
  DeleteOutlined,
  DownloadOutlined,
  FileImageOutlined,
  FileTextOutlined,
  MoreOutlined,
  PlayCircleFilled,
  ReloadOutlined,
  SoundOutlined,
} from '@ant-design/icons'
import { Button, Tag } from 'antd'
import type { Project, Stage } from '../types'
import { ScriptWorkspace } from './ScriptWorkspace'

const stages: Stage[] = ['脚本', '生产', '成片', '投放']

interface WorkspaceProps {
  project: Project
  stage: Stage
  onStageChange: (stage: Stage) => void
}

function ResultsView() {
  return (
    <section className="content-section" aria-labelledby="results-title">
      <div className="section-heading">
        <div><h3 id="results-title">项目成片</h3><p>统一查看、下载并整理本项目生成的全部内容</p></div>
        <div className="heading-actions"><Button icon={<ReloadOutlined />}>同步文件</Button><Button type="primary" icon={<FolderOpenIcon />}>打开发布文件夹</Button></div>
      </div>
      <div className="filter-row">
        <div className="filter-pills"><button className="active">全部 <b>8</b></button><button>视频 <b>1</b></button><button>图片 <b>4</b></button><button>音频 <b>1</b></button><button>文稿 <b>2</b></button></div>
        <Button danger type="text" icon={<DeleteOutlined />}>批量删除</Button>
      </div>
      <div className="asset-grid">
        <article className="asset-card featured">
          <div className="video-preview"><span className="film-line" /><PlayCircleFilled /><span className="duration">03:39</span></div>
          <AssetMeta icon={<PlayCircleFilled />} title="final_video.mp4" subtitle="1080P · 86.4 MB" />
        </article>
        <article className="asset-card">
          <div className="image-preview cover"><span>AI时代</span><strong>摄影师如何<br />重新出发？</strong><small>镜序工坊</small></div>
          <AssetMeta icon={<FileImageOutlined />} title="cover_landscape.png" subtitle="1920 × 1080" />
        </article>
        <article className="asset-card">
          <div className="audio-preview"><SoundOutlined /><div className="wave">▂▅▃▇▄▆▂▅▇▃▆▄▂</div><span>03:39</span></div>
          <AssetMeta icon={<SoundOutlined />} title="narration.mp3" subtitle="5.8 MB · 单声道" />
        </article>
        <article className="asset-card">
          <div className="document-preview"><FileTextOutlined /><span>字幕与时间轴</span><i /><i /><i /><i /></div>
          <AssetMeta icon={<FileTextOutlined />} title="subtitle.srt" subtitle="82 条字幕" />
        </article>
      </div>
    </section>
  )
}

function FolderOpenIcon() { return <CloudUploadOutlined /> }

function AssetMeta({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="asset-meta">
      <span className="asset-type">{icon}</span>
      <span><strong>{title}</strong><small>{subtitle}</small></span>
      <div className="asset-actions"><button aria-label={`复制 ${title}`}><CopyOutlined /></button><button aria-label={`下载 ${title}`}><DownloadOutlined /></button><button aria-label={`${title} 更多操作`}><MoreOutlined /></button></div>
    </div>
  )
}

function PipelineView() {
  return <section className="placeholder-view"><CloudUploadOutlined /><h3>生产流水线</h3><p>上传素材并依次生成配音、字幕、场景图、封面和视频。</p><Button type="primary">开始生产</Button></section>
}

function PublishView() {
  return <section className="placeholder-view"><CloudUploadOutlined /><h3>辅助投放</h3><p>自动填写抖音、小红书和视频号发布信息，由你检查后手动发布。</p><Button type="primary">准备发布</Button></section>
}

export function Workspace({ project, stage, onStageChange }: WorkspaceProps) {
  return (
    <main className="workspace">
      <header className="workspace-header">
        <div className="project-title"><div><p>{project.channel} / 项目</p><h2>{project.title}</h2></div><Tag icon={<CheckCircleFilled />} color={project.status === '已完成' ? 'success' : 'processing'}>{project.status}</Tag></div>
        <nav className="stage-tabs" aria-label="项目流程" role="tablist">
          {stages.map((item, index) => <button key={item} role="tab" aria-label={item} aria-selected={stage === item} onClick={() => onStageChange(item)}><span aria-hidden="true">{index + 1}</span>{item}</button>)}
        </nav>
      </header>
      <div className="workspace-body">
        {stage === '成片' && <ResultsView />}
        {stage === '生产' && <PipelineView />}
        {stage === '脚本' && <ScriptWorkspace key={project.id} projectId={project.id} />}
        {stage === '投放' && <PublishView />}
      </div>
    </main>
  )
}
