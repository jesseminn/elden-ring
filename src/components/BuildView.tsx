import { useEffect, useMemo, useState } from "react";
import { useAppState, useDispatch } from "../store";
import SheetSelect from "./SheetSelect";
import Icon from "./Icon";
import {
  statMeta,
  statOrder,
  base,
  baseLv,
  builds,
  earlySegments,
  classes,
  metaBuilds,
  wasteOf,
  wasteByStat,
  finalStats,
  buildLevel,
} from "../lib/builds";
import type { StatKey, Stats, Segment } from "../types";

/* ============================================================
   配點器
   主角 = 升級與配點進度追蹤（盜賊感應流 Lv5→200 逐級計畫，對應實機存檔）
   輔助 = 先選初始職業、再選流派（流派依浪費少→多排序）；
          流派右上「詳情」按鈕展開該流派的浪費分析。
   官方繁中屬性名：生命力/集中力/耐力/力氣/靈巧/智力/信仰/感應
   ============================================================ */

function suitability(waste: number): { label: string; cls: string } {
  if (waste === 0) return { label: "完美契合 · 零浪費", cls: "perfect" };
  if (waste <= 3) return { label: "極省 · 幾乎無浪費", cls: "great" };
  if (waste <= 7) return { label: "普通 · 小幅浪費", cls: "ok" };
  return { label: "不建議 · 浪費偏大", cls: "bad" };
}

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
  const [showDetail, setShowDetail] = useState(false);

  const cls = classes.find((c) => c.id === state.ui.classId) ?? classes[0];

  // 流派依「此職業浪費點數」由少到多排序（穩定排序）
  const rankedBuilds = useMemo(
    () =>
      metaBuilds
        .map((b, i) => ({ b, w: wasteOf(cls, b), i }))
        .sort((a, z) => a.w - z.w || a.i - z.i),
    [cls],
  );
  const meta = metaBuilds.find((b) => b.id === state.ui.metaBuildId) ?? metaBuilds[0];

  return (
    <div className="view build-view">
      {/* ---------- 選單：先職業、再流派（流派右上有「詳情」） ---------- */}
      <div className="mb-pickers">
        <SheetSelect
          label="初始職業"
          sheetTitle="選擇初始職業"
          sheetSub="起始等級與八維決定配點浪費"
          value={cls.id}
          onChange={(id) => dispatch({ type: "setClassId", id })}
          options={classes.map((c) => ({
            value: c.id,
            title: c.name,
            sub: `${c.en} · 起始 Lv${c.lv}`,
          }))}
        />
        <SheetSelect
          label="流派（依浪費少→多）"
          sheetTitle="選擇流派"
          sheetSub="依目前職業浪費點數由少到多排序"
          value={meta.id}
          onChange={(id) => dispatch({ type: "setMetaBuildId", id })}
          headExtra={
            <button
              type="button"
              className={"ghost-btn small mb-detail-btn" + (showDetail ? " on" : "")}
              onClick={() => setShowDetail((v) => !v)}
            >
              {showDetail ? "收合" : "詳情"} <Icon name="chevron" className={"mb-caret" + (showDetail ? " up" : "")} />
            </button>
          }
          options={rankedBuilds.map(({ b, w }) => ({
            value: b.id,
            title: b.name,
            sub: b.tag,
            badge: `浪費 ${w}`,
          }))}
        />
      </div>

      {/* ---------- 流派詳情（點「詳情」才展開）：浪費分析 ---------- */}
      {showDetail && <BuildDetail cls={cls} meta={meta} />}

      {/* ---------- 主角：升級與配點進度追蹤 ---------- */}
      <ProgressTracker />

      <div className="build-footer">
        逐級計畫對應實機存檔（Lv5→57 共用段），Lv57 起依流派分流；若實際配點偏離，擊敗蕾娜菈後用幼生露滴洗點對齊 · 目前等級與選擇自動儲存
      </div>
    </div>
  );
}

/* ============================================================
   流派詳情：職業 × 流派 的浪費分析（預設收合，點「詳情」展開）
   浪費＝Σ max(0, 職業起始值 − 流派所需)：洗點不能低於職業起始值，用不到的高起始屬性=永久浪費
   ============================================================ */
function BuildDetail({ cls, meta }: { cls: (typeof classes)[number]; meta: (typeof metaBuilds)[number] }) {
  const dispatch = useDispatch();
  const waste = wasteOf(cls, meta);
  const wst = wasteByStat(cls, meta);
  const fin = finalStats(cls, meta);
  const finalLv = buildLevel(fin); // = 150 + 浪費
  const suit = suitability(waste);
  const bestClasses = useMemo(
    () =>
      classes
        .map((c) => ({ c, w: wasteOf(c, meta) }))
        .sort((a, z) => a.w - z.w)
        .slice(0, 3),
    [meta],
  );

  return (
    <div className="mb-detail">
      <div className={"mb-verdict " + suit.cls}>
        <div className="mb-verdict-top">
          <span className="mb-verdict-name">
            {cls.name} → {meta.name}
          </span>
          <span className="badge">{meta.tag}</span>
        </div>
        <div className="mb-verdict-waste">
          浪費 <b>{waste}</b> 點 · {suit.label}
        </div>
        <div className="mb-verdict-sub">
          走完此流派實際會到 Lv{finalLv}
          {waste > 0 ? `（比理想多 ${waste} 級，全卡在用不到的屬性洗不掉）` : "（剛好 Lv150，無冗餘）"}
        </div>
        {waste > 0 && (
          <div className="mb-waste-chips">
            {statOrder
              .filter((k) => wst[k] > 0)
              .map((k) => (
                <span key={k} className="mb-waste-chip" style={{ borderColor: statMeta[k].color }}>
                  {statMeta[k].name} +{wst[k]}
                </span>
              ))}
          </div>
        )}
        <div className="mb-verdict-blurb">{meta.blurb}</div>
      </div>

      {/* Lv150 目標面板 */}
      <div className="build-section">
        <div className="build-section-title">Lv150 目標面板 · {cls.name}起手</div>
        <div className="build-stats">
          {statOrder.map((k) => {
            const m = statMeta[k];
            const v = fin[k];
            const isPrimary = meta.primary.includes(k);
            const wasted = wst[k] > 0;
            return (
              <div
                key={k}
                className={"build-stat" + (isPrimary ? " next" : "") + (wasted ? " mb-stat-wasted" : "")}
              >
                <span className="build-stat-name">
                  {m.name}
                  <span className="build-stat-en">{m.en}</span>
                </span>
                <div className="build-stat-bar">
                  <div style={{ width: (v / 99) * 100 + "%", background: m.color }} />
                </div>
                <span className="build-stat-val">
                  {v}
                  {wasted ? <span className="mb-stat-waste-tag"> (+{wst[k]}廢)</span> : isPrimary ? " ★" : ""}
                </span>
              </div>
            );
          })}
        </div>
        <div className="build-softcaps">
          職業起手：{statOrder.map((k) => `${statMeta[k].name}${cls.stats[k]}`).join(" / ")}
          。★ = 主屬性；標「廢」者為職業起始值高於本流派所需、洗點也降不掉的浪費。
        </div>
      </div>

      {/* 代表武器 */}
      <div className="build-section">
        <div className="build-section-title">代表武器 · 對 Lv150 目標</div>
        <div className="build-gear">
          {meta.gear.map((g) => {
            const missing = (Object.entries(g.req) as [StatKey, number][])
              .filter(([k, v]) => meta.target[k] < v)
              .map(([k, v]) => `${statMeta[k].name} ${meta.target[k]}/${v}`);
            const ok = missing.length === 0;
            return (
              <div key={g.name} className={"build-gear-row" + (ok ? "" : " locked")}>
                <span className="build-gear-mark">{ok ? <Icon name="check" /> : <Icon name="x" />}</span>
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

      {/* 此流派最省職業 Top3 */}
      <div className="build-section">
        <div className="build-section-title">{meta.name} · 最省的初始職業</div>
        <div className="mb-rank">
          {bestClasses.map(({ c, w }, i) => (
            <button
              key={c.id}
              className={"mb-rank-row" + (c.id === cls.id ? " current" : "")}
              onClick={() => dispatch({ type: "setClassId", id: c.id })}
            >
              <span className="mb-rank-no">{i + 1}</span>
              <span className="mb-rank-name">{c.name}</span>
              <span className="mb-rank-waste">浪費 {w}</span>
            </button>
          ))}
        </div>
        <div className="build-softcaps">點選即切換到該職業。浪費＝Σ max(0, 職業起始值 − 流派所需)。</div>
      </div>
    </div>
  );
}

/* ============================================================
   主角：升級與配點進度追蹤（盜賊感應流 Lv5→200 逐級計畫）
   逐級資料僅出血流/龍饗具備；以 metaBuildId 連動。
   ============================================================ */
function ProgressTracker() {
  const state = useAppState();
  const dispatch = useDispatch();

  // 只有出血流/龍饗在 builds[] 有逐級資料
  const detail = builds.find((b) => b.id === state.ui.metaBuildId);
  const build = detail ?? builds[0];
  const plan = useMemo(() => buildPlan([...earlySegments, ...build.tail]), [build]);
  const MAX_LV = baseLv + plan.length; // 200

  const lv = Math.max(baseLv, Math.min(MAX_LV, state.ui.buildLv ?? baseLv));
  const setLevel = (v: number) =>
    dispatch({ type: "setBuildLv", lv: Math.max(baseLv, Math.min(MAX_LV, v)) });

  const [showAll, setShowAll] = useState(false);
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

  if (!detail) {
    // 所選流派沒有逐級資料：引導回有逐級計畫的流派
    return (
      <div className="build-section pt-empty">
        <div className="build-section-title">升級與配點進度追蹤</div>
        <div className="build-softcaps">
          目前所選流派「{metaBuilds.find((b) => b.id === state.ui.metaBuildId)?.name}」尚無逐級配點計畫。
          逐級實戰計畫目前提供「出血流」與「龍饗流」，請在上方流派選單切換到這兩者之一。
        </div>
        <div className="pt-jump">
          <button className="gold-btn small" onClick={() => dispatch({ type: "setMetaBuildId", id: "bleed" })}>
            切到出血流逐級計畫
          </button>
          <button className="ghost-btn small" onClick={() => dispatch({ type: "setMetaBuildId", id: "dragon" })}>
            切到龍饗流逐級計畫
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="pt-head">
        <div className="build-section-title">升級與配點進度追蹤 · {build.name}</div>
      </div>
      <div className="build-intro">{build.intro}</div>

      {/* 升級步進器 */}
      <div className="build-stepper">
        <div className="build-step-row">
          <button className="ghost-btn build-pm" onClick={() => setLevel(lv - 1)} disabled={lv <= baseLv} aria-label="降一級">
            <Icon name="minus" />
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
          <button className="gold-btn build-pm" onClick={() => setLevel(lv + 1)} disabled={lv >= MAX_LV} aria-label="升一級">
            <Icon name="plus" />
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

      {/* 下一級 */}
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

      {/* 屬性面板 */}
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

      {/* 裝備解鎖 */}
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
                <span className="build-gear-mark">{ok ? <Icon name="check" /> : <Icon name="x" />}</span>
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

      {/* 完整時間軸 */}
      <div className="build-section">
        <div className="build-section-head">
          <div className="build-section-title">完整配點時間軸（點任一級可跳轉）</div>
          <button className="ghost-btn small" onClick={() => setShowAll(!showAll)}>
            {showAll ? "收合，只看附近" : `展開全部 ${plan.length} 級`}
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
                  {passed && <span className="build-tl-check"><Icon name="check" /></span>}
                </button>
                {p.note && <div className="build-tl-note">◆ {p.note}</div>}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
