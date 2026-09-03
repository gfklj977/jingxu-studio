# 镜序工坊桌面版发布说明

## 支持范围

- macOS：Apple Silicon（arm64），不提供 Intel 版本。
- Windows：Windows 10/11，x64。
- 应用数据保存在系统用户数据目录，升级安装不会删除项目数据库和密钥。

## 本地发布前检查

```bash
npm ci
npm run release:check
npm run lint
npm test -- --run
PYTHONPATH=backend .venv/bin/pytest -q backend/tests
npm audit --omit=dev --audit-level=high
```

macOS 构建使用 `npm run desktop:pack:mac`。Windows 必须在 Windows x64 环境中使用 `npm run desktop:pack:win`，因为 PyInstaller 不能跨系统生成后端可执行文件。

## CI 构建

推送到 `main` 或创建合并请求时只运行质量门禁。手动运行 `Desktop builds`，或推送与 `package.json` 版本一致的 `vX.Y.Z` 标签时，同时生成 macOS 和 Windows 安装包。构建结果在 Actions 的 Artifacts 中保留 14 天。

## 签名密钥

密钥只保存在仓库的 Actions Secrets，不写入代码：

- macOS：`MAC_CSC_LINK`、`MAC_CSC_KEY_PASSWORD`。
- Windows：`WIN_CSC_LINK`、`WIN_CSC_KEY_PASSWORD`。
- macOS 公证：`APPLE_ID`、`APPLE_APP_SPECIFIC_PASSWORD`、`APPLE_TEAM_ID`。

未配置证书时仍可生成内部测试包，但操作系统会显示“未知开发者”或 SmartScreen 提示。对外发布前必须在目标系统验证签名状态、安装、首次启动、生成成片和卸载流程。

## 发布与回滚

1. 更新 `package.json` 的语义化版本号。
2. 完成 macOS Apple Silicon 与 Windows 10 实机冒烟测试。
3. 创建 `vX.Y.Z` 标签并保存生成的安装包和校验值。
4. 首批仅向内部用户发布；确认项目打开、生产流水线和人工投稿正常后再扩大范围。
5. 若出现数据损坏、启动失败或生产任务大面积失败，立即撤下当前安装包，恢复上一版本下载入口；用户数据目录保持不动。

自动更新需要稳定的 HTTPS 下载地址或远程发布仓库。配置发布目标之前不要在客户端写死更新地址。

构建完成后运行 `npm run release:checksums`，生成 `release/SHA256SUMS.txt`。对外提供的安装包必须与该文件中的 SHA-256 一致。
