import raw from "../data/walkthrough.json";
import rawCol from "../data/collection.json";
import rawLinks from "../data/links.json";
import type { Walkthrough, Chapter, Step, Quest, CollectionData, CollectRegion, CollectItem } from "../types";

export const data = raw as unknown as Walkthrough;
export const collection = rawCol as unknown as CollectionData;
export const collectRegions: CollectRegion[] = collection.regions.filter((r) => r.items.length > 0);

// 收集項目索引（id → 項目 + 區域名）
export const collectItemById: Record<string, { item: CollectItem; regionName: string }> = {};
for (const r of collectRegions) for (const it of r.items) collectItemById[it.id] = { item: it, regionName: r.name };

// 流程步驟 ↔ 收集項目 的雙向連動表（勾一邊另一邊同步）
const linkData = rawLinks as unknown as { links: [string, string][] };
export const linkMap: Record<string, string[]> = {};
for (const [a, b] of linkData.links) {
  (linkMap[a] ||= []).push(b);
  (linkMap[b] ||= []).push(a);
}
// 取某流程步驟連動到的收集項 id（過濾掉非 col- 的，以防萬一）
export const collectIdsForStep = (stepId: string): string[] =>
  (linkMap[stepId] || []).filter((id) => id.startsWith("col-"));

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

// 「系列」收集物的種類：散落全地圖、值得一次檢視所有位置者（排除武器/護符等泛用裝備類）
export const SERIES_KINDS = new Set<string>([
  "黃金種子", "聖盃露滴", "淚滴", "記憶石", "古龍岩", "死根", "追憶", "畫作", "地圖", "製作筆記",
]);

// 非窮舉的類別：只列流程提到的，UI 會標「清單不完整」（武器/防具量太大、不逐項追蹤）
export const INCOMPLETE_KINDS = new Set<string>(["武器", "防具"]);

// 某流程步驟連動到的「系列」種類（去重、依出現順序）
export function seriesKindsForStep(stepId: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const id of collectIdsForStep(stepId)) {
    const k = collectItemById[id]?.item.kind;
    if (k && SERIES_KINDS.has(k) && !seen.has(k)) {
      seen.add(k);
      out.push(k);
    }
  }
  return out;
}

// 純粹複述收集品的「整行」：取得「…」。（後面沒有其他補充說明才算）
const ITEM_ECHO_RE = /^取得[「『].+[」』]\s*。?\s*$/;
// 取得該步驟「去除收集複述後」的補充說明；無收集連動時原樣保留，避免資訊遺失
export function visibleDetail(step: Step): string[] {
  if (collectIdsForStep(step.id).length === 0) return step.detail;
  return step.detail.filter((d) => !ITEM_ECHO_RE.test(d));
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

// 收集項 → 連動到的章節（取第一個連動到的流程步驟，供「收集」分頁顯示與跳轉）
export function chapterForCollect(colId: string): { num: number; chapterId: string; stepId: string } | null {
  for (const sid of linkMap[colId] || []) {
    const s = stepById[sid];
    if (s) {
      const ch = chapterById[s.chapterId];
      if (ch) return { num: ch.num, chapterId: ch.id, stepId: sid };
    }
  }
  return null;
}

// 依「類別」分組（系列類別優先、其餘依出現順序）；每項附所屬地區名，供收集分頁以類別呈現
export interface KindGroupItem {
  item: CollectItem;
  regionName: string;
}
export interface KindGroup {
  kind: string;
  items: KindGroupItem[];
}
export const collectByKind: KindGroup[] = (() => {
  const map = new Map<string, KindGroupItem[]>();
  for (const r of collectRegions)
    for (const it of r.items) {
      if (!map.has(it.kind)) map.set(it.kind, []);
      map.get(it.kind)!.push({ item: it, regionName: r.name });
    }
  const series = [...SERIES_KINDS].filter((k) => map.has(k));
  const rest = collectKinds.filter((k) => !SERIES_KINDS.has(k));
  return [...series, ...rest].map((k) => ({ kind: k, items: map.get(k) || [] })).filter((g) => g.items.length);
})();
