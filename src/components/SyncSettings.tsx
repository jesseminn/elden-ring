import { useState } from "react";
import type { SyncHandle } from "../lib/sync";

export default function SyncSettings({ sync, onClose }: { sync: SyncHandle; onClose: () => void }) {
  const [gistId, setGistId] = useState(sync.config?.gistId || "");
  const [token, setToken] = useState(sync.config?.token || "");
  const on = !!sync.config;

  const enable = () => {
    if (!gistId.trim() || !token.trim()) return;
    sync.configure({ gistId: gistId.trim(), token: token.trim() });
  };

  const statusText =
    sync.status === "off"
      ? "未啟用"
      : sync.status === "syncing"
      ? "同步中…"
      : sync.status === "error"
      ? "錯誤"
      : "已連線";

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">雲端同步（GitHub Gist）</div>
        <div className="modal-body">
          <div className={"sync-status sync-" + sync.status}>
            狀態：{statusText}
            {sync.error && <span className="sync-err">（{sync.error}）</span>}
          </div>

          <label className="sync-field">
            <span>Gist ID</span>
            <input
              value={gistId}
              onChange={(e) => setGistId(e.target.value)}
              placeholder="gist 網址末段那串 id"
              spellCheck={false}
              autoCapitalize="none"
            />
          </label>
          <label className="sync-field">
            <span>Token（只給 Gists 讀寫權限）</span>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="github_pat_… / ghp_…"
              spellCheck={false}
              autoCapitalize="none"
            />
          </label>
          <div className="sync-hint">
            token 只存在你這台瀏覽器、不會上傳、也不在公開原始碼裡。進度存進該 gist 的 <code>elden-progress.json</code>。
          </div>

          <div className="sync-actions">
            {on ? (
              <>
                <button className="gold-btn" onClick={sync.syncNow}>
                  立即上傳
                </button>
                <button className="ghost-btn" onClick={() => sync.configure(null)}>
                  停用同步
                </button>
              </>
            ) : (
              <button className="gold-btn" onClick={enable} disabled={!gistId.trim() || !token.trim()}>
                啟用同步
              </button>
            )}
            <span className="tb-spacer" />
            <button className="ghost-btn" onClick={onClose}>
              關閉
            </button>
          </div>

          <details className="sync-help">
            <summary>怎麼設定？（一次性）</summary>
            <ol>
              <li>
                到 gist.github.com 建一個 <b>公開</b> gist，檔名 <code>elden-progress.json</code>、內容{" "}
                <code>{`{"done":{}}`}</code>；建立後網址末段就是 Gist ID。
              </li>
              <li>
                GitHub Settings → Developer settings → Fine-grained tokens 建一把 token，權限只勾{" "}
                <b>Gists：Read and write</b>。
              </li>
              <li>把 Gist ID 與 token 貼上、按「啟用同步」。換裝置時填一樣的 ID＋token 即可同步。</li>
            </ol>
          </details>
        </div>
      </div>
    </div>
  );
}
