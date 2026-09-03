# 镜序工坊

镜序工坊是一款面向中文短视频创作的本地桌面工作台，覆盖选题、搜索、脚本、配音、字幕、分镜、封面、视频合成和人工投稿准备。

## 桌面系统

- macOS Apple Silicon
- Windows 10/11 x64

项目数据保存在本机。DeepSeek、Tavily、Seedream 和豆包等第三方服务密钥通过系统安全存储管理，不写入项目数据库或 Git 仓库。

## 本地开发

```bash
python3 -m venv .venv
.venv/bin/pip install -r backend/requirements.txt
npm ci
npm run desktop:dev
```

Windows 请使用 `.venv\\Scripts\\pip` 安装 Python 依赖。

## 验证与构建

```bash
npm run release:check
npm run lint
npm test -- --run
PYTHONPATH=backend .venv/bin/pytest -q backend/tests
npm run desktop:pack:mac
```

Windows 安装包必须在 Windows x64 环境执行 `npm run desktop:pack:win`。详细发布流程见 [docs/RELEASE.md](docs/RELEASE.md)。

## 发布状态

当前为早期测试版本。GitHub Releases 自动更新已接入；对外分发前仍需配置 macOS 与 Windows 代码签名证书。
