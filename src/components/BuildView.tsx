import { useMemo, useState, type CSSProperties } from "react";
import { useAppState, useDispatch } from "../store";

/* ============================================================
   艾爾登法環 ・ 盜賊 → 感應出血流 逐級配點計畫 (Lv5 → Lv200)
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

export default function BuildView() {
  const state = useAppState();
  const dispatch = useDispatch();
  const lv = Math.max(BASE_LV, Math.min(MAX_LV, state.ui.buildLv ?? BASE_LV));
  const setLevel = (v: number) =>
    dispatch({ type: "setBuildLv", lv: Math.max(BASE_LV, Math.min(MAX_LV, v)) });

  const stats = useMemo(() => statsAt(lv), [lv]);
  const next = lv < MAX_LV ? PLAN[lv - BASE_LV] : null;
  const upcoming = useMemo(() => PLAN.slice(lv - BASE_LV, lv - BASE_LV + 8), [lv]);
  const runes = useMemo(() => {
    /* 升級所需盧恩公式(近似,Lv12+ 官方公式) */
    const cost = (l: number) => {
      const x = (l + 81 - 92) * 0.02;
      return Math.floor(((x < 0 ? 0 : x) + 0.1) * Math.pow(l + 81, 2) + 1);
    };
    return next ? cost(lv) : 0;
  }, [lv, next]);

  const [showAll, setShowAll] = useState(false);
  const S = styles;

  return (
    <div className="view bp-root" style={S.app}>
      <header style={S.header}>
        <div style={S.eyebrow}>ELDEN RING ・ BANDIT → ARCANE BLEED</div>
        <h1 style={S.title}>感應出血流 配點計畫書</h1>
        <div style={S.subtitle}>
          盜賊 Lv{BASE_LV} 起手 ・ 長牙雙太刀+完整血咒雙修 ・ Lv187 核心畢業,之後彈性加點至 Lv{MAX_LV}
        </div>
      </header>

      {/* ---------- 升級步進器 ---------- */}
      <section style={S.stepperCard}>
        <div style={S.stepperRow}>
          <button style={S.stepBtn} onClick={() => setLevel(lv - 1)} disabled={lv <= BASE_LV}>
            −
          </button>
          <div style={S.lvCenter}>
            <div style={S.lvLabel}>目前等級</div>
            <input
              type="number"
              value={lv}
              min={BASE_LV}
              max={MAX_LV}
              onChange={(e) => setLevel(parseInt(e.target.value || String(BASE_LV), 10))}
              style={S.lvInput}
            />
          </div>
          <button style={S.stepBtnGold} onClick={() => setLevel(lv + 1)} disabled={lv >= MAX_LV}>
            ＋
          </button>
        </div>
        <input
          type="range"
          min={BASE_LV}
          max={MAX_LV}
          value={lv}
          onChange={(e) => setLevel(parseInt(e.target.value, 10))}
          style={S.slider}
          className="gold-slider"
        />

        {next ? (
          <div style={S.nextCard}>
            <div style={S.nextLabel}>
              下一級 ・ Lv{lv} → Lv{next.lv}
            </div>
            <div style={S.nextStat}>
              加{" "}
              <span style={{ color: STAT_META[next.stat].color, fontWeight: 800 }}>
                【{STAT_META[next.stat].name}】
              </span>
              <span style={S.nextArrow}>
                {" "}
                {next.value - 1} → {next.value}
              </span>
            </div>
            <div style={S.nextRunes}>所需盧恩 ≈ {runes.toLocaleString()}</div>
            {next.note && <div style={S.nextNote}>◆ {next.note}</div>}
            <button style={S.levelUpBtn} onClick={() => setLevel(lv + 1)}>
              已在賜福處升級,記錄 +1
            </button>
          </div>
        ) : (
          <div style={S.nextCard}>
            <div style={S.nextStat}>🏆 Lv{MAX_LV} 配點畢業</div>
            <div style={S.nextNote}>
              200 級之後自由配點建議順序:集中力 → 30、耐力 → 35、靈巧 → 40、生命力以外皆可。
            </div>
          </div>
        )}
      </section>

      {/* ---------- 屬性面板 ---------- */}
      <section style={S.panel}>
        <div style={S.panelTitle}>目前屬性 ・ Lv{lv}</div>
        <div style={S.statGrid}>
          {STAT_ORDER.map((k) => {
            const m = STAT_META[k];
            const v = stats[k];
            const isNext = next && next.stat === k;
            return (
              <div key={k} style={{ ...S.statRow, ...(isNext ? S.statRowNext : {}) }}>
                <span style={S.statName}>
                  {m.name}
                  <span style={S.statEn}> {m.en}</span>
                </span>
                <div style={S.statBarOuter}>
                  <div style={{ ...S.statBarInner, width: (v / 99) * 100 + "%", background: m.color }} />
                </div>
                <span style={{ ...S.statVal, color: isNext ? "#f3d98a" : "#e8e0cf" }}>
                  {v}
                  {isNext ? " ▲" : ""}
                </span>
              </div>
            );
          })}
        </div>
        <div style={S.softcaps}>
          軟上限備忘:生命力 40/60 ・ 感應 45/55/80(出血累積與質變補正)・ 耐力 50 ・ 集中力 55
        </div>
      </section>

      {/* ---------- 裝備解鎖 ---------- */}
      <section style={S.panel}>
        <div style={S.panelTitle}>出血流裝備解鎖狀態</div>
        <div style={S.gearList}>
          {GEAR.map((g) => {
            const missing = (Object.entries(g.req) as [StatKey, number][])
              .filter(([k, v]) => stats[k] < v)
              .map(([k, v]) => `${STAT_META[k].name} ${stats[k]}/${v}`);
            const ok = missing.length === 0;
            return (
              <div key={g.name} style={{ ...S.gearRow, ...(ok ? {} : S.gearLocked) }}>
                <span style={{ ...S.gearMark, color: ok ? "#a8c98a" : "#6e6450" }}>{ok ? "✓" : "✗"}</span>
                <span style={S.gearName}>{g.name}</span>
                <span style={S.gearTag}>{g.tag}</span>
                <span style={S.gearReq}>
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
      </section>

      {/* ---------- 完整時間軸 ---------- */}
      <section style={S.panel}>
        <div style={S.panelHeadRow}>
          <div style={S.panelTitle}>完整配點時間軸(點任一級可跳轉)</div>
          <button style={S.toggleBtn} onClick={() => setShowAll(!showAll)}>
            {showAll ? "收合,只看附近" : "展開全部 195 級"}
          </button>
        </div>
        <div style={S.timeline}>
          {(showAll ? PLAN : upcoming).map((p) => {
            const m = STAT_META[p.stat];
            const passed = p.lv <= lv;
            const isNext = next && p.lv === next.lv;
            return (
              <div key={p.lv}>
                <button
                  onClick={() => setLevel(p.lv)}
                  style={{
                    ...S.tlRow,
                    ...(passed ? S.tlPassed : {}),
                    ...(isNext ? S.tlNext : {}),
                  }}
                  className="tl-row"
                >
                  <span style={S.tlLv}>Lv{p.lv}</span>
                  <span style={{ ...S.tlDot, background: m.color }} />
                  <span style={S.tlStat}>{m.name}</span>
                  <span style={S.tlVal}>→ {p.value}</span>
                  {passed && <span style={S.tlCheck}>✓</span>}
                </button>
                {p.note && <div style={S.tlNote}>◆ {p.note}</div>}
              </div>
            );
          })}
        </div>
      </section>

      <footer style={S.footer}>
        武器路線:蕾杜薇亞+大刀雙匕首(開局)→ 打刀灌切腹(中期)→ 打刀+長牙雙太刀(亞壇起)→ 屍山血海/蒙格溫長槍(後期)。
        若實際配點偏離,擊敗蕾娜菈後用幼生露滴洗點對齊即可 ・ 目前等級自動儲存
      </footer>
    </div>
  );
}

/* ============================ 樣式 ============================ */
const gold = "#d9b366";
const styles: Record<string, CSSProperties> = {
  app: { padding: "4px 0 40px" },
  header: { maxWidth: 680, margin: "0 auto 16px" },
  eyebrow: { fontSize: 11, letterSpacing: "0.25em", color: "#8a7a55", marginBottom: 6 },
  title: {
    margin: 0,
    fontSize: 25,
    fontWeight: 700,
    color: gold,
    fontFamily: 'Georgia, "Noto Serif TC", serif',
    letterSpacing: "0.04em",
  },
  subtitle: { fontSize: 13, color: "#9a8f78", marginTop: 4 },

  stepperCard: {
    maxWidth: 680,
    margin: "0 auto 14px",
    background: "#1a150e",
    border: "1px solid #3a3125",
    borderRadius: 12,
    padding: "18px 16px",
    boxShadow: "0 0 24px rgba(217,179,102,0.06)",
  },
  stepperRow: { display: "flex", alignItems: "center", justifyContent: "center", gap: 18 },
  stepBtn: {
    width: 46,
    height: 46,
    borderRadius: 10,
    fontSize: 22,
    cursor: "pointer",
    background: "#221c12",
    border: "1px solid #3a3125",
    color: "#b3a78c",
  },
  stepBtnGold: {
    width: 46,
    height: 46,
    borderRadius: 10,
    fontSize: 22,
    cursor: "pointer",
    background: "#2e2715",
    border: "1px solid " + gold,
    color: gold,
    boxShadow: "0 0 10px rgba(217,179,102,0.25)",
  },
  lvCenter: { textAlign: "center" },
  lvLabel: { fontSize: 11, color: "#8a7a55", letterSpacing: "0.1em", marginBottom: 2 },
  lvInput: {
    width: 96,
    fontSize: 34,
    fontWeight: 800,
    textAlign: "center",
    background: "transparent",
    border: "none",
    color: "#f0e6cd",
    fontFamily: "Georgia, serif",
    outline: "none",
  },
  slider: { width: "100%", marginTop: 12, accentColor: gold },
  nextCard: {
    marginTop: 14,
    padding: "13px 14px",
    borderRadius: 10,
    background: "linear-gradient(180deg, rgba(217,179,102,0.10), rgba(217,179,102,0.03))",
    border: "1px solid #55482e",
  },
  nextLabel: { fontSize: 11, letterSpacing: "0.12em", color: "#8a7a55", marginBottom: 4 },
  nextStat: { fontSize: 19, color: "#f0e6cd" },
  nextArrow: { fontSize: 16, color: "#b3a78c", marginLeft: 6 },
  nextRunes: { fontSize: 11.5, color: "#7d7159", marginTop: 4 },
  nextNote: { fontSize: 12.5, color: "#d8c89e", marginTop: 8, lineHeight: 1.6 },
  levelUpBtn: {
    marginTop: 12,
    width: "100%",
    padding: "11px 0",
    borderRadius: 8,
    background: "#2e2715",
    border: "1px solid " + gold,
    color: gold,
    fontSize: 14.5,
    fontWeight: 700,
    cursor: "pointer",
    letterSpacing: "0.05em",
  },

  panel: {
    maxWidth: 680,
    margin: "0 auto 14px",
    background: "#1a150e",
    border: "1px solid #2c251a",
    borderRadius: 12,
    padding: "16px",
  },
  panelTitle: {
    fontSize: 14.5,
    fontWeight: 700,
    color: "#e3d7bd",
    marginBottom: 12,
    fontFamily: 'Georgia, "Noto Serif TC", serif',
    letterSpacing: "0.05em",
  },
  panelHeadRow: { display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 },
  statGrid: { display: "flex", flexDirection: "column", gap: 8 },
  statRow: { display: "flex", alignItems: "center", gap: 10, padding: "5px 8px", borderRadius: 7 },
  statRowNext: { background: "rgba(217,179,102,0.08)", border: "1px solid #55482e" },
  statName: { width: 86, fontSize: 13, color: "#cfc3a6", flexShrink: 0 },
  statEn: { fontSize: 10, color: "#7d7159" },
  statBarOuter: {
    flex: 1,
    height: 6,
    background: "#241e13",
    borderRadius: 3,
    overflow: "hidden",
    border: "1px solid #2c251a",
  },
  statBarInner: { height: "100%", borderRadius: 3, transition: "width .3s", opacity: 0.85 },
  statVal: { width: 44, textAlign: "right", fontSize: 15, fontWeight: 700, fontFamily: "Georgia, serif" },
  softcaps: { marginTop: 12, fontSize: 11.5, color: "#7d7159", lineHeight: 1.6 },

  gearList: { display: "flex", flexDirection: "column", gap: 6 },
  gearRow: {
    display: "flex",
    alignItems: "center",
    gap: 9,
    padding: "8px 10px",
    borderRadius: 8,
    background: "#1f1910",
    border: "1px solid #2c251a",
    flexWrap: "wrap",
  },
  gearLocked: { opacity: 0.6 },
  gearMark: { fontWeight: 800, width: 14 },
  gearName: { fontSize: 13, color: "#ded2b6", fontWeight: 600 },
  gearTag: { fontSize: 10, color: "#c9a86a", border: "1px solid #55482e", borderRadius: 4, padding: "1px 6px" },
  gearReq: { marginLeft: "auto", fontSize: 11, color: "#8d8169" },

  toggleBtn: {
    background: "#1c170f",
    border: "1px solid #3a3125",
    color: "#b3a78c",
    borderRadius: 6,
    padding: "6px 12px",
    fontSize: 12,
    cursor: "pointer",
  },
  timeline: { display: "flex", flexDirection: "column", gap: 3, marginTop: 10, maxHeight: 460, overflowY: "auto" },
  tlRow: {
    display: "flex",
    alignItems: "center",
    gap: 9,
    width: "100%",
    padding: "7px 10px",
    borderRadius: 7,
    cursor: "pointer",
    textAlign: "left",
    background: "transparent",
    border: "1px solid transparent",
    color: "#cfc3a6",
  },
  tlPassed: { opacity: 0.45 },
  tlNext: { background: "rgba(217,179,102,0.10)", border: "1px solid #55482e", opacity: 1 },
  tlLv: { width: 52, fontSize: 12.5, color: "#9a8f78", fontFamily: "Georgia, serif", flexShrink: 0 },
  tlDot: { width: 8, height: 8, borderRadius: "50%", flexShrink: 0 },
  tlStat: { fontSize: 13.5, fontWeight: 600 },
  tlVal: { fontSize: 13, color: "#9a8f78" },
  tlCheck: { marginLeft: "auto", fontSize: 12, color: "#8fa377" },
  tlNote: {
    margin: "2px 0 8px 70px",
    fontSize: 11.5,
    color: "#c9b88a",
    lineHeight: 1.6,
    paddingLeft: 10,
    borderLeft: "2px solid #55482e",
  },
  footer: { maxWidth: 680, margin: "24px auto 0", fontSize: 11, color: "#5f5640", textAlign: "center", lineHeight: 1.8 },
};
