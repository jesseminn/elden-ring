import { memo, useEffect, useRef, useState } from "react";
import type { Step } from "../types";
import { questById, collectIdsForStep, seriesKindsForStep, visibleDetail } from "../lib/data";
import { useDispatch } from "../store";

interface Props {
  step: Step;
  done: boolean;
  isCurrent: boolean;
  flash: boolean;
}

function StepRowInner({ step, done, isCurrent, flash }: Props) {
  const dispatch = useDispatch();
  const [showDetail, setShowDetail] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [flashing, setFlashing] = useState(false);

  useEffect(() => {
    if (flash && ref.current) {
      ref.current.scrollIntoView({ block: "center", behavior: "smooth" });
      setFlashing(true);
      const t = setTimeout(() => setFlashing(false), 900);
      return () => clearTimeout(t);
    }
  }, [flash]);

  if (step.type === "note") {
    return (
      <div className="step note" ref={ref}>
        <div className="step-main">
          <span className="note-label">提示</span>
          <span className="step-text">{step.text}</span>
          {step.detail.length > 0 && <DetailBlock detail={step.detail} show={showDetail} onToggle={() => setShowDetail((v) => !v)} />}
        </div>
      </div>
    );
  }

  const cls = ["step", step.type];
  if (done) cls.push("done");
  if (isCurrent) cls.push("current");
  if (flashing) cls.push("flash");
  if (step.added) cls.push("added");

  const collectIds = collectIdsForStep(step.id);
  const seriesKinds = seriesKindsForStep(step.id);
  const detail = visibleDetail(step);

  return (
    <div className={cls.join(" ")} ref={ref} data-step={step.id}>
      <label className="step-cb">
        <input
          type="checkbox"
          checked={done}
          onChange={(e) => dispatch({ type: "toggleStep", id: step.id, value: e.target.checked })}
        />
      </label>
      <div className="step-main">
        <span className="step-text">
          {step.text}
          {step.missable && <span className="miss-tag" title="易斷：操作不當可能永久錯過">易斷</span>}
          {step.added && <span className="added-tag" title="此步驟為查證網路資料後補充，非攻略原文">查證補充</span>}
          {isCurrent && <span className="current-tag">目前進度</span>}
        </span>

        {(step.boss || step.location || step.quests.length > 0 || collectIds.length > 0) && (
          <div className="step-extra">
            {step.boss && <span className="chip boss">BOSS</span>}
            {step.location && (
              <span className="chip loc" title="地點（查證補充）">{step.location}</span>
            )}
            {collectIds.length > 0 && (
              <button
                className="chip collect"
                title="檢視此步驟可收集的物品（勾選會同步）"
                onClick={() => dispatch({ type: "openCollectPeek", stepId: step.id })}
              >
                收集 ({collectIds.length}) ↗
              </button>
            )}
            {seriesKinds.map((k) => (
              <button
                key={k}
                className="chip series"
                title={`查看「${k}」全地圖收集位置`}
                onClick={() => dispatch({ type: "openSeries", kind: k })}
              >
                系列：{k} ↗
              </button>
            ))}
            {step.quests.map((qid) => {
              const q = questById[qid];
              if (!q) return null;
              return (
                <button
                  key={qid}
                  className="chip quest"
                  style={{ color: q.color, borderColor: q.color + "88", background: q.color + "1f" }}
                  title={`查看「${q.name}」完整支線流程（底部彈出）`}
                  onClick={() => dispatch({ type: "openPeek", qid, fromStepId: step.id })}
                >
                  {q.name} ↗
                </button>
              );
            })}
          </div>
        )}

        {detail.length > 0 && (
          <DetailBlock detail={detail} show={showDetail} onToggle={() => setShowDetail((v) => !v)} />
        )}
      </div>
    </div>
  );
}

function DetailBlock({ detail, show, onToggle }: { detail: string[]; show: boolean; onToggle: () => void }) {
  return (
    <>
      <button className="detail-toggle" onClick={onToggle}>
        {show ? "▾" : "▸"} 補充說明 ({detail.length})
      </button>
      {show && (
        <div className="step-detail">
          {detail.map((d, i) => (
            <div className={"dl" + (d.includes("→") ? " branch" : "")} key={i}>
              {d}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

export const StepRow = memo(StepRowInner);
