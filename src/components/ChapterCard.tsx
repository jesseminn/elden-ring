import { memo } from "react";
import type { Chapter, Step } from "../types";
import { chapterStats, pct, isDone, type DoneMap, type SkipMap } from "../lib/data";
import { useDispatch, type Facets } from "../store";
import { StepRow } from "./StepRow";
import Icon from "./Icon";

interface Props {
  chapter: Chapter;
  done: DoneMap;
  collapsed: boolean;
  hideDone: boolean;
  facets: Facets;
  anyFacet: boolean;
  currentStepId: string | null;
  skipped: SkipMap;
  flashStepId: string | null;
}

const matchFacet = (s: Step, f: Facets) =>
  (f.boss && s.boss) ||
  (f.collect && s.items.length > 0) ||
  (f.npc && s.quests.length > 0);

function ChapterCardInner({ chapter, done, collapsed, hideDone, facets, anyFacet, currentStepId, skipped, flashStepId }: Props) {
  const dispatch = useDispatch();
  const stats = chapterStats(chapter, done);

  const visibleSteps = chapter.steps.filter((s) => {
    if (anyFacet) {
      if (s.type === "note") return false; // 篩選時隱藏提示
      if (!matchFacet(s, facets)) return false;
    }
    if (hideDone && s.type !== "note" && isDone(done, s.id)) return false;
    return true;
  });

  // 篩選後本章沒有任何符合的步驟就整章隱藏
  if (anyFacet && visibleSteps.length === 0) return null;

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
          {(() => {
            const p = pct(stats.done, stats.total);
            return (
              <span className={"ring" + (p === 100 ? " full" : "")} title={`${stats.done}/${stats.total}`}>
                <svg viewBox="0 0 36 36">
                  <circle className="ring-bg" cx="18" cy="18" r="15.5" />
                  <circle className="ring-fg" cx="18" cy="18" r="15.5" pathLength={100} strokeDasharray={`${p} 100`} />
                </svg>
                <span className="ring-pct">{p}%</span>
              </span>
            );
          })()}
          <span className="chapter-caret"><Icon name="chevron" /></span>
        </span>
      </div>

      {!collapsed && (
        <div className="chapter-body">
          {visibleSteps.map((s) => (
            <StepRow
              key={s.id}
              step={s}
              done={isDone(done, s.id)}
              isCurrent={s.id === currentStepId}
              skipped={!!skipped[s.id]}
              flash={s.id === flashStepId}
            />
          ))}
          {visibleSteps.length === 0 && <div className="empty-note">（此章已全部完成）</div>}
        </div>
      )}
    </div>
  );
}

export const ChapterCard = memo(ChapterCardInner);
