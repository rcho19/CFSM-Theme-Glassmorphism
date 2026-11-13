# CFSM Theme Glassmorphism

面向 CF-Server-Monitor 的毛玻璃主题二次开发分支，基于 [allury 的移植版](https://github.com/allury/CFSM-Glassmorphism)，视觉与三网组件参考 [Komari Glassmorphism](https://github.com/sanrokamlan-prog/komari-theme-Glassmorphism)。保留 MIT 许可和原作者署名。

当前为 **1.3.0 正式版**。首页与详情丢包已按各自接口采样独立复算；四种权限组合、验证续期及主题切换已有用户手工验收记录。[发布说明与固定安装地址](docs/releases/v1.3.0.md)，[验收范围与已知限制](docs/RELEASE_READINESS_2026-11-13.md)。

本轮新增三网多线路、小曲线/色块、时间桶交互和按来源/节点配置；修复跨来源凭据发送及名称混用。遵守 CFSM 额度规范，不通过定时 REST 推进历史，详情默认十分钟。跨来源私有授权暂不支持，请使用同源安装。

## 文档

- [安装、配置、开发、公开发布与回滚](docs/USAGE.md)
- [实施规格与验收条件](docs/IMPLEMENTATION_SPEC.md)
- [开发约束](docs/DEVELOPMENT_CONSTRAINTS.md)
- [隐私、安全边界与外部请求](docs/SECURITY.md)
- [上游同步与必要差异](docs/UPSTREAM_SYNC.md)
- [验证结果](docs/IMPLEMENTATION_RESULTS.md)

## 快速验证

使用 Node 20.19+ 或 22.12+、Bun 1.4.4：

```sh
bun install --frozen-lockfile
bun run lint
bun run typecheck
bun run test
bun run build
bun run validate:dist
bun audit
```

源码上传至你自己的仓库后，Actions 检查通过会把产物追加到 `dist` 分支。CFSM 同源安装推荐使用自己仓库 `dist` 的完整提交 SHA；不要使用上游仓库地址来安装本地改动。部署参数可从 GitHub Secrets 注入，但进入前端的 API 地址、标题等都是公开信息，绝不能填写任何凭据。

正式产物仅包含 `index.html` 与 `assets/`，不提交依赖、构建文件夹、真实配置或审查临时日志。安全检查是发布门槛，不构成绝对无漏洞保证。
