// 資料校驗（單一指令把所有「連動性／正確性」不變式跑一遍）
// 用法：node scripts/validate-data.mjs  （或 npm run validate）
// 退出碼非 0 代表有錯，CI / 部署前可擋。
import fs from "node:fs";

const read = (p) => JSON.parse(fs.readFileSync(new URL(`../${p}`, import.meta.url), "utf8"));

const errors = [];
const warns = [];
const err = (m) => errors.push(m);
const warn = (m) => warns.push(m);

// ---- 載入 ----
let w, c, l, b, src;
for (const [name, p] of [
  ["walkthrough", "src/data/walkthrough.json"],
  ["collection", "src/data/collection.json"],
  ["links", "src/data/links.json"],
  ["builds", "src/data/builds.json"],
  ["sources", "src/data/sources.json"],
]) {
  try {
    const v = read(p);
    if (name === "walkthrough") w = v;
    else if (name === "collection") c = v;
    else if (name === "links") l = v;
    else if (name === "builds") b = v;
    else if (name === "sources") src = v;
  } catch (e) {
    err(`JSON 無法解析：${p} — ${e.message}`);
  }
}
if (errors.length) finish();

// ---- 索引 ----
const stepIds = new Set();
const dupStep = [];
for (const ch of w.chapters)
  for (const s of ch.steps) {
    if (stepIds.has(s.id)) dupStep.push(s.id);
    stepIds.add(s.id);
  }
const colIds = new Set();
const dupCol = [];
for (const r of c.regions)
  for (const it of r.items) {
    if (colIds.has(it.id)) dupCol.push(it.id);
    colIds.add(it.id);
  }
if (dupStep.length) err(`重複的步驟 id：${dupStep.join(", ")}`);
if (dupCol.length) err(`重複的收集項 id：${dupCol.join(", ")}`);

// ---- links：形狀＋指向存在 ----
const isStep = (id) => stepIds.has(id);
const isCol = (id) => colIds.has(id);
for (const pair of l.links) {
  if (!Array.isArray(pair) || pair.length !== 2) {
    err(`links 形狀錯誤：${JSON.stringify(pair)}`);
    continue;
  }
  const [a, bb] = pair;
  const aOk = isStep(a) || isCol(a);
  const bOk = isStep(bb) || isCol(bb);
  if (!aOk) err(`links 指向不存在的 id：${a}`);
  if (!bOk) err(`links 指向不存在的 id：${bb}`);
  // 兩端都存在時，形狀必須是 col↔step（不接受 col↔col / step↔step）
  if (aOk && bOk && isCol(a) === isCol(bb)) err(`links 非 (col↔step) 形狀：${a} ↔ ${bb}`);
}

// ---- quests：stepIds 存在 + count 一致 ----
for (const q of w.quests || []) {
  for (const sid of q.stepIds) if (!isStep(sid)) err(`支線 ${q.id} 指向不存在步驟：${sid}`);
  if (typeof q.count === "number" && q.count !== q.stepIds.length)
    err(`支線 ${q.id} count(${q.count}) ≠ stepIds 長度(${q.stepIds.length})`);
}

// ---- step.quests ↔ quest.stepIds 雙向一致 ----
const questById = {};
for (const q of w.quests || []) questById[q.id] = q;
for (const ch of w.chapters)
  for (const s of ch.steps)
    for (const qid of s.quests || []) {
      if (!questById[qid]) err(`步驟 ${s.id} 掛了不存在的支線：${qid}`);
      else if (!questById[qid].stepIds.includes(s.id))
        warn(`步驟 ${s.id} 標 quests:[${qid}] 但該支線 stepIds 沒收錄此步驟`);
    }

// ---- sources（來源帳本）----
if (src) {
  const known = new Set(Object.keys(src.sources || {}));
  const dataFiles = new Set(["walkthrough.json", "collection.json", "links.json", "builds.json"]);
  const seenClaim = new Set();
  for (const cl of src.claims || []) {
    if (!cl.id) err(`sources：有 claim 缺 id`);
    else if (seenClaim.has(cl.id)) err(`sources：重複 claim id ${cl.id}`);
    seenClaim.add(cl.id);
    if (!Array.isArray(cl.sources) || cl.sources.length === 0) err(`sources：claim ${cl.id} 沒列來源`);
    for (const s of cl.sources || []) if (!known.has(s)) err(`sources：claim ${cl.id} 引用未登錄來源「${s}」`);
    if (cl.target) {
      const file = String(cl.target).split("#")[0];
      if (!dataFiles.has(file)) warn(`sources：claim ${cl.id} 的 target 檔名「${file}」不在資料檔清單`);
    }
  }
} else {
  warn("尚無 src/data/sources.json（來源帳本）");
}

finish();

function finish() {
  for (const m of warns) console.log("⚠ " + m);
  if (errors.length) {
    for (const m of errors) console.log("✗ " + m);
    console.log(`\n資料校驗：失敗（錯誤 ${errors.length}、警告 ${warns.length}）`);
    process.exit(1);
  }
  console.log(
    `資料校驗：通過（步驟 ${stepIds?.size ?? 0}、收集 ${colIds?.size ?? 0}、連結 ${l?.links.length ?? 0}、警告 ${warns.length}）`
  );
  process.exit(0);
}
