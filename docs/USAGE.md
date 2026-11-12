# 使用和公开发布说明

当前为本地开发候选版 1.3.0-dev.1，不是原移植版 v1.2.0 的官方更新。保留原作者 MIT 许可和署名。只有完成真实站点验收后才适合标记稳定版。

## 同源安装

1. 将源码上传到你自己的 GitHub 仓库，默认分支使用 main。
2. 在 Actions 中允许工作流写入仓库内容。Build 会先检查、测试、构建和审计，通过后追加提交到 dist 分支。
3. 在 CFSM 管理端的自定义主题 URL 填写 `https://github.com/<你的用户名>/<你的主题仓库>/tree/<dist的完整40位提交SHA>`。
4. 安装后验证首页、节点详情、三网、后台入口和主题配置保存；保留原主题引用以便回滚。

dist 是构建产物分支，不是本地 dist 文件夹。生产安装优先固定完整提交 SHA，不依赖滚动分支缓存刷新。不要把原作者的仓库地址当成你当前修改的安装地址。

## 新版三网

在 CFSM 后台开启三网详情，然后在主题设置中开启“启用新版三网”。默认 ct/cu/cm，最多三条；全局设置按数据来源保存，单节点覆盖包含来源和节点 ID。选择器可移除失效绑定或恢复默认。未配置、无采样、超时和 0 是不同状态。

小曲线和色块都展示列表首次返回的两小时采样窗口快照，显示获取时间；不是持续滚动的一小时完整探测统计。旧快照会标记，页面恢复可见时按官方规则补取列表。不会每五分钟轮询，也不会逐台请求历史。线路名称或数值按钮可进入详情；图上可用鼠标、触屏或左右方向键查看时间桶。

详情默认 10 分钟，负载与延迟共用历史范围；用户切换范围才查询对应的 `/api/history/all`。WS 断开后指数退避最多十次；不进行定时 REST 回退。后台关闭三网详情或没有窗口时不绘制历史小图。

本地保存只影响该浏览器。保存到后端需要在同源 CFSM 官方管理端登录，将向 `/api/theme_options` 提交完整快照；多人同时编辑仍有最后写入覆盖风险。“导出二级密码”只是前端确认文本，不是安全边界，不应填写真实密码。

## 独立 Pages 部署

在仓库 Settings → Pages 选择 dist 分支、根目录。按需在 Actions Secrets 配置下列公开运行参数，全部可留空用于同源安装：

| 名称 | 内容 |
|---|---|
| API_BASE | HTTP(S) 纯 origin，多个来源逗号分隔 |
| TITLE | 站点默认标题 |
| BACKGROUND_IMAGE | 默认背景 URL；主题后台明确配置优先 |
| CSP_API | 额外允许的 API origin，逗号分隔 |
| CSP_STATIC | 图片和媒体允许来源，逗号分隔；外部背景来源也需列入 |

这些值会进入浏览器可读的 HTML，使用 Secrets 只是避免写死到源码，不能隐藏站点地址。严禁填入 API_SECRET、JWT、Cookie、密码或含凭据 URL。Worker 的 `CORS_ALLOWED_ORIGINS` 需允许 Pages 的纯 origin。

本版多源默认匿名：不把同源 JWT 发给其他来源，不在 WS URL 放主站凭据。跨源私有站点和独立跨源 Turnstile 授权尚未提供，不应宣称受支持；有此需求请同源安装，或另行实现逐 origin 的显式授权流程。不能为“让它能连上”而恢复全站共享 JWT。

## 开发与验证

需要 Node 20.19+ 或 22.12+，Bun 1.4.4。源码采用 Vue 3、TypeScript、Vite、ECharts 和 reka-ui。

```sh
bun install --frozen-lockfile
bun run dev
bun run lint
bun run typecheck
bun run test
bun run build
bun run validate:dist
bun audit
```

开发服务器没有内置生产探针，也不会自动使用你电脑上的凭据。Windows 若 Bun 下 SFC 检查异常，使用符合版本要求的 Node 执行 `node node_modules/vue-tsc/bin/vue-tsc.js --noEmit -p tsconfig.json`，不能跳过模板错误。

本地构建包根目录必须只有 index.html 与 assets/。正式构建使用 Actions；不要提交 node_modules、dist、.env、outputs 或本机审查日志。

离线界面验收可以在构建后执行 `bun run preview:fixture`，打开 `http://127.0.0.1:4178`。该服务仅监听回环地址，使用明确命名的合成节点并拒绝配置写入；不连接真实 Worker，不会进入生产包。使用完后在终端按 Ctrl+C 结束。

## 发布前检查和回滚

- 真实验证公开/私有 × Turnstile 开/关四种同源组合，检查首页、WS、详情和保存；本地模拟不能代替真实 Cloudflare 验收。
- 验证 320/375/768/1440 宽度、明暗、所有卡片密度、键盘和触屏交互。
- 检查浏览器网络请求无未知来源；源码、依赖和构建产物扫描均通过。
- 备份旧主题引用及 theme_options；使用独立候选提交，不覆盖已有稳定标签。
- 出问题时切回旧主题引用，并按需恢复旧配置；旧版会忽略新增三网键。

## 安全报告

请使用你自己仓库的私密漏洞报告渠道。不要在公开 Issue 粘贴真实 Token、Cookie、API_SECRET、服务器 IP 清单或订阅链接。已知限制见 SECURITY.md，实施边界见 IMPLEMENTATION_SPEC.md。
