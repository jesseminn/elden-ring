import { useState } from "react";
import type { SyncHandle } from "../lib/sync";

export default function SyncSettings({ sync, onClose }: { sync: SyncHandle; onClose: () => void }) {
  const [gistId, setGistId] = useState(sync.config?.gistId || "");
  const [token, setToken] = useState(sync.config?.token || "");
  const connected = !!sync.config && sync.status !== "choosing";
  const choosing = sync.status === "choosing" && sync.choice;

  const enable = () => {
    if (!gistId.trim() || !token.trim()) return;
    sync.configure({ gistId: gistId.trim(), token: token.trim() });
  };

  const statusText =
    sync.status === "off"
      ? "未啟用"
      : sync.status === "syncing"
      ? "同步中…"
      : sync.status === "choosing"
      ? "待選擇"
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

          {choosing ? (
            // 首次設定且兩邊都有資料 → 讓使用者選保留哪一份
            <div className="sync-choice">
              <div className="sync-choice-head">本地與雲端都有進度，要保留哪一份？（另一邊會被覆蓋）</div>
              <div className="sync-choice-counts">
                本地 <b>{sync.choice!.localCount}</b> 項 ・ 雲端 <b>{sync.choice!.cloudCount}</b> 項
              </div>
              <button className="gold-btn" onClick={sync.chooseDownload}>
                用雲端覆蓋本地（保留雲端 {sync.choice!.cloudCount} 項）
              </button>
              <button className="gold-btn" onClick={sync.chooseUpload}>
                用本地覆蓋雲端（保留本地 {sync.choice!.localCount} 項）
              </button>
              <button className="ghost-btn" onClick={() => sync.configure(null)}>
                取消
              </button>
            </div>
          ) : connected ? (
            // 已連線
            <div className="sync-actions">
              <button className="gold-btn" onClick={sync.syncNow}>
                立即上傳
              </button>
              <button className="ghost-btn" onClick={() => sync.configure(null)}>
                停用同步
              </button>
              <span className="tb-spacer" />
              <button className="ghost-btn" onClick={onClose}>
                關閉
              </button>
            </div>
          ) : (
            // 未啟用：填 gist + token
            <>
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
                token 只存在你這台瀏覽器、不會上傳、也不在公開原始碼裡。進度存進該 gist 的{" "}
                <code>elden-progress.json</code>。
              </div>
              <div className="sync-actions">
                <button className="gold-btn" onClick={enable} disabled={!gistId.trim() || !token.trim()}>
                  啟用同步
                </button>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
