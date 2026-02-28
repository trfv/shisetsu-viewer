import type { ElementType, FC } from "react";
import styles from "./Label.module.css";

type Props = {
  label: string;
  size: LabelSize;
  as?: ElementType;
};

type LabelSize = "small" | "medium" | "large";

export const BaseLabel: FC<Props> = ({ label, size, as: Component = "span" }) => {
  return <Component className={`${styles["label"]} ${styles[size]}`}>{label}</Component>;
};
