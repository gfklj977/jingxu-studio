import { App as AntApp, ConfigProvider } from 'antd'
import { useEffect, useState } from 'react'
import { createProject, listProjects, listTrashedProjects, reorderProjects, restoreProject, trashProject, updateProject } from './api/projects'
import { CreateProjectDialog } from './components/CreateProjectDialog'
import { DeleteProjectDialog, RecycleBin, RenameProjectDialog } from './components/ProjectDialogs'
import { Sidebar } from './components/Sidebar'
import { Workspace } from './components/Workspace'
import { projects } from './data'
import type { Stage } from './types'
import type { Project } from './types'

export default function App() {
  const [projectItems, setProjectItems] = useState(projects)
  const [selectedId, setSelectedId] = useState(projects[0].id)
  const [stage, setStage] = useState<Stage>('成片')
  const [searchValue, setSearchValue] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [deletingProject, setDeletingProject] = useState<Project | null>(null)
  const [trashOpen, setTrashOpen] = useState(false)
  const [trashItems, setTrashItems] = useState<Project[]>([])
  const [trashLoading, setTrashLoading] = useState(false)
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

  async function replaceProject(project: Project) {
    setProjectItems((current) => current.map((item) => item.id === project.id ? project : item).sort((a, b) => Number(b.isPinned) - Number(a.isPinned)))
  }

  async function handleRename(title: string) {
    if (!editingProject) return
    await replaceProject(await updateProject(editingProject.id, { title }))
    setEditingProject(null)
  }

  async function handleTogglePin(project: Project) {
    await replaceProject(await updateProject(project.id, { isPinned: !project.isPinned }))
  }

  async function handleTrash() {
    if (!deletingProject) return
    await trashProject(deletingProject.id)
    const remaining = projectItems.filter((item) => item.id !== deletingProject.id)
    setProjectItems(remaining)
    if (selectedId === deletingProject.id && remaining.length > 0) setSelectedId(remaining[0].id)
    setDeletingProject(null)
  }

  async function openTrash() {
    setTrashOpen(true)
    setTrashLoading(true)
    try { setTrashItems(await listTrashedProjects()) } finally { setTrashLoading(false) }
  }

  async function handleRestore(project: Project) {
    const restored = await restoreProject(project.id)
    setTrashItems((current) => current.filter((item) => item.id !== project.id))
    setProjectItems((current) => [restored, ...current])
  }

  async function handleReorder(sourceId: number, targetId: number) {
    const previous = projectItems
    const sourceIndex = previous.findIndex((item) => item.id === sourceId)
    const targetIndex = previous.findIndex((item) => item.id === targetId)
    if (sourceIndex < 0 || targetIndex < 0) return
    const next = [...previous]
    const [moved] = next.splice(sourceIndex, 1)
    next.splice(targetIndex, 0, moved)
    setProjectItems(next)
    try {
      await reorderProjects(next.map((item) => item.id))
    } catch {
      setProjectItems(previous)
    }
  }

  return (
    <ConfigProvider theme={{ token: { colorPrimary: '#0f766e', colorInfo: '#0f766e', borderRadius: 8, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", sans-serif' } }}>
      <AntApp>
        <div className="app-shell">
          <Sidebar projects={visibleProjects} selectedId={selectedId} onSelect={setSelectedId} onCreate={() => setDialogOpen(true)} searchValue={searchValue} onSearchChange={setSearchValue} onRename={setEditingProject} onTogglePin={handleTogglePin} onTrash={setDeletingProject} onOpenTrash={openTrash} onReorder={handleReorder} reorderEnabled={!normalizedSearch} />
          <Workspace project={project} stage={stage} onStageChange={setStage} />
        </div>
        <CreateProjectDialog open={dialogOpen} submitting={submitting} onCancel={() => setDialogOpen(false)} onCreate={handleCreate} />
        <RenameProjectDialog project={editingProject} onCancel={() => setEditingProject(null)} onRename={handleRename} />
        <DeleteProjectDialog project={deletingProject} onCancel={() => setDeletingProject(null)} onConfirm={handleTrash} />
        <RecycleBin open={trashOpen} projects={trashItems} loading={trashLoading} onClose={() => setTrashOpen(false)} onRestore={handleRestore} />
      </AntApp>
    </ConfigProvider>
  )
}
