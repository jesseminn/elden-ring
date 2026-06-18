import { useMemo, useState } from "react";
import { useAppState, useDispatch } from "../store";

export default function DataModal({ onClose }: { onClose: () => void }) {
  const { done } = useAppState();
  const dispatch = useDispatch();
  const exportStr = useMemo(
    () => JSON.stringify({ v: 1, done: Object.keys(done).filter((k) => done[k]) }),
    [done],
  );
  const [text, setText] = useState("");
  const [msg, setMsg] = useState("");

  const copy = () =>
    navigator.clipboard?.writeText(exportStr).then(
      () => setMsg("已複製到剪貼簿"),
      () => setMsg("複製失敗，請手動全選複製"),
    );

  const doImport = () => {
    try {
      const o = JSON.parse(text.trim());
      const arr: unknown = Array.isArray(o) ? o : o.done;
      if (!Array.isArray(arr)) throw new Error();
      const next: Record<string, boolean> = {};
      arr.forEach((id) => typeof id === "string" && (next[id] = true));
      dispatch({ type: "setProgress", done: next });
      setMsg(`匯入成功：${Object.keys(next).length} 項`);
    } catch {
      setMsg("匯入失敗：請貼上正確的 JSON");
    }
  };

  return (
    <div className="sheet-backdrop center" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">搬移進度</div>
        <p className="modal-desc">
          進度存在這個瀏覽器裡。換手機 / 換瀏覽器時，用下面的 JSON 把勾選帶過去。
        </p>

        <div className="modal-label">匯出（複製這段）</div>
        <textarea className="modal-ta" readOnly value={exportStr} onFocus={(e) => e.target.select()} />
        <button className="gold-btn" onClick={copy}>
          複製
        </button>

        <div className="modal-label" style={{ marginTop: 14 }}>
          匯入（貼上後套用，會覆蓋目前進度）
        </div>
        <textarea
          className="modal-ta"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder='貼上 {"v":1,"done":[...]}'
        />
        <div style={{ display: "flex", gap: 8 }}>
          <button className="gold-btn" onClick={doImport}>
            套用
          </button>
          <button className="ghost-btn" onClick={onClose}>
            關閉
          </button>
        </div>
        {msg && <div className="modal-msg">{msg}</div>}
      </div>
    </div>
  );
}
