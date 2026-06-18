import raw from "../data/walkthrough.json";
import type { Walkthrough, Chapter, Step, Quest } from "../types";

export const data = raw as unknown as Walkthrough;

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
