export type Stage = '脚本' | '生产' | '成片' | '投放'

export interface Project {
  id: number
  title: string
  channel: string
  updatedAt: string
  status: '已完成' | '制作中' | '草稿'
  isPinned?: boolean
}
