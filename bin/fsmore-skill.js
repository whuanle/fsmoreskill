#!/usr/bin/env node
// @whuanle/fsmore-skill 安装器：把包内 fsmore/ 技能目录装进本机 AI 的技能目录。
// 无第三方依赖，Node ≥ 18。
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SKILL_NAME = "fsmore";
const pkgRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const USAGE = `fsmore-skill · 安装 fsmore Agent Skill

用法：
  npx @whuanle/fsmore-skill                 安装到 ~/.agents/skills/fsmore（默认，跨工具标准目录）
  npx @whuanle/fsmore-skill --zcode         改装到 ~/.zcode/skills/fsmore（.zcode 优先级更高）
  npx @whuanle/fsmore-skill --dir <path>    安装到自定义技能目录下的 fsmore/ 子目录
  npx @whuanle/fsmore-skill uninstall       卸载 ~/.agents/skills/fsmore
  npx @whuanle/fsmore-skill uninstall --zcode / --dir <path>   对应卸载

前提：本机已安装并启动 fsmore（npm install -g @whuanle/fsmore && fsmore）。`;

function parseArgs(argv) {
  const command = argv[0] === "uninstall" ? "uninstall" : "install";
  const rest = argv[0] === "uninstall" ? argv.slice(1) : argv;
  let zcode = false;
  let dir = null;
  for (let i = 0; i < rest.length; i += 1) {
    if (rest[i] === "--zcode") {
      zcode = true;
    } else if (rest[i] === "--dir") {
      dir = rest[i + 1];
      if (!dir) {
        console.error("错误：--dir 需要一个路径参数");
        process.exit(1);
      }
      i += 1;
    } else if (rest[i] === "--help" || rest[i] === "-h") {
      console.log(USAGE);
      process.exit(0);
    } else {
      console.error(`未知参数：${rest[i]}\n`);
      console.log(USAGE);
      process.exit(1);
    }
  }
  let targetRoot;
  if (dir) {
    targetRoot = path.resolve(dir);
  } else {
    targetRoot = path.join(os.homedir(), zcode ? ".zcode" : ".agents", "skills");
  }
  return { command, target: path.join(targetRoot, SKILL_NAME) };
}

function install(target) {
  // 技能源文件在包根目录：SKILL.md + references/（只拷这两样，不带包的其它文件）
  const skillMd = path.join(pkgRoot, "SKILL.md");
  const refsSrc = path.join(pkgRoot, "references");
  if (!fs.existsSync(skillMd)) {
    console.error(`错误：包内缺少技能文件（${skillMd}），安装包可能不完整`);
    process.exit(1);
  }
  fs.rmSync(target, { recursive: true, force: true });
  fs.mkdirSync(target, { recursive: true });
  fs.copyFileSync(skillMd, path.join(target, "SKILL.md"));
  if (fs.existsSync(refsSrc)) {
    fs.cpSync(refsSrc, path.join(target, "references"), { recursive: true });
  }
  console.log(`已安装：${target}`);
  console.log("重启 AI 会话后生效（技能在会话启动时加载）。");
}

function uninstall(target) {
  if (!fs.existsSync(target)) {
    console.log(`未安装：${target}`);
    return;
  }
  fs.rmSync(target, { recursive: true, force: true });
  console.log(`已卸载：${target}`);
}

const { command, target } = parseArgs(process.argv.slice(2));
if (command === "uninstall") {
  uninstall(target);
} else {
  install(target);
}
