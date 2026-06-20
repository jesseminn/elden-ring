import { useEffect, useMemo, useState } from "react";
import { useAppState, useDispatch } from "../store";
import { statMeta, statOrder, base, baseLv, builds, earlySegments } from "../lib/builds";
import type { StatKey, Stats, Segment } from "../types";

/* ============================================================
   配點器：盜賊（感應）為核心的兩套 build（Lv5 → Lv200）
   官方繁中屬性名:生命力/集中力/耐力/力氣/靈巧/智力/信仰/感應
   - Lv5→57 為共用段：對應使用者真實存檔（截圖驗證,不可變動）
   - Lv57→200 依所選 build 分流
   - 資料抽至 src/data/builds.json（型別見 src/types.ts），本檔只負責邏輯與渲染
   ============================================================ */

/* ---------- 由 segments 展開逐級計畫 ---------- */
interface PlanStep {
  lv: number;
  stat: StatKey;
  value: number;
  note?: string;
}
function buildPlan(segments: Segment[]): PlanStep[] {
  const plan: PlanStep[] = [];
  const cur: Stats = { ...base };
  let lv = baseLv;
  segments.forEach((seg) => {
    for (let i = 0; i < seg.n; i++) {
      cur[seg.s] += 1;
      lv += 1;
      plan.push({ lv, stat: seg.s, value: cur[seg.s], note: i === seg.n - 1 ? seg.note : undefined });
    }
  });
  return plan;
}
function statsAt(plan: PlanStep[], lv: number): Stats {
  const s: Stats = { ...base };
  for (let i = 0; i < lv - baseLv; i++) s[plan[i].stat] += 1;
  return s;
}

/* 升級所需盧恩(近似,Lv12+ 官方公式) */
function runeCost(l: number): number {
  const x = (l + 81 - 92) * 0.02;
  return Math.floor(((x < 0 ? 0 : x) + 0.1) * Math.pow(l + 81, 2) + 1);
}

export default function BuildView() {
  const state = useAppState();
  const dispatch = useDispatch();

  const build = builds.find((b) => b.id === state.ui.buildId) ?? builds[0];
  const plan = useMemo(() => buildPlan([...earlySegments, ...build.tail]), [build]);
  const MAX_LV = baseLv + plan.length; // 200

  const lv = Math.max(baseLv, Math.min(MAX_LV, state.ui.buildLv ?? baseLv));
  const setLevel = (v: number) =>
    dispatch({ type: "setBuildLv", lv: Math.max(baseLv, Math.min(MAX_LV, v)) });

  const [showAll, setShowAll] = useState(false);

  // 等級輸入框：本地字串 state，允許暫時清空／中途值
  const [lvText, setLvText] = useState(String(lv));
  useEffect(() => {
    setLvText(String(lv));
  }, [lv]);
  const onLvChange = (t: string) => {
    setLvText(t);
    if (t === "") return;
    const n = parseInt(t, 10);
    if (!Number.isNaN(n) && n >= baseLv && n <= MAX_LV) setLevel(n);
  };
  const onLvBlur = () => {
    const n = parseInt(lvText, 10);
    if (lvText === "" || Number.isNaN(n)) {
      setLvText(String(lv));
      return;
    }
    setLevel(n);
    setLvText(String(Math.max(baseLv, Math.min(MAX_LV, n))));
  };

  const stats = useMemo(() => statsAt(plan, lv), [plan, lv]);
  const next = lv < MAX_LV ? plan[lv - baseLv] : null;
  const upcoming = useMemo(() => plan.slice(lv - baseLv, lv - baseLv + 8), [plan, lv]);

  return (
    <div className="view build-view">
      {/* ---------- build 選擇 ---------- */}
      <div className="build-picker">
        <span className="tb-label">流派</span>
        <select
          className="kind-select"
          value={build.id}
          onChange={(e) => dispatch({ type: "setBuildId", id: e.target.value })}
        >
          {builds.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>
      <div className="build-intro">{build.intro}</div>

      {/* ---------- 升級步進器 ---------- */}
      <div className="build-stepper">
        <div className="build-step-row">
          <button className="ghost-btn build-pm" onClick={() => setLevel(lv - 1)} disabled={lv <= baseLv}>
            −
          </button>
          <div className="build-lv">
            <span className="tb-label">目前等級</span>
            <input
              type="number"
              className="build-lv-input"
              value={lvText}
              min={baseLv}
              max={MAX_LV}
              onChange={(e) => onLvChange(e.target.value)}
              onBlur={onLvBlur}
            />
          </div>
          <button className="gold-btn build-pm" onClick={() => setLevel(lv + 1)} disabled={lv >= MAX_LV}>
            ＋
          </button>
        </div>
        <input
          type="range"
          className="build-slider"
          min={baseLv}
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
            加 <b style={{ color: statMeta[next.stat].color }}>【{statMeta[next.stat].name}】</b>
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
          <div className="build-next-note">200 級之後自由配點建議順序：集中力 → 30、耐力 → 35，生命力以外皆可。</div>
        </div>
      )}

      {/* ---------- 屬性面板 ---------- */}
      <div className="build-section">
        <div className="build-section-title">目前屬性 · Lv{lv}</div>
        <div className="build-stats">
          {statOrder.map((k) => {
            const m = statMeta[k];
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
        <div className="build-softcaps">{build.softcaps}</div>
      </div>

      {/* ---------- 裝備解鎖 ---------- */}
      <div className="build-section">
        <div className="build-section-title">裝備解鎖狀態</div>
        <div className="build-route">{build.route}</div>
        <div className="build-gear">
          {build.gear.map((g) => {
            const missing = (Object.entries(g.req) as [StatKey, number][])
              .filter(([k, v]) => stats[k] < v)
              .map(([k, v]) => `${statMeta[k].name} ${stats[k]}/${v}`);
            const ok = missing.length === 0;
            return (
              <div key={g.name} className={"build-gear-row" + (ok ? "" : " locked")}>
                <span className="build-gear-mark">{ok ? "✓" : "✗"}</span>
                <span className="build-gear-name">{g.name}</span>
                <span className="badge">{g.tag}</span>
                <span className="build-gear-req">
                  {ok
                    ? (Object.entries(g.req) as [StatKey, number][])
                        .map(([k, v]) => `${statMeta[k].en}${v}`)
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
          {(showAll ? plan : upcoming).map((p) => {
            const m = statMeta[p.stat];
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
        Lv5→57 為共用段，對應實機存檔；Lv57 起依所選 build 分流。若實際配點偏離，擊敗蕾娜菈後用幼生露滴洗點對齊即可 · 目前等級自動儲存
      </div>
    </div>
  );
}
