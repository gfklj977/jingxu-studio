import { App as AntApp, ConfigProvider } from 'antd'
import { useEffect, useState } from 'react'
import { createProject, listProjects } from './api/projects'
import { CreateProjectDialog } from './components/CreateProjectDialog'
import { Sidebar } from './components/Sidebar'
import { Workspace } from './components/Workspace'
import { projects } from './data'
import type { Stage } from './types'

export default function App() {
  const [projectItems, setProjectItems] = useState(projects)
  const [selectedId, setSelectedId] = useState(projects[0].id)
  const [stage, setStage] = useState<Stage>('成片')
  const [searchValue, setSearchValue] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const project = projectItems.find((item) => item.id === selectedId) ?? projectItems[0]
  const normalizedSearch = searchValue.trim().toLocaleLowerCase('zh-CN')
  const visibleProjects = normalizedSearch
    ? projectItems.filter((item) => `${item.title} ${item.channel}`.toLocaleLowerCase('zh-CN').includes(normalizedSearch))
    : projectItems

  useEffect(() => {
    listProjects().then((loaded) => {
      if (loaded.length > 0) {
        setProjectItems(loaded)
        setSelectedId(loaded[0].id)
      }
    }).catch(() => undefined)
  }, [])

  async function handleCreate(title: string, channel: string) {
    setSubmitting(true)
    try {
      const created = await createProject(title, channel)
      setProjectItems((current) => [created, ...current])
      setSelectedId(created.id)
      setDialogOpen(false)
    } catch {
      return
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ConfigProvider theme={{ token: { colorPrimary: '#0f766e', colorInfo: '#0f766e', borderRadius: 8, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", sans-serif' } }}>
      <AntApp>
        <div className="app-shell">
          <Sidebar projects={visibleProjects} selectedId={selectedId} onSelect={setSelectedId} onCreate={() => setDialogOpen(true)} searchValue={searchValue} onSearchChange={setSearchValue} />
          <Workspace project={project} stage={stage} onStageChange={setStage} />
        </div>
        <CreateProjectDialog open={dialogOpen} submitting={submitting} onCancel={() => setDialogOpen(false)} onCreate={handleCreate} />
      </AntApp>
    </ConfigProvider>
  )
}
