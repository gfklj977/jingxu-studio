import {
  FolderOpenOutlined,
  PlusOutlined,
  SearchOutlined,
  SettingOutlined,
  StarFilled,
} from '@ant-design/icons'
import { Button, Input, Tooltip } from 'antd'
import type { Project } from '../types'

interface SidebarProps {
  projects: Project[]
  selectedId: number
  onSelect: (id: number) => void
  onCreate: () => void
}

export function Sidebar({ projects, selectedId, onSelect, onCreate }: SidebarProps) {
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

      <Input prefix={<SearchOutlined />} placeholder="搜索项目" allowClear aria-label="搜索项目" />

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
          {projects.map((project) => (
            <button
              key={project.id}
              className={`project-item ${project.id === selectedId ? 'selected' : ''}`}
              aria-pressed={project.id === selectedId}
              aria-label={`${project.title}，${project.status}`}
              onClick={() => onSelect(project.id)}
            >
              <span className="project-icon"><FolderOpenOutlined /></span>
              <span className="project-copy">
                <strong>{project.title}</strong>
                <small>{project.updatedAt} · {project.status}</small>
              </span>
            </button>
          ))}
        </div>
      </section>

      <footer className="sidebar-footer">
        <Tooltip title="全局设置"><Button type="text" icon={<SettingOutlined />}>设置</Button></Tooltip>
        <span className="local-badge"><i />本地运行</span>
      </footer>
    </aside>
  )
}
