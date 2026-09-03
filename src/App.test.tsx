import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('镜序工坊工作台', () => {
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
})
