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
export type SyncStatus = "off" | "idle" | "syncing" | "error";

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
  configure: (cfg: SyncConfig | null) => void;
  syncNow: () => void;
}

// 同步引擎：開站拉一次（雲端較新就採用），done 變動就 debounce 推送。
export function useSyncEngine(done: DoneMap, dispatch: Dispatch<Action>): SyncHandle {
  const [config, setConfig] = useState<SyncMeta | null>(() => loadSyncConfig());
  const [status, setStatus] = useState<SyncStatus>(config ? "idle" : "off");
  const [error, setError] = useState<string | null>(null);
  const ready = useRef(false); // 初次 pull 完成前不推送，避免空表覆蓋雲端
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const cfgRef = useRef<SyncMeta | null>(config);
  cfgRef.current = config;

  const setLocalTs = (ts: number) => {
    const c = cfgRef.current;
    if (c) {
      const next = { ...c, localUpdatedAt: ts };
      saveSyncConfig(next);
      setConfig(next);
    }
  };

  // 開站 / 換設定時拉雲端
  useEffect(() => {
    if (!config) {
      setStatus("off");
      ready.current = false;
      return;
    }
    let cancelled = false;
    ready.current = false;
    setStatus("syncing");
    setError(null);
    pullGist(config)
      .then(async (cloud) => {
        if (cancelled) return;
        if (cloud && cloud.updatedAt > (config.localUpdatedAt || 0)) {
          dispatch({ type: "setProgress", done: cloud.done }); // 雲端較新 → 採用
          setLocalTs(cloud.updatedAt);
        } else {
          await pushGist(config, done).then(setLocalTs); // 本地較新/雲端空 → 推上去
        }
        if (cancelled) return;
        ready.current = true;
        setStatus("idle");
      })
      .catch((e) => {
        if (!cancelled) {
          setStatus("error");
          setError(e?.message || String(e));
        }
      });
    return () => {
      cancelled = true;
    };
    // 只在 gistId/token 變動時重拉；done 變動由下面的推送 effect 處理
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config?.gistId, config?.token]);

  // done 變動 → debounce 推送
  useEffect(() => {
    const c = cfgRef.current;
    if (!c || !ready.current) return;
    setStatus("syncing");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      pushGist(c, done)
        .then((ts) => {
          setLocalTs(ts);
          setStatus("idle");
          setError(null);
        })
        .catch((e) => {
          setStatus("error");
          setError(e?.message || String(e));
        });
    }, 1500);
    return () => clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  const configure = (cfg: SyncConfig | null) => {
    if (cfg) setConfig({ ...cfg });
    else {
      saveSyncConfig(null);
      setConfig(null);
    }
  };
  const syncNow = () => {
    const c = cfgRef.current;
    if (!c) return;
    setStatus("syncing");
    pushGist(c, done)
      .then((ts) => {
        setLocalTs(ts);
        setStatus("idle");
        setError(null);
      })
      .catch((e) => {
        setStatus("error");
        setError(e?.message || String(e));
      });
  };

  return { config, status, error, configure, syncNow };
}
