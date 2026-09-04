import { BulbOutlined, ClockCircleOutlined, FileSearchOutlined, SaveOutlined, UploadOutlined } from '@ant-design/icons'
import { Alert, Button, Input, Skeleton, message } from 'antd'
import { useEffect, useState } from 'react'
import { generateProjectScript, getProjectScript, researchProject, saveProjectScript, type ProjectScript } from '../api/projects'

const emptyScript: ProjectScript = { projectId: 0, topic: '', brief: '', researchNotes: '', content: '', updatedAt: '', versions: [] }

export function ScriptWorkspace({ projectId }: { projectId: number }) {
  const [script, setScript] = useState<ProjectScript>(emptyScript)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [searching, setSearching] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [importedFile, setImportedFile] = useState('')

  useEffect(() => {
    let active = true
    getProjectScript(projectId)
      .then((loaded) => { if (active) setScript(loaded) })
      .catch(() => { if (active) setError('暂时无法加载脚本，请检查本地服务。') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [projectId])

  function update(field: keyof ProjectScript, value: string) {
    setScript((current) => ({ ...current, [field]: value }))
  }

  async function importScript(file: File) {
    if (!/\.(txt|md)$/i.test(file.name)) {
      setError('仅支持上传 .txt 或 .md 脚本文件。')
      return
    }
    if (file.size > 1024 * 1024) {
      setError('脚本文件不能超过 1 MB。')
      return
    }
    setError('')
    const content = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result ?? ''))
      reader.onerror = () => reject(reader.error)
      reader.readAsText(file, 'UTF-8')
    })
    update('content', content)
    setImportedFile(file.name)
  }

  async function save() {
    setSaving(true)
    setError('')
    try {
      const saved = await saveProjectScript(projectId, script)
      setScript(saved)
      message.success('脚本版本已保存')
    } catch {
      setError('脚本保存失败，内容仍保留在当前页面。')
    } finally {
      setSaving(false)
    }
  }

  async function research() {
    if (script.topic.trim().length < 2) return
    setSearching(true); setError('')
    try {
      const results = await researchProject(projectId, script.topic)
      update('researchNotes', results.map((item, index) => `[${index + 1}] ${item.title}\n${item.url}\n${item.content}`).join('\n\n'))
    } catch { setError('联网搜索失败，请先在设置中配置并测试 Tavily。') }
    finally { setSearching(false) }
  }

  async function generate() {
    if (!script.topic.trim()) return
    setGenerating(true); setError('')
    try { update('content', await generateProjectScript(projectId, script)) }
    catch { setError('脚本生成失败，请先在设置中配置并测试 DeepSeek。') }
    finally { setGenerating(false) }
  }

  if (loading) return <section className="content-section script-loading" aria-label="正在加载脚本"><Skeleton active paragraph={{ rows: 8 }} /></section>

  return <section className="script-workspace" aria-label="脚本工作区">
    <div className="script-main content-section">
      <div className="section-heading">
        <div><h3>脚本创作</h3><p>从选题、资料到可追溯的口播稿</p></div>
        <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={save} disabled={!script.topic && !script.content}>保存新版本</Button>
      </div>
      <div className="script-form">
        {error && <Alert type="error" showIcon message={error} />}
        <label><span>选题 <small>{script.topic.length}/200</small></span><Input aria-label="选题" maxLength={200} value={script.topic} onChange={(event) => update('topic', event.target.value)} placeholder="例如：AI 时代，摄影师该如何重新出发？" /></label>
        <label><span>创作简报 <small>{script.brief.length}/4000</small></span><Input.TextArea aria-label="创作简报" maxLength={4000} rows={3} value={script.brief} onChange={(event) => update('brief', event.target.value)} placeholder="目标观众、核心观点、时长、口吻和行动号召" /></label>
        <label><span>资料摘要 <small>{script.researchNotes.length}/20000</small></span><Input.TextArea aria-label="资料摘要" maxLength={20000} rows={5} value={script.researchNotes} onChange={(event) => update('researchNotes', event.target.value)} placeholder="粘贴来源、关键事实和可引用观点" /></label>
        <div className="script-source-bar">
          <div><strong>脚本来源</strong><small>可使用 AI 生成，也可以直接导入自己的文稿</small></div>
          <label className="script-upload">
            <input aria-label="上传脚本文件" type="file" accept=".txt,.md,text/plain,text/markdown" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importScript(file) }} />
            <span><UploadOutlined /> 上传 TXT / MD</span>
          </label>
          {importedFile && <span className="import-success">已导入 {importedFile}</span>}
        </div>
        <div className="script-tools">
          <Button icon={<FileSearchOutlined />} loading={searching} disabled={script.topic.trim().length < 2} onClick={research}>联网搜索</Button>
          <Button icon={<BulbOutlined />} loading={generating} disabled={!script.topic.trim()} onClick={generate}>AI 生成脚本</Button>
        </div>
        <label><span>脚本正文 <small>{script.content.length}/50000</small></span><Input.TextArea aria-label="脚本正文" maxLength={50000} rows={14} value={script.content} onChange={(event) => update('content', event.target.value)} placeholder="在这里编辑口播脚本……" /></label>
      </div>
    </div>
    <aside className="version-panel content-section" aria-label="脚本版本">
      <h3><ClockCircleOutlined /> 版本记录</h3>
      {script.versions.length === 0 && <p className="version-empty">保存第一版脚本后，这里会出现历史记录。</p>}
      {script.versions.map((version, index) => <button key={version.id} onClick={() => update('content', version.content)}>
        <strong>版本 {script.versions.length - index}</strong>
        <small>{new Date(version.createdAt).toLocaleString('zh-CN')}</small>
        <span>{version.content.slice(0, 48) || '空脚本'}</span>
      </button>)}
    </aside>
  </section>
}
