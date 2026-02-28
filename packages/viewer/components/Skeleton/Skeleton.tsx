import type { CSSProperties, FC } from "react";
import styles from "./Skeleton.module.css";

type Props = {
  width?: number | string;
  height?: number | string;
  style?: CSSProperties;
  className?: string;
};

export const Skeleton: FC<Props> = ({ width = "100%", height = "1.2em", style, className }) => (
  <span
    className={`${styles["skeleton"]}${className ? ` ${className}` : ""}`}
    data-testid="skeleton"
    style={{ width, height, ...style }}
  />
);
