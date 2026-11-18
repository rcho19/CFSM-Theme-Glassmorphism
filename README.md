# CFSM Theme Glassmorphism

面向 CF-Server-Monitor 的毛玻璃主题二次开发分支，基于 [allury 的移植版](https://github.com/allury/CFSM-Glassmorphism)，视觉与三网组件参考 [Komari Glassmorphism](https://github.com/sanrokamlan-prog/komari-theme-Glassmorphism)。保留 MIT 许可和原作者署名。

**当前版本：v1.3.1。** 本版修复首页三网入口未直达延迟图表的问题，优化名称、延迟、丢包的配色与间距，并更新构建工具链。[中文发布说明](docs/releases/v1.3.1.md) · [下载正式版](https://github.com/rcho19/CFSM-Theme-Glassmorphism/releases/tag/v1.3.1)

## 功能

- 首页节点卡片与列表、分组、搜索、排序、收藏及多种卡片密度，支持明暗和色觉友好模式。
- 展示真实 CPU、内存、磁盘、网络速率、流量和探测数据；缺少字段明确降级，不生成生产演示数据。
- 新版三网可从 CFSM 八个探测目标中选择最多三条线路，按数据来源与节点配置，提供小曲线、色块和鼠标/触屏/方向键时间桶查看。
- 节点详情支持概览、负载及延迟分区，保留真实历史断点、加载状态和错误提示。
- 多 API 来源保留节点归属与凭据边界；详情和历史返回拥有该节点的来源。
- 主题设置按默认值、后端配置、本机覆盖三层生效；管理员可通过 CFSM 公开主题写接口保存后端配置。

## 安装正式版

1. 打开 CFSM 管理后台 `/admin#/admin`，保留已登录的管理页。升级前备份现用主题地址，以及“设置 → 外观 2 → 主题自定义配置 JSON”，保存到仓库之外的私人位置。
2. 进入“主题商店 → 自定义主题 URL”，填写下面的固定版本地址，点击“应用自定义”。这会更换站点访客看到的主题。

   ```text
   https://github.com/rcho19/CFSM-Theme-Glassmorphism/tree/theme-v1.3.1
   ```

3. 另开标签页刷新首页，检查首页、三网、详情和管理入口。
4. 使用新版三网时，后台开启“显示三网详情”，再进入主题的“主题设置 → 三网”开启“启用新版三网”。首次调整可先“保存到此浏览器”；需要跨浏览器生效时，再由管理员“保存到 CFSM 后端”。

`theme-v1.3.1` 是可安装的固定产物标签；`v1.3.1` 和 `main` 保存源码，不能直接作为安装地址。ZIP 附件见 [Release](https://github.com/rcho19/CFSM-Theme-Glassmorphism/releases/tag/v1.3.1)，压缩包根目录仅有 `index.html` 和 `assets/`。

回滚时重新应用 [v1.3.0 固定地址](https://github.com/rcho19/CFSM-Theme-Glassmorphism/tree/theme-v1.3.0) 或之前保存的主题地址；仅在确实改过后端配置时恢复相应 JSON。本次升级不需要修改 Worker、数据库或 Agent。[完整入口与回滚说明](docs/USAGE.md)

## v1.3.1 的三网变化

- 点击三网名称、延迟或丢包数值，直接进入详情的“延迟”标签；未开启分区标签时滚动至延迟图表。普通卡片点击仍进入概览。
- 名称与“丢包”文字保持中性色；延迟采用“同色微深”：基于各档曲线色，浅色混入 28% 黑色、深色混入 5% 黑色，不降低饱和度。丢包数值保留独立文字色板。
- 增加状态圆点，按内容排列名称和数值，数值与曲线保持 4px 间距，曲线使用剩余宽度。

## 数据口径与支持边界

首页三网展示列表接口的**两小时采样窗口快照**；详情展示所选历史范围，默认十分钟。两处平均丢包率可能不同，不能当作同一份原始探测包统计。页面标记快照时间及过期状态，不使用定时 REST 轮询，也不逐卡请求历史。

仅 HTTP 上报的 Agent 仍可使用，实时更新频率取决于实际上报周期；稀疏样本不保证形成连续曲线。跨来源私有站点与独立跨来源 Turnstile 授权暂不支持，推荐在 CFSM 同源安装。后端主题配置保存没有修订号锁，多管理员同时保存可能最后写入覆盖。

本版已完成本地合成数据的交互、配色和响应式检查；没有把该结果表述为所有真机或所有生产环境均已验证。v1.3.0 的真实数据与权限组合验收单独记录在 [既有验收报告](docs/RELEASE_READINESS_2026-11-13.md)。

## 文档

- [安装、配置、开发、公开发布与回滚](docs/USAGE.md)
- [v1.3.1 发布验收与限制](docs/RELEASE_READINESS_2026-11-18.md)
- [三网入口与配色验证](docs/THREE_NET_FIX_2026-11-18.md)
- [兼容性矩阵](docs/compatibility-matrix.md) · [API 映射](docs/api-mapping.md) · [架构](docs/architecture.md)
- [实施规格与验收条件](docs/IMPLEMENTATION_SPEC.md)
- [开发约束](docs/DEVELOPMENT_CONSTRAINTS.md)
- [隐私、安全边界与外部请求](docs/SECURITY.md)
- [上游同步与必要差异](docs/UPSTREAM_SYNC.md)
- [验证结果](docs/IMPLEMENTATION_RESULTS.md)

## 快速验证

使用 Bun 1.4.4，建议 Node 22.12+；仅使用 Bun 锁文件。日常开发运行 `bun run dev`，提交和发布前执行：

```sh
bun install --frozen-lockfile
bun run lint
bun run typecheck
bun run test
bun run build
bun run validate:dist
bun run verify:security
bun run audit:dependencies
```

Windows 上还需使用符合版本要求的 Node 检查 Vue SFC 模板，不能将 Bun 下的模块错误直接忽略：

```sh
node node_modules/vue-tsc/bin/vue-tsc.js --noEmit -p tsconfig.json
```

构建后运行 `bun run preview:fixture`，访问 `http://127.0.0.1:4178` 可查看本地合成数据；它不连接真实 Worker，不会进入正式包。

**依赖审计说明：** picomatch 使用可复现的本地保守缓解补丁。只有完整性及漏洞/兼容行为检查通过，审计才临时排除一条指定公告；其他漏洞与审计错误仍阻断构建。例外于 **2026-12-02 00:00 UTC（北京时间 08:00）** 到期，必须复核官方修复；到期只阻断后续构建，不影响已安装主题运行。原始 `bun audit` 仍会报告该公告，不能宣称零漏洞。[缓解范围与移除条件](docs/DEPENDENCY_MITIGATION_2026-11-18.md)

## 预览与正式发布

| 触发方式 | Actions 产物 | 安装用途 |
| --- | --- | --- |
| 推送 `main` | 质量门通过后追加到 `dist` | 测试时固定 `dist` 的完整提交 SHA |
| 推送 `vX.Y.Z-rc.N` | 预发布 Release、`theme-vX.Y.Z-rc.N` | 固定候选版，不推进稳定分支 |
| 推送 `vX.Y.Z` | 正式 Release、ZIP、`theme-vX.Y.Z`，更新 `theme-dist` | 固定正式版或稳定滚动分支 |

正式产物由 [Build 工作流](.github/workflows/build.yml) 冻结安装、检查、构建、审计和打包。本地构建用于开发验证，不手动替代正式流水线。标签必须与 `package.json` 版本一致，并准备同名中文 `docs/releases/<tag>.md`；不要覆盖已发布标签。发布不会自动改变你当前 CFSM 站点的主题引用。

源码上传至你自己的仓库后，Actions 检查通过会把产物追加到 `dist` 分支。CFSM 同源安装推荐使用自己仓库 `dist` 的完整提交 SHA；不要使用上游仓库地址来安装本地改动。部署参数可从 GitHub Secrets 注入，但进入前端的 API 地址、标题等都是公开信息，绝不能填写任何凭据。

正式产物仅包含 `index.html` 与 `assets/`，不提交依赖、构建文件夹、真实配置或审查临时日志。安全检查是发布门槛，不构成绝对无漏洞保证。

## 许可与问题反馈

本项目遵循 [MIT 许可](LICENSE)，保留原主题及移植作者版权信息。报告问题时请描述版本、浏览器、复现步骤和预期表现，不要公开真实凭据、Cookie、订阅地址或服务器清单。
