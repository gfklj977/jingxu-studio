import { ConfigProvider } from 'antd'
import { useState } from 'react'
import { Sidebar } from './components/Sidebar'
import { Workspace } from './components/Workspace'
import { projects } from './data'
import type { Stage } from './types'

export default function App() {
  const [selectedId, setSelectedId] = useState(projects[0].id)
  const [stage, setStage] = useState<Stage>('成片')
  const project = projects.find((item) => item.id === selectedId) ?? projects[0]

  return (
    <ConfigProvider theme={{ token: { colorPrimary: '#0f766e', colorInfo: '#0f766e', borderRadius: 8, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", sans-serif' } }}>
      <div className="app-shell">
        <Sidebar projects={projects} selectedId={selectedId} onSelect={setSelectedId} />
        <Workspace project={project} stage={stage} onStageChange={setStage} />
      </div>
    </ConfigProvider>
  )
}

