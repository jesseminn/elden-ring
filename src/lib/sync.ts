// 雲端同步（GitHub Gist）：把進度（done 主鍵表）存進一個 gist 的 elden-progress.json。
// - 前端用使用者貼進 localStorage 的 token 寫（token 不進公開 bundle）。
// - 衝突：兩端各帶 updatedAt，較新者勝（單人用，last-write-wins 足夠）。
// - agent 端用 `curl api.github.com/gists/<id>` 零 auth 讀（公開 gist）。
import { useEffect, useRef, useState } from "react";
import type { Dispatch } from "react";
import { canonicalId, type DoneMap } from "./data";
import type { Action } from "../store";

const LS_SYNC = "elden-sync-v1";
const FILE = "elden-progress.json";
const API = (id: string) => `https://api.github.com/gists/${id}`;

export interface SyncConfig {
  gistId: string;
  token: string;
}
interface SyncMeta extends SyncConfig {
  localUpdatedAt?: number;
}
export type SyncStatus = "off" | "idle" | "syncing" | "choosing" | "error";

export function loadSyncConfig(): SyncMeta | null {
  try {
    const v = JSON.parse(localStorage.getItem(LS_SYNC) || "null");
    return v && v.gistId && v.token ? v : null;
  } catch {
    return null;
  }
}
function saveSyncConfig(cfg: SyncMeta | null) {
  if (cfg) localStorage.setItem(LS_SYNC, JSON.stringify(cfg));
  else localStorage.removeItem(LS_SYNC);
}

interface CloudPayload {
  done: DoneMap;
  updatedAt: number;
}

export async function pullGist(cfg: SyncConfig): Promise<CloudPayload | null> {
  const r = await fetch(API(cfg.gistId), {
    headers: {
      Accept: "application/vnd.github+json",
      ...(cfg.token ? { Authorization: `Bearer ${cfg.token}` } : {}),
    },
  });
  if (!r.ok) throw new Error(`讀取 gist 失敗（HTTP ${r.status}）`);
  const j = await r.json();
  const f = j.files?.[FILE];
  if (!f || !f.content) return null;
  let parsed: { done?: DoneMap; updatedAt?: number };
  try {
    parsed = JSON.parse(f.content);
  } catch {
    throw new Error("gist 內容不是合法 JSON");
  }
  const raw = parsed.done || {};
  const done: DoneMap = {};
  for (const k in raw) if (raw[k]) done[canonicalId(k)] = true; // 正規化成主鍵
  return { done, updatedAt: parsed.updatedAt || 0 };
}

export async function pushGist(cfg: SyncConfig, done: DoneMap): Promise<number> {
  const updatedAt = Date.now();
  const content = JSON.stringify({ done, updatedAt, app: "elden-ring-tracker" });
  const r = await fetch(API(cfg.gistId), {
    method: "PATCH",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${cfg.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ files: { [FILE]: { content } } }),
  });
  if (!r.ok) throw new Error(`寫入 gist 失敗（HTTP ${r.status}）`);
  return updatedAt;
}

export interface SyncHandle {
  config: SyncConfig | null;
  status: SyncStatus;
  error: string | null;
  // 首次啟用且兩邊都有資料時，需使用者選擇覆蓋哪邊；否則為 null
  choice: { localCount: number; cloudCount: number } | null;
  configure: (cfg: SyncConfig | null) => void;
  chooseUpload: () => void; // 用本地覆蓋雲端
  chooseDownload: () => void; // 用雲端覆蓋本地
  syncNow: () => void;
}

const countDone = (d: DoneMap) => Object.keys(d).length;

// 同步引擎：
// - 首次設定 gist（config 無 baseline）：只有一邊有資料就自動；兩邊都有 → 進入 choosing 讓使用者選。
// - 已建立 baseline：開站 / 視窗 focus / 分頁可見 → pull，僅在「雲端比本地 baseline 新」時採用。
// - 本地 done 變動 → debounce push。
export function useSyncEngine(done: DoneMap, dispatch: Dispatch<Action>): SyncHandle {
  const [config, setConfig] = useState<SyncMeta | null>(() => loadSyncConfig());
  const [status, setStatus] = useState<SyncStatus>(config ? "idle" : "off");
  const [error, setError] = useState<string | null>(null);
  const [choice, setChoice] = useState<{ localCount: number; cloudCount: number } | null>(null);
  const ready = useRef(false); // baseline 建立、可推送
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pendingCloud = useRef<CloudPayload | null>(null);
  const cfgRef = useRef<SyncMeta | null>(config);
  cfgRef.current = config;
  const doneRef = useRef(done);
  doneRef.current = done;

  const fail = (e: unknown) => {
    setStatus("error");
    setError((e as Error)?.message || String(e));
  };
  // 建立/更新 baseline 並轉為已連線
  const finalize = (ts: number) => {
    const c = cfgRef.current;
    if (!c) return;
    const next = { ...c, localUpdatedAt: ts };
    saveSyncConfig(next);
    setConfig(next);
    pendingCloud.current = null;
    ready.current = true;
    setChoice(null);
    setStatus("idle");
    setError(null);
  };

  // 開站 / 換 gist 設定
  useEffect(() => {
    if (!config) {
      setStatus("off");
      ready.current = false;
      setChoice(null);
      return;
    }
    let cancelled = false;
    ready.current = false;
    setChoice(null);
    setStatus("syncing");
    setError(null);
    (async () => {
      try {
        const cloud = await pullGist(config);
        if (cancelled) return;
        const established = config.localUpdatedAt != null;
        if (established) {
          // 已連線：雲端較新才採用
          if (cloud && cloud.updatedAt > (config.localUpdatedAt || 0)) {
            dispatch({ type: "setProgress", done: cloud.done });
            finalize(cloud.updatedAt);
          } else {
            ready.current = true;
            setStatus("idle");
          }
          return;
        }
        // 首次設定
        const localCount = countDone(doneRef.current);
        const cloudCount = cloud ? countDone(cloud.done) : 0;
        if (localCount > 0 && cloudCount > 0) {
          pendingCloud.current = cloud;
          setChoice({ localCount, cloudCount });
          setStatus("choosing");
        } else if (cloud && cloudCount > 0) {
          dispatch({ type: "setProgress", done: cloud.done }); // 只有雲端有 → 下載
          finalize(cloud.updatedAt);
        } else {
          const ts = await pushGist(config, doneRef.current); // 只有本地有 / 兩邊空 → 上傳
          if (!cancelled) finalize(ts);
        }
      } catch (e) {
        if (!cancelled) fail(e);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config?.gistId, config?.token]);

  // done 變動 → debounce push
  useEffect(() => {
    const c = cfgRef.current;
    if (!c || !ready.current) return;
    setStatus("syncing");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      pushGist(c, done).then(finalize).catch(fail);
    }, 1500);
    return () => clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  // 視窗 focus / 分頁可見 → pull（僅已連線、且雲端較新才採用）
  useEffect(() => {
    const pull = () => {
      const c = cfgRef.current;
      if (!c || !ready.current || document.visibilityState === "hidden") return;
      pullGist(c)
        .then((cloud) => {
          const cc = cfgRef.current;
          if (cc && cloud && cloud.updatedAt > (cc.localUpdatedAt || 0)) {
            dispatch({ type: "setProgress", done: cloud.done });
            finalize(cloud.updatedAt);
          }
        })
        .catch(() => {}); // 回焦的背景 pull 失敗就靜默
    };
    const onVis = () => {
      if (document.visibilityState === "visible") pull();
    };
    window.addEventListener("focus", pull);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("focus", pull);
      document.removeEventListener("visibilitychange", onVis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const configure = (cfg: SyncConfig | null) => {
    if (cfg) setConfig({ ...cfg }); // 無 baseline → 觸發首次設定流程
    else {
      saveSyncConfig(null);
      setConfig(null);
      ready.current = false;
      pendingCloud.current = null;
      setChoice(null);
      setStatus("off");
    }
  };
  const chooseUpload = () => {
    const c = cfgRef.current;
    if (!c) return;
    setStatus("syncing");
    pushGist(c, doneRef.current).then(finalize).catch(fail);
  };
  const chooseDownload = () => {
    const c = cfgRef.current;
    const cloud = pendingCloud.current;
    if (!c || !cloud) return;
    setStatus("syncing");
    dispatch({ type: "setProgress", done: cloud.done });
    finalize(cloud.updatedAt);
  };
  const syncNow = () => {
    const c = cfgRef.current;
    if (!c) return;
    setStatus("syncing");
    pushGist(c, doneRef.current).then(finalize).catch(fail);
  };

  return { config, status, error, choice, configure, chooseUpload, chooseDownload, syncNow };
}
