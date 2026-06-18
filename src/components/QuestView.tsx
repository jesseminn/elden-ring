import { useEffect, useRef } from "react";
import {
  data,
  stepById,
  chapterById,
  questStats,
  questNextId,
  pct,
  type DoneMap,
} from "../lib/data";
import type { Quest } from "../types";
import { useAppState, useDispatch } from "../store";

export default function QuestView() {
  const { done, ui } = useAppState();
  const major = data.quests.filter((q) => q.major);
  const minor = data.quests.filter((q) => !q.major);

  return (
    <div className="view">
      <div className="quest-cards">
        <div className="qc-group">主要支線</div>
        {major.map((q) => (
          <QuestCard key={q.id} quest={q} done={done} open={ui.activeQuest === q.id} />
        ))}
        <div className="qc-group">其他 NPC / 收集</div>
        {minor.map((q) => (
          <QuestCard key={q.id} quest={q} done={done} open={ui.activeQuest === q.id} />
        ))}
      </div>
    </div>
  );
}

function QuestCard({ quest, done, open }: { quest: Quest; done: DoneMap; open: boolean }) {
  const dispatch = useDispatch();
  const ref = useRef<HTMLDivElement>(null);
  const st = questStats(quest, done);
  const p = pct(st.done, st.total);
  const complete = st.total > 0 && st.done === st.total;
  const nextId = questNextId(quest, done);
  const nextStep = nextId ? stepById[nextId] : null;
  const nextChapter = nextStep ? chapterById[nextStep.chapterId] : null;

  useEffect(() => {
    if (open && ref.current) ref.current.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [open]);

  return (
    <div className={"quest-card" + (open ? " open" : "")} ref={ref}>
      <div
        className="qc-head"
        onClick={() => dispatch({ type: "openQuest", id: open ? "" : quest.id })}
      >
        <span className="qc-dot" style={{ background: quest.color }} />
        <div className="qc-main">
          <div className="qc-name">{quest.name}</div>
          <div className="qc-sub">
            {complete ? (
              <span style={{ color: "var(--green-bright)" }}>✓ 已完成</span>
            ) : nextStep && nextChapter ? (
              <>
                <span className="next">下一步：</span>
                {nextStep.text}
                <span style={{ color: "var(--muted2)" }}>（第{nextChapter.num}章）</span>
              </>
            ) : (
              quest.desc
            )}
          </div>
        </div>
        <span className="qc-count">
          {st.done}/{st.total} · {p}%
        </span>
        <span className="qc-caret">▸</span>
      </div>

      {open && (
        <>
          {quest.desc && <div className="qc-end">{quest.desc}</div>}
          <div className="qc-body">
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

            <div className="timeline">
              {quest.stepIds.map((sid) => {
                const s = stepById[sid];
                const ch = chapterById[s.chapterId];
                const isDone = !!done[sid];
                const isNext = sid === nextId;
                return (
                  <div key={sid} className={"tl-step" + (isDone ? " done" : "") + (isNext ? " current" : "")}>
                    <div className="tl-node" />
                    <div className="tl-head">
                      <label className="tl-cb">
                        <input
                          type="checkbox"
                          checked={isDone}
                          onChange={(e) => dispatch({ type: "toggleStep", id: sid, value: e.target.checked })}
                        />
                      </label>
                      <span className="tl-text">{s.text}</span>
                      <button
                        className="tl-loc"
                        title="在線性流程中查看此步驟"
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
        </>
      )}
    </div>
  );
}
