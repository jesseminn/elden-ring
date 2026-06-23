import {
  collectRegions,
  collectRegionStats,
  collectionOverall,
  collectKinds,
  kindStats,
  pct,
  type DoneMap,
} from "../lib/data";
import type { CollectRegion } from "../types";
import { useAppState, useDispatch } from "../store";
import Icon from "./Icon";

export default function CollectionView() {
  const { done, ui } = useAppState();
  const dispatch = useDispatch();
  const overall = collectionOverall(done);
  const expIds = collectRegions.map((r) => "exp-" + r.id);

  // 系列 = 有 2 項以上的種類
  const series = collectKinds
    .map((k) => ({ kind: k, ...kindStats(k, done) }))
    .filter((s) => s.total >= 2);

  return (
    <div className="view">
      <div className="collect-summary">
        <div className="overall-bar">
          <div className="overall-fill" style={{ width: pct(overall.done, overall.total) + "%" }} />
        </div>
        <div className="collect-summary-text">
          收集進度 <b>{overall.done} / {overall.total}</b> · {pct(overall.done, overall.total)}%
        </div>
      </div>

      <div className="series-bar">
        <span className="tb-label">系列（點擊看所有取得地點）</span>
        <div className="series-pills">
          {series.map((s) => {
            const full = s.done === s.total;
            return (
              <button
                key={s.kind}
                className={"series-pill" + (full ? " full" : "")}
                onClick={() => dispatch({ type: "openSeries", kind: s.kind })}
              >
                {s.kind} <span className="sp-count">{s.done}/{s.total}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="toolbar2">
        <div className="tb-row">
          <label className="chk">
            <input
              type="checkbox"
              checked={ui.hideDone}
              onChange={(e) => dispatch({ type: "setHideDone", value: e.target.checked })}
            />
            隱藏已取得
          </label>
          <span className="tb-spacer" />
          <button className="ghost-btn small" onClick={() => dispatch({ type: "setAllCollapsed", ids: expIds, value: true })}>
            展開
          </button>
          <button className="ghost-btn small" onClick={() => dispatch({ type: "setAllCollapsed", ids: expIds, value: false })}>
            收合
          </button>
        </div>
      </div>

      {collectRegions.map((r) => (
        <RegionCard key={r.id} region={r} done={done} hideDone={ui.hideDone} expanded={!!ui.collapsed["exp-" + r.id]} />
      ))}
    </div>
  );
}

function RegionCard({
  region,
  done,
  hideDone,
  expanded,
}: {
  region: CollectRegion;
  done: DoneMap;
  hideDone: boolean;
  expanded: boolean;
}) {
  const dispatch = useDispatch();
  const stats = collectRegionStats(region, done);
  const p = pct(stats.done, stats.total);

  const items = region.items.filter((it) => !(hideDone && done[it.id]));

  return (
    <div className={"chapter" + (expanded ? "" : " collapsed")}>
      <div className="chapter-head" onClick={() => dispatch({ type: "toggleChapter", id: "exp-" + region.id })}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
            <span className="chapter-title">{region.name}</span>
            <span style={{ fontSize: 11, color: "var(--muted2)", fontStyle: "italic" }}>{region.en}</span>
          </div>
          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
            {region.lv} · {region.wpn} · {stats.done}/{stats.total}
          </div>
        </div>
        <span className="chapter-prog">
          <span className={"ring" + (p === 100 ? " full" : "")} title={`${stats.done}/${stats.total}`}>
            <svg viewBox="0 0 36 36">
              <circle className="ring-bg" cx="18" cy="18" r="15.5" />
              <circle className="ring-fg" cx="18" cy="18" r="15.5" pathLength={100} strokeDasharray={`${p} 100`} />
            </svg>
            <span className="ring-pct">{p}%</span>
          </span>
          <span className="chapter-caret"><Icon name="chevron" /></span>
        </span>
      </div>

      {expanded && (
        <div className="chapter-body">
          {region.note && <div className="region-note">{region.note}</div>}
          {items.map((it) => {
            const isDone = !!done[it.id];
            return (
              <label key={it.id} className={"citem" + (isDone ? " done" : "")}>
                <input
                  type="checkbox"
                  checked={isDone}
                  onChange={(e) => dispatch({ type: "toggleStep", id: it.id, value: e.target.checked })}
                />
                <span className="citem-main">
                  <span className="citem-top">
                    <button
                      className="chip kind clickable"
                      title={`查看所有「${it.kind}」取得地點`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        dispatch({ type: "openSeries", kind: it.kind });
                      }}
                    >
                      {it.kind}
                    </button>
                    {it.miss && <span className="miss-tag">易斷</span>}
                  </span>
                  <span className="citem-text">{it.text}</span>
                  {it.note && <span className="citem-note">{it.note}</span>}
                </span>
              </label>
            );
          })}
          {items.length === 0 && <div className="empty-note">（此區已全部取得）</div>}
        </div>
      )}
    </div>
  );
}
