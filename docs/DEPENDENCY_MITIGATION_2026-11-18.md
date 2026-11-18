# 构建审计与 Node 24 Action 修正

## 问题及处理

构建 44269475752 的 checkout、lint、类型检查、测试及 build 成功，实际失败步骤为依赖审计。Node 20 弃用提示是独立警告。

- 四处 checkout 更新为官方 v7.0.1 的完整提交 `3d3c42e5aac5ba805825da76410c181273ba90b1`，该提交 `action.yml` 明确声明 `using: node24`。保持原权限与发布触发条件。
- 2026-11-18 npm 最新 picomatch 仍为 4.0.7，[GHSA-fc5q-39xc-vjpf](https://github.com/advisories/GHSA-fc5q-39xc-vjpf) 尚未列出官方修复版本；不能通过普通升级消除此公告。
- 使用 Bun 官方 `patchedDependencies` 安装可审阅补丁。保留普通字面量重复和上游已有的安全字符集合展开；其余单分支复杂重复 extglob 由上游原有机制转为字面量，避免生成嵌套或歧义重复正则。这是本地保守缓解，不是官方发布的完整修复。

## 审计例外边界

执行 `bun run audit:dependencies`：先检查确切包版本、已安装 parser 的 SHA-256，再分别在 Node 与 Bun 子进程运行漏洞样例和常用 glob 兼容检查。子进程有五秒硬超时。只有这些条件均通过，才允许 `bun audit` 精确排除上述一条 GHSA。审计仍覆盖全部依赖，其他公告、网络失败或任何补丁校验错误均导致非零退出；没有使用 continue-on-error、降低严重度或只审计生产依赖。

例外到 **2026-12-02 00:00 UTC（北京时间 08:00）** 自动失效。届时必须核查官方修复；不得为了让 CI 通过而直接顺延日期。原始 `bun audit` 仍会报告该版本公告，不能把有例外的结果描述成“零漏洞”。

补丁对默认安全选项生效，不保护主动关闭 `maxExtglobRecursion` 防护的调用。复杂单分支重复 glob 的匹配语义会变为字面量，这是保守缓解的兼容代价。项目构建和测试必须通过；不把此结果推广为整个 picomatch 的全面安全保证。

## 移除与回滚

官方修复发布后，优先升级到官方安全版本；移除 patchedDependencies、补丁文件、两个缓解审计脚本与对应测试，恢复直接 `bun audit`，重新冻结安装并通过全部质量门。不要保留无实际必要的公告例外。

回滚这次修正时必须同时恢复 package.json、bun.lock、补丁、脚本和 workflow；仅删除补丁将使安装或审计失败。未经缓解的旧依赖仍应阻断发布。

## 验证

- 当前目录冻结安装通过；另在全新临时目录复制 package.json、bun.lock 和 patches，以 `--frozen-lockfile --ignore-scripts --backend copyfile` 安装，确认补丁可重现，已安装 parser 哈希及漏洞/兼容行为检查均通过。
- lint、Bun typecheck、独立 Node 的 Vue SFC typecheck、71 文件 / 836 项测试、生产构建、dist 校验与源码/产物安全模式扫描通过。产物资源哈希与本次修改前相同，没有改变主题界面或运行时代码。
- `bun run audit:dependencies` 检查 341 个包，在上述缓解条件下精确排除 1 条公告后通过；不等于原始审计零告警。
- 到期、版本变化和补丁缺失均有失败路径测试。保留既有构建大分块提示。

远端 CI 需要用户推送后才能确认，本次不自动提交、推送或发布。没有为此次工具链改动重跑浏览器矩阵或生产站点验收。
