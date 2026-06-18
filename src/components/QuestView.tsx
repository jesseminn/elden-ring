import { data, questById, stepById, chapterById, questStats, questNextId, pct, type DoneMap } from "../lib/data";
import type { Quest } from "../types";
import { useAppState, useDispatch } from "../store";

export default function QuestView() {
  const { done, ui } = useAppState();
  const major = data.quests.filter((q) => q.major);
  const minor = data.quests.filter((q) => !q.major);
  const active = ui.activeQuest ? questById[ui.activeQuest] : null;

  return (
    <div className="view">
      <div className="quests-layout">
        <aside className="quest-list">
          <div className="quest-list-group">主要支線</div>
          {major.map((q) => (
            <QuestListItem key={q.id} quest={q} done={done} active={ui.activeQuest === q.id} />
          ))}
          <div className="quest-list-group">其他 NPC / 收集</div>
          {minor.map((q) => (
            <QuestListItem key={q.id} quest={q} done={done} active={ui.activeQuest === q.id} />
          ))}
        </aside>

        <section className="quest-detail">
          {active ? (
            <QuestDetail quest={active} done={done} />
          ) : (
            <div className="quest-empty">← 從左側選擇一條支線，查看完整流程與目前進度</div>
          )}
        </section>
      </div>
    </div>
  );
}

function QuestListItem({ quest, done, active }: { quest: Quest; done: DoneMap; active: boolean }) {
  const dispatch = useDispatch();
  const st = questStats(quest, done);
  const complete = st.total > 0 && st.done === st.total;
  return (
    <button
      className={"quest-item" + (active ? " active" : "") + (complete ? " complete" : "")}
      onClick={() => dispatch({ type: "openQuest", id: quest.id })}
    >
      <div className="quest-item-top">
        <span className="quest-dot" style={{ background: quest.color }} />
        <span className="quest-name">{quest.name}</span>
        <span className="quest-count">
          {st.done}/{st.total}
        </span>
      </div>
      <span className="mini-bar">
        <span className="mini-fill" style={{ width: pct(st.done, st.total) + "%", background: quest.color }} />
      </span>
    </button>
  );
}

function QuestDetail({ quest, done }: { quest: Quest; done: DoneMap }) {
  const dispatch = useDispatch();
  const st = questStats(quest, done);
  const complete = st.total > 0 && st.done === st.total;
  const nextId = questNextId(quest, done);
  const nextStep = nextId ? stepById[nextId] : null;
  const nextChapter = nextStep ? chapterById[nextStep.chapterId] : null;

  return (
    <>
      <div className="qd-header">
        <span className="quest-dot" style={{ background: quest.color, width: 16, height: 16 }} />
        <div>
          <div className="qd-title">{quest.name}</div>
          <p className="qd-desc">{quest.desc}</p>
        </div>
        <div className="qd-prog">
          <div className="num">
            {st.done} / {st.total}
          </div>
          <div className="qd-desc">步驟完成</div>
        </div>
      </div>

      <div className="qd-next">
        {complete ? (
          <span className="qd-alldone">✓ 此支線全部步驟已完成</span>
        ) : nextStep && nextChapter ? (
          <>
            <div className="lbl">下一步</div>
            <div className="txt">{nextStep.text}</div>
            <div className="qd-desc">
              位於：第 {nextChapter.num} 章 {nextChapter.title}
            </div>
          </>
        ) : null}
      </div>

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
              {(s.boss || s.items.length > 0) && (
                <div className="tl-extra">
                  {s.boss && <span className="chip boss">⚔ BOSS</span>}
                  {s.items.map((it, i) => (
                    <span className="chip item" key={i}>
                      {it}
                    </span>
                  ))}
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
    </>
  );
}
