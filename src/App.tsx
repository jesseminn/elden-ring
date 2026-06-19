import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { overallStats, pct, currentStepId, data } from "./lib/data";
import { useAppState, useDispatch } from "./store";
import FlowView from "./components/FlowView";
import QuestView from "./components/QuestView";
import CollectionView from "./components/CollectionView";
import BuildView from "./components/BuildView";
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

  // 配點器與流程追蹤器是兩個同層的頂層模式（最頂部切換）。
  // 記住進配點前所在的流程分頁，切回追蹤器時還原。
  const prevTabRef = useRef<typeof state.ui.tab>("flow");
  const onBuild = state.ui.tab === "build";
  const goBuild = () => {
    if (onBuild) return;
    prevTabRef.current = state.ui.tab;
    dispatch({ type: "setTab", tab: "build" });
  };
  const goTracker = () => {
    if (!onBuild) return;
    dispatch({ type: "setTab", tab: prevTabRef.current === "build" ? "flow" : prevTabRef.current });
  };

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
            <h1>艾爾登法環</h1>
            <nav className="modes">
              <button className={"mode" + (!onBuild ? " active" : "")} onClick={goTracker}>
                流程追蹤器
              </button>
              <button className={"mode" + (onBuild ? " active" : "")} onClick={goBuild}>
                配點器
              </button>
            </nav>
          </div>
          {!onBuild && (
            <>
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
            </>
          )}
        </header>

        {!onBuild && (
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
        )}
      </div>

      {state.ui.tab === "flow" ? (
        <FlowView />
      ) : state.ui.tab === "quests" ? (
        <QuestView />
      ) : state.ui.tab === "collect" ? (
        <CollectionView />
      ) : (
        <BuildView />
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
