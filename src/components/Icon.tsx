import type { CSSProperties } from "react";

/* 可復用 inline-SVG 圖示（取代原本的文字/Unicode icon）。
   線條型用 currentColor，吃父層文字顏色；尺寸預設 1em 隨字級縮放。 */

export type IconName =
  | "chevron" // 右向 V；用 CSS rotate 轉成上/下
  | "arrowUpRight"
  | "check"
  | "x"
  | "plus"
  | "minus"
  | "warning"
  | "star";

const P: Record<IconName, { d: string; fill?: boolean }> = {
  chevron: { d: "M9 6l6 6-6 6" },
  arrowUpRight: { d: "M7 17L17 7M9 7h8v8" },
  check: { d: "M5 13l4 4L19 7" },
  x: { d: "M6 6l12 12M18 6L6 18" },
  plus: { d: "M12 5v14M5 12h14" },
  minus: { d: "M5 12h14" },
  warning: { d: "M12 3l9 16H3L12 3zM12 10v4M12 17.5v.5", fill: false },
  star: { d: "M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 17l-5.2 2.6 1-5.8L3.5 9.7l5.9-.9L12 3.5z", fill: true },
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
  const { d, fill } = P[name];
  return (
    <svg
      className={"icon" + (className ? " " + className : "")}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill ? "currentColor" : "none"}
      stroke={fill ? "none" : "currentColor"}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      style={style}
    >
      {title && <title>{title}</title>}
      <path d={d} />
    </svg>
  );
}
