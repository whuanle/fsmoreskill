# fsmore 安装与配置

首次使用或排障时读本文件。日常文档读写用不到这里的内容。

## 安装与启动

需要 Node.js ≥ 20。

```bash
npm install -g @whuanle/fsmore   # 安装
fsmore                            # 启动
npx @whuanle/fsmore               # 免安装试用
```

启动后打开 `http://127.0.0.1:7788` 即 Web 控制台，`Ctrl+C` 停止。

## 首次授权

1. 到[飞书开放平台](https://open.feishu.cn/app)创建**企业自建应用**，在「权限管理」开通以下权限并**发布版本**：

   | 权限 | 用途 |
   | --- | --- |
   | `docx:document` | 读取与编辑文档 |
   | `docx:document.block:convert` | Markdown 与文档块互转 |
   | `wiki:wiki:readonly` | 读取知识库 |
   | `wiki:wiki` | 在知识库节点下新建文档（`create_doc` 用） |
   | `drive:drive:readonly` | 读取云空间与图片附件 |
   | `search:docs:read` | 在线搜索云文档（`search_online` 用） |
   | `board:whiteboard:node:read` | 读取画板 |
   | `board:whiteboard:node:create` | 画板回写 |

2. Web 控制台 → **设置**，填入 App ID / App Secret 保存。
3. 复制设置页显示的回调地址（`http://127.0.0.1:7788/api/oauth/callback`），粘贴到开放平台应用的「安全设置 → 重定向 URL」——漏了这步授权页会报「redirect_uri 不合法」。
4. 设置页点**「打开飞书扫码授权」**，用飞书扫码确认。授权长期自动续期，过期会提示重新扫码。

之后到**文档树**页粘贴知识库 / 云空间文件夹 / 单篇文档的链接，点「⬇ 拉取」/「⟳ 同步全部」，文档即同步为本地 Markdown。

## 环境变量

| 环境变量 | 说明 |
| --- | --- |
| `FSMORE_PORT` | 服务端口（默认 7788，改后需同步更新飞书重定向 URL 和 MCP 端点） |
| `FSMORE_DATA_DIR` | 数据目录（默认：源码运行为仓库 `data/`，npm 安装为 `~/.fsmore/`） |
| `FSMORE_WORKSPACE_DIR` | Markdown 工作区目录（默认 `{DATA_DIR}/workspace`） |
| `FSMORE_APP_ID` / `FSMORE_APP_SECRET` | 飞书应用凭证（也可在设置页填写） |
| `FSMORE_API_BASE` | 飞书 API 基地址，Lark 国际版设为 `https://open.larksuite.com/open-apis` |

## 数据目录结构

```
{DATA_DIR}/
├── config.json          应用配置（含凭证）
├── index.json           文档索引（节点、路径、同步状态）
└── workspace/           Markdown 工作区（AI 读写区）
    ├── .maomi/feishu-docs/{token}.md        文档正文（含 front matter）
    ├── .maomi/feishu-docs/{token}/          回写基线缓存（勿动）
    ├── .maomi/feishu-docs/baselines/        基线 markdown（勿动）
    └── _assets/{docId}/                     图片 / 白板导出 / 附件
```

## 常见问题

- **MCP 连不上 / 工具调不通**：服务没启动，运行 `fsmore`；确认端口未被改过。
- **授权页报 redirect_uri 不合法**：回调地址没粘贴到开放平台「安全设置 → 重定向 URL」，或改过端口没同步更新。
- **`push_doc` 提示冲突**：远端在上次同步后被别人改过。确认要覆盖就传 `force: true`。
- **`sync_doc` 拒绝执行**：本地有未推送的修改，先 `push_doc`，或确认放弃后传 `force: true`。
- **安全**：服务默认只监听 127.0.0.1 且无鉴权，不要暴露到公网。
