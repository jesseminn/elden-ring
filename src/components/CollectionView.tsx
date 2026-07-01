import { Fragment } from "react";
import {
  collectByKind,
  kindStats,
  collectionOverall,
  chapterForCollect,
  bellSeriesLabel,
  isDone as resolveDone,
  SERIES_KINDS,
  INCOMPLETE_KINDS,
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

  const items = group.items.filter((g) => !(hideDone && resolveDone(done, g.item.id)));

  return (
    <div className={"chapter" + (expanded ? "" : " collapsed")}>
      <div className="chapter-head" onClick={() => dispatch({ type: "toggleChapter", id: "kind-" + group.kind })}>
        <div className="ch-head-main">
          <div className="ch-head-top">
            <span className="chapter-title">{group.kind}</span>
            <span className={"chapter-pct" + (p === 100 ? " full" : "")} title={`${stats.done}/${stats.total}`}>
              {p}%
            </span>
            {isSeries && <span className="kind-series-tag">系列</span>}
          </div>
          <div className="kind-count">{stats.done}/{stats.total} 項</div>
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
        <span className="chapter-caret"><Icon name="chevron" /></span>
      </div>

      {expanded && (
        <div className="chapter-body">
          {INCOMPLETE_KINDS.has(group.kind) && (
            <div className="region-note">⚠ 此清單僅列流程提到的，並不完整（武器/防具/戰灰量大，未逐項收錄）</div>
          )}
          {(() => {
            let prevSub: string | null = null;
            return items.map(({ item, regionName }) => {
              const isDone = resolveDone(done, item.id);
              const link = chapterForCollect(item.id);
              const sub = group.kind === "鈴珠" ? bellSeriesLabel(item.text) : null;
              const showSub = !!sub && sub !== prevSub;
              prevSub = sub;
              return (
                <Fragment key={item.id}>
                  {showSub && <div className="citem-subhead">{sub}</div>}
                  <label className={"citem" + (isDone ? " done" : "")}>
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
                </Fragment>
              );
            });
          })()}
          {items.length === 0 && <div className="empty-note">（此類別已全部取得）</div>}
        </div>
      )}
    </div>
  );
}
