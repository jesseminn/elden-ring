import {
  collectRegions,
  collectRegionStats,
  collectionOverall,
  collectKinds,
  pct,
  type DoneMap,
} from "../lib/data";
import type { CollectRegion } from "../types";
import { useAppState, useDispatch } from "../store";

export default function CollectionView() {
  const { done, ui } = useAppState();
  const dispatch = useDispatch();
  const kind = ui.collectKind;
  const overall = collectionOverall(done);

  const expIds = collectRegions.map((r) => "exp-" + r.id);

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

      <div className="toolbar">
        <select
          className="kind-select"
          value={kind}
          onChange={(e) => dispatch({ type: "setCollectKind", kind: e.target.value })}
        >
          <option value="">全部種類</option>
          {collectKinds.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
        <label className="chk">
          <input
            type="checkbox"
            checked={ui.hideDone}
            onChange={(e) => dispatch({ type: "setHideDone", value: e.target.checked })}
          />
          隱藏已取得
        </label>
        <button className="ghost-btn small" onClick={() => dispatch({ type: "setAllCollapsed", ids: expIds, value: true })}>
          全部展開
        </button>
        <button className="ghost-btn small" onClick={() => dispatch({ type: "setAllCollapsed", ids: expIds, value: false })}>
          全部收合
        </button>
      </div>

      {collectRegions.map((r) => (
        <RegionCard key={r.id} region={r} done={done} kind={kind} hideDone={ui.hideDone} expanded={!!ui.collapsed["exp-" + r.id]} />
      ))}
    </div>
  );
}

function RegionCard({
  region,
  done,
  kind,
  hideDone,
  expanded,
}: {
  region: CollectRegion;
  done: DoneMap;
  kind: string;
  hideDone: boolean;
  expanded: boolean;
}) {
  const dispatch = useDispatch();
  const stats = collectRegionStats(region, done);
  const p = pct(stats.done, stats.total);

  const items = region.items.filter((it) => {
    if (kind && it.kind !== kind) return false;
    if (hideDone && done[it.id]) return false;
    return true;
  });

  // 套用種類 filter 後本區沒有項目就隱藏
  if (kind && region.items.every((it) => it.kind !== kind)) return null;

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
          <span className="chapter-caret">▸</span>
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
                    <span className="chip kind">{it.kind}</span>
                    {it.miss && <span className="miss-tag">易斷</span>}
                  </span>
                  <span className="citem-text">{it.text}</span>
                  {it.note && <span className="citem-note">{it.note}</span>}
                </span>
              </label>
            );
          })}
          {items.length === 0 && <div className="empty-note">（此區目前篩選下沒有項目）</div>}
        </div>
      )}
    </div>
  );
}
