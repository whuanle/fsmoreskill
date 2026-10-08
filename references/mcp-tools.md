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

找文档（`search_online` 云端搜索并自动拉取，或 `search_docs` / `list_docs` 搜本地；浏览结构用 `get_tree`）→ 读（`read_doc`，长文分段）→ 内容可能过期时 `sync_doc` 后重读 → 编辑本地 .md → `push_doc` 回写。产出新文档用 `create_doc`；接入整个知识库/文件夹用 `add_root` + `sync_space`。

## 工具清单

### create_doc — 新建飞书文档

新建一篇空 docx 文档并同步到本地（返回 md 路径），编辑本地文件后 `push_doc` 回写。

- `title`：必填，文档标题
- `parent_token`：可选父位置 token——云空间文件夹（`get_tree` 的 folder 节点）或 wiki 节点/知识库根；不传建在「我的空间」（挂在「新建文档」虚拟文档源下）
- 在知识库节点下创建需要 `wiki:wiki` 写权限；缺失时报错并指引重新扫码授权
- 返回：`token` / `md_path` / `url`（飞书链接）/ `rootId`

### add_root — 添加文档源

把一个知识库节点 / 云空间文件夹 / 单篇文档添加为工作台文档源，并列出目录树（写入索引）。之后 `sync_space` 批量同步。

- `link_or_token`：必填，飞书链接或裸 token
- `list`：可选，是否立即列目录树，默认 true
- 返回：`root_id`（= `list_spaces` 的 space_id）/ `kind` / `title` / `nodes_listed`

### get_tree — 获取目录树

飞书文档层级目录树，可从任意位置展开。未列出的节点默认自动向飞书拉取一层并写入索引（`list_remote: false` 只用本地缓存）。

- 不传参数：返回全部文档源（根节点 + 各自子树）
- `space_id`：限定某个文档源（`list_spaces` 返回的）
- `token`：从该节点位置展开子树（节点 token 或 `feishu_doc_id`）
- `depth`：展开层数，默认 3，上限 10；大空间建议小深度分页取
- 返回：`nodes[]` 嵌套树，每个节点含 `token` / `title` / `kind`（space/wiki/folder/doc/other）/ `has_child` / `synced` / `md_path` / `children_listed`；`truncated: true` 表示超 500 节点被截断，换 `token` 分段取
- 注意：`has_child: true` 且无 `children` 字段 = 子级未列出（可再调一次让它拉取）；`children: []` = 已列出且确实为空

### resolve_docs — 批量解析文档本地位置

一批 token / doc_id / 标题一次性换成本地路径。只查本地索引，不发网络请求。

- `tokens`：最多 50 个（节点 token 或 `feishu_doc_id`，精确反查）
- `titles`：最多 20 个标题（精确匹配优先，其次包含，最多 5 个候选）
- 返回：`results[]`（`found` + `match`（token 查询）或 `matches[]`（标题查询），含 `md_path` / `synced` / `doc_id` / `source_url`）
- 未在索引的 token 会提示走 `search_online`；在索引但未同步的提示先 `sync_doc`

### search_online — 在线搜索飞书文档（含未同步）

在飞书云端搜索文档：范围是授权用户可见的**全部**云文档与知识库，不限于已添加的文档源。命中后默认自动拉取到本地（`auto_pull`），返回本地路径后即可 `read_doc`。

- `query`：必填，关键词（云端全文匹配，最长 30 字符）
- `limit`：可选，返回条数，默认 10（上限 20）
- `page_token`：可选，上一页 `has_more: true` 时返回的翻页标记
- `sort`：可选，`relevance`（默认）/ `edited` 最近编辑 / `created` 创建时间 / `opened` 最近打开
- `auto_pull`：可选，默认 true——把未同步的可同步结果拉取到本地
- `pull_limit`：可选，自动拉取的最大篇数，默认 5（按命中顺序跳过已同步）
- 返回：`hits[]`（`title` / `summary` / `token` / `entity_type`（DOC/WIKI）/ `doc_types` / `url` / `owner_name` / `update_time` / `syncable` / `synced` / `md_path`）、`pulled[]`（实际拉取结果）、`has_more` / `page_token`
- 仅 docx 文档与 wiki 节点可同步（sheet / bitable / slides 等标记 `syncable: false`）
- 报权限错误时：需在开放平台开通 `search:docs:read` 并让用户重新扫码授权

### list_spaces — 列出文档源

列出已添加的飞书文档源（知识库节点 / 云空间文件夹 / 单篇文档）与工作区根路径。

- 入参：无
- 返回：`workspace_path`（本机绝对路径）、`spaces[]`（`space_id` / `kind` / `title` / `token` / `docs_synced`）

### list_docs — 列出已同步文档

- `space`：可选，`list_spaces` 返回的 `space_id`
- `query`：可选，按标题或路径模糊匹配
- `limit`：可选，默认 100，上限 500
- 返回：`docs[]`（`title` / `path`（工作区相对路径，喂给 `read_doc` / `push_doc`）/ `token` / `doc_id` / `synced_at` / `revision_id` / `source_url`）

### search_docs — 全文搜索（仅本地）

在本地已同步文档的 markdown 全文中做关键词搜索（支持中文）。只覆盖已同步的文档；找不知道 token 的未同步文档用 `search_online`。

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
