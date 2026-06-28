// 一鍵發版：驗證 → build → bump → commit → 併入 main → 推送；最後印出要觸發的部署參數。
// 用法：node scripts/release.mjs <version> "<commit message 第一行>"
//   例：node scripts/release.mjs 1.9.16 "資料：補某某"
// 把易錯的 git 步驟（分支搞錯、忘了切回、落後 main）封裝起來、有護欄會中止。
// 注意：真正觸發 GitHub Pages 部署的是 MCP actions_run_trigger（沙箱推不了 tag），
//       本腳本最後會印出該用的 workflow 參數，由 agent 送出。
import { execSync } from "node:child_process";
import fs from "node:fs";

const WORK_BRANCH = "claude/ui-tweaks-8s9rh6";
const TRAILER = `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01641ouA7Q8DQbpBSZ9WYum3`;

const sh = (cmd, opts = {}) => {
  const out = execSync(cmd, { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"], ...opts });
  return out ? out.trim() : ""; // stdio:"inherit" 時 execSync 回 null
};
const die = (m) => {
  console.error("✗ " + m);
  process.exit(1);
};

const [, , version, msg] = process.argv;
if (!version || !/^\d+\.\d+\.\d+$/.test(version)) die("請給 semver 版本，如 1.9.16");
if (!msg) die("請給 commit 第一行訊息");

// 0) 必須在工作分支
const branch = sh("git rev-parse --abbrev-ref HEAD");
if (branch !== WORK_BRANCH) die(`目前在 ${branch}，請切回 ${WORK_BRANCH} 再發版`);

// 1) 驗證四件套（資料校驗 → JSON → tsc/smoke → build）
console.log("• 驗證：validate / tsc / smoke / build …");
try {
  sh("node scripts/validate-data.mjs", { stdio: "inherit" });
  sh("npx tsc --noEmit");
  sh("node scripts/smoke.mjs");
  sh("npm run build");
} catch (e) {
  die("驗證未過，已中止（不發版）。\n" + (e.stdout || e.message || ""));
}

// 2) bump package.json
const pkgPath = new URL("../package.json", import.meta.url);
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
pkg.version = version;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
console.log(`• package.json → ${version}`);

// 3) commit（附固定 trailer）
sh("git add -A");
const full = `${msg}\n\n${TRAILER}`;
sh(`git commit -q -F -`, { input: full });
console.log("• commit 完成：" + sh("git log --oneline -1"));

// 4) push 工作分支
sh(`git push -u origin ${WORK_BRANCH}`);

// 5) 護欄：HEAD 不可落後 origin/main（落後就先 rebase，別蓋舊基底）
sh("git fetch origin main");
const behind = sh("git rev-list --count HEAD..origin/main");
if (behind !== "0") die(`HEAD 落後 origin/main ${behind} 個 commit，請先 rebase 再發版（已 push 工作分支，但未併 main）。`);

// 6) ff-merge 進 main 並推送，再切回工作分支
sh("git checkout main");
try {
  sh(`git merge --ff-only ${WORK_BRANCH}`);
  sh("git push origin main");
} finally {
  sh(`git checkout ${WORK_BRANCH}`);
}
console.log("• 已併入 main 並推送。");

// 7) 印出部署觸發參數（由 agent 用 MCP 送出）
console.log("\n✅ 本地發版完成。請觸發部署（沙箱推不了 tag，用 GitHub Actions runner 端建 tag）：");
console.log(
  JSON.stringify(
    {
      tool: "mcp__github__actions_run_trigger",
      method: "run_workflow",
      owner: "jesseminn",
      repo: "elden-ring",
      workflow_id: "deploy.yml",
      ref: "main",
      inputs: { tag: `v${version}` },
    },
    null,
    2
  )
);
