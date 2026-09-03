import type { Project } from '../types'

interface ApiProject {
  id: number
  title: string
  channel: string
  status: 'DRAFT' | 'PRODUCING' | 'COMPLETED'
  isPinned: boolean
  deletedAt: string | null
  updatedAt: string
}

interface ProjectPage {
  data: ApiProject[]
}

const statusLabels: Record<ApiProject['status'], Project['status']> = {
  DRAFT: '草稿',
  PRODUCING: '制作中',
  COMPLETED: '已完成',
}

function toProject(project: ApiProject): Project {
  return {
    id: project.id,
    title: project.title,
    channel: project.channel,
    status: statusLabels[project.status],
    isPinned: project.isPinned,
    updatedAt: new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric' }).format(new Date(project.updatedAt)),
  }
}

export async function listProjects(): Promise<Project[]> {
  const response = await fetch('/api/projects?page=1&pageSize=50')
  if (!response.ok) throw new Error('项目列表加载失败')
  const page = await response.json() as ProjectPage
  return page.data.map(toProject)
}

export async function createProject(title: string, channel: string): Promise<Project> {
  const response = await fetch('/api/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, channel }),
  })
  if (!response.ok) throw new Error('项目创建失败')
  return toProject(await response.json() as ApiProject)
}

export async function updateProject(id: number, changes: { title?: string; isPinned?: boolean }): Promise<Project> {
  const response = await fetch(`/api/projects/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(changes),
  })
  if (!response.ok) throw new Error('项目更新失败')
  return toProject(await response.json() as ApiProject)
}

export async function trashProject(id: number): Promise<void> {
  const response = await fetch(`/api/projects/${id}`, { method: 'DELETE' })
  if (!response.ok) throw new Error('移入回收站失败')
}

export async function listTrashedProjects(): Promise<Project[]> {
  const response = await fetch('/api/trash/projects?page=1&pageSize=100')
  if (!response.ok) throw new Error('回收站加载失败')
  const page = await response.json() as ProjectPage
  return page.data.map(toProject)
}

export async function restoreProject(id: number): Promise<Project> {
  const response = await fetch(`/api/trash/projects/${id}/restore`, { method: 'POST' })
  if (!response.ok) throw new Error('项目恢复失败')
  return toProject(await response.json() as ApiProject)
}
