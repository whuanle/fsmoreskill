# fsmore MCP 工具参考

端点：`http://127.0.0.1:7788/mcp`（Streamable HTTP，无状态模式，POST）。端口随 `FSMORE_PORT` 变化。

部分客户端里工具名带前缀，如 `mcp__fsmore__read_doc`。

## 接入配置

**通用 JSON**

```json
{
  "mcpServers": {
    "fsmore": { "url": "http://127.0.0.1:7788/mcp" }
  }
}
```

**Claude Code**

```bash
claude mcp add --transport http fsmore http://127.0.0.1:7788/mcp
```

**Codex CLI**（`~/.codex/config.toml`）

```toml
[mcp_servers.fsmore]
url = "http://127.0.0.1:7788/mcp"
```

## 推荐工作流

找文档（`search_docs` / `list_docs`）→ 读（`read_doc`，长文分段）→ 内容可能过期时 `sync_doc` 后重读 → 编辑本地 .md → `push_doc` 回写。

## 工具清单

### list_spaces — 列出文档源

列出已添加的飞书文档源（知识库节点 / 云空间文件夹 / 单篇文档）与工作区根路径。

- 入参：无
- 返回：`workspace_path`（本机绝对路径）、`spaces[]`（`space_id` / `kind` / `title` / `token` / `docs_synced`）

### list_docs — 列出已同步文档

- `space`：可选，`list_spaces` 返回的 `space_id`
- `query`：可选，按标题或路径模糊匹配
- `limit`：可选，默认 100，上限 500
- 返回：`docs[]`（`title` / `path`（工作区相对路径，喂给 `read_doc` / `push_doc`）/ `token` / `doc_id` / `synced_at` / `revision_id` / `source_url`）

### search_docs — 全文搜索

在本地已同步文档的 markdown 全文中做关键词搜索（支持中文）。

- `query`：必填
- `limit`：可选，默认 20，上限 50
- 返回：按得分排序的 `hits[]`，含摘要片段

### read_doc — 读取文档

- `path`：工作区相对路径（`list_docs` / `search_docs` 返回的）
- `token`：飞书节点 token（与 `path` 二选一）
- `offset`：起始字符偏移，默认 0
- `length`：最多返回字符数，默认 40000，上限 200000
- 返回：`title` / `path` / `synced_at` / `revision_id` / `truncated` / `content`（含 front matter）
- 截断时 `content` 尾部有 `<!-- fsmore: ... offset=... -->` 注释，按它继续读

### get_doc_meta — 文档元信息

- `path` 或 `token`（二选一）
- 返回：`title` / `token` / `doc_id` / `obj_type` / `path` / `synced_at` / `revision_id` / `source_url` / `assets[]` / `sync_error`

### sync_doc — 同步单篇文档

从飞书拉取最新内容到本地（含资源），内容未变时秒回跳过。

- `token` 或 `path`（二选一）
- `force`：可选，忽略版本比对强制重拉，默认 false
- 注意：本地有未推送修改时会**拒绝覆盖**（保护草稿）；先 `push_doc` 或确认放弃后带 `force`

### sync_space — 同步整个文档源

- `space_id`：可选，不传则同步全部文档源
- `force`：可选，默认 false（只拉有更新的）
- 返回 `job_id`，**后台异步执行**，用 `get_job` 查进度

### push_doc — 回写飞书

把本地 markdown 推回飞书，覆盖文档正文。

- `path`：通常是刚编辑过的文档路径
- `token`：或传飞书节点 token（与 `path` 二选一）
- `force`：可选，强制覆盖远端（忽略版本冲突检查），默认 false
- 冲突：远端有新改动时拒绝，`force: true` 才覆盖
- 阻断：含 Markdown 图片（`![]()`）或超出回写策略范围时阻断，本地草稿保持不变

### get_job — 查询任务进度

- `job_id`：`sync_space` 返回的任务 id
- 返回：`done` / `changed` / `skipped` / `failed` 计数与错误列表

### list_assets — 列出文档资源

列出一篇文档的本地资源（图片 / 白板导出 / 附件）。

- `path` 或 `token`（二选一）
- 返回：`assets[]`（`path` 工作区相对路径 + `absolute_path` 绝对路径）

### fetch_asset — 下载飞书资源

按飞书资源 token 随时下载资源到本地工作区。

- `token`：必填，飞书资源 token（文档 markdown 中的图片 / 附件占位会给出）
- `kind`：可选，`file` / `image` / `whiteboard`，默认 `file`（whiteboard 会导出为图片）
- 返回：`relative_path` 与 `absolute_path`

## 不用 MCP 的等价操作

- 搜索：`grep` / Grep 工具搜工作区 `.md`
- 读取：直接 Read `.maomi/feishu-docs/{token}.md`
- 列表：读 `data/index.json`（数据目录下）可拿到全部节点与路径映射
- 回写：**没有等价操作**，必须走 `push_doc`（或 Web 控制台）
