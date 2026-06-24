import {
  collectByKind,
  kindStats,
  collectionOverall,
  chapterForCollect,
  SERIES_KINDS,
  pct,
  type DoneMap,
  type KindGroup,
} from "../lib/data";
import { useAppState, useDispatch } from "../store";
import Icon from "./Icon";

export default function CollectionView() {
  const { done, ui } = useAppState();
  const dispatch = useDispatch();
  const overall = collectionOverall(done);
  const allIds = collectByKind.map((g) => "kind-" + g.kind);

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
          <button className="ghost-btn small" onClick={() => dispatch({ type: "setAllCollapsed", ids: allIds, value: true })}>
            展開
          </button>
          <button className="ghost-btn small" onClick={() => dispatch({ type: "setAllCollapsed", ids: allIds, value: false })}>
            收合
          </button>
        </div>
      </div>

      {collectByKind.map((g) => (
        <KindCard key={g.kind} group={g} done={done} hideDone={ui.hideDone} expanded={!!ui.collapsed["kind-" + g.kind]} />
      ))}
    </div>
  );
}

function KindCard({
  group,
  done,
  hideDone,
  expanded,
}: {
  group: KindGroup;
  done: DoneMap;
  hideDone: boolean;
  expanded: boolean;
}) {
  const dispatch = useDispatch();
  const stats = kindStats(group.kind, done);
  const p = pct(stats.done, stats.total);
  const isSeries = SERIES_KINDS.has(group.kind);

  const items = group.items.filter((g) => !(hideDone && done[g.item.id]));

  return (
    <div className={"chapter" + (expanded ? "" : " collapsed")}>
      <div className="chapter-head" onClick={() => dispatch({ type: "toggleChapter", id: "kind-" + group.kind })}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
            <span className="chapter-title">{group.kind}</span>
            {isSeries && <span className="kind-series-tag">系列</span>}
          </div>
          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
            {stats.done}/{stats.total} 項
          </div>
        </div>
        {isSeries && (
          <button
            className="ghost-btn small"
            title="在地圖視角檢視此系列所有取得位置"
            onClick={(e) => {
              e.stopPropagation();
              dispatch({ type: "openSeries", kind: group.kind });
            }}
          >
            全地圖 <Icon name="arrowUpRight" />
          </button>
        )}
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
          {items.map(({ item, regionName }) => {
            const isDone = !!done[item.id];
            const link = chapterForCollect(item.id);
            return (
              <label key={item.id} className={"citem" + (isDone ? " done" : "")}>
                <input
                  type="checkbox"
                  checked={isDone}
                  onChange={(e) => dispatch({ type: "toggleStep", id: item.id, value: e.target.checked })}
                />
                <span className="citem-main">
                  <span className="citem-top">
                    <span className="citem-region">{regionName}</span>
                    {item.miss && <span className="miss-tag">易斷</span>}
                    {link && (
                      <button
                        className="tl-loc"
                        title="在線性流程中查看此步驟"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          dispatch({ type: "gotoStep", chapterId: link.chapterId, stepId: link.stepId });
                        }}
                      >
                        第{link.num}章 ›
                      </button>
                    )}
                  </span>
                  <span className="citem-text">{item.text}</span>
                  {item.note && <span className="citem-note">{item.note}</span>}
                </span>
              </label>
            );
          })}
          {items.length === 0 && <div className="empty-note">（此類別已全部取得）</div>}
        </div>
      )}
    </div>
  );
}
