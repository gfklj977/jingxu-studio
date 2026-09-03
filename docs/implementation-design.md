# 本地 AI 短片工作台：落地设计方案

> 文档状态：Draft v1.0
>
> 用途：产品、UI、前端、后端、AI 流水线、测试与桌面打包的共同实施依据
>
> 对应任务规划：`tasks/plan.md`、`tasks/todo.md`

## 1. 项目定义

### 1.1 产品目标

打造一套采用新品牌、同时支持 macOS 与 Windows 的本地 AI 短片创作工具。用户可以围绕频道模板创建选题，完成资料检索、脚本生成、配音、字幕、分镜图、封面、视频合成、素材管理和多平台辅助投稿。

产品需要复现参考系统的核心工作流、信息架构、操作效率和成片效果，但不复制原产品名称、Logo、帮助链接、试用提示、会员授权、证书体系或云同步服务。

### 1.2 目标用户

- 短视频知识博主和内容团队。
- 摄影、培训、门店经营等垂直行业的内容生产者。
- 不擅长剪辑，但能够审稿、选图并完成最终投稿确认的运营人员。
- 需要在本地保存客户资料、脚本和成片的中小团队。

### 1.3 核心价值

- 将多个 AI 平台和本地工具整合成一个连续工作流。
- 频道模板沉淀品牌风格、脚本结构、声音和视觉规范。
- 每个生产阶段都可以单独执行、重跑、取消和复用。
- 资产留在本机，密钥不经过自建云端。
- 自动准备投稿资料并填写平台表单，最终发布仍由用户确认。

### 1.4 版本 1 范围

必须包含：

- macOS 与 Windows 客户端。
- 本地单用户模式。
- 频道模板和项目管理。
- 复用并换牌处理后的现有频道提示词。
- DeepSeek 文本生成。
- 豆包搜索和 Tavily 搜索。
- 火山方舟 Seedream、API易 GPT-Image-2、胜算云 GPT-Image-2。
- 豆包 TTS 和豆包 ASR。
- FFmpeg 视频合成。
- 脚本、生产、成片、投放四大工作区。
- 抖音、小红书、视频号自动填写和人工最终发布。
- 本地设置、密钥管理、日志、备份和数据目录迁移。

明确不包含：

- 会员、试用、证书和付费授权体系。
- 云端账号、云配置同步和云项目同步。
- 自动完成最终发布。
- 移动端客户端。
- 多人实时协作和权限系统。
- 服务端渲染或公网部署。

### 1.5 新品牌

- 名称：镜序工坊。
- 英文：JINGXU STUDIO。
- 口号：从灵感到成片，一条线完成。
- 主色：镜序青 `#0F766E`。
- 基础深色：深海墨 `#0F172A`。
- 品牌强调色：创意珊瑚 `#FF6B57`。
- 品牌规范与 Logo 源文件：`镜序工坊_品牌方案/`。

## 2. 当前假设

以下假设用于推进设计，若后续调整，应先更新本文档再编码：

1. “首版只支持 macOS，同时支持 Windows”按“首版同时支持 macOS 和 Windows”执行。
2. 产品为本地单用户桌面应用，不设置应用登录。
3. AI 服务由用户填写自己的 API 凭证并直接连接供应商。
4. 产品默认只监听 `127.0.0.1`，不提供局域网访问。
5. 新品牌确定为“镜序工坊”，英文辅助名 `JINGXU STUDIO`，口号为“从灵感到成片，一条线完成”。
6. 现有频道提示词可以复用，但必须执行品牌替换；旧试用版固定收尾统一替换为可关闭的新品牌结尾：“本期内容由镜序工坊辅助创作，从灵感到成片，一条线完成。”
7. 版本 1 支持 Apple Silicon Mac，不支持 Intel Mac，最低 macOS 13；Windows 支持 Windows 10 22H2 与 Windows 11 x64。
8. 三种生图渠道全部保留，默认优先显示火山方舟，两个 GPT-Image-2 中转渠道放在同一高级选择区。

## 3. 成功标准

### 3.1 业务成功标准

- 新用户在配置密钥后，可以在 10 分钟内理解并开始第一次创作。
- 一条已有脚本的标准项目可以完成“配音 → 字幕 → 时间轴 → 图片 → 封面 → 视频”。
- 任一阶段失败时，用户能看见失败原因并只重跑失败阶段及必要下游阶段。
- 重启应用后，项目、任务状态、日志摘要和全部产物仍然存在。
- 同一项目在 macOS 与 Windows 生成的成片，在分辨率、帧率、字幕位置、场景时长和混音结果上满足黄金样片容差。
- 自动填写投稿页面后，应用停止并明确提示用户检查和发布。

### 3.2 工程成功标准

- API 和前端类型由一份 OpenAPI 合同生成，避免手写结构漂移。
- 后端单元与集成测试覆盖率不低于 80%，关键路径不低于 90%。
- 前端关键组件和四条端到端主流程均有自动化测试。
- 所有文件操作受数据根目录约束，无目录穿越。
- API、日志、错误消息和截图中不出现完整密钥。
- 应用只绑定回环地址，公网和局域网地址无法直接访问。
- macOS 与 Windows 安装包均通过干净系统的安装、升级、重启和卸载验证。

## 4. 信息架构

### 4.1 页面层级

```text
应用
├── 工作台
│   ├── 频道与项目导航
│   ├── /projects/:projectId/script
│   ├── /projects/:projectId/production
│   ├── /projects/:projectId/results
│   └── /projects/:projectId/publishing
├── 频道配置抽屉
├── 全局设置页
│   ├── 文本模型
│   ├── 联网搜索
│   ├── 生图服务
│   ├── 配音与识别
│   ├── 音频与视频
│   ├── 数据位置
│   └── 日志与诊断
├── 回收站弹窗
└── 关于与版本信息
```

### 4.2 全局导航原则

- 左侧栏始终表达“频道 → 项目”的归属关系。
- 顶部始终表达“当前项目 → 当前状态 → 当前工作阶段”。
- 工作阶段只允许四种：脚本、生产、成片、投放。
- URL 是当前项目和阶段的唯一来源，刷新后必须回到同一位置。
- 设置、频道配置和回收站属于覆盖层，不改变项目主路由。

## 5. 核心用户流程

### 5.1 首次启动

```text
启动应用
  → 检查数据目录与数据库
  → 启动本地服务
  → 浏览器打开工作台
  → 检测必需密钥
  → 缺失则显示配置引导
  → 配置完成后进行轻量连通性验证
  → 创建第一个项目
```

首次启动不要求注册，不上传密钥，不要求授权证书。

### 5.2 标准创作

```text
选择频道模板
  → 输入主题
  → 创建项目
  → 填写创作简报或导入资料
  → 选择搜索策略
  → AI 生成脚本
  → 预览、评分、修改并保存
  → 选择生产步骤
  → 运行流水线
  → 查看日志与产物
  → 必要时替换素材或单步重跑
  → 检查成片
  → 自动填写投稿页面
  → 用户最终发布
  → 收录发布链接
```

### 5.3 故障恢复

```text
阶段失败
  → 标记失败阶段与错误代码
  → 保留已完成产物
  → 给出可执行修复建议
  → 用户修复设置或素材
  → 从失败阶段重跑
  → 仅使相关下游缓存失效
```

## 6. UI 与视觉系统

### 6.1 布局规格

- 设计基准：1280×720，设备像素比不参与 CSS 尺寸计算。
- 左侧栏：默认 320 px；可调范围 260–460 px；宽度保存到本地偏好。
- 分隔拖拽条：6 px 可操作区域，视觉线 1 px。
- 顶部项目栏：约 96 px 高，分为项目信息和阶段导航两个逻辑区域。
- 主工作区：浅灰背景，卡片之间使用 12–16 px 间距。
- 主内容最小宽度：720 px；更小时将左栏折叠为抽屉。
- 生产页：桌面宽屏使用 38%/62% 双栏；窄屏改为单列。
- 成片页：卡片最小宽度 280 px，自适应 1–3 列。

### 6.2 设计令牌

初始令牌来自参考界面，品牌确定后只允许通过令牌层修改：

```css
:root {
  --color-bg-app: #f5f7fb;
  --color-bg-panel: #ffffff;
  --color-bg-soft: #f8fafc;
  --color-text-primary: #1f2937;
  --color-text-secondary: #6b7280;
  --color-border: #eef0f6;
  --color-primary: #0f766e;
  --color-primary-strong: #115e59;
  --color-accent: #ff6b57;
  --color-primary-soft: #ccfbf1;
  --color-success: #168a5b;
  --color-warning: #d97706;
  --color-danger: #ff4d4f;
  --radius-control: 8px;
  --radius-segmented: 12px;
  --radius-card: 14px;
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
}
```

主色已经按“镜序工坊”品牌确定。创意珊瑚只用于品牌节点、创作入口和轻提示，不能代替危险红。

### 6.3 字体

- UI 字体：`-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif`。
- 正文基准：14 px / 22 px。
- 页面标题：22 px / 30 px，600。
- 区块标题：16 px / 24 px，600。
- 辅助文字：12 px / 20 px。
- 日志：等宽字体，12–13 px / 20 px。
- 不使用图片代替 UI 正文。

### 6.4 状态表达

所有状态必须同时使用图标、文字和颜色：

| 状态 | 文案 | 颜色 | 行为 |
|---|---|---|---|
| 未开始 | 待处理 | 中性灰 | 可启动 |
| 排队 | 排队中 | 蓝灰 | 可取消 |
| 运行 | 生成中 | 主色 | 显示进度和耗时 |
| 成功 | 已完成 | 绿色 | 可查看、重跑 |
| 失败 | 失败 | 红色 | 显示原因、重试 |
| 取消中 | 正在取消 | 橙色 | 禁止重复操作 |
| 已取消 | 已取消 | 灰色 | 可重新启动 |
| 复用 | 已复用 | 蓝绿色 | 展示命中原因 |

### 6.5 响应式策略

- ≥1200 px：完整双栏工作台。
- 960–1199 px：左栏收窄至 280 px，卡片减少列数。
- 768–959 px：左栏默认折叠，主区单列。
- <768 px：仅保证查看与轻量编辑，不承诺视频生产的完整移动体验。
- 自动化视觉测试至少覆盖 768、1024、1280、1440 四种宽度。

### 6.6 无障碍要求

- 满足 WCAG 2.1 AA。
- 所有文字对比度至少 4.5:1，大字号至少 3:1。
- 所有图标按钮具有中文 `aria-label`。
- Tab 顺序与视觉顺序一致。
- 抽屉和弹窗打开后锁定焦点，关闭后焦点返回触发按钮。
- 拖拽排序同时提供键盘“上移/下移”操作。
- 进度更新通过节流后的 `aria-live="polite"` 汇报。
- 错误不能只用红色表达，必须显示错误文本和解决建议。
- 删除、迁移、覆盖和恢复操作必须说明影响范围。

## 7. 页面详细设计

### 7.1 左侧频道与项目栏

组成：

1. 品牌区：新 Logo、新产品名、“本地 AI 短片创作工作台”。
2. 创作折叠区：主题输入、模板选择、创建按钮、导入热点卡片。
3. 频道标题区：刷新、回收站。
4. 频道节点：名称、项目数量、模板属性、搜索、配置、打开目录。
5. 项目节点：标题、状态、打开目录、删除。
6. 底部能力说明：只展示实际启用的引擎。

行为：

- 单击频道展开/折叠。
- 单击项目进入上次所在阶段，默认进入脚本页。
- 项目支持拖拽排序和右键置顶；键盘用户使用菜单完成同等操作。
- 删除进入回收站，不直接清除磁盘文件。
- 搜索仅过滤当前频道项目标题，清空后恢复排序。
- 频道数量和项目状态由服务端返回，不在前端自行统计。

空状态：

- 无频道：提示创建或导入频道模板。
- 频道无项目：显示“创建第一个选题”。
- 搜索无结果：保留搜索词并提供清空按钮。

### 7.2 项目顶部栏

显示：

- 项目图标、项目标题、频道标签。
- 当前状态。
- 脚本、生产、成片、投放四阶段分段导航。
- 刷新与设置入口。

规则：

- 项目标题超过一行时截断，悬浮显示全文。
- 导航选中态必须与 URL 一致。
- 正在生产时允许切页，任务在后端继续运行。
- 离开存在未保存编辑的页面时显示确认。

### 7.3 脚本工作区

#### 热点制作卡片导入

入口位于左侧“创作”区域，允许从剪贴板、文件或拖拽导入通用热点卡片，不依赖原品牌网站。

支持格式：

- `.json`：结构化卡片，适合其他工具输出和批量处理。
- `.md`：带 YAML Front Matter 的人类可读卡片。
- 纯文本：粘贴后进入字段识别预览，不直接创建项目。

JSON 合同：

```json
{
  "schemaVersion": "1.0",
  "title": "热点主题",
  "summary": "事件或观点摘要",
  "sourceUrls": ["https://example.com/article"],
  "publishedAt": "2026-09-03T08:00:00Z",
  "keywords": ["关键词"],
  "suggestedTemplateKey": "dual-story",
  "angles": ["可采用的内容角度"],
  "notes": "人工补充说明"
}
```

导入流程：

```text
选择/粘贴卡片
  → 格式与版本校验
  → URL 和文本安全检查
  → 字段映射预览
  → 选择目标频道
  → 检测同标题或同来源重复项
  → 用户确认
  → 创建项目并写入 brief.md
```

验收规则：

- 不支持的 `schemaVersion` 明确提示，不做猜测式导入。
- 缺少标题时允许用户补充；标题和摘要同时缺失则拒绝。
- 来源 URL 只作为参考资料，不自动执行网页中的任何指令。
- 检测到重复项时提供“打开已有项目”“仍然创建”和“取消”。
- 导入过程不修改原文件。

#### 创作简报

- 支持粘贴话题、Prompt Pack、长文和链接。
- 支持导入 `.md`、`.txt`、`.pdf`、`.docx`、`.mp3`、`.m4a`、`.wav`。
- 音频先转写，再作为简报附件。
- 每项目可以覆盖搜索类别和参考数量。
- 发送按钮启动生成；Enter 换行，Cmd/Ctrl+Enter 发送。

#### 生成过程

- 显示检索、整理资料、生成、验证、保存五个子阶段。
- 展示已采用的参考来源，不展示供应商内部思维链。
- 可取消；取消后保留原脚本。
- 生成结果先写临时文件，通过校验后原子替换 `content.md`。

#### 脚本编辑

- 预览与编辑模式切换。
- 保存前创建时间戳备份。
- 支持复制全文、导入替换、历史恢复。
- 恢复历史版本前先备份当前版本。
- Markdown 渲染必须过滤危险 HTML。

#### 内容工具

- 选题评分：返回维度、得分、建议和可执行修改。
- 爆款诊断：返回开场、节奏、冲突、证明、结尾等问题。
- 标题/封面 A/B：生成多个标题、封面文案和提示词。
- 工具结果作为独立版本保存，不直接覆盖脚本。

#### 一键转图文

“一键转图文”将当前视频脚本转换为可发布的图文内容包，不影响原脚本和视频产物。

输入：

- 当前有效 `content.md`。
- 已生成的封面和场景图；未生成时允许只输出文字版。
- 频道品牌、免责声明、标签和平台偏好。
- 可选作者补充说明。

输出目录：

```text
article/
├── article.md                 通用长文
├── xiaohongshu.md             小红书图文版
├── wechat-official.md         公众号长文版
├── captions.json              图片与段落对应关系
├── assets/                    文章采用的图片副本或引用清单
└── article-manifest.json      输入指纹、生成时间、模型和版本
```

转换步骤：

1. 解析脚本主旨、论点、证据、案例和结论。
2. 删除口播角色标记、重复追问和只适合语音的过渡语。
3. 生成标题、导语、小标题、正文、结尾和标签。
4. 将场景图映射到对应段落，生成图注和替代文本。
5. 分别生成通用长文、小红书和公众号结构。
6. 执行事实、品牌、长度、敏感内容和图片引用校验。
7. 保存为独立 Article Revision，不覆盖视频脚本。

平台差异：

| 输出 | 目标长度 | 结构 |
|---|---:|---|
| 通用长文 | 1,200–3,000 字 | 标题、导语、3–6 节、总结 |
| 小红书 | 500–1,000 字 | 强开头、短段落、要点、标签 |
| 公众号 | 1,500–4,000 字 | 导语、章节、图片、结语与免责声明 |

状态与错误：

- 没有有效脚本：按钮禁用并提示先完成脚本。
- 图片缺失：允许生成文字包，标记“待补图”。
- 转换运行中：显示独立进度，不阻塞视频生产。
- 部分平台失败：保留已成功输出，可单独重试失败平台。
- 脚本变化后：显示“源脚本已更新”，允许重新生成，不自动覆盖旧文章。

### 7.4 生产工作区

#### 素材入库

- 支持点击选择和多文件拖入。
- 图片白名单：16:9、4:3、3:4；容差默认 ±1.5%。
- `s_NN.*`、`person.*`、`portrait.*`、`avatar.*` 保留原逻辑名称。
- 16:9 普通上传默认进入场景/开场图区；4:3、3:4 自动进入发布封面位。
- 不支持的比例明确显示尺寸、比例和建议裁切值。
- 上传先进入临时目录，完成格式和安全校验后移动到项目目录。

#### BGM

- 三态：跟随频道、使用项目临时音乐、不使用。
- 支持 MP3、M4A、AAC、WAV、FLAC、OGG、OPUS，单文件上限默认 200 MB。
- 上传后允许试听和移除。
- 音量显示最终生效值及来源。

#### 流水线控制

- 五个用户可选阶段：配音、字幕、分镜、封面、成片。
- 后端可进一步拆成 `audio`、`subtitleAsr`、`sceneTimeline`、`images`、`covers`、`video`。
- “一键生成”选择所有有效阶段。
- “一键转图文”作为独立输出模式，不与视频流水线耦合。
- 当用户选择下游阶段而上游产物缺失时，界面说明将自动补齐的阶段。

#### 实时日志

- 顶部展示总体状态、耗时、取消按钮。
- 每阶段展示状态、耗时、进度、重试入口。
- 日志支持复制、清空显示和下载诊断包。
- “清空日志”只清除界面显示，不删除服务端审计摘要。

### 7.5 成片工作区

顶部工具：

- 文件总数、全选、已选数量、批量删除、发布文件夹、重新点收。

文件卡片：

- 视频：封面帧、播放、复制、下载、删除。
- 音频：播放波形或播放按钮、复制、下载、删除。
- 图片：缩略图、放大预览、查看提示词、复制、下载、删除。
- 文本：类型图标、摘要、复制、下载、恢复/选用、删除。
- JSON/SRT：语法或字幕预览、复制、下载、删除。

规则：

- 列表以服务端点收结果为准。
- 删除移入项目内部 `.trash`，延迟永久清理。
- 下载文件名保留中文并安全编码。
- 预览大文件时采用流式媒体或范围请求，不整体加载到内存。
- 文件卡片键使用稳定的相对路径，不使用数组索引。

### 7.6 投放工作区

#### 投稿前检查

平台卡片：抖音、小红书、视频号。每个频道在每个平台对应独立浏览器资料目录。

检查项目：

- 账号已登录且在有效期内。
- 成片存在且可读取。
- 推荐标题存在并满足平台长度。
- 标签存在且已标准化。
- 横版和竖版封面按平台要求就绪。
- 原创声明默认值已明确。

只有全部必需项通过后才启用“打开并自动填写”。

#### 自动填写边界

允许：

- 打开投稿页面。
- 选择并上传本项目成片。
- 填写标题、说明和标签。
- 选择本项目封面。
- 设置已批准的原创默认值。

禁止：

- 自动点击最终发布、提交或预约发布。
- 自动处理验证码。
- 使用用户日常 Chrome/Edge 资料目录。
- 在账号之间共享 Cookie。

#### 发布链接收纳

- 支持粘贴抖音、快手、YouTube、B站、小红书、视频号链接。
- 自动识别平台，并允许人工修正。
- 保存标题、备注、创建时间。
- 允许修改和移入回收站。
- 不抓取或重新发布第三方内容。

### 7.7 全局设置

分组：

1. DeepSeek：Key、Base URL、模型、思考开关、推理强度。
2. 搜索：供应商、凭证、类别、参考上限。
3. 生图：三家供应商、模型、质量、并发。
4. TTS/ASR：凭证、发音人、单/双人、语速、随机起始。
5. 音频视频：人声、BGM、默认编码预设。
6. 数据位置：当前目录、占用空间、磁盘剩余、迁移。
7. 日志诊断：打开日志、导出脱敏诊断包。

密钥字段：

- GET 只返回 `isConfigured` 和末四位提示，不返回原值。
- 留空保存表示保持不变。
- 明确点击“移除”才删除凭证。
- 修改后先本地校验，再允许保存。

### 7.8 频道设置

字段：

- 频道名称和品牌名。
- 模式：单人图文、单人讲故事、双人讲故事、自定义。
- 系统提示词。
- 默认免责声明。
- 发布标签。
- 封面脚注。
- 横版/竖版封面生成开关。
- 发音方式、生成类型、音色、语速、音量。
- 发音人顺序。
- 场景时间轴深度思考。
- 默认 BGM 和音量。

继承规则：

```text
项目临时设置 > 频道设置 > 全局设置 > 程序默认值
```

界面必须在字段旁显示当前有效值的来源。

### 7.9 维护与修复中心

维护中心位于全局设置的“日志与诊断”区域，默认只做扫描，不自动删除或修改数据。

扫描项目：

- 数据库中存在、目录缺失的项目。
- 目录存在、数据库无记录的孤儿项目。
- 数据库资产记录与磁盘文件不一致。
- 无法解码、零字节或哈希不匹配的媒体。
- 超过保留时间的临时文件和中断任务输出。
- 频道模板目录缺失或提示词不可读。
- 投稿浏览器资料目录存在但账号记录缺失。
- 浏览器资料被锁定、版本不兼容或异常膨胀。

每个问题提供：问题类型、影响范围、推荐操作、可恢复性和预计释放空间。

允许操作：

- 重新点收：以磁盘为准重新登记安全资产。
- 恢复项目：把完整孤儿目录重新登记到数据库。
- 隔离损坏文件：移动到项目 `.trash/quarantine`。
- 清理可重建缓存：字幕帧、下载临时文件和失败任务临时输出。
- 重建投稿资料：仅在用户确认后备份并重置指定频道/平台资料目录。
- 导出诊断：生成脱敏诊断包，不修改数据。

安全规则：

- 扫描与预览无需确认；任何删除、隔离、覆盖或浏览器资料重置都必须二次确认。
- 批量修复前自动创建数据库备份和操作清单。
- 每次修复产生可读报告；能恢复的操作提供撤销入口。
- 永远不操作数据根目录以外的文件。

## 8. 系统架构

### 8.1 总体结构

```text
React SPA
   │ REST + SSE
   ▼
FastAPI Local Server
   ├── Project/Template Services ── SQLite
   ├── Artifact Service ─────────── Local Filesystem
   ├── Job Engine ───────────────── Worker Queue
   │      ├── DeepSeek
   │      ├── Doubao Search / Tavily
   │      ├── Ark / APIYi / Shengsuanyun
   │      ├── Doubao TTS / ASR
   │      └── FFmpeg / Pillow
   ├── Publishing Service ───────── Playwright
   ├── Secret Store ─────────────── Keychain / Credential Manager
   └── Platform Adapter ─────────── macOS / Windows
```

### 8.2 进程模型

- 桌面启动器负责单实例检查、选择端口、启动 FastAPI 和打开默认页面。
- FastAPI 主进程负责 API、静态文件、SSE 和任务调度。
- 长任务通过受控子进程或工作进程执行。
- FFmpeg 运行在独立进程组，取消时终止完整进程树。
- Playwright 投稿浏览器与日常浏览器隔离。
- 应用退出时不强杀正在原子写入的数据库事务；提供短暂优雅退出窗口。

### 8.3 技术栈

| 层 | 技术 |
|---|---|
| Web | React、TypeScript、Vite、Ant Design |
| Server state | TanStack Query |
| Local UI state | React state；跨页面轻量状态使用 Zustand |
| Forms | React Hook Form + Zod |
| API | FastAPI、Pydantic |
| ORM/DB | SQLAlchemy 2 + Alembic + SQLite |
| Jobs | 自研有界本地队列 + asyncio/subprocess |
| Events | Server-Sent Events |
| Media | FFmpeg、ffprobe、Pillow |
| Browser | Playwright |
| Testing | Pytest、Vitest、Testing Library、Playwright Test |
| Packaging | PyInstaller；macOS 签名/公证；Windows Inno Setup 或 MSIX |

## 9. 项目结构

```text
apps/
├── server/
│   ├── api/                 路由和请求边界
│   ├── domain/              实体、枚举、状态机
│   ├── services/            用例服务
│   ├── repositories/        SQLite 持久化
│   ├── jobs/                队列、事件、取消和恢复
│   ├── security/            密钥、路径和脱敏
│   ├── platform/            macOS/Windows 差异
│   ├── migrations/          Alembic 迁移
│   └── main.py
├── web/
│   ├── src/app/             路由和全局 Provider
│   ├── src/layout/          工作台骨架
│   ├── src/features/        按业务功能分组
│   ├── src/components/      通用表现组件
│   ├── src/api/             生成的客户端和查询 Hooks
│   ├── src/styles/          令牌和全局样式
│   └── src/test/            测试工具
pipeline/
├── contracts/               供应商和阶段接口
├── providers/               AI 服务适配器
├── stages/                  生产阶段
├── publishing/              平台投稿适配器
└── media/                   FFmpeg、字幕、图片处理
packages/contracts/          OpenAPI 生成类型
tests/
├── server/
├── pipeline/
├── fixtures/
├── golden/
└── e2e/
docs/
packaging/
tasks/
```

## 10. 领域模型与数据库

### 10.1 ChannelTemplate

| 字段 | 类型 | 说明 |
|---|---|---|
| id | UUID | 稳定 ID，不使用名称作外键 |
| key | string | URL/目录安全键 |
| name | string | 展示名称 |
| mode | enum | SINGLE_ARTICLE / SINGLE_STORY / DUAL_STORY / CUSTOM |
| prompt | text | 换牌后的频道提示词 |
| brandName | string? | 频道级品牌覆盖 |
| releaseTags | string[] | 默认标签 |
| voiceConfig | json | TTS 覆盖设置 |
| coverConfig | json | 封面设置 |
| bgmConfig | json | 默认 BGM 设置 |
| isBuiltin | boolean | 内置模板只读标记 |
| createdAt/updatedAt | datetime | 审计时间 |

### 10.2 Project

| 字段 | 类型 | 说明 |
|---|---|---|
| id | UUID | 项目 ID |
| templateId | UUID | 所属频道 |
| topicName | string | 项目标题 |
| status | enum | DRAFT / READY / RUNNING / COMPLETED / FAILED |
| sortOrder | decimal | 稳定排序值 |
| isPinned | boolean | 置顶 |
| activeStage | enum | SCRIPT / PRODUCTION / RESULTS / PUBLISHING |
| settingsOverride | json | 项目级覆盖 |
| createdAt/updatedAt/deletedAt | datetime | 软删除和审计 |

### 10.3 ContentRevision

| 字段 | 类型 | 说明 |
|---|---|---|
| id | UUID | 版本 ID |
| projectId | UUID | 项目 |
| kind | enum | BRIEF / CONTENT / TOOL_RESULT |
| relativePath | string | 文件相对路径 |
| contentSha256 | string | 内容指纹 |
| source | enum | USER / AI / RESTORE / IMPORT |
| createdAt | datetime | 创建时间 |

### 10.4 Job 与 JobStage

Job 保存用户请求；JobStage 保存每个阶段的独立状态、输入指纹、输出指纹、耗时和错误。避免把全部阶段状态塞进一段不可查询的日志。

主要字段：

- Job：id、projectId、status、requestedSteps、effectiveSteps、createdAt、startedAt、finishedAt、cancelRequestedAt。
- JobStage：id、jobId、stage、status、progress、inputFingerprint、outputFingerprint、errorCode、errorMessage、startedAt、finishedAt。

### 10.5 Artifact

| 字段 | 类型 | 说明 |
|---|---|---|
| id | UUID | 资产 ID |
| projectId | UUID | 项目 |
| kind | enum | VIDEO / AUDIO / IMAGE / TEXT / SUBTITLE / TIMELINE / OTHER |
| role | string? | OPENING、SCENE、COVER_4_3 等 |
| relativePath | string | 数据根目录内相对路径 |
| mimeType | string | MIME |
| size | integer | 字节数 |
| sha256 | string | 指纹 |
| width/height/duration | number? | 媒体元数据 |
| source | enum | GENERATED / UPLOADED / IMPORTED |
| createdAt/deletedAt | datetime | 审计与软删除 |

### 10.6 PublishingAccount、PublishingTask、ReleaseLink

- PublishingAccount 以 `templateId + platform` 唯一，保存资料目录键、显示名和登录状态，不保存明文 Cookie 到数据库。
- PublishingTask 保存项目、平台、素材指纹、标题、说明、状态、阶段和错误。
- ReleaseLink 保存平台、URL、标题、备注和创建时间。

### 10.7 HotspotImport 与 ArticleRevision

- HotspotImport：id、sourceType、schemaVersion、title、sourceUrls、payloadHash、targetTemplateId、createdProjectId、status、warnings、createdAt。
- ArticleRevision：id、projectId、platform、sourceContentSha256、relativePath、status、model、createdAt。
- 热点导入记录原始载荷的哈希和字段映射结果，不默认保存完整第三方网页内容。
- 图文输出按平台独立版本化，允许某个平台重跑而不覆盖其他平台结果。

### 10.8 数据库规则

- SQLite 开启 WAL、foreign keys 和 busy timeout。
- 所有结构修改必须通过迁移。
- 删除频道前必须处理关联项目。
- 排序更新使用事务。
- 项目名称在同一频道内唯一，大小写和 Unicode 规范化规则固定。
- API 不向前端暴露数据库文件路径。

## 11. 文件系统设计

```text
<data-root>/
├── app.db
├── config/
│   ├── settings.json        非密钥配置
│   └── migrations.json
├── templates/
│   └── <template-id>/
│       ├── prompt.md
│       └── bgm/
├── projects/
│   └── <project-id>/
│       ├── brief.md
│       ├── content.md
│       ├── revisions/
│       ├── audio/
│       ├── images/
│       ├── covers/
│       ├── timeline/
│       ├── release/
│       ├── metadata/
│       ├── temp/
│       └── .trash/
├── browser-profiles/
│   └── <template-id>/<platform>/
├── logs/
└── backups/
```

原则：

- 磁盘目录使用 UUID，展示名称写入元数据，避免中文重命名导致路径断裂。
- UI 仍显示用户熟悉的频道名和项目名。
- 外部上传的文件名仅作为展示名；真实存储名由系统生成。
- 最终写入使用“临时文件 → fsync → 原子重命名”。
- 迁移数据目录时先复制并校验，再切换配置；失败时保留原目录。

## 12. API 设计

### 12.1 通用约定

- 基础路径：`/api`。
- JSON 字段：camelCase。
- 枚举：UPPER_SNAKE_CASE。
- 时间：ISO 8601 UTC。
- ID：UUID 字符串。
- 列表：统一分页结构。
- 修改：使用 PATCH；完整替换仅在确实需要时使用 PUT。
- POST 创建返回 201；异步任务返回 202。
- 删除成功且目标已不存在时保持幂等。

统一成功分页：

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "pageSize": 50,
    "totalItems": 0,
    "totalPages": 0
  }
}
```

统一错误：

```json
{
  "error": {
    "code": "PROJECT_NAME_CONFLICT",
    "message": "当前频道中已存在同名项目",
    "details": {
      "field": "topicName"
    },
    "requestId": "req_..."
  }
}
```

### 12.2 项目与频道

```text
GET    /api/templates
POST   /api/templates
GET    /api/templates/:templateId
PATCH  /api/templates/:templateId
POST   /api/templates/:templateId/duplicate
GET    /api/projects
POST   /api/projects
GET    /api/projects/:projectId
PATCH  /api/projects/:projectId
DELETE /api/projects/:projectId
POST   /api/projects/:projectId/restore
PATCH  /api/projects/:projectId/order
GET    /api/trash/projects
DELETE /api/trash/projects/:projectId
```

### 12.3 内容

```text
GET    /api/projects/:projectId/brief
PUT    /api/projects/:projectId/brief
GET    /api/projects/:projectId/content
PUT    /api/projects/:projectId/content
POST   /api/projects/:projectId/content/generations
GET    /api/projects/:projectId/content/generations/:generationId
DELETE /api/projects/:projectId/content/generations/:generationId
GET    /api/projects/:projectId/revisions
POST   /api/projects/:projectId/revisions/:revisionId/restore
POST   /api/projects/:projectId/content-tools/topic-score
POST   /api/projects/:projectId/content-tools/viral-diagnosis
POST   /api/projects/:projectId/content-tools/title-cover-options
POST   /api/hotspot-imports/validate
POST   /api/hotspot-imports
GET    /api/hotspot-imports/:importId
POST   /api/projects/:projectId/article-conversions
GET    /api/projects/:projectId/article-conversions
GET    /api/article-conversions/:conversionId
DELETE /api/article-conversions/:conversionId
```

热点验证接口只解析和返回预览；真正创建项目必须调用第二个接口。图文转换返回 202，并复用统一 Job/SSE 事件协议。

### 12.4 任务与事件

```text
POST   /api/projects/:projectId/jobs
GET    /api/projects/:projectId/jobs
GET    /api/jobs/:jobId
DELETE /api/jobs/:jobId
GET    /api/jobs/:jobId/events
```

创建任务请求示例：

```json
{
  "requestedSteps": ["AUDIO", "SUBTITLES", "IMAGES", "COVERS", "VIDEO"],
  "force": false,
  "allowIncompleteVideo": false
}
```

SSE 事件结构：

```json
{
  "eventId": 184,
  "jobId": "...",
  "stage": "IMAGES",
  "type": "STAGE_PROGRESS",
  "progress": 0.6,
  "message": "场景图 6/10 已完成",
  "occurredAt": "2026-09-03T10:30:00Z"
}
```

客户端重连通过 `Last-Event-ID` 恢复，服务端必须保证事件单调递增。

### 12.5 文件与资产

```text
GET    /api/projects/:projectId/artifacts
POST   /api/projects/:projectId/artifacts
GET    /api/artifacts/:artifactId
GET    /api/artifacts/:artifactId/content
GET    /api/artifacts/:artifactId/download
DELETE /api/artifacts/:artifactId
POST   /api/projects/:projectId/artifacts/batch-delete
POST   /api/projects/:projectId/artifacts/reconcile
GET    /api/artifacts/:artifactId/prompt
```

媒体响应支持 `Range`。上传 API 校验 MIME、扩展名、魔数、文件大小和解码能力。

### 12.6 设置与诊断

```text
GET    /api/settings
PATCH  /api/settings
GET    /api/settings/secrets/status
PATCH  /api/settings/secrets
POST   /api/settings/providers/:provider/test
GET    /api/settings/data-location
POST   /api/settings/data-location/migrations
GET    /api/settings/data-location/migrations/:migrationId
POST   /api/diagnostics/export
POST   /api/maintenance/scans
GET    /api/maintenance/scans/:scanId
POST   /api/maintenance/repairs
GET    /api/maintenance/repairs/:repairId
POST   /api/maintenance/repairs/:repairId/undo
```

修复请求必须提交扫描结果版本和被选问题 ID；扫描结果变化时返回 409，防止按过期清单修改磁盘。

### 12.7 投稿

```text
GET    /api/projects/:projectId/publishing/prepare
GET    /api/templates/:templateId/publishing-accounts
POST   /api/templates/:templateId/publishing-accounts/:platform/login
DELETE /api/templates/:templateId/publishing-accounts/:platform
POST   /api/projects/:projectId/publishing-tasks
GET    /api/projects/:projectId/publishing-tasks
GET    /api/publishing-tasks/:taskId
GET    /api/projects/:projectId/release-links
POST   /api/projects/:projectId/release-links
PATCH  /api/release-links/:releaseLinkId
DELETE /api/release-links/:releaseLinkId
```

### 12.8 并发与冲突

- 内容保存携带 `revision`，版本不一致返回 409。
- 同一项目同一时刻仅允许一个写入型生产任务。
- 不同项目允许并行，默认全局最大并发按供应商独立配置。
- 创建 Job 支持 `Idempotency-Key`，避免双击重复启动。
- 任务取消和删除使用 DELETE，但业务结果通过统一状态返回。

## 13. 状态机

### 13.1 项目状态

```text
DRAFT
  └── 脚本有效 ──> READY
READY
  └── 任务启动 ──> RUNNING
RUNNING
  ├── 全部成功 ──> COMPLETED
  ├── 部分失败 ──> FAILED
  └── 用户取消 ──> READY 或 COMPLETED（取决于已有产物）
COMPLETED
  └── 上游内容修改 ──> READY
FAILED
  └── 重试 ──> RUNNING
```

### 13.2 Job 状态

```text
QUEUED → RUNNING → SUCCEEDED
                  → FAILED
                  → CANCELLING → CANCELLED
QUEUED ───────────────────────→ CANCELLED
```

终态不可逆；重跑必须创建新 Job。

### 13.3 投稿任务状态

```text
PREPARING → WAITING_FOR_LOGIN → FILLING → READY_FOR_USER
          → FAILED
READY_FOR_USER → COMPLETED（用户粘贴发布链接或主动确认）
               → ABANDONED
```

## 14. AI 服务抽象

### 14.1 接口边界

```python
class TextGenerationProvider(Protocol):
    async def generate(self, request: TextRequest) -> TextResult: ...

class SearchProvider(Protocol):
    async def search(self, request: SearchRequest) -> SearchResult: ...

class ImageGenerationProvider(Protocol):
    async def generate(self, request: ImageRequest) -> ImageResult: ...

class SpeechSynthesisProvider(Protocol):
    async def synthesize(self, request: SpeechRequest) -> SpeechResult: ...

class SpeechRecognitionProvider(Protocol):
    async def transcribe(self, request: AsrRequest) -> AsrResult: ...
```

每个供应商响应均视为不可信输入，必须通过 Pydantic 模型校验后进入流水线。

### 14.2 DeepSeek

- 配置：API Key、Base URL、模型、thinking type、reasoning effort、超时。
- 输入：频道提示词、简报、参考资料、当前脚本、生成模式。
- 输出：Markdown 文本、模型标识、用量、完成原因。
- 禁止记录完整请求中的敏感原始资料；诊断日志只记录长度、哈希和状态。

### 14.3 搜索

- Doubao Search Custom 默认适合中文与国内时效内容。
- Tavily 作为通用检索和兼容选项。
- 每条参考包含标题、URL、摘要、来源、检索时间。
- 去重键使用规范化 URL + 内容指纹。
- 网页内容只能作为资料，不能改变频道提示词和程序指令。

### 14.4 生图

- 三家供应商共享统一尺寸、质量、数量和提示词结构。
- 场景图以编号角色关联，不依赖文件列表顺序。
- 单张失败允许重试，不重跑全部场景。
- 并发分别受全局和供应商限额约束。
- 每张图片保存提示词、供应商、模型、尺寸、时间和输入指纹。

### 14.5 TTS 与 ASR

- TTS 支持单人和双人脚本解析。
- 双人角色映射在生成前校验，未知角色必须报错或交给用户处理。
- 语速范围 0.5–2.0，默认 1.0。
- 人声音量默认乘数 1.30，并通过限幅避免削波。
- ASR 默认使用豆包提交模式，允许复用 TTS Key。
- 字幕文本与时间轴必须保存供应商原始结果和规范化结果的哈希。

## 15. 媒体生产流水线

### 15.1 阶段定义

1. Parse：解析 `content.md`，提取标题、对话、重点字幕和图片提示词。
2. Validate：校验脚本结构、角色、提示词数量和封面提示词。
3. Audio：调用 TTS，合并、标准化并输出 `podcast.mp3`。
4. Subtitle ASR：识别音频并输出 `subtitles.srt`。
5. Scene Timeline：把脚本场景映射到字幕时间段，输出 `scene_timeline.json`。
6. Images：生成或复用 `s_01...s_NN`。
7. Covers：生成/复用开场图、4:3 和 3:4 封面。
8. Video：预处理画面、渲染字幕、混音、编码和原子输出。
9. Reconcile：调用 ffprobe 点收并登记全部产物。

### 15.2 缓存与失效

每个阶段输入指纹包含：

- 上游产物 SHA-256。
- 有效频道/项目设置。
- 供应商和模型。
- 阶段实现版本。
- 相关提示词或素材内容。

变更影响：

| 修改内容 | 必须失效 |
|---|---|
| 脚本对白 | Audio、Subtitle、Timeline、Video |
| 场景提示词 | 对应 Image、Video |
| 封面提示词 | Covers、Video 开篇 |
| 音色/语速 | Audio、Subtitle、Timeline、Video |
| 字幕样式 | Video |
| BGM/音量 | Video |
| 手动替换场景图 | Video |

### 15.3 视频黄金规格

已从参考成片确认：

- 容器：MP4。
- 视频：H.264，1920×1080，30 fps。
- 像素格式：参考为 `yuvj420p`；实现时验证平台兼容性后锁定等效 FFmpeg 参数。
- 音频：AAC、单声道、24 kHz，参考约 107 kbps。
- 参考视频平均码率约 929 kbps，但正式规格以编码参数和黄金样片误差为准。
- 人声音量：1.30。
- BGM 音量：0.09。
- 字幕：macOS 默认苹方/冬青黑体链路，Windows 默认微软雅黑；必须通过视觉黄金样片校准字号、字重、描边、阴影、换行和底部安全区。
- 开场图时长和场景切换来自 `scene_timeline.json`。
- 静态场景的运动、缩放和转场必须从多条参考视频中测定，不能只根据单个成片推断。

### 15.4 输出验收

每条成片自动检查：

- 视频和音频流均存在。
- 分辨率、帧率、时长、音频采样率符合预设。
- 时长与主音频误差不超过 100 ms。
- 无黑帧开场、零字节产物和损坏媒体。
- 字幕末行不超过音频时长。
- 时间轴覆盖完整且无负时长、倒序和明显空洞。
- 输出写入成功后才替换旧成片。

## 16. 投稿自动化设计

### 16.1 适配器

```typescript
interface PublishingAdapter {
  platform: 'DOUYIN' | 'XIAOHONGSHU' | 'WECHAT_CHANNELS';
  verifyLogin(): Promise<LoginStatus>;
  openComposer(): Promise<void>;
  fillDraft(input: PublishingDraft): Promise<FillResult>;
  handoffToUser(): Promise<void>;
}
```

### 16.2 浏览器资料隔离

```text
browser-profiles/<template-id>/<platform>/
```

- 一个频道、一个平台、一个资料目录。
- 资料目录不允许通过 UI 任意选择。
- 浏览器启动参数由平台适配器集中生成。
- Windows 优先 Chrome，缺失时使用 Edge；macOS 优先 Chrome。
- 登录失效后进入重新登录状态，不自动清除资料目录。

### 16.3 稳定性策略

- 优先使用角色、可访问名称和稳定属性定位。
- 平台专属选择器集中在单个适配器，不散落在业务代码中。
- 每个平台维护本地镜像测试页面，验证上传、标题、标签和封面流程。
- 真实页面结构变化时返回 `PLATFORM_UI_CHANGED`，不盲目点击。
- 用户接管后停止自动控制，避免争抢输入。

## 17. 安全与隐私

### 17.1 密钥

- macOS 存入 Keychain。
- Windows 存入 Credential Manager。
- 数据库只保存密钥引用和配置状态。
- `.env` 只作为开发和迁移兼容，不作为正式默认存储。
- 导出诊断包前执行集中脱敏。

### 17.2 本地服务

- 仅监听 `127.0.0.1`。
- 启动时生成随机本地会话令牌，通过启动 URL 或安全 Cookie 传递。
- 所有写操作校验 Origin/Host 和本地会话。
- 拒绝公网 Host header 和跨域请求。
- 禁止前端传入任意绝对路径。

### 17.3 文件安全

- 所有用户路径先解析再验证必须位于数据根目录。
- 文件上传检查扩展名、MIME、文件头和可解码性。
- 压缩包如未来支持，必须防止 Zip Slip 和解压炸弹。
- HTML/Markdown 预览执行白名单清洗。
- 日志不记录 Cookie、Authorization、API Key、完整客户资料和完整浏览器资料路径。

### 17.4 投稿安全

- 不读取用户日常浏览器资料。
- 不自动最终发布。
- 不处理验证码。
- 不保存用户平台密码。
- 清除投稿账号必须二次确认，并明确说明将删除对应独立浏览器会话。

## 18. 跨平台设计

### 18.1 平台抽象

```python
class PlatformServices(Protocol):
    def reveal_in_folder(self, path: Path) -> None: ...
    def open_browser(self, url: str) -> None: ...
    def get_secret(self, key: str) -> str | None: ...
    def set_secret(self, key: str, value: str) -> None: ...
    def available_browsers(self) -> list[BrowserInfo]: ...
    def font_candidates(self) -> list[Path]: ...
```

### 18.2 macOS

- 仅支持 Apple Silicon arm64，不支持 Intel Mac。
- 最低支持 macOS 13。
- 应用签名和 notarization。
- Finder 揭示文件。
- Keychain 保存密钥。
- 优先使用系统中文字体。

### 18.3 Windows

- 支持 Windows 10 22H2 x64 和 Windows 11 x64。
- 不提供 32 位安装包。
- Inno Setup 或 MSIX 安装器。
- Explorer 揭示文件。
- Credential Manager 保存密钥。
- 打包微软雅黑或验证系统字体存在；遵循字体许可。
- 正确处理中文路径、长路径、反斜杠和进程树取消。
- Chrome 缺失时可使用 Edge 独立资料目录。

### 18.4 跨平台一致性

- 数据结构和项目目录一致。
- 不在数据库保存 OS 专属绝对路径。
- Golden Project 在两个系统运行并比较：时长、画面尺寸、字幕基线、断行、音量和场景切换。
- 差异允许项必须写入黄金测试配置，不能静默放宽。

### 18.5 系统自适应容量与并发

版本 1 不设置固定项目容量上限，按系统磁盘、内存、CPU 和供应商限制动态决定。

启动时采集：

- 逻辑/物理 CPU 核心数。
- 可用内存和总内存。
- 数据盘剩余空间和总空间。
- 各供应商允许的最大并发。
- 当前正在运行的 FFmpeg 和浏览器任务。

默认策略：

```text
普通项目并行数 = clamp(floor(逻辑 CPU / 4), 1, 3)
生图并发数     = min(供应商上限, clamp(floor(内存 GB / 4), 1, 5))
FFmpeg 并发数   = clamp(floor(物理 CPU / 4), 1, 2)
ASR/TTS 并发数  = min(2, 供应商上限)
磁盘迁移/点收   = 1
```

附加约束：

- 同一个项目同时只能有一个写入型流水线任务。
- 系统可用内存低于 4 GB 时，暂停启动新的生图或 FFmpeg 任务。
- 用户可以降低并发；提高到安全计算值以上时显示费用、温度和稳定性提示。
- 供应商返回限流后自动降低对应并发，不影响其他供应商。

磁盘预警：

- 正常：剩余空间 ≥ 15%。
- 警告：剩余空间 < 15%，或小于 30 GB。
- 严重：剩余空间 < 8%，或小于 15 GB。
- 阻止新生产：剩余空间小于 `max(预计任务空间 × 3, 5 GB)`。
- 预计任务空间根据场景图数量、音频时长、临时字幕帧和编码预设动态计算。
- 单项目超过 50 GB 或 5,000 个资产时提示归档，但不直接阻止用户。
- 清理建议按“可安全重建的临时帧 → 旧日志 → 项目回收站 → 用户确认的历史产物”排序。

## 19. 错误设计

错误分层：

| 层 | 示例代码 | 用户表达 |
|---|---|---|
| 输入 | VALIDATION_ERROR | 指出字段和修正方式 |
| 配置 | PROVIDER_NOT_CONFIGURED | 引导到具体设置分组 |
| 供应商 | PROVIDER_RATE_LIMITED | 显示等待建议，不暴露原始响应 |
| 文件 | ARTIFACT_DECODE_FAILED | 显示文件名和支持格式 |
| 任务 | JOB_CANCELLED | 说明已保留哪些产物 |
| 投稿 | PLATFORM_UI_CHANGED | 建议更新应用或改为手动发布 |
| 系统 | INTERNAL_ERROR | 显示 requestId 和导出诊断入口 |

所有错误都必须回答三个问题：发生了什么、哪些内容已保留、用户下一步做什么。

## 20. 日志与可观测性

- 每次 API 请求生成 requestId。
- 每个 Job 和 Stage 使用稳定 ID。
- 日志采用结构化 JSONL，UI 渲染人类可读文案。
- 日志等级：DEBUG、INFO、WARNING、ERROR。
- 默认保留 14 天或 200 MB，先达到者触发轮转。
- 生产日志记录阶段、耗时、缓存命中和产物指纹，不记录密钥与完整敏感文本。
- 诊断包包含版本、OS、配置状态、脱敏日志、数据库 schema 版本和 ffprobe 信息。

## 21. 前端工程规范

### 21.1 状态职责

- URL：项目 ID、当前工作阶段、可分享的筛选条件。
- TanStack Query：项目、模板、任务、资产和设置等服务端状态。
- Zustand：左栏宽度、折叠状态、日志显示偏好等跨页面 UI 状态。
- 组件本地状态：弹窗开关、当前输入、临时选择。
- 不把服务端资源复制进全局 store。

### 21.2 组件边界

- 页面组件只负责组合和路由。
- Container Hook 负责查询、变更和错误映射。
- 展示组件只接收已校验数据和事件回调。
- 单文件组件接近 200 行时拆分。
- 功能专属组件、测试和 hooks 共置。

### 21.3 示例风格

```tsx
export function JobStageRow({ stage, onRetry }: JobStageRowProps) {
  return (
    <section aria-labelledby={`stage-${stage.id}`}>
      <StageStatusIcon status={stage.status} />
      <h3 id={`stage-${stage.id}`}>{stage.label}</h3>
      <StageProgress value={stage.progress} status={stage.status} />
      {stage.canRetry && (
        <Button onClick={() => onRetry(stage.id)}>重新运行</Button>
      )}
    </section>
  );
}
```

命名：

- React 组件：PascalCase。
- Hooks：`useXxx`。
- API 字段：camelCase。
- CSS 类采用组件语义，不使用视觉偶然值命名。
- 用户文案集中管理，避免组件中散落旧品牌字符串。

## 22. 后端工程规范

- 路由只负责鉴权/会话、解析、校验和响应映射。
- Service 负责用例，不直接依赖 FastAPI Request。
- Repository 负责数据库，不执行网络和 FFmpeg。
- Pipeline Stage 通过显式输入输出运行，禁止读取隐式全局状态。
- 外部 API 响应必须验证。
- 阻塞 IO 放入线程或子进程，不阻塞事件循环。
- 所有子进程参数使用数组，不通过 shell 拼接用户输入。
- 删除、迁移和覆盖操作必须记录审计摘要。

## 23. 测试策略

### 23.1 单元测试

- 路径约束和文件名规范化。
- 提示词解析和角色识别。
- 状态机转移。
- 指纹和缓存失效。
- 音量与时间轴计算。
- 错误映射和脱敏。
- 平台选择器解析。

### 23.2 API 集成测试

- 项目 CRUD、排序、置顶、回收站。
- 内容并发保存和版本冲突。
- Job 创建、SSE、取消和恢复。
- 上传安全和 Range 响应。
- 密钥只写接口。
- 数据迁移回滚。
- 热点卡片校验、重复检测和导入原子性。
- 图文多平台部分成功与单平台重试。
- 维护扫描只读、修复前备份和可撤销修复。

### 23.3 前端组件测试

- 频道树的所有状态。
- 未保存离开确认。
- 生产阶段依赖提示。
- 日志断线重连和去重。
- 资产卡片按 MIME 呈现正确操作。
- 设置继承来源。
- 键盘导航和焦点恢复。

### 23.4 端到端测试

1. 首次启动 → 配置假供应商 → 创建项目。
2. 简报 → 生成脚本 → 修改 → 恢复历史。
3. 上传素材 → 假流水线 → 实时进度 → 查看成片。
4. 阶段失败 → 修复 → 单步重试。
5. 项目删除 → 回收站 → 恢复。
6. 投稿检查 → 本地平台测试页 → 自动填写 → 人工接管。
7. 数据目录迁移 → 重启 → 数据完整。
8. 导入热点卡片 → 映射预览 → 创建项目 → 简报正确。
9. 视频脚本 → 一键转图文 → 三种输出 → 源脚本更新提示。
10. 制造孤儿目录和损坏资产 → 扫描 → 预览 → 修复 → 撤销。

### 23.5 黄金测试

- UI：1280×720 为主基准，另测 768、1024、1440。
- 视频：固定脚本、固定音频、固定图片，比较帧尺寸、字幕框、时间点和音频响度。
- 跨平台：同一 Golden Project 分别在 macOS/Windows 产出结果。
- 参考系统参数必须通过至少三条不同长度成片校准，防止过拟合单个样本。

### 23.6 性能指标

- 本地 API 普通读取 P95 < 150 ms。
- 500 个项目的左栏首次可交互 < 1.5 秒。
- 100 个资产的结果页滚动保持流畅，使用虚拟化或懒加载。
- SSE 消息从服务端产生到 UI 显示 P95 < 500 ms。
- 应用空闲内存目标 < 350 MB，不含独立投稿浏览器。
- 长任务不得阻塞普通项目和设置接口。

## 24. 开发命令

计划统一提供：

```bash
make bootstrap
make dev
make test
make lint
make typecheck
make build
make test-e2e
make test-golden
make package-macos
make package-windows
```

各命令必须在 README 中写明环境要求和输出位置。CI 中不得调用真实付费 AI 服务。

## 25. 实施阶段

### 阶段 A：规格冻结与品牌骨架

- 确认新名称、Logo、主色和帮助站。
- 建立参考截图和黄金样片库。
- 从现有提示词中生成品牌替换清单。
- 冻结 OpenAPI 与状态机。

验收：产品、设计、工程共同签字确认 MVP。

### 阶段 B：本地基础与项目管理

- React/FastAPI 骨架。
- SQLite 迁移。
- 两栏工作台。
- 频道、项目、排序、回收站。

验收：刷新、重启和数据库迁移均保持状态。

### 阶段 C：脚本工作流

- 简报、导入、DeepSeek、搜索。
- Markdown 编辑、预览和版本恢复。
- 内容工具。

验收：完整脚本流程使用假服务和真实 DeepSeek 各跑通一次。

### 阶段 D：任务引擎与媒体流水线

- Job/SSE/取消/恢复。
- TTS、ASR、时间轴、生图和 FFmpeg。
- 资产管理。

验收：一条黄金项目生成完整成片，失败重试和缓存复用有效。

### 阶段 E：投稿

- 独立资料目录。
- 三个平台适配器。
- 本地镜像测试页。
- 真实页面自动填写验证。

验收：填写后停在最终发布按钮之前。

### 阶段 F：跨平台交付

- macOS 签名/公证安装包。
- Windows 安装包。
- Keychain/Credential Manager。
- 数据迁移、备份恢复、跨平台黄金测试。

验收：两套干净系统安装测试和完整主流程通过。

## 26. 产品边界

### 始终执行

- 修改规格后再修改代码。
- 所有外部输入在边界校验。
- 每次提交前运行相关测试、lint 和类型检查。
- 新功能提供空、加载、失败、成功和重试状态。
- 所有生产步骤可取消并保留已经完成的安全产物。
- 新文案检查旧品牌残留。

### 需要先确认

- 修改数据库核心关系。
- 新增付费供应商或依赖。
- 改变最终成片规格。
- 改为自动最终发布。
- 添加云同步、账号或授权体系。
- 改变数据保留和永久删除策略。

### 永远不做

- 提交 API Key、Cookie、账号密码和真实客户素材。
- 通过前端返回完整密钥。
- 读取用户日常浏览器资料。
- 自动处理验证码或自动点击最终发布。
- 用 shell 字符串拼接用户文件名执行 FFmpeg。
- 在未校验目标路径时删除或迁移目录。
- 为通过测试而删除测试或降低安全检查。

## 27. 主要风险

| 风险 | 等级 | 处理 |
|---|---|---|
| 三个平台页面频繁变化 | 高 | 适配器隔离、语义定位、镜像页、失败即停止 |
| AI 服务返回格式不稳定 | 高 | 强类型校验、修复步骤、版本化提示词 |
| Windows/macOS 字幕不一致 | 高 | 字体策略、Pillow 渲染、跨平台黄金帧 |
| FFmpeg 长任务中断 | 高 | 临时输出、原子替换、进程树取消、恢复 |
| 密钥或 Cookie 泄漏 | 高 | 系统凭证库、集中脱敏、禁止打包浏览器资料 |
| 用户误删大批素材 | 高 | 软删除、二次确认、根目录约束、延迟清理 |
| 生图并发导致费用失控 | 高 | 并发上限、任务预估、显式重跑、缓存 |
| 复用提示词遗留旧品牌 | 中 | 品牌扫描测试、集中变量、人工抽检 |
| 本地端口被其他进程占用 | 中 | 安全动态端口、单实例锁、启动握手 |

## 28. 发布验收清单

### 功能

- [ ] 频道与项目全生命周期可用。
- [ ] 脚本生成、编辑、历史和工具可用。
- [ ] 六个媒体阶段可单独执行和组合执行。
- [ ] 日志、进度、取消、重试和恢复可用。
- [ ] 视频、音频、图片和文本资产可预览和管理。
- [ ] 三个平台可自动填写并人工最终发布。

### 视觉与体验

- [ ] 1280×720 主基准与设计稿一致。
- [ ] 768–1440 px 无关键内容遮挡。
- [ ] 状态不只依赖颜色。
- [ ] 所有图标按钮有可访问名称。
- [ ] 键盘可以完成核心流程。
- [ ] 空、加载、错误、禁用状态齐全。

### 成片

- [ ] 1920×1080、30 fps、H.264、AAC。
- [ ] 音视频时长误差在允许范围内。
- [ ] 字幕位置、断行和描边通过黄金测试。
- [ ] 人声和 BGM 音量与参考匹配。
- [ ] 场景切换与时间轴一致。

### 安全

- [ ] 只监听本机回环地址。
- [ ] 密钥保存在系统凭证库。
- [ ] 日志和诊断包完成脱敏。
- [ ] 路径穿越和恶意文件名测试通过。
- [ ] 投稿浏览器资料完全隔离。
- [ ] 最终发布必须由用户完成。

### 交付

- [ ] macOS 安装、签名和公证完成。
- [ ] Windows 安装与卸载完成。
- [ ] 数据备份、迁移和恢复文档齐全。
- [ ] 新品牌替换扫描无旧品牌残留。
- [ ] README、用户手册、API 文档和故障排查齐全。

## 29. 尚待确定

目前仅剩以下非阻塞项：

1. 新品牌帮助网站的正式域名。
2. 是否需要为不同频道预置不同的品牌结尾开关。
3. 新品牌是否需要独立的内容免责声明模板。
4. 正式发布前完成“镜序工坊”的商标、域名和应用商店重名检索。

## 30. 开工门槛

满足以下条件后进入编码阶段：

- [ ] 用户认可本文档的产品边界和主流程。
- [x] 品牌确定为“镜序工坊”，Logo 与品牌色方案已建立。
- [ ] 确认首批需要导入的频道模板。
- [ ] 建立至少三条参考视频的黄金样片目录。
- [x] 平台确定为 macOS 13+ Apple Silicon，以及 Windows 10 22H2/Windows 11 x64。
- [ ] `tasks/plan.md` 和 `tasks/todo.md` 与本文档保持一致。

## 31. 与参考系统的覆盖评估

### 31.1 评分口径

当前仍处于设计阶段，尚无可运行的新应用。因此必须区分：

- **设计覆盖率**：方案是否已经定义参考功能和交互。
- **目标功能相似度**：按方案完成后，用户可感知功能与参考系统的接近程度。
- **像素相似度**：只有前端完成并进行截图比较后才能计算。
- **当前完成度**：目前只有设计、规划与品牌资产，不代表软件已经实现。

### 31.2 当前结论

| 指标 | 估算 | 说明 |
|---|---:|---|
| 核心创作流程设计覆盖 | 98% | 脚本、生产、成片和投放完整覆盖 |
| 全部可见功能设计覆盖 | 93% | 商业授权和云功能按决定排除；少量高级维护行为待细化 |
| 完成后的目标功能相似度 | 90–94% | 新品牌且删除云/授权体系，因此不会达到功能总量 100% |
| 完成后的布局交互相似度 | 92–96% | 两栏、四阶段、卡片、弹窗和状态体系保持一致 |
| 完成后的像素相似度 | 暂不可测 | 品牌色和 Logo 主动不同；需实现后截图回归 |
| 当前软件实现完成度 | 0% | 当前交付为设计文件、任务规划和 Logo，不是可运行程序 |

### 31.3 功能覆盖矩阵

| 参考功能 | 镜序工坊版本 1 | 状态 |
|---|---|---|
| 频道树、项目数量和状态 | 保留 | 已设计 |
| 创建主题和选择模板 | 保留 | 已设计 |
| 搜索、排序、置顶 | 保留 | 已设计 |
| 项目回收站与恢复 | 保留 | 已设计 |
| 打开项目/频道产物目录 | 保留，跨平台实现 | 已设计 |
| 频道提示词与高级配置 | 保留并换牌 | 已设计 |
| 创作简报和资料导入 | 保留 | 已设计 |
| 音频转写为简报 | 保留 | 已设计 |
| DeepSeek 写稿 | 保留 | 已设计 |
| 豆包/Tavily 联网搜索 | 保留 | 已设计 |
| 参考资料查看 | 保留 | 已设计 |
| 选题评分 | 保留 | 已设计 |
| 爆款诊断 | 保留 | 已设计 |
| 标题与封面 A/B | 保留 | 已设计 |
| Markdown 编辑与预览 | 保留 | 已设计 |
| 脚本版本备份与恢复 | 保留 | 已设计 |
| 多比例素材自动入库 | 保留 | 已设计 |
| 项目临时 BGM | 保留 | 已设计 |
| 配音、字幕、分镜、封面、成片 | 保留 | 已设计 |
| 单步运行和一键生成 | 保留 | 已设计 |
| 一键转图文 | 保留 | 已补充三类输出、版本和错误状态 |
| 实时日志和阶段进度 | 保留 | 已设计 |
| 取消、失败重试和缓存复用 | 保留并增强 | 已设计 |
| 视频/音频/图片/文本资产管理 | 保留 | 已设计 |
| 图片提示词查看 | 保留 | 已设计 |
| 批量删除、下载、复制 | 保留 | 已设计 |
| 发布文件夹和重新点收 | 保留 | 已设计 |
| 抖音、小红书、视频号账号隔离 | 保留 | 已设计 |
| 自动填写、人工最终发布 | 保留 | 已设计 |
| 发布链接收纳与复盘 | 保留 | 已设计 |
| 全局密钥和模型设置 | 保留 | 已设计 |
| 数据目录迁移 | 保留 | 已设计 |
| 微信应用账号登录 | 不保留 | 按产品决定排除 |
| 试用期和证书授权 | 不保留 | 按产品决定排除 |
| 云端配置同步 | 不保留 | 按产品决定排除 |
| 在线自动更新 | 不保留 | 版本 1 排除；保留本地版本信息 |
| 原品牌帮助链接与热点站 | 不保留原地址 | 已补充通用 JSON/Markdown 热点卡导入 |
| 孤儿模板、损坏资产维护 | 保留并增强 | 已补充扫描、修复、隔离和撤销机制 |

### 31.4 达到 94% 仍需执行的验证

三个规格缺口已经补齐。剩余工作不再是产品定义，而是实施与校准：

1. 从至少三条参考成片测定字幕、转场和 FFmpeg 编码参数。
2. 实现后在 1280×720 下做逐页面截图差异测试。
3. 使用本地镜像页和真实平台分别验证投稿自动填写。
4. 在 macOS 与 Windows 运行同一黄金项目并比较输出。
