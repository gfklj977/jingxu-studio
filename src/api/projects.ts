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

export async function reorderProjects(projectIds: number[]): Promise<void> {
  const response = await fetch('/api/projects/order', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectIds }),
  })
  if (!response.ok) throw new Error('项目排序保存失败')
}

export interface ProjectScript {
  projectId: number
  topic: string
  brief: string
  researchNotes: string
  content: string
  updatedAt: string
  versions: { id: number; content: string; createdAt: string }[]
}

export async function getProjectScript(projectId: number): Promise<ProjectScript> {
  const response = await fetch(`/api/projects/${projectId}/script`)
  if (!response.ok) throw new Error('脚本加载失败')
  return response.json() as Promise<ProjectScript>
}

export async function saveProjectScript(projectId: number, script: Pick<ProjectScript, 'topic' | 'brief' | 'researchNotes' | 'content'>): Promise<ProjectScript> {
  const response = await fetch(`/api/projects/${projectId}/script`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(script),
  })
  if (!response.ok) throw new Error('脚本保存失败')
  return response.json() as Promise<ProjectScript>
}

export interface ProviderStatus { id: string; name: string; capability: string; status: 'MISSING' | 'READY' | 'ERROR' }

export async function listProviders(): Promise<ProviderStatus[]> {
  const response = await fetch('/api/settings/providers')
  if (!response.ok) throw new Error('服务状态加载失败')
  return ((await response.json()) as { data: ProviderStatus[] }).data
}

export async function saveProviderSecret(providerId: string, apiKey: string): Promise<void> {
  const response = await fetch(`/api/settings/providers/${providerId}/secret`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ apiKey }),
  })
  if (!response.ok) throw new Error('密钥保存失败')
}

export async function deleteProviderSecret(providerId: string): Promise<void> {
  const response = await fetch(`/api/settings/providers/${providerId}/secret`, { method: 'DELETE' })
  if (!response.ok) throw new Error('密钥删除失败')
}

export async function testProvider(providerId: string): Promise<{ status: 'VALID'; latencyMs: number }> {
  const response = await fetch(`/api/settings/providers/${providerId}/test`, { method: 'POST' })
  if (!response.ok) throw new Error('连接检测失败')
  return response.json() as Promise<{ status: 'VALID'; latencyMs: number }>
}

export interface ResearchItem { title: string; url: string; content: string }

export async function researchProject(projectId: number, query: string): Promise<ResearchItem[]> {
  const response = await fetch(`/api/projects/${projectId}/research`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query }) })
  if (!response.ok) throw new Error('联网搜索失败')
  return ((await response.json()) as { data: ResearchItem[] }).data
}

export async function generateProjectScript(projectId: number, input: { topic: string; brief: string; researchNotes: string }): Promise<string> {
  const { topic, brief, researchNotes } = input
  const response = await fetch(`/api/projects/${projectId}/script/generate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ topic, brief, researchNotes }) })
  if (!response.ok) throw new Error('脚本生成失败')
  return ((await response.json()) as { content: string }).content
}
