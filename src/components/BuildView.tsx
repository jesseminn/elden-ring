import { useMemo, useState } from "react";
import { pct } from "../lib/data";
import { useAppState, useDispatch } from "../store";

/* ============================================================
   配點分頁：盜賊 → 感應出血流 逐級配點計畫 (Lv5 → Lv200)
   官方繁中屬性名:生命力/集中力/耐力/力氣/靈巧/智力/信仰/感應
   資料模型與不變量見 HANDOFF_SPEC（Lv5→57 對應真實存檔,Lv187 核心畢業）
   ============================================================ */

type StatKey = "vig" | "mnd" | "end" | "str" | "dex" | "int" | "fai" | "arc";
type Stats = Record<StatKey, number>;

const STAT_META: Record<StatKey, { name: string; en: string; color: string }> = {
  vig: { name: "生命力", en: "VIG", color: "#c4574f" },
  mnd: { name: "集中力", en: "MND", color: "#7e9bb8" },
  end: { name: "耐力", en: "END", color: "#a3a06b" },
  str: { name: "力氣", en: "STR", color: "#b08968" },
  dex: { name: "靈巧", en: "DEX", color: "#c9a86a" },
  int: { name: "智力", en: "INT", color: "#8c84b0" },
  fai: { name: "信仰", en: "FAI", color: "#d8c08a" },
  arc: { name: "感應", en: "ARC", color: "#c46a9e" },
};
const STAT_ORDER: StatKey[] = ["vig", "mnd", "end", "str", "dex", "int", "fai", "arc"];

/* 盜賊 (Bandit) Lv5 初始值 — 官方確認 */
const BASE: Stats = { vig: 10, mnd: 11, end: 10, str: 9, dex: 13, int: 9, fai: 8, arc: 14 };
const BASE_LV = 5;

/* ---------- 配點段落(依序展開,每段 = 連續升同一屬性) ----------
   Lv5→57:沿用最早版 roadmap,精準對應已配好的真實面板(信12/感25,截圖驗證一字不差)
   Lv57→200:新規劃 — 信仰補到15解套、力氣延到接近亞壇,終局收束至出血流畢業面板 */
const SEGMENTS: { s: StatKey; n: number; note?: string }[] = [
  /* ===== Lv5 → 57:已完成(對應真實歷史) ===== */
  { s: "vig", n: 5, note: "血量是新手村最好的護符。前期雙持=蕾杜薇亞+大刀(初始武器)雙匕首" },
  { s: "str", n: 2, note: "力氣 11:打刀 Uchigatana 需求 ①" },
  { s: "dex", n: 2, note: "靈巧 15:打刀需求達標(一周目僅一把,盜賊無法雙打刀)" },
  { s: "vig", n: 5, note: "生命力 20:瑪爾基特前的保命線" },
  { s: "mnd", n: 4, note: "集中力 15:戰技藍量(血之斬擊/切腹)" },
  { s: "arc", n: 2 },
  { s: "vig", n: 5, note: "生命力 25:進史東薇爾城的安全線" },
  { s: "arc", n: 4, note: "感應 20:屍山血海需求 ①(提前備好)" },
  { s: "end", n: 5, note: "耐力 15:中量翻滾餘裕+連段持久" },
  { s: "dex", n: 3, note: "靈巧 18:屍山血海需求 ②" },
  { s: "str", n: 1, note: "力氣 12:屍山血海需求 ③ — 中期三需求(力12/敏18/感20)全齊" },
  { s: "vig", n: 5, note: "生命力 30:利耶尼亞/蓋利德繞道安全線" },
  { s: "arc", n: 5, note: "感應 25:純收益,血質變補正與出血累積提升" },
  { s: "fai", n: 4, note: "★ 你目前在此(Lv57・信仰升到 12)。原計畫是賦予血焰,但血質變+鮮血斬擊的打刀無法塗血焰(塗層 buff 與自訂戰技互斥)— 這 12 點先停著,下一步補到 15 解套" },
  /* ===== Lv57 → 200:從這裡開始是新規劃 ===== */
  { s: "fai", n: 3, note: "信仰 → 15:解鎖賜我力量吧 Flame, Grant Me Strength(身體 buff,可與血質變打刀並存,開場攻擊+20%)。把卡住的信仰救回。★雙修版信仰之後續升到 27 放完整血咒" },
  { s: "arc", n: 5, note: "感應 → 30:鮮血斬擊傷害與破出血速度直接受惠,單刀此刻最有感的提升" },
  { s: "vig", n: 5, note: "生命力 → 35:利耶尼亞後段/蓋利德繞道容錯" },
  { s: "mnd", n: 5, note: "集中力 → 20:鮮血斬擊/切腹+血系咒文耗藍的安全線(雙修版血咒也吃藍)" },
  { s: "arc", n: 5, note: "感應 → 35:持續餵養出血引擎" },
  /* ↓↓↓ 接近亞壇:補力氣/靈巧拿長牙(雙修版保留雙太刀) ↓↓↓ */
  { s: "str", n: 6, note: "力氣 → 18:長牙 Nagakiba 需求 ①。接近亞壇再升!長牙在尤拉任務終點(瑪莉卡第二教堂事件後)自其遺體取得,別提前殺尤拉" },
  { s: "dex", n: 4, note: "靈巧 → 22:長牙需求達標(力18/靈22)→ 打刀+長牙雙太刀解禁" },
  { s: "vig", n: 5, note: "生命力 → 40:第一軟上限,王城羅德爾標配" },
  { s: "arc", n: 7, note: "感應 → 42:衝第一軟上限的主力成長期" },
  { s: "arc", n: 3, note: "感應 → 45:第一軟上限達標 — 出血累積與血質變補正甜蜜點" },
  { s: "end", n: 5, note: "耐力 → 20:中量翻滾基準(裝備重量 <70%)。出血流耐力不宜過高,以免強韌度拖慢自身出血累積" },
  { s: "fai", n: 5, note: "信仰 → 20:血系咒文補正開始爬升(蒼蠅群/血禍/血焰爪)" },
  { s: "vig", n: 5, note: "生命力 → 45" },
  { s: "arc", n: 10, note: "感應 → 55:第二軟上限" },
  { s: "vig", n: 5, note: "生命力 → 50:聖樹/瑪蓮妮亞/DLC 入場券" },
  { s: "str", n: 6, note: "力氣 → 24:蒙格溫的神聖長槍需求 ②(雙修版近戰主力之一)" },
  { s: "fai", n: 7, note: "信仰 → 27:★完整血系咒文補正達標 — 對應蒙格溫長槍 S tier 配點,搭血賜聖印當遠程第二套輸出" },
  { s: "vig", n: 10, note: "生命力 → 60:硬上限,DLC 高傷環境必備" },
  { s: "str", n: 4, note: "力氣 → 28:血鬼的手臂 Bloodfiend's Arm(DLC)需求達標 — 近戰三把武器需求全齊" },
  { s: "arc", n: 10, note: "感應 → 65" },
  { s: "arc", n: 15, note: "🏆 感應 → 80:Lv187 核心畢業達成!面板 生60/集20/耐20/力28/靈22/智9/信27/感80 — 長牙雙太刀 + 完整血咒雙修,近戰三把武器全可用" },
  /* ===== Lv188 → 200:已畢業,以下 13 點為彈性加點(依手感自由調整) ===== */
  { s: "mnd", n: 5, note: "【已畢業・彈性】集中力 → 25:血系咒文放得勤就補這裡,少喝藍瓶" },
  { s: "end", n: 5, note: "【已畢業・彈性】耐力 → 25:多點連段/翻滾餘裕,或換更重護甲" },
  { s: "vig", n: 3, note: "【已畢業・彈性】生命力剩餘 3 點墊高(或改投感應冗餘/集中)。Lv200 收束:生63/集25/耐25/力28/靈22/智9/信27/感80" },
];

/* ---------- 展開為逐級計畫 ---------- */
interface PlanStep {
  lv: number;
  stat: StatKey;
  value: number;
  note?: string;
}
function buildPlan(): PlanStep[] {
  const plan: PlanStep[] = [];
  const cur: Stats = { ...BASE };
  let lv = BASE_LV;
  SEGMENTS.forEach((seg) => {
    for (let i = 0; i < seg.n; i++) {
      cur[seg.s] += 1;
      lv += 1;
      plan.push({
        lv,
        stat: seg.s,
        value: cur[seg.s],
        note: i === seg.n - 1 ? seg.note : undefined,
      });
    }
  });
  return plan;
}
const PLAN = buildPlan();
const MAX_LV = BASE_LV + PLAN.length; // 200

/* 指定等級時的全屬性 */
function statsAt(lv: number): Stats {
  const s: Stats = { ...BASE };
  for (let i = 0; i < lv - BASE_LV; i++) s[PLAN[i].stat] += 1;
  return s;
}

/* ---------- 出血流裝備需求 ---------- */
const GEAR: { name: string; req: Partial<Stats>; tag: string }[] = [
  { name: "大刀 Great Knife(盜賊初始武器)", req: { str: 6, dex: 12 }, tag: "開局" },
  { name: "蕾杜薇亞 Reduvia", req: { str: 5, dex: 13, arc: 13 }, tag: "開局" },
  { name: "逆手劍 Backhand Blade(DLC)", req: { str: 8, dex: 13 }, tag: "DLC" },
  { name: "打刀 Uchigatana(一周目僅一把!)", req: { str: 11, dex: 15 }, tag: "主力" },
  { name: "賦予血焰 Bloodflame Blade", req: { fai: 12, arc: 10 }, tag: "禱告" },
  { name: "長牙 Nagakiba(尤拉任務 → 雙太刀)", req: { str: 18, dex: 22 }, tag: "雙刀" },
  { name: "賜我力量吧 Flame, Grant Me Strength", req: { fai: 15 }, tag: "禱告" },
  { name: "屍山血海 Rivers of Blood", req: { str: 12, dex: 18, arc: 20 }, tag: "主力" },
  { name: "艾蕾諾拉的雙薙刀 Eleonora's Poleblade", req: { str: 12, dex: 21, arc: 19 }, tag: "替換" },
  { name: "血鬼的手臂 Bloodfiend's Arm(DLC)", req: { str: 28, dex: 11, arc: 16 }, tag: "DLC" },
  { name: "蒙格溫的神聖長槍 Mohgwyn's Sacred Spear", req: { str: 24, dex: 14, arc: 27 }, tag: "後期" },
];

/* 升級所需盧恩(近似,Lv12+ 官方公式) */
function runeCost(l: number): number {
  const x = (l + 81 - 92) * 0.02;
  return Math.floor(((x < 0 ? 0 : x) + 0.1) * Math.pow(l + 81, 2) + 1);
}

export default function BuildView() {
  const state = useAppState();
  const dispatch = useDispatch();
  const lv = Math.max(BASE_LV, Math.min(MAX_LV, state.ui.buildLv ?? BASE_LV));
  const setLevel = (v: number) =>
    dispatch({ type: "setBuildLv", lv: Math.max(BASE_LV, Math.min(MAX_LV, v)) });

  const [showAll, setShowAll] = useState(false);

  const stats = useMemo(() => statsAt(lv), [lv]);
  const next = lv < MAX_LV ? PLAN[lv - BASE_LV] : null;
  const upcoming = useMemo(() => PLAN.slice(lv - BASE_LV, lv - BASE_LV + 8), [lv]);

  return (
    <div className="view build-view">
      {/* ---------- 進度摘要 ---------- */}
      <div className="collect-summary">
        <div className="overall-bar">
          <div className="overall-fill" style={{ width: pct(lv - BASE_LV, MAX_LV - BASE_LV) + "%" }} />
        </div>
        <div className="collect-summary-text">
          配點進度 <b>Lv{lv}</b> / {MAX_LV} · 盜賊 → 感應出血流（長牙雙太刀 + 完整血咒雙修，Lv187 核心畢業）
        </div>
      </div>

      {/* ---------- 升級步進器 ---------- */}
      <div className="build-stepper">
        <div className="build-step-row">
          <button className="ghost-btn build-pm" onClick={() => setLevel(lv - 1)} disabled={lv <= BASE_LV}>
            −
          </button>
          <div className="build-lv">
            <span className="tb-label">目前等級</span>
            <input
              type="number"
              className="build-lv-input"
              value={lv}
              min={BASE_LV}
              max={MAX_LV}
              onChange={(e) => setLevel(parseInt(e.target.value || String(BASE_LV), 10))}
            />
          </div>
          <button className="gold-btn build-pm" onClick={() => setLevel(lv + 1)} disabled={lv >= MAX_LV}>
            ＋
          </button>
        </div>
        <input
          type="range"
          className="build-slider"
          min={BASE_LV}
          max={MAX_LV}
          value={lv}
          onChange={(e) => setLevel(parseInt(e.target.value, 10))}
        />
      </div>

      {/* ---------- 下一級 ---------- */}
      {next ? (
        <div className="build-next">
          <div className="build-next-head">
            下一級 · Lv{lv} → Lv{next.lv}
          </div>
          <div className="build-next-stat">
            加{" "}
            <b style={{ color: STAT_META[next.stat].color }}>【{STAT_META[next.stat].name}】</b>
            <span className="build-next-arrow">
              {next.value - 1} → {next.value}
            </span>
          </div>
          <div className="build-next-runes">所需盧恩 ≈ {runeCost(lv).toLocaleString()}</div>
          {next.note && <div className="build-next-note">◆ {next.note}</div>}
          <button className="gold-btn build-levelup" onClick={() => setLevel(lv + 1)}>
            已在賜福處升級，記錄 +1
          </button>
        </div>
      ) : (
        <div className="build-next">
          <div className="build-next-stat">🏆 Lv{MAX_LV} 配點畢業</div>
          <div className="build-next-note">
            200 級之後自由配點建議順序：集中力 → 30、耐力 → 35、靈巧 → 40，生命力以外皆可。
          </div>
        </div>
      )}

      {/* ---------- 屬性面板 ---------- */}
      <div className="build-section">
        <div className="build-section-title">目前屬性 · Lv{lv}</div>
        <div className="build-stats">
          {STAT_ORDER.map((k) => {
            const m = STAT_META[k];
            const v = stats[k];
            const isNext = next && next.stat === k;
            return (
              <div key={k} className={"build-stat" + (isNext ? " next" : "")}>
                <span className="build-stat-name">
                  {m.name}
                  <span className="build-stat-en">{m.en}</span>
                </span>
                <div className="build-stat-bar">
                  <div style={{ width: (v / 99) * 100 + "%", background: m.color }} />
                </div>
                <span className="build-stat-val">
                  {v}
                  {isNext ? " ▲" : ""}
                </span>
              </div>
            );
          })}
        </div>
        <div className="build-softcaps">
          軟上限備忘：生命力 40/60 · 感應 45/55/80（出血累積與質變補正）· 耐力 50 · 集中力 55
        </div>
      </div>

      {/* ---------- 裝備解鎖 ---------- */}
      <div className="build-section">
        <div className="build-section-title">出血流裝備解鎖狀態</div>
        <div className="build-gear">
          {GEAR.map((g) => {
            const missing = (Object.entries(g.req) as [StatKey, number][])
              .filter(([k, v]) => stats[k] < v)
              .map(([k, v]) => `${STAT_META[k].name} ${stats[k]}/${v}`);
            const ok = missing.length === 0;
            return (
              <div key={g.name} className={"build-gear-row" + (ok ? "" : " locked")}>
                <span className="build-gear-mark">{ok ? "✓" : "✗"}</span>
                <span className="build-gear-name">{g.name}</span>
                <span className="badge">{g.tag}</span>
                <span className="build-gear-req">
                  {ok
                    ? (Object.entries(g.req) as [StatKey, number][])
                        .map(([k, v]) => `${STAT_META[k].en}${v}`)
                        .join(" / ")
                    : "缺 " + missing.join("、")}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ---------- 完整時間軸 ---------- */}
      <div className="build-section">
        <div className="build-section-head">
          <div className="build-section-title">完整配點時間軸（點任一級可跳轉）</div>
          <button className="ghost-btn small" onClick={() => setShowAll(!showAll)}>
            {showAll ? "收合，只看附近" : "展開全部 195 級"}
          </button>
        </div>
        <div className="build-timeline">
          {(showAll ? PLAN : upcoming).map((p) => {
            const m = STAT_META[p.stat];
            const passed = p.lv <= lv;
            const isNext = next && p.lv === next.lv;
            return (
              <div key={p.lv}>
                <button
                  className={"build-tl-row" + (passed ? " passed" : "") + (isNext ? " next" : "")}
                  onClick={() => setLevel(p.lv)}
                >
                  <span className="build-tl-lv">Lv{p.lv}</span>
                  <span className="build-tl-dot" style={{ background: m.color }} />
                  <span className="build-tl-stat">{m.name}</span>
                  <span className="build-tl-val">→ {p.value}</span>
                  {passed && <span className="build-tl-check">✓</span>}
                </button>
                {p.note && <div className="build-tl-note">◆ {p.note}</div>}
              </div>
            );
          })}
        </div>
      </div>

      <div className="build-footer">
        武器路線：蕾杜薇亞+大刀雙匕首（開局）→ 打刀灌切腹（中期）→ 打刀+長牙雙太刀（亞壇起）→ 屍山血海／蒙格溫長槍（後期）。
        若實際配點偏離，擊敗蕾娜菈後用幼生露滴洗點對齊即可 · 目前等級自動儲存
      </div>
    </div>
  );
}
