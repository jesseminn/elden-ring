import raw from "../data/walkthrough.json";
import rawCol from "../data/collection.json";
import type { Walkthrough, Chapter, Step, Quest, CollectionData, CollectRegion } from "../types";

export const data = raw as unknown as Walkthrough;
export const collection = rawCol as unknown as CollectionData;
export const collectRegions: CollectRegion[] = collection.regions.filter((r) => r.items.length > 0);

// ---- 索引 ----
export const stepById: Record<string, Step> = {};
export const chapterById: Record<string, Chapter> = {};
export const questById: Record<string, Quest> = {};
export const allSteps: Step[] = []; // 依流程順序

for (const ch of data.chapters) {
  chapterById[ch.id] = ch;
  for (const s of ch.steps) {
    stepById[s.id] = s;
    allSteps.push(s);
  }
}
for (const q of data.quests) questById[q.id] = q;

export const actionable = (s: Step) => s.type !== "note";

// ---- 統計 ----
export type DoneMap = Record<string, boolean>;

export function chapterStats(ch: Chapter, done: DoneMap) {
  let total = 0;
  let cnt = 0;
  for (const s of ch.steps) {
    if (!actionable(s)) continue;
    total++;
    if (done[s.id]) cnt++;
  }
  return { total, done: cnt };
}

export function overallStats(done: DoneMap) {
  let total = 0;
  let cnt = 0;
  for (const s of allSteps) {
    if (!actionable(s)) continue;
    total++;
    if (done[s.id]) cnt++;
  }
  return { total, done: cnt };
}

export function questStats(q: Quest, done: DoneMap) {
  let cnt = 0;
  for (const id of q.stepIds) if (done[id]) cnt++;
  return { total: q.stepIds.length, done: cnt };
}

export function questNextId(q: Quest, done: DoneMap): string | null {
  for (const id of q.stepIds) if (!done[id]) return id;
  return null;
}

// 全域「目前進度」= 流程上第一個未完成且可執行的步驟
export function currentStepId(done: DoneMap): string | null {
  for (const s of allSteps) {
    if (actionable(s) && !done[s.id]) return s.id;
  }
  return null;
}

export const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);

// ---- 收集 ----
export function collectRegionStats(r: CollectRegion, done: DoneMap) {
  let cnt = 0;
  for (const it of r.items) if (done[it.id]) cnt++;
  return { total: r.items.length, done: cnt };
}

export function collectionOverall(done: DoneMap) {
  let total = 0,
    cnt = 0;
  for (const r of collectRegions)
    for (const it of r.items) {
      total++;
      if (done[it.id]) cnt++;
    }
  return { total, done: cnt };
}

// 某系列（種類）在各區的項目，依區順序分組
export function seriesByRegion(kind: string) {
  const out: { region: CollectRegion; items: CollectRegion["items"] }[] = [];
  for (const r of collectRegions) {
    const items = r.items.filter((it) => it.kind === kind);
    if (items.length) out.push({ region: r, items });
  }
  return out;
}

export function kindStats(kind: string, done: DoneMap) {
  let total = 0,
    cnt = 0;
  for (const r of collectRegions)
    for (const it of r.items)
      if (it.kind === kind) {
        total++;
        if (done[it.id]) cnt++;
      }
  return { total, done: cnt };
}

// 全部收集物的種類（依出現順序）
export const collectKinds: string[] = (() => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of collectRegions)
    for (const it of r.items)
      if (!seen.has(it.kind)) {
        seen.add(it.kind);
        out.push(it.kind);
      }
  return out;
})();
