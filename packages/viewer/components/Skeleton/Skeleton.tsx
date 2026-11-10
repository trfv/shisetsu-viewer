import type { CSSProperties, FC } from "react";

import styles from "./Skeleton.module.css";

type Props = {
  width?: number | string;
  height?: number | string;
  style?: CSSProperties;
  className?: string;
  variant?: "block" | "text";
};

export const Skeleton: FC<Props> = ({
  width = "100%",
  height,
  style,
  className,
  variant = "block",
}) => (
  <span
    className={[styles["skeleton"], variant === "text" && styles["text"], className]
      .filter(Boolean)
      .join(" ")}
    data-testid="skeleton"
    style={{
      width,
      height: height ?? (variant === "text" ? undefined : "1.2em"),
      ...style,
    }}
  />
);
