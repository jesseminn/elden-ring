import type { CSSProperties } from "react";
import {
  ChevronRight,
  ArrowUpRight,
  Check,
  X,
  Plus,
  Minus,
  TriangleAlert,
  Star,
  type LucideIcon,
} from "lucide-react";

/* 統一的圖示出口：實際圖形來自 Lucide（lucide-react，MIT）。
   保留這層 wrapper 是為了：
   1. 用語意化的 name 對應到 Lucide 元件，呼叫端不必各自 import；
   2. 一律掛上 .icon class（吃 styles.css 的對齊與各種 rotate 規則，
      例如 caret 方向、.dt-caret.open、.ss-caret .icon …）；
   3. 尺寸預設 1em，隨父層字級縮放、用 currentColor 吃文字顏色。 */

export type IconName =
  | "chevron" // 右向，方向由 CSS rotate 控制
  | "arrowUpRight"
  | "check"
  | "x"
  | "plus"
  | "minus"
  | "warning"
  | "star";

const MAP: Record<IconName, LucideIcon> = {
  chevron: ChevronRight,
  arrowUpRight: ArrowUpRight,
  check: Check,
  x: X,
  plus: Plus,
  minus: Minus,
  warning: TriangleAlert,
  star: Star,
};

interface Props {
  name: IconName;
  size?: number | string;
  className?: string;
  strokeWidth?: number;
  style?: CSSProperties;
  title?: string;
}

export default function Icon({ name, size = "1em", className, strokeWidth = 2, style, title }: Props) {
  const Cmp = MAP[name];
  return (
    <Cmp
      className={"icon" + (className ? " " + className : "")}
      size={size}
      strokeWidth={strokeWidth}
      style={style}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    />
  );
}
