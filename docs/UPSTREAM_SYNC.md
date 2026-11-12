# 上游参考与同步边界

- 基础移植：allury/CFSM-Glassmorphism，d593caf，MIT。
- 原主题：sanrokamlan-prog/komari-theme-Glassmorphism，14f26ac，MIT。
- CFSM 规范：用户指定的 [theme-ai-prompt.md](https://github.com/rcho19/CF-Server-Monitor/blob/main/theme-ai-prompt.md)，2026-11-11 阅读；与 theme-develop.md 配套使用。

本轮复制原主题 Sparkline.vue、sparklinePath.ts、pingChartAxisScale.ts，保留头部来源注释。Sparkline 相关设计源于 towersip MIT 分支 a41270e；原主题 LICENSE 的版权信息保留在仓库 LICENSE 中。原作者及移植作者署名不得删除。

新版组件按 CFSM 两小时采样窗口适配，未复制 Komari RPC、任务管理和地理查询。同步目标包括 69878cb 曲线比例/防过冲、d68e4e1 失效绑定可移除、14f26ac 窗口丢包不被最近恢复值抹去。小曲线直接复用原组件；任务选择改为 CFSM 八目标字段；完整图表入口复用节点详情。

用户补充规范后，先前的五分钟 REST 刷新提议已经作废。C-01 历史停留在初始窗口属于该接口预算下的快照边界，现通过时间与过期标记说明，不通过轮询隐藏这一限制。旧版断线轮询也已关闭。

视觉必要差异：显示两小时快照、按 origin/节点 ID 绑定、后台关闭时隐藏、没有采集任务管理。列表保留紧凑的多线路文字摘要，卡片提供完整小曲线与色块。未声明与原主题所有新功能或所有像素完全一致。
