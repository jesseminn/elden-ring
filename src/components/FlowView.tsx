import { useEffect, useMemo } from "react";
import { data, currentStepId } from "../lib/data";
import { useAppState, useDispatch } from "../store";
import { ChapterCard } from "./ChapterCard";

export default function FlowView() {
  const state = useAppState();
  const dispatch = useDispatch();
  const { done, skipped, ui, highlight } = state;

  const curId = useMemo(() => currentStepId(done, skipped), [done, skipped]);

  // 跳轉動畫播完後清除 highlight
  useEffect(() => {
    if (highlight) {
      const t = setTimeout(() => dispatch({ type: "clearHighlight" }), 1000);
      return () => clearTimeout(t);
    }
  }, [highlight, dispatch]);

  const chapterIds = data.chapters.map((c) => c.id);

  const facets = ui.facets;
  const anyFacet = facets.boss || facets.collect || facets.npc;

  const FACETS: { key: "boss" | "collect" | "npc"; label: string; cls: string }[] = [
    { key: "boss", label: "BOSS", cls: "f-boss" },
    { key: "collect", label: "收集", cls: "f-collect" },
    { key: "npc", label: "支線", cls: "f-npc" },
  ];

  return (
    <div className="view">
      <div className="toolbar2">
        <div className="tb-row">
          <span className="tb-label">篩選</span>
          {FACETS.map((f) => (
            <button
              key={f.key}
              className={"pill " + f.cls + (facets[f.key] ? " on" : "")}
              onClick={() => dispatch({ type: "toggleFacet", facet: f.key })}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="tb-row">
          <span className="tb-label">檢視</span>
          <label className="chk">
            <input
              type="checkbox"
              checked={ui.hideDone}
              onChange={(e) => dispatch({ type: "setHideDone", value: e.target.checked })}
            />
            隱藏已完成
          </label>
          <label className="chk">
            <input
              type="checkbox"
              checked={ui.onlyMain}
              onChange={(e) => dispatch({ type: "setOnlyMain", value: e.target.checked })}
            />
            只看主線
          </label>
          <span className="tb-spacer" />
          <button className="ghost-btn small" onClick={() => dispatch({ type: "setAllCollapsed", ids: chapterIds, value: false })}>
            展開
          </button>
          <button className="ghost-btn small" onClick={() => dispatch({ type: "setAllCollapsed", ids: chapterIds, value: true })}>
            收合
          </button>
        </div>
      </div>

      {data.chapters.map((ch) => {
        if (ui.onlyMain && ch.nonMainline) return null;
        return (
          <ChapterCard
            key={ch.id}
            chapter={ch}
            done={done}
            collapsed={!!ui.collapsed[ch.id]}
            hideDone={ui.hideDone}
            facets={facets}
            anyFacet={anyFacet}
            currentStepId={curId}
            skipped={skipped}
            flashStepId={highlight?.stepId ?? null}
          />
        );
      })}
    </div>
  );
}
