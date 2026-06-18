import { memo } from "react";
import type { Chapter } from "../types";
import { chapterStats, pct, type DoneMap } from "../lib/data";
import { useDispatch } from "../store";
import { StepRow } from "./StepRow";

interface Props {
  chapter: Chapter;
  done: DoneMap;
  collapsed: boolean;
  hideDone: boolean;
  currentStepId: string | null;
  flashStepId: string | null;
}

function ChapterCardInner({ chapter, done, collapsed, hideDone, currentStepId, flashStepId }: Props) {
  const dispatch = useDispatch();
  const stats = chapterStats(chapter, done);

  return (
    <div className={"chapter" + (collapsed ? " collapsed" : "")} data-ch={chapter.id}>
      <div className="chapter-head" onClick={() => dispatch({ type: "toggleChapter", id: chapter.id })}>
        <span className="chapter-num">{chapter.num}</span>
        <span className="chapter-title">{chapter.title}</span>
        <span className="chapter-meta">
          {chapter.level && <span className="badge lvl">Lv {chapter.level}</span>}
          {chapter.upgrade && <span className="badge upg">強化 {chapter.upgrade}</span>}
          {chapter.nonMainline && <span className="badge side">非主線地圖</span>}
        </span>
        <span className="chapter-prog">
          <span>
            {stats.done}/{stats.total}
          </span>
          <span className="mini-bar">
            <span className="mini-fill" style={{ width: pct(stats.done, stats.total) + "%" }} />
          </span>
          <span className="chapter-caret">▾</span>
        </span>
      </div>

      {!collapsed && (
        <div className="chapter-body">
          {chapter.steps.map((s) => {
            if (hideDone && s.type !== "note" && done[s.id]) return null;
            return (
              <StepRow
                key={s.id}
                step={s}
                done={!!done[s.id]}
                isCurrent={s.id === currentStepId}
                flash={s.id === flashStepId}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

export const ChapterCard = memo(ChapterCardInner);
