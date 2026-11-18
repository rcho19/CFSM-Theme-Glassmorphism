# v1.3.1 发布验收

## 授权、范围与回滚

用户于 2026-11-18 明确要求发布 v1.3.1、编写中文发布说明并补全仓库文档。该授权覆盖此前仅本地开发、不推送和不发布的阶段限制，仅向个人仓库 `rcho19/CFSM-Theme-Glassmorphism` 提交发布；不向上游推送，不修改生产站点或后台配置。

范围为已推送的三网入口、配色、间距及工具链修复，加上版本号、README、中文发布说明与安装文档。发布准备基线 `d3feff0`，远端 main 同步，既有 main 构建 44278288279 已成功；开始时远端不存在 v1.3.1 / theme-v1.3.1。完整变更与限制见 `releases/v1.3.1.md`。

流程为本地完整质量门 → 推送 main 并等待预览构建 → 推送 v1.3.1 标签 → 核对正式工作流、Release、ZIP 结构与产物引用。正式产物由 Actions 生成，不提交本地 dist，不覆盖旧标签。已安装站点保持原引用；需要回滚时重新安装 theme-v1.3.0 或用户备份的固定主题。

## 验证证据与剩余风险

- 三网最终方案已在本地 Chrome 合成数据的 32 组组合中检查五档配色、320/375/768/1440px、明暗及色觉友好模式；跳转与布局证据见 `THREE_NET_FIX_2026-11-18.md`。
- 依赖本地缓解、冻结重装、补丁校验和到期策略见 `DEPENDENCY_MITIGATION_2026-11-18.md`。审计包含一个有条件的已知公告例外，不是零漏洞保证。
- v1.3.0 真实数据与权限组合验收保留原记录；本次没有新增真实站点、完整真机矩阵或旧配置恢复演练。

## 本地质量门

最终版本冻结安装、lint、Bun typecheck、独立 Node 的 Vue SFC typecheck、71 文件 / 836 项测试、build、validate:dist、安全模式扫描及 git diff --check 通过。带既有严格例外的依赖审计检查 341 个包，仅排除已经过补丁与行为校验的一条指定公告。产物为 index.html 与 assets/，包含 26 个资源文件，保留既有大分块提示。

## 远端发布核对入口

正式附件只使用标签工作流构建；交付时必须核对对应源码 SHA、所有发布任务、固定产物标签、稳定分支与 ZIP 根结构。预览与正式发布均需使用对应源码提交的成功构建，不能以早前成功记录替代。

- [Build 工作流](https://github.com/rcho19/CFSM-Theme-Glassmorphism/actions/workflows/build.yml)
- [v1.3.1 正式 Release](https://github.com/rcho19/CFSM-Theme-Glassmorphism/releases/tag/v1.3.1)
- [theme-v1.3.1 固定产物](https://github.com/rcho19/CFSM-Theme-Glassmorphism/tree/theme-v1.3.1)
- [theme-dist 稳定分支](https://github.com/rcho19/CFSM-Theme-Glassmorphism/tree/theme-dist)
