import { useCallback, useEffect, useMemo, useState } from "react";
import { overallStats, pct } from "./lib/data";
import { useAppState, useDispatch } from "./store";
import FlowView from "./components/FlowView";
import QuestView from "./components/QuestView";
import QuestPeek from "./components/QuestPeek";
import DataModal from "./components/DataModal";

export default function App() {
  const state = useAppState();
  const dispatch = useDispatch();
  const [toast, setToast] = useState<{ msg: string; nonce: number } | null>(null);
  const [showData, setShowData] = useState(false);

  const showToast = useCallback((msg: string) => setToast({ msg, nonce: Date.now() }), []);

  const stats = useMemo(() => overallStats(state.done), [state.done]);

  const reset = () => {
    if (confirm("確定要清除所有進度嗎？此動作無法復原。")) {
      dispatch({ type: "resetProgress" });
      showToast("已清除所有進度");
    }
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
            <button className="ghost-btn" title="匯出 / 匯入進度（換裝置用）" onClick={() => setShowData(true)}>
              搬移
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
            📜 線性流程
          </button>
          <button
            className={"tab" + (state.ui.tab === "quests" ? " active" : "")}
            onClick={() => dispatch({ type: "setTab", tab: "quests" })}
          >
            🧭 支線總覽
          </button>
        </nav>
      </div>

      {state.ui.tab === "flow" ? <FlowView onToast={showToast} /> : <QuestView />}

      <QuestPeek />
      {showData && <DataModal onClose={() => setShowData(false)} />}
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
