import rawBuilds from "../data/builds.json";
import type { BuildData, ClassDef, MetaBuild, StatKey, Stats } from "../types";

export const buildData = rawBuilds as unknown as BuildData;
export const { statMeta, statOrder, base, baseLv, earlySegments, builds, classes, metaBuilds } =
  buildData;

const LEVEL_OFFSET = 79; // 等級 = 八維總和 − 79（官方公式，已驗證十職業）
export const buildLevel = (s: Stats): number =>
  statOrder.reduce((sum, k) => sum + s[k], 0) - LEVEL_OFFSET;

/**
 * 配點浪費：洗點時每個屬性不能低於初始職業的起始值，
 * 所以職業在「目標用不到的屬性」上多出的起始點數就是永久浪費。
 * 浪費 = Σ max(0, 職業起始值 − 目標值)
 */
export function wasteOf(cls: ClassDef, b: MetaBuild): number {
  return statOrder.reduce((w, k) => w + Math.max(0, cls.stats[k] - b.target[k]), 0);
}

/** 各屬性的浪費明細（>0 才算浪費） */
export function wasteByStat(cls: ClassDef, b: MetaBuild): Record<StatKey, number> {
  const out = {} as Record<StatKey, number>;
  for (const k of statOrder) out[k] = Math.max(0, cls.stats[k] - b.target[k]);
  return out;
}

/** 走此 build 的實際面板：每屬性 = max(職業起始, 目標)；總級 = 150 + 浪費 */
export function finalStats(cls: ClassDef, b: MetaBuild): Stats {
  const out = {} as Stats;
  for (const k of statOrder) out[k] = Math.max(cls.stats[k], b.target[k]);
  return out;
}
