import { useEffect } from "react";
import { collectItemById, collectIdsForStep, stepById, isDone as resolveDone } from "../lib/data";
import { useAppState, useDispatch } from "../store";

export default function CollectPeek() {
  const { collectPeek, done } = useAppState();
  const dispatch = useDispatch();

  useEffect(() => {
    if (!collectPeek) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && dispatch({ type: "closeCollectPeek" });
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [collectPeek, dispatch]);

  if (!collectPeek) return null;
  const step = stepById[collectPeek];
  const ids = collectIdsForStep(collectPeek);
  if (!ids.length) return null;

  return (
    <div className="sheet-backdrop" onClick={() => dispatch({ type: "closeCollectPeek" })}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grip" />
        <div className="sheet-head">
          <div className="qc-main">
            <div className="qc-name">此步驟的收集品</div>
            {step && <div className="qc-sub">{step.text.slice(0, 40)}</div>}
          </div>
          <span className="qc-count">{ids.filter((id) => resolveDone(done, id)).length}/{ids.length}</span>
        </div>

        <div className="sheet-body">
          {ids.map((id) => {
            const entry = collectItemById[id];
            if (!entry) return null;
            const { item, regionName } = entry;
            const isDone = resolveDone(done, id);
            return (
              <label key={id} className={"citem" + (isDone ? " done" : "")}>
                <input
                  type="checkbox"
                  checked={isDone}
                  onChange={(e) => dispatch({ type: "toggleStep", id, value: e.target.checked })}
                />
                <span className="citem-main">
                  <span className="citem-top">
                    <button
                      className="chip kind clickable"
                      title={`查看所有「${item.kind}」取得地點`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        dispatch({ type: "closeCollectPeek" });
                        dispatch({ type: "openSeries", kind: item.kind });
                      }}
                    >
                      {item.kind}
                    </button>
                    <span className="citem-region">{regionName}</span>
                    {item.miss && <span className="miss-tag">易斷</span>}
                  </span>
                  <span className="citem-text">{item.text}</span>
                  {item.note && <span className="citem-note">{item.note}</span>}
                </span>
              </label>
            );
          })}
        </div>

        <button className="sheet-close" onClick={() => dispatch({ type: "closeCollectPeek" })}>
          關閉
        </button>
      </div>
    </div>
  );
}
