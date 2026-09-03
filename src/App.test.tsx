import { fireEvent, render, screen } from '@testing-library/react'
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

    await user.click(screen.getByRole('button', { name: 'AI 如何重塑摄影门店，制作中' }))

    expect(screen.getByRole('heading', { name: 'AI 如何重塑摄影门店' })).toBeInTheDocument()
  })

  it('支持在脚本、生产、成片和投放之间切换', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('tab', { name: '生产' }))

    expect(screen.getByRole('tab', { name: '生产' })).toHaveAttribute('aria-selected', 'true')
    expect(await screen.findByText('生产设置加载失败')).toBeInTheDocument()
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

  it('按项目标题或栏目筛选侧栏项目', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByRole('textbox', { name: '搜索项目' }), '儿童摄影')

    expect(screen.getByRole('button', { name: '儿童摄影的情绪价值，草稿' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'AI 如何重塑摄影门店，制作中' })).not.toBeInTheDocument()
  })

  it('通过项目菜单置顶项目', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.mocked(fetch)
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [], pagination: {} }) } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 180, title: 'AI 如何重塑摄影门店', channel: '李逍遥说说', status: 'PRODUCING', isPinned: true, deletedAt: null, createdAt: '2026-09-03T00:00:00Z', updatedAt: '2026-09-03T00:00:00Z' }),
      } as Response)
    render(<App />)

    await user.click(screen.getByRole('button', { name: '更多操作：AI 如何重塑摄影门店' }))
    await user.click(await screen.findByRole('menuitem', { name: /置顶项目/ }))

    expect(fetchMock).toHaveBeenLastCalledWith('/api/projects/180', expect.objectContaining({ method: 'PATCH' }))
    expect(screen.getByLabelText('已置顶：AI 如何重塑摄影门店')).toBeInTheDocument()
  })

  it('从回收站恢复项目', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.mocked(fetch)
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [], pagination: {} }) } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [{ id: 301, title: '被删除项目', channel: '默认栏目', status: 'DRAFT', isPinned: false, deletedAt: '2026-09-03T00:00:00Z', createdAt: '2026-09-03T00:00:00Z', updatedAt: '2026-09-03T00:00:00Z' }], pagination: {} }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 301, title: '被删除项目', channel: '默认栏目', status: 'DRAFT', isPinned: false, deletedAt: null, createdAt: '2026-09-03T00:00:00Z', updatedAt: '2026-09-03T00:00:00Z' }),
      } as Response)
    render(<App />)

    await user.click(screen.getByRole('button', { name: /回收站/ }))
    await user.click(await screen.findByRole('button', { name: '恢复：被删除项目' }))

    expect(await screen.findByRole('button', { name: /被删除项目，草稿/ })).toBeInTheDocument()
  })

  it('拖动项目后保存新顺序', async () => {
    const fetchMock = vi.mocked(fetch)
    render(<App />)
    const dataTransfer = {
      value: '',
      setData(_type: string, value: string) { this.value = value },
      getData() { return this.value },
    }

    const source = screen.getByRole('button', { name: '摄影师如何看待 AI 时代，已完成' }).closest('.project-row')!
    const target = screen.getByRole('button', { name: 'AI 如何重塑摄影门店，制作中' }).closest('.project-row')!
    fireEvent.dragStart(source, { dataTransfer })
    fireEvent.drop(target, { dataTransfer })

    expect(fetchMock).toHaveBeenLastCalledWith('/api/projects/order', expect.objectContaining({
      method: 'PUT',
      body: JSON.stringify({ projectIds: [180, 181, 179] }),
    }))
  })

  it('编辑并保存项目脚本', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.mocked(fetch)
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [], pagination: {} }) } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ projectId: 181, topic: '', brief: '', researchNotes: '', content: '', updatedAt: '2026-09-03T00:00:00Z', versions: [] }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ projectId: 181, topic: 'AI 与摄影师', brief: '', researchNotes: '', content: '开场文案', updatedAt: '2026-09-03T00:01:00Z', versions: [{ id: 1, content: '开场文案', createdAt: '2026-09-03T00:01:00Z' }] }),
      } as Response)
    render(<App />)

    await user.click(screen.getByRole('tab', { name: '脚本' }))
    await user.type(await screen.findByLabelText('选题'), 'AI 与摄影师')
    await user.type(screen.getByLabelText('脚本正文'), '开场文案')
    await user.click(screen.getByRole('button', { name: /保存新版本/ }))

    expect(fetchMock).toHaveBeenLastCalledWith('/api/projects/181/script', expect.objectContaining({ method: 'PUT' }))
    expect(await screen.findByText('版本 1')).toBeInTheDocument()
  })

  it('在设置中展示服务配置状态', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.mocked(fetch)
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [], pagination: {} }) } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [{ id: 'deepseek', name: 'DeepSeek', capability: '文本生成', status: 'MISSING' }] }) } as Response)
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'AI 服务设置' }))

    expect(await screen.findByText('DeepSeek')).toBeInTheDocument()
    expect(screen.getByText('未配置')).toBeInTheDocument()
  })

  it('保存服务密钥后刷新状态', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.mocked(fetch)
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [], pagination: {} }) } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [{ id: 'deepseek', name: 'DeepSeek', capability: '文本生成', status: 'MISSING' }] }) } as Response)
      .mockResolvedValueOnce({ ok: true } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [{ id: 'deepseek', name: 'DeepSeek', capability: '文本生成', status: 'READY' }] }) } as Response)
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'AI 服务设置' }))
    await user.click(await screen.findByRole('button', { name: '配置 DeepSeek' }))
    await user.type(screen.getByLabelText('DeepSeek API 密钥'), 'sk-example-safe')
    await user.click(screen.getByRole('button', { name: '保存 DeepSeek 密钥' }))

    expect(fetchMock).toHaveBeenLastCalledWith('/api/settings/providers')
    expect(await screen.findByText('已就绪')).toBeInTheDocument()
  })

  it('对已配置的 DeepSeek 执行连接检测', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.mocked(fetch)
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [], pagination: {} }) } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [{ id: 'deepseek', name: 'DeepSeek', capability: '文本生成', status: 'READY' }] }) } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ status: 'VALID', latencyMs: 42 }) } as Response)
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'AI 服务设置' }))
    await user.click(await screen.findByRole('button', { name: '测试 DeepSeek 连接' }))

    expect(fetchMock).toHaveBeenLastCalledWith('/api/settings/providers/deepseek/test', { method: 'POST' })
    expect(await screen.findByText('42 ms')).toBeInTheDocument()
  })

  it('搜索资料并生成脚本初稿', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.mocked(fetch)
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [], pagination: {} }) } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ projectId: 181, topic: '', brief: '', researchNotes: '', content: '', updatedAt: '', versions: [] }) } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [{ title: '资料一', url: 'https://example.com/a', content: '关键结论' }] }) } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ content: '生成的口播脚本' }) } as Response)
    render(<App />)

    await user.click(screen.getByRole('tab', { name: '脚本' }))
    await user.type(await screen.findByLabelText('选题'), 'AI 摄影')
    await user.click(screen.getByRole('button', { name: /联网搜索/ }))
    expect(await screen.findByDisplayValue(/https:\/\/example.com\/a/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /AI 生成脚本/ }))
    expect(await screen.findByDisplayValue('生成的口播脚本')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenLastCalledWith('/api/projects/181/script/generate', expect.objectContaining({ method: 'POST' }))
  })

  it('展示并保存生产流水线配置', async () => {
    const user = userEvent.setup()
    const settings = { stages: ['AUDIO', 'SUBTITLES', 'STORYBOARD', 'COVER', 'VIDEO'], resolution: '1920x1080', fps: 30, videoCodec: 'H264', audioCodec: 'AAC', voiceVolume: 1.3, bgmVolume: 0.09 }
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ data: [], pagination: {} }) } as Response).mockResolvedValueOnce({ ok: true, json: async () => settings } as Response).mockResolvedValueOnce({ ok: false, status: 404 } as Response).mockResolvedValueOnce({ ok: true, json: async () => settings } as Response).mockResolvedValueOnce({ ok: true, json: async () => ({ id: 7, projectId: 181, status: 'QUEUED', stages: settings.stages.map((name) => ({ name, status: 'PENDING', progress: 0 })), createdAt: '', updatedAt: '' }) } as Response)
    render(<App />)

    await user.click(screen.getByRole('tab', { name: '生产' }))
    expect(await screen.findByText('1920×1080')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /保存生产设置/ }))
    expect(fetchMock).toHaveBeenLastCalledWith('/api/projects/181/production-settings', expect.objectContaining({ method: 'PUT' }))
    await user.click(screen.getByRole('button', { name: /一键生成/ }))
    expect(await screen.findByText('任务 #7')).toBeInTheDocument()
    expect(screen.getByText('排队中')).toBeInTheDocument()
  })
})
