import { useCallback, useEffect, useMemo, useState } from "react";
import { overallStats, pct } from "./lib/data";
import { useAppState, useDispatch } from "./store";
import FlowView from "./components/FlowView";
import QuestView from "./components/QuestView";

export default function App() {
  const state = useAppState();
  const dispatch = useDispatch();
  const [toast, setToast] = useState<{ msg: string; nonce: number } | null>(null);

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
      <header className="topbar">
        <div className="brand">
          <h1>
            艾爾登法環 <span>流程攻略追蹤器</span>
          </h1>
          <p className="subtitle">依「個人筆記式攻略（A.C / feiouex）」整理的線性流程與支線總覽</p>
        </div>
        <div className="overall">
          <div className="overall-bar">
            <div className="overall-fill" style={{ width: pct(stats.done, stats.total) + "%" }} />
          </div>
          <div className="overall-text">
            <b>
              {stats.done} / {stats.total}
            </b>{" "}
            已完成
          </div>
          <button className="ghost-btn" title="清除所有進度" onClick={reset}>
            重設進度
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

      {state.ui.tab === "flow" ? <FlowView onToast={showToast} /> : <QuestView />}

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
