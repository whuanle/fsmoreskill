# fsmoreskill

[fsmore](https://github.com/whuanle/fsmore)（飞书本地 AI 工作台）的 Agent Skill。

让任意支持 Skill 的 AI（ZCode / Claude Code 等）学会使用 fsmore：在哪里找到同步下来的飞书文档、读取哪些文件、怎么安全地编辑并回写飞书。

## 安装

npm 一条命令安装（Node ≥ 18）：

```bash
npx @whuanle/fsmore-skill
```

或全局安装后使用：

```bash
npm install -g @whuanle/fsmore-skill
fsmore-skill                            # 安装到 ~/.agents/skills/fsmore（默认，跨工具标准目录）
fsmore-skill --zcode                    # 改装到 ~/.zcode/skills/fsmore
fsmore-skill uninstall                  # 卸载
```

前提：本机已安装并启动 fsmore（`npm install -g @whuanle/fsmore && fsmore`）。建议同时接入 MCP（`http://127.0.0.1:7788/mcp`），没有 MCP 时技能仍可指导 AI 直接读写工作区文件，但无法回写飞书。

## 结构

```
├── SKILL.md                 触发条件 + 核心工作流（找文件 / 读文件 / 改文件 / 回写）
├── references/
│   ├── mcp-tools.md         11 个 MCP 工具的参数、返回与接入配置
│   └── setup.md             安装、扫码授权、环境变量、常见问题
├── bin/fsmore-skill.js      安装器
└── package.json
```

内容基于 fsmore 源码（`@whuanle/fsmore` 0.1.x）整理；fsmore 行为有变化时同步更新本技能。
