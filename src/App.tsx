import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { overallStats, pct, currentStepId, skippedCount, data } from "./lib/data";
import { useAppState, useDispatch } from "./store";
import FlowView from "./components/FlowView";
import QuestView from "./components/QuestView";
import CollectionView from "./components/CollectionView";
import BuildView from "./components/BuildView";
import QuestPeek from "./components/QuestPeek";
import SeriesPeek from "./components/SeriesPeek";
import CollectPeek from "./components/CollectPeek";
import SyncSettings from "./components/SyncSettings";
import { useSyncEngine } from "./lib/sync";
import Icon from "./components/Icon";

export default function App() {
  const state = useAppState();
  const dispatch = useDispatch();
  const [toast, setToast] = useState<{ msg: string; nonce: number } | null>(null);

  const showToast = useCallback((msg: string) => setToast({ msg, nonce: Date.now() }), []);

  const stats = useMemo(() => overallStats(state.done), [state.done]);
  const curId = useMemo(() => currentStepId(state.done, state.skipped), [state.done, state.skipped]);
  const nSkipped = useMemo(() => skippedCount(state.done, state.skipped), [state.done, state.skipped]);

  const sync = useSyncEngine(state.done, state.skipped, dispatch);
  const [syncOpen, setSyncOpen] = useState(false);

  // 量測固定頂欄高度寫進 --top-h，給展開章節的 sticky 標題當偏移（頂欄高度會隨模式/換行變動）
  const topRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = topRef.current;
    if (!el) return;
    const apply = () =>
      document.documentElement.style.setProperty("--top-h", el.offsetHeight + "px");
    apply();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", apply);
      return () => window.removeEventListener("resize", apply);
    }
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

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
      <div className="sticky-top" ref={topRef}>
        <header className="topbar">
          <div className="brand">
            <h1 title="艾爾登法環 流程攻略追蹤器">ELDEN RING</h1>
          </div>
          <div className="modes">
            <button className={"mode" + (!onBuild ? " active" : "")} onClick={goTracker}>
              流程
            </button>
            <button className={"mode" + (onBuild ? " active" : "")} onClick={goBuild}>
              配點
            </button>
          </div>
          <Menu onReset={reset} onSync={() => setSyncOpen(true)} syncStatus={sync.status} />
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

        {!onBuild && state.ui.tab === "flow" && (
          <div className="subbar">
            <div className="overall">
              <div className="overall-cap">
                <span className="overall-label">線性流程進度</span>
                <span className="overall-count">{stats.done} / {stats.total}</span>
                <span className="overall-pct">{pct(stats.done, stats.total)}%</span>
                {nSkipped > 0 && (
                  <span className="overall-skip" title="你主動跳過、尚未完成的主線步驟數">跳過 {nSkipped}</span>
                )}
              </div>
              <div className="overall-frame">
                <div className="overall-bar">
                  <div className="overall-fill" style={{ width: pct(stats.done, stats.total) + "%" }} />
                </div>
              </div>
            </div>
          </div>
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

      {state.ui.tab === "flow" && (
        <button className="fab" title="跳到流程中第一個未完成的步驟" onClick={jumpCurrent}>
          <Icon name="locate" size={14} /> 目前進度
        </button>
      )}

      <QuestPeek />
      <SeriesPeek />
      <CollectPeek />
      {syncOpen && <SyncSettings sync={sync} onClose={() => setSyncOpen(false)} />}
      <Toast toast={toast} />
    </>
  );
}

function Menu({
  onReset,
  onSync,
  syncStatus,
}: {
  onReset: () => void;
  onSync: () => void;
  syncStatus: "off" | "idle" | "syncing" | "choosing" | "error";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const syncLabel =
    syncStatus === "idle"
      ? "已連線"
      : syncStatus === "syncing"
      ? "同步中"
      : syncStatus === "choosing"
      ? "待選擇"
      : syncStatus === "error"
      ? "錯誤"
      : "未啟用";

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="menu-wrap" ref={ref}>
      <button
        className="menu-btn"
        aria-label="選單"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Icon name="menu" size={20} />
      </button>
      {open && (
        <div className="menu-pop" role="menu">
          <button
            className="menu-item"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onSync();
            }}
          >
            雲端同步…
            <span className={"menu-sync-tag sync-" + syncStatus}>{syncLabel}</span>
          </button>
          <button
            className="menu-item danger"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onReset();
            }}
          >
            清除所有進度
          </button>
          <div className="menu-ver" title="目前線上版本">
            版本 v{__APP_VERSION__}
          </div>
        </div>
      )}
    </div>
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
