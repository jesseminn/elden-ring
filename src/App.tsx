import { useCallback, useEffect, useMemo, useState } from "react";
import { overallStats, pct, currentStepId, data } from "./lib/data";
import { useAppState, useDispatch } from "./store";
import FlowView from "./components/FlowView";
import QuestView from "./components/QuestView";
import CollectionView from "./components/CollectionView";
import QuestPeek from "./components/QuestPeek";
import SeriesPeek from "./components/SeriesPeek";
import CollectPeek from "./components/CollectPeek";

export default function App() {
  const state = useAppState();
  const dispatch = useDispatch();
  const [toast, setToast] = useState<{ msg: string; nonce: number } | null>(null);

  const showToast = useCallback((msg: string) => setToast({ msg, nonce: Date.now() }), []);

  const stats = useMemo(() => overallStats(state.done), [state.done]);
  const curId = useMemo(() => currentStepId(state.done), [state.done]);

  const reset = () => {
    if (confirm("確定要清除所有進度嗎？此動作無法復原。")) {
      dispatch({ type: "resetProgress" });
      showToast("已清除所有進度");
    }
  };

  const jumpCurrent = () => {
    if (!curId) {
      showToast("流程已全部完成");
      return;
    }
    const ch = data.chapters.find((c) => c.steps.some((s) => s.id === curId))!;
    dispatch({ type: "gotoStep", chapterId: ch.id, stepId: curId });
  };

  return (
    <>
      <div className="sticky-top">
        <header className="topbar">
          <div className="brand">
            <h1>
              艾爾登法環 <span>流程追蹤器</span>
            </h1>
            <p className="subtitle">線性流程 · 支線總覽 · 100% 全收集</p>
          </div>
          <div className="overall">
            <div className="overall-bar">
              <div className="overall-fill" style={{ width: pct(stats.done, stats.total) + "%" }} />
            </div>
            <div className="overall-text">
              <b>
                {stats.done} / {stats.total}
              </b>{" "}
              · {pct(stats.done, stats.total)}%
            </div>
          </div>
          <div className="head-btns">
            <button className="gold-btn" title="跳到流程中第一個未完成的步驟" onClick={jumpCurrent}>
              跳到目前進度
            </button>
            <button className="ghost-btn" title="清除所有進度" onClick={reset}>
              重設
            </button>
          </div>
        </header>

        <nav className="tabs">
          <button
            className={"tab" + (state.ui.tab === "flow" ? " active" : "")}
            onClick={() => dispatch({ type: "setTab", tab: "flow" })}
          >
            線性流程
          </button>
          <button
            className={"tab" + (state.ui.tab === "quests" ? " active" : "")}
            onClick={() => dispatch({ type: "setTab", tab: "quests" })}
          >
            支線總覽
          </button>
          <button
            className={"tab" + (state.ui.tab === "collect" ? " active" : "")}
            onClick={() => dispatch({ type: "setTab", tab: "collect" })}
          >
            收集
          </button>
        </nav>
      </div>

      {state.ui.tab === "flow" ? (
        <FlowView />
      ) : state.ui.tab === "quests" ? (
        <QuestView />
      ) : (
        <CollectionView />
      )}

      <QuestPeek />
      <SeriesPeek />
      <CollectPeek />
      <Toast toast={toast} />
    </>
  );
}

function Toast({ toast }: { toast: { msg: string; nonce: number } | null }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!toast) return;
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 1800);
    return () => clearTimeout(t);
  }, [toast]);
  return <div className={"toast" + (visible ? " show" : "")}>{toast?.msg}</div>;
}
