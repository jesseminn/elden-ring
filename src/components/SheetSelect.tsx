import { useEffect, useState, type ReactNode } from "react";
import Icon from "./Icon";

/* ============================================================
   SheetSelect：可復用的「下拉 = 底部彈出 bottom sheet」選擇器
   原生 <select> 難客製，這個用既有 .sheet* 樣式呈現選項，
   觸發鈕外觀仿欄位、點擊由底部滑出選單，支援次要說明與右側徽章。
   ============================================================ */

export interface SheetOption {
  value: string;
  /** 選項主文字（同時作為觸發鈕顯示，除非另給 triggerLabel） */
  title: ReactNode;
  /** 觸發鈕上的精簡文字（預設用 title） */
  triggerLabel?: ReactNode;
  /** 次要說明（顯示在選項標題下方） */
  sub?: ReactNode;
  /** 右側徽章（如「浪費 0」） */
  badge?: ReactNode;
}

interface Props {
  /** 觸發鈕上方小標 */
  label?: string;
  /** 標題列右側額外內容（如「詳情」按鈕） */
  headExtra?: ReactNode;
  /** bottom sheet 標題 */
  sheetTitle: string;
  sheetSub?: string;
  value: string;
  options: SheetOption[];
  onChange: (value: string) => void;
}

export default function SheetSelect({ label, headExtra, sheetTitle, sheetSub, value, options, onChange }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const cur = options.find((o) => o.value === value) ?? options[0];

  return (
    <div className="ss">
      {(label || headExtra) && (
        <div className="ss-head">
          {label && <span className="tb-label">{label}</span>}
          {headExtra}
        </div>
      )}

      <button
        type="button"
        className="ss-trigger"
        data-value={value}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <span className="ss-trigger-label">{cur?.triggerLabel ?? cur?.title}</span>
        {cur?.badge && <span className="ss-trigger-badge">{cur.badge}</span>}
        <span className="ss-caret" aria-hidden="true"><Icon name="chevron" /></span>
      </button>

      {open && (
        <div className="sheet-backdrop" onClick={() => setOpen(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()} role="listbox">
            <div className="sheet-grip" />
            <div className="sheet-head">
              <div className="qc-main">
                <div className="qc-name">{sheetTitle}</div>
                {sheetSub && <div className="qc-sub">{sheetSub}</div>}
              </div>
            </div>

            <div className="sheet-body">
              {options.map((o) => {
                const sel = o.value === value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    role="option"
                    aria-selected={sel}
                    data-value={o.value}
                    className={"ss-option" + (sel ? " current" : "")}
                    onClick={() => {
                      onChange(o.value);
                      setOpen(false);
                    }}
                  >
                    <span className="ss-option-main">
                      <span className="ss-option-title">{o.title}</span>
                      {o.sub && <span className="ss-option-sub">{o.sub}</span>}
                    </span>
                    {o.badge && <span className="ss-option-badge">{o.badge}</span>}
                    {sel && <span className="ss-option-check" aria-hidden="true"><Icon name="check" /></span>}
                  </button>
                );
              })}
            </div>

            <button className="sheet-close" onClick={() => setOpen(false)}>
              關閉
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
