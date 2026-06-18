import { useEffect, useMemo } from "react";
import { data, currentStepId } from "../lib/data";
import { useAppState, useDispatch } from "../store";
import { ChapterCard } from "./ChapterCard";

export default function FlowView({ onToast }: { onToast: (m: string) => void }) {
  const state = useAppState();
  const dispatch = useDispatch();
  const { done, ui, highlight } = state;

  const curId = useMemo(() => currentStepId(done), [done]);

  // 跳轉動畫播完後清除 highlight
  useEffect(() => {
    if (highlight) {
      const t = setTimeout(() => dispatch({ type: "clearHighlight" }), 1000);
      return () => clearTimeout(t);
    }
  }, [highlight, dispatch]);

  const chapterIds = data.chapters.map((c) => c.id);

  const jumpCurrent = () => {
    if (!curId) {
      onToast("流程已全部完成 🎉");
      return;
    }
    const ch = data.chapters.find((c) => c.steps.some((s) => s.id === curId))!;
    dispatch({ type: "gotoStep", chapterId: ch.id, stepId: curId });
  };

  return (
    <div className="view">
      <div className="toolbar">
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
          只看主線章節
        </label>
        <button className="ghost-btn small" onClick={() => dispatch({ type: "setAllCollapsed", ids: chapterIds, value: false })}>
          全部展開
        </button>
        <button className="ghost-btn small" onClick={() => dispatch({ type: "setAllCollapsed", ids: chapterIds, value: true })}>
          全部收合
        </button>
        <button className="gold-btn small" onClick={jumpCurrent}>
          跳到目前進度 ▾
        </button>
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
            currentStepId={curId}
            flashStepId={highlight?.stepId ?? null}
          />
        );
      })}
    </div>
  );
}
