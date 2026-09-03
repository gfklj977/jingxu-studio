import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

describe('镜序工坊工作台', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [], pagination: { page: 1, pageSize: 50, totalItems: 0, totalPages: 0 } }),
    }))
  })

  it('展示品牌、项目导航和默认成片结果', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: '镜序工坊' })).toBeInTheDocument()
    expect(screen.getByRole('tablist', { name: '项目流程' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: '成片' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('项目成片')).toBeInTheDocument()
  })

  it('允许切换项目并同步主内容标题', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: /AI 如何重塑摄影门店/ }))

    expect(screen.getByRole('heading', { name: 'AI 如何重塑摄影门店' })).toBeInTheDocument()
  })

  it('支持在脚本、生产、成片和投放之间切换', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('tab', { name: '生产' }))

    expect(screen.getByRole('tab', { name: '生产' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('生产流水线')).toBeInTheDocument()
  })

  it('新建项目后将服务器返回的项目加入侧栏并选中', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.mocked(fetch)
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [], pagination: { page: 1, pageSize: 50, totalItems: 0, totalPages: 0 } }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 201, title: '新项目标题', channel: '李逍遥说说', status: 'DRAFT', createdAt: '2026-09-03T00:00:00Z', updatedAt: '2026-09-03T00:00:00Z' }),
      } as Response)
    render(<App />)

    await user.click(screen.getByRole('button', { name: /新建创作项目/ }))
    await user.type(screen.getByLabelText('项目标题'), '新项目标题')
    await user.click(screen.getByRole('button', { name: '创建项目' }))

    expect(await screen.findByRole('heading', { name: '新项目标题' })).toBeInTheDocument()
    expect(fetchMock).toHaveBeenLastCalledWith('/api/projects', expect.objectContaining({ method: 'POST' }))
  })
})
