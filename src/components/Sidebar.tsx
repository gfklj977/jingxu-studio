import {
  FolderOpenOutlined,
  DeleteOutlined,
  EditOutlined,
  MoreOutlined,
  PlusOutlined,
  SearchOutlined,
  SettingOutlined,
  StarFilled,
} from '@ant-design/icons'
import { Button, Dropdown, Input, Tooltip } from 'antd'
import type { Project } from '../types'

interface SidebarProps {
  projects: Project[]
  selectedId: number
  onSelect: (id: number) => void
  onCreate: () => void
  searchValue: string
  onSearchChange: (value: string) => void
  onRename: (project: Project) => void
  onTogglePin: (project: Project) => void
  onTrash: (project: Project) => void
  onOpenTrash: () => void
  onReorder: (sourceId: number, targetId: number) => void
  reorderEnabled: boolean
}

export function Sidebar({ projects, selectedId, onSelect, onCreate, searchValue, onSearchChange, onRename, onTogglePin, onTrash, onOpenTrash, onReorder, reorderEnabled }: SidebarProps) {
  return (
    <aside className="sidebar" aria-label="项目侧栏">
      <header className="brand">
        <div className="brand-mark" aria-hidden="true"><span /></div>
        <div>
          <h1>镜序工坊</h1>
          <p>本地 AI 短片创作工作台</p>
        </div>
      </header>

      <Button type="primary" size="large" icon={<PlusOutlined />} block className="create-button" onClick={onCreate}>
        新建创作项目
      </Button>

      <Input prefix={<SearchOutlined />} placeholder="搜索项目" allowClear aria-label="搜索项目" value={searchValue} onChange={(event) => onSearchChange(event.target.value)} />

      <section className="channel-block" aria-labelledby="channel-title">
        <div className="section-label" id="channel-title">
          <span>创作栏目</span><button aria-label="栏目设置"><SettingOutlined /></button>
        </div>
        <button className="channel-item active">
          <span className="channel-avatar">李</span>
          <span><strong>李逍遥说说</strong><small>知识口播 · 3 个项目</small></span>
          <StarFilled className="star" />
        </button>
      </section>

      <section className="project-block" aria-labelledby="project-title">
        <div className="section-label" id="project-title"><span>最近项目</span><small>{projects.length}</small></div>
        <div className="project-list">
          {projects.map((project) => <div className={`project-row ${project.id === selectedId ? 'selected' : ''}`} key={project.id}
            draggable={reorderEnabled}
            onDragStart={(event) => event.dataTransfer.setData('text/project-id', String(project.id))}
            onDragOver={(event) => { if (reorderEnabled) event.preventDefault() }}
            onDrop={(event) => {
              event.preventDefault()
              const sourceId = Number(event.dataTransfer.getData('text/project-id'))
              if (sourceId && sourceId !== project.id) onReorder(sourceId, project.id)
            }}>
            <button className="project-item" aria-pressed={project.id === selectedId} aria-label={`${project.title}，${project.status}`} onClick={() => onSelect(project.id)}>
              <span className="project-icon"><FolderOpenOutlined /></span>
              <span className="project-copy"><strong>{project.title}</strong><small>{project.updatedAt} · {project.status}</small></span>
              {project.isPinned && <StarFilled className="project-pin" aria-label={`已置顶：${project.title}`} />}
            </button>
            <Dropdown trigger={['click']} menu={{ items: [
              { key: 'rename', label: '重命名', icon: <EditOutlined />, onClick: () => onRename(project) },
              { key: 'pin', label: project.isPinned ? '取消置顶' : '置顶项目', icon: <StarFilled />, onClick: () => onTogglePin(project) },
              { type: 'divider' },
              { key: 'trash', label: '移入回收站', danger: true, icon: <DeleteOutlined />, onClick: () => onTrash(project) },
            ] }}><button className="project-more" aria-label={`更多操作：${project.title}`}><MoreOutlined /></button></Dropdown>
          </div>)}
          {projects.length === 0 && <p className="project-empty">没有匹配的项目</p>}
        </div>
      </section>

      <footer className="sidebar-footer">
        <div><Tooltip title="全局设置"><Button type="text" icon={<SettingOutlined />}>设置</Button></Tooltip><Button type="text" icon={<DeleteOutlined />} onClick={onOpenTrash}>回收站</Button></div>
        <span className="local-badge"><i />本地运行</span>
      </footer>
    </aside>
  )
}
