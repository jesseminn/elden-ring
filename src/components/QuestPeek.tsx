import { useEffect } from "react";
import {
  questById,
  stepById,
  chapterById,
  questStats,
  questNextId,
  pct,
} from "../lib/data";
import { useAppState, useDispatch } from "../store";

export default function QuestPeek() {
  const { peek, done } = useAppState();
  const dispatch = useDispatch();

  // Esc 關閉
  useEffect(() => {
    if (!peek) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && dispatch({ type: "closePeek" });
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [peek, dispatch]);

  if (!peek) return null;
  const quest = questById[peek.qid];
  if (!quest) return null;

  const st = questStats(quest, done);
  const p = pct(st.done, st.total);
  const complete = st.total > 0 && st.done === st.total;
  const nextId = questNextId(quest, done);
  const nextStep = nextId ? stepById[nextId] : null;
  const nextChapter = nextStep ? chapterById[nextStep.chapterId] : null;

  return (
    <div className="sheet-backdrop" onClick={() => dispatch({ type: "closePeek" })}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grip" />
        <div className="sheet-head">
          <span className="qc-dot" style={{ background: quest.color }} />
          <div className="qc-main">
            <div className="qc-name">{quest.name}</div>
            {quest.desc && <div className="qc-sub">{quest.desc}</div>}
          </div>
          <span className="qc-count">
            {st.done}/{st.total} · {p}%
          </span>
        </div>

        {complete ? (
          <div className="qc-next qc-alldone">✓ 此支線全部步驟已完成</div>
        ) : nextStep && nextChapter ? (
          <div className="qc-next">
            下一步：{nextStep.text}
            <span style={{ color: "var(--muted)" }}>
              （第 {nextChapter.num} 章 {nextChapter.title}）
            </span>
          </div>
        ) : null}

        <div className="sheet-body">
          <div className="timeline">
            {quest.stepIds.map((sid) => {
              const s = stepById[sid];
              const ch = chapterById[s.chapterId];
              const isDone = !!done[sid];
              const isNext = sid === nextId;
              const isFrom = sid === peek.fromStepId;
              return (
                <div
                  key={sid}
                  className={"tl-step" + (isDone ? " done" : "") + (isNext ? " current" : "") + (isFrom ? " from" : "")}
                >
                  <div className="tl-node" />
                  <div className="tl-head">
                    <label className="tl-cb">
                      <input
                        type="checkbox"
                        checked={isDone}
                        onChange={(e) => dispatch({ type: "toggleStep", id: sid, value: e.target.checked })}
                      />
                    </label>
                    <span className="tl-text">
                      {s.text}
                      {isFrom && <span className="from-tag">你在這</span>}
                    </span>
                    <button
                      className="tl-loc"
                      title="跳到線性流程中的這一步"
                      onClick={() => dispatch({ type: "gotoStep", chapterId: ch.id, stepId: sid })}
                    >
                      第{ch.num}章 ›
                    </button>
                  </div>
                  {(s.boss || s.location) && (
                    <div className="tl-extra">
                      {s.boss && <span className="chip boss">BOSS</span>}
                      {s.location && <span className="chip loc">{s.location}</span>}
                    </div>
                  )}
                  {s.detail.length > 0 && (
                    <div className="tl-detail">
                      {s.detail.map((d, i) => (
                        <div className="dl" key={i}>
                          {d}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <button className="sheet-close" onClick={() => dispatch({ type: "closePeek" })}>
          關閉
        </button>
      </div>
    </div>
  );
}
