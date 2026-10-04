# fsmoreskill

[fsmore](https://github.com/whuanle/fsmore)（飞书本地 AI 工作台）的 Agent Skill。

让任意支持 Skill 的 AI（ZCode / Claude Code 等）学会使用 fsmore：在哪里找到同步下来的飞书文档、读取哪些文件、怎么安全地编辑并回写飞书。fsmore 本体通过 npm 安装：`npm install -g @whuanle/fsmore`。

## 安装技能

把本仓库的 `SKILL.md` 与 `references/` 复制到技能目录下的 `fsmore/`：

```bash
git clone https://github.com/whuanle/fsmoreskill.git
mkdir -p ~/.agents/skills/fsmore
cp -r fsmoreskill/SKILL.md fsmoreskill/references ~/.agents/skills/fsmore/
```

前提：已用 npm 安装并启动 fsmore（`npm install -g @whuanle/fsmore && fsmore`）。建议同时接入 MCP（`http://127.0.0.1:7788/mcp`），没有 MCP 时技能仍可指导 AI 直接读写工作区文件，但无法回写飞书。

## 结构

```
├── SKILL.md                 触发条件 + 核心工作流（找文件 / 读文件 / 改文件 / 回写）
└── references/
    ├── mcp-tools.md         11 个 MCP 工具的参数、返回与接入配置
    └── setup.md             安装（npm）、扫码授权、环境变量、常见问题
```

内容基于 fsmore 源码（`@whuanle/fsmore` 0.1.x）整理；fsmore 行为有变化时同步更新本技能。
