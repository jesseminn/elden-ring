export type StepType = "event" | "optional" | "note";

export interface Step {
  id: string;
  chapterId: string;
  type: StepType;
  text: string;
  detail: string[];
  items: string[];
  boss: boolean;
  quests: string[];
  /** Claude 後補的步驟，UI 會以徽章與高亮標示 */
  added?: boolean;
  /** Claude 後補的地點標示（原步驟未寫明發生地點時補上） */
  location?: string;
  /** 易斷：會錯過（missable）的關鍵步驟，UI 以 ⚠ 標示 */
  missable?: boolean;
}

export interface Chapter {
  id: string;
  num: number;
  title: string;
  nonMainline: boolean;
  level: string;
  upgrade: string;
  steps: Step[];
}

export interface Quest {
  id: string;
  name: string;
  desc: string;
  color: string;
  major: boolean;
  stepIds: string[];
  count: number;
}

export interface Walkthrough {
  chapters: Chapter[];
  quests: Quest[];
}

export interface CollectItem {
  id: string;
  kind: string;
  text: string;
  miss?: boolean;
  note?: string;
}

export interface CollectRegion {
  id: string;
  name: string;
  en: string;
  lv: string;
  wpn: string;
  note: string;
  items: CollectItem[];
}

export interface CollectionData {
  regions: CollectRegion[];
}

// ---- 配點器（build planner）----
export type StatKey = "vig" | "mnd" | "end" | "str" | "dex" | "int" | "fai" | "arc";
export type Stats = Record<StatKey, number>;

export interface StatMeta {
  name: string;
  en: string;
  color: string;
}

/** 一段連續加點：把屬性 s 加 n 點；note 顯示在該段最後一級 */
export interface Segment {
  s: StatKey;
  n: number;
  note?: string;
}

export interface GearItem {
  name: string;
  req: Partial<Stats>;
  tag: string;
}

export interface BuildDef {
  id: string;
  name: string;
  intro: string;
  /** 武器/輸出路線（顯示在「裝備解鎖狀態」section） */
  route: string;
  softcaps: string;
  /** Lv57→200 分流段 */
  tail: Segment[];
  gear: GearItem[];
}

export interface BuildData {
  statMeta: Record<StatKey, StatMeta>;
  statOrder: StatKey[];
  base: Stats;
  baseLv: number;
  /** Lv5→57 共用段 */
  earlySegments: Segment[];
  builds: BuildDef[];
}
