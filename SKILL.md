---
name: fsmore
description: 使用 fsmore（飞书本地 AI 工作台）查找、读取、编辑并回写飞书文档。当用户提到 fsmore、已同步到本地的飞书文档或知识库、127.0.0.1:7788 的 fsmore MCP 服务，或要求搜索/修改/回写飞书文档时使用本技能——即使没明说 fsmore，只要操作对象是 fsmore 工作区里的飞书文档（.maomi/feishu-docs 下的 .md）也应触发。
---

# fsmore · 飞书本地 AI 工作台

fsmore 把飞书知识库 / 云空间文档同步为本机 Markdown 文件，并通过 MCP 服务（`http://127.0.0.1:7788/mcp`，Streamable HTTP）暴露给 AI。你有两种等价的工作方式：

1. **MCP 工具**（推荐）：`search_docs` / `read_doc` / `sync_doc` / `push_doc` 等，完整清单见 [references/mcp-tools.md](references/mcp-tools.md)。
2. **直接读写本地文件**：所有文档都是工作区下的 .md 文件，用普通文件工具读写即可；但**回写飞书必须走 MCP 的 `push_doc`**，直接改文件不会同步到远端。

MCP 连不上说明服务没启动：提醒用户运行 `fsmore`（未安装则先 `npm install -g @whuanle/fsmore`，或直接 `npx @whuanle/fsmore`），Web 控制台在 `http://127.0.0.1:7788`。首次安装授权见 [references/setup.md](references/setup.md)。

## 1. 在哪里找到文件

- **工作区根目录**：`list_spaces` 返回的 `workspace_path`（本机绝对路径）。默认 `~/.fsmore/workspace/`，可用环境变量 `FSMORE_WORKSPACE_DIR` / `FSMORE_DATA_DIR` 覆盖。
- **文档正文**：`.maomi/feishu-docs/{token}.md`，一律按飞书节点 token 命名，标题变化不移动文件。**不要按文档标题猜路径**——用 `list_docs` / `search_docs` 拿准确的 `path`。
- **图片等资源**：`_assets/{docId}/`，markdown 与网页里引用的是工作区相对路径。
- **回写基线**（内部缓存，不要读改）：`.maomi/feishu-docs/{token}/`（IR 与原始 blocks JSON）、`.maomi/feishu-docs/baselines/{token}.base.md`。删改它们会导致回写策略失效。

每个 .md 头部有 front matter：`title` / `source` / `source_url` / `feishu_token` / `feishu_doc_id` / `revision_id` / `synced_at`。这些字段由同步维护，**编辑时不要改动**；需要原文链接或版本号时直接读它们，或调 `get_doc_meta`。

## 2. 读取哪些文件、怎么读

定位文档：

- 按内容关键词找 → `search_docs`（全文搜索，返回得分排序与摘要片段）
- 按标题 / 路径找 → `list_docs`（可用 `space` 过滤某个文档源）
- 看有哪些文档源 → `list_spaces`
- 元信息（原文链接、版本、资源清单、同步错误）→ `get_doc_meta`

读取：

- `read_doc`（`path` 或 `token` 二选一定位）。长文档用 `offset` / `length` 分段读取；返回 `truncated: true` 时按尾部注释给出的 offset 继续读。**不要默认把整篇长文一次性读入上下文**，先定位目标章节再读附近区域。
- 直接读本地 .md 文件完全等价（front matter 之后就是正文）。

需要最新版本：先 `sync_doc` 再读。注意本地保护——本地文件相对基线有未推送的修改时，`sync_doc` 会拒绝用云端覆盖；此时要么先 `push_doc` 保存改动，要么与用户确认放弃本地修改后传 `force: true`。

## 3. 怎么编辑文件

本地 .md 是**工作副本**，飞书远端是**权威源**：所有修改写本地文件，改完用 `push_doc` 回写；不要绕过它直接调飞书 API。

编辑规则（违反会导致回写失败或损坏文档结构）：

- 正文必须是严格 Markdown：`# 标题`、`## 标题`、`- 条目`、`1. 条目`、`> 引用`——标记符号后必须保留一个空格；标题层级保持连续。
- **局部修改优先**：能改一节就不要整篇重写，用精确片段替换或补丁方式编辑；只有文档为空、极短，或用户明确要求整篇重构时才整文件重写。
- 编辑因片段不匹配或命中不唯一而失败时：重新读取目标区域，换补丁方式修改，**不要原样重试同一个编辑**。
- **飞书原生块保持原样**：`<image ...>`、`<callout ...>`、`<table ...>`、`<board ...>`、`<bitable ...>`、`<divider />`、`<status>` 等标签是飞书原生块的保真表示，回写靠它们无损还原。不要改写成普通 Markdown，不要臆造或修改其中的 token、块 id、属性；要改复杂块附近的内容，只改它前后的普通文本块，保留复杂块本体，不要跨块做大范围替换。
- 图片 / 附件：正文中的 `<image>` / 附件占位对应 `_assets/` 下的本地文件，回写时按占位处理、不会丢本地文件；需要查看图片时用 `list_assets` / `fetch_asset`。**新增 Markdown 语法图片（`![](x.png)`）会被回写阻断**——要插图先和用户确认方案。
- 不要动 front matter、`.maomi/feishu-docs/{token}/` 缓存目录和 `_assets/`（除非用户明确要求整理资源）。
- 改稿类任务（优化 / 扩写 / 补细节 / 补图表）：读到目标章节后尽快直接动手修改，不要先输出大段计划或提纲。

## 4. 回写飞书（push_doc）

标准流程：`read_doc`（或直接读文件）→ 编辑本地 .md → `push_doc`（传 `path` 或 `token`）。

- 回写按四级策略无损还原：白板 mermaid 增量 → 无损原生块重推 → docs_ai 整文覆写（保留 callout / 表格 / 图片等原生标签）→ 纯 Markdown 重建。
- **乐观锁**：上次同步后远端被别人改过时 `push_doc` 会拒绝并提示冲突。与用户确认后再传 `force: true` 覆盖，不要自作主张强制覆盖。
- 超出策略范围的内容（如 Markdown 图片）会被阻断，本地草稿保持不变——如实告诉用户阻断原因。

## 5. 把文档任务移交给其它 AI 时的提示词模板

把某篇文档的任务交给没有本技能的 AI（新会话 / 子代理）时，按此模板生成提示词。路径字段填实际值，并要求对方按字面量使用：

```text
（此处写具体任务，例如：把「登录设计」第 2 节扩写，补充异常分支）

---
注意：
- 本次任务处理 fsmore 同步的飞书文档。下面路径字段的值就是实际文件路径，读取 / 写入时直接使用该字面量，不要当作占位符。
- 飞书远端是权威源，本地 .md 只是工作副本：只修改 body_path 指向的文件，不要改 front matter、.maomi 缓存目录和 _assets。
- 正文必须是严格 Markdown：`# 标题`、`- 条目`、`1. 条目`、`> 引用` 标记后保留一个空格，标题层级连续。
- 草稿较长时优先分段读取目标章节附近，不要整篇读入上下文；局部修改优先精确片段替换，不要整篇重写。
- `<image>`、`<callout>`、`<table>`、`<board>`、`<bitable>` 等原生标签保持原样，不伪装成普通 Markdown，不臆造其中的 token / 块 id。
- 改完保存即可，回写飞书由发起方执行（若你也有 fsmore MCP，可在确认后调用 push_doc）。

<fsmore_doc_context>
title: {文档标题}
body_path: {工作区相对路径，如 .maomi/feishu-docs/P615wvXmkiTDOGkvhyLc7sDDnrh.md}
token: {feishu_token}
workspace_root: {工作区绝对路径}
</fsmore_doc_context>
```

## 参考

- [references/mcp-tools.md](references/mcp-tools.md)：11 个 MCP 工具的完整参数、返回结构与接入配置
- [references/setup.md](references/setup.md)：安装、扫码授权、环境变量、常见问题
