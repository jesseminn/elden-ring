import { useEffect } from "react";
import { seriesByRegion, kindStats, pct, isDone as resolveDone } from "../lib/data";
import { useAppState, useDispatch } from "../store";

export default function SeriesPeek() {
  const { seriesPeek, done } = useAppState();
  const dispatch = useDispatch();

  useEffect(() => {
    if (!seriesPeek) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && dispatch({ type: "closeSeries" });
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [seriesPeek, dispatch]);

  if (!seriesPeek) return null;
  const kind = seriesPeek;
  const groups = seriesByRegion(kind);
  const st = kindStats(kind, done);
  const p = pct(st.done, st.total);

  return (
    <div className="sheet-backdrop" onClick={() => dispatch({ type: "closeSeries" })}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grip" />
        <div className="sheet-head">
          <div className="qc-main">
            <div className="qc-name">{kind}</div>
            <div className="qc-sub">所有取得地點</div>
          </div>
          <span className="qc-count">
            {st.done}/{st.total} · {p}%
          </span>
        </div>

        <div className="sheet-body">
          {groups.map(({ region, items }) => (
            <div key={region.id} className="series-group">
              <div className="series-region">{region.name}</div>
              {items.map((it) => {
                const isDone = resolveDone(done, it.id);
                return (
                  <label key={it.id} className={"citem" + (isDone ? " done" : "")}>
                    <input
                      type="checkbox"
                      checked={isDone}
                      onChange={(e) => dispatch({ type: "toggleStep", id: it.id, value: e.target.checked })}
                    />
                    <span className="citem-main">
                      <span className="citem-text">
                        {it.text}
                        {it.miss && <span className="miss-tag">易斷</span>}
                      </span>
                      {it.note && <span className="citem-note">{it.note}</span>}
                    </span>
                  </label>
                );
              })}
            </div>
          ))}
        </div>

        <button className="sheet-close" onClick={() => dispatch({ type: "closeSeries" })}>
          關閉
        </button>
      </div>
    </div>
  );
}
